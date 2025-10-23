const User = require("../models/user.model");
const Token = require("../models/token.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const speakeasy = require("speakeasy");
const passport = require("passport");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOtpToResetPassword
} = require("../utils/email");
const { validateRegistration, validateLogin } = require("../utils/validation");
const { generateTokens } = require("../utils/generateTokens");

// Register a new user
exports.register = async (req, res, next) => {
  try {
    // Validate request body
    const { error } = validateRegistration(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create new user
    const newUser = new User({
      email,
      password,
      firstName,
      lastName,
      verificationToken,
      verificationTokenExpires,
    });

    // Save user to database
    await newUser.save();

    // Send verification email
    await sendVerificationEmail(newUser.email, verificationToken);

    res.status(201).json({
      success: true,
      message:
        "User registered successfully. Please check your email to verify your account.",
    });
  } catch (error) {
    next(error);
  }
};

// Verify email
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Find user with the verification token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    // Update user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    // Validate request body
    const { error } = validateLogin(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Authenticate using passport local strategy
    passport.authenticate(
      "local",
      { session: false },
      async (err, user, info) => {
        try {
          if (err) {
            return next(err);
          }

          // Record login attempt
          const ipAddress = req.ip;
          const userAgent = req.headers["user-agent"];

          if (!user) {
            // If user exists, record failed login attempt
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
              await existingUser.recordLoginAttempt(
                ipAddress,
                userAgent,
                false
              );
            }

            return res.status(401).json({
              success: false,
              message: info.message || "Authentication failed",
            });
          }

          // Check if 2FA is enabled
          if (user.isTwoFactorEnabled) {
            // Generate temporary token for 2FA
            const tempToken = jwt.sign(
              { id: user._id, require2FA: true },
              process.env.JWT_SECRET,
              { expiresIn: "5m" }
            );

            // Record login attempt (partial success)
            await user.recordLoginAttempt(ipAddress, userAgent, true);

            return res.status(200).json({
              success: true,
              message: "2FA required",
              tempToken,
              require2FA: true,
              isUserFillsInitialData: user.isUserFillsInitialData,
              planSubscribedTo: user.planSubscribedTo,
            });
          }

          // Generate JWT token
          const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
          );

          // Generate refresh token
          const refreshToken = jwt.sign(
            { id: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
          );

          // Save refresh token to database
          const newToken = new Token({
            userId: user._id,
            token: refreshToken,
            type: "refresh",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          });
          await newToken.save();

          // Record successful login attempt
          await user.recordLoginAttempt(ipAddress, userAgent, true);

          res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            refreshToken,
            user: {
              id: user._id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              isUserFillsInitialData: user.isUserFillsInitialData,
              planSubscribedTo: user.planSubscribedTo,
            },
          });
        } catch (error) {
          next(error);
        }
      }
    )(req, res, next);
  } catch (error) {
    next(error);
  }
};

// Verify 2FA
exports.verify2FA = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({
        success: false,
        message: "Temporary token and verification code are required",
      });
    }

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Check if token requires 2FA
    if (!decoded.require2FA) {
      return res.status(400).json({
        success: false,
        message: "Invalid token type",
      });
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify 2FA code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: code,
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );

    // Save refresh token to database
    const newToken = new Token({
      userId: user._id,
      token: refreshToken,
      type: "refresh",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    await newToken.save();

    res.status(200).json({
      success: true,
      message: "2FA verification successful",
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Setup 2FA
exports.setup2FA = async (req, res, next) => {
  try {
    // Get user from JWT token
    const user = req.user;

    // Generate new secret
    const secret = speakeasy.generateSecret({
      name: `ExpressAuthAPI:${user.email}`,
    });

    // Save secret to user
    user.twoFactorSecret = secret.base32;
    await user.save();

    res.status(200).json({
      success: true,
      message: "2FA setup initiated",
      secret: secret.base32,
      otpauth_url: secret.otpauth_url,
    });
  } catch (error) {
    next(error);
  }
};

// Enable 2FA
exports.enable2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: "2FA setup not initiated",
      });
    }

    // Verify code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: code,
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    // Enable 2FA
    user.isTwoFactorEnabled = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "2FA enabled successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Disable 2FA
exports.disable2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!user.isTwoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: "2FA is not enabled",
      });
    }

    // Verify code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: code,
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    // Disable 2FA
    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Forgot password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

    // Save token to database
    const token = new Token({
      userId: user._id,
      token: resetToken,
      type: "passwordReset",
      expiresAt: new Date(resetTokenExpires),
    });
    await token.save();

    // Update user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetToken);

    res.status(200).json({
      success: true,
      message: "Password reset email sent",
    });
  } catch (error) {
    next(error);
  }
};

// Reset password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    // Find user with the reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Find token in database
    const tokenDoc = await Token.findOne({
      userId: user._id,
      token,
      type: "passwordReset",
      isUsed: false,
      expiresAt: { $gt: Date.now() },
    });

    if (!tokenDoc) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Update user password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Mark token as used
    tokenDoc.isUsed = true;
    await tokenDoc.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    // Find token in database
    const tokenDoc = await Token.findOne({
      userId: decoded.id,
      token: refreshToken,
      type: "refresh",
      isUsed: false,
      expiresAt: { $gt: Date.now() },
    });

    if (!tokenDoc) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate new JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );

    // Mark old token as used
    tokenDoc.isUsed = true;
    await tokenDoc.save();

    // Save new refresh token to database
    const newToken = new Token({
      userId: user._id,
      token: newRefreshToken,
      type: "refresh",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    await newToken.save();

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      token,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// Google OAuth initiate
exports.googleLogin = (req, res, next) => {
  // Store the redirect URL in session if provided
  if (req.query.redirect) {
    // req.session.redirectUrl = req.query.redirect;
    const redirectUrl =
      req.query.redirect || process.env.FRONTEND_URL || "http://localhost:3001";
    req.session.redirectUrl = redirectUrl;
  }

  passport.authenticate("google", {
    scope: ["profile", "email"],
    accessType: "offline",
    prompt: "consent",
  })(req, res, next);
};

// Google OAuth callback
exports.googleCallback = (req, res, next) => {
  passport.authenticate(
    "google",
    { session: false },
    async (err, user, info) => {
      try {
        if (err) {
          console.error("Google OAuth Error:", err);
          return res.status(400).json({
            success: false,
            message: "OAuth error occurred",
            error: err.message,
          });
          // return res.redirect(`${process.env.FRONTEND_URL}/login?
          //   error=oauth_error`);
        }

        if (!user) {
          console.error("Google OAuth - No user returned:", info);
          return res.status(400).json({
            success: false,
            message: "Google authentication failed",
            info,
          });
          // return res.redirect(`${process.env.FRONTEND_URL}/login?
          //   error=google_auth_failed`);
        }

        // Generate tokens
        const { token, refreshToken } = await generateTokens(user);

        // Record login attempt
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers["user-agent"];
        await user.recordLoginAttempt(ipAddress, userAgent, true, "google");

        // Return success response
        return res.status(200).json({
          success: true,
          message: "Google OAuth works fine!",
          token,
          refreshToken,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: user.profilePicture,
            role: user.role,
            isVerified: user.isVerified,
          },
        });

        //  // Get redirect URL from session or use default
        //  const redirectUrl = req.session.redirectUrl || `${process.env.
        //   FRONTEND_URL}/dashboard`;
        //   delete req.session.redirectUrl;

        //   // For development/testing, you can return JSON instead of redirect
        //   if (req.query.format === 'json') {
        //     return res.status(200).json({
        //       success: true,
        //       message: 'Google login successful',
        //       token,
        //       refreshToken,
        //       user: {
        //         id: user._id,
        //         email: user.email,
        //         firstName: user.firstName,
        //         lastName: user.lastName,
        //         profilePicture: user.profilePicture,
        //         role: user.role,
        //         isVerified: user.isVerified,
        //       },
        //     });
        //   }

        //   // Redirect to frontend with tokens (for production)
        //   const redirectWithTokens = `${redirectUrl}?token=${encodeURIComponent
        //   (token)}&refreshToken=${encodeURIComponent(refreshToken)}`;
        //   res.redirect(redirectWithTokens);
      } catch (error) {
        console.error("Google OAuth Callback Error:", error);
        return res.status(500).json({
          success: false,
          message: "Server error occurred",
          error: error.message,
        });

        // res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
      }
    }
  )(req, res, next);
};

// Link Google account to existing user
exports.linkGoogleAccount = (req, res, next) => {
  // Ensure user is authenticated
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Store user ID in session for linking
  req.session.linkUserId = req.user._id;

  passport.authenticate("google", {
    scope: ["profile", "email"],
    accessType: "offline",
    prompt: "consent",
  })(req, res, next);
};

// Unlink Google account
exports.unlinkGoogleAccount = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.googleId) {
      return res.status(400).json({
        success: false,
        message: "Google account is not linked",
      });
    }

    // Check if user has password or other OAuth methods
    if (!user.password && !user.facebookId) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot unlink Google account. Please set a password first or link another account.",
      });
    }

    // Remove Google data
    user.googleId = undefined;
    user.oauthProfiles.google = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Google account unlinked successfully",
    });
  } catch (error) {
    next(error);
  }
};

// --- google mobile login approach
exports.googleMobileLogin = async (req, res) => {
  try {
    const { accessToken, idToken, email, name, photoUrl } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        firstName: name?.split(' ')[0] || '',
        lastName: name?.split(' ')[1] || '',
        profilePicture: photoUrl,
        authProvider: 'google',
        isVerified: true,
      });
      await user.save();
    }

    const { token, refreshToken } = await generateTokens(user);

    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    await user.recordLoginAttempt(ipAddress, userAgent, true, 'google');

    res.json({
      success: true,
      message: 'Google login successful',
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        role: user.role,
        isVerified: user.isVerified,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

// Get OAuth accounts linked to user
exports.getLinkedAccounts = async (req, res, next) => {
  try {
    const user = req.user;

    const linkedAccounts = {
      google: !!user.googleId,
      facebook: !!user.facebookId,
      hasPassword: !!user.password,
    };

    res.status(200).json({
      success: true,
      linkedAccounts,
    });
  } catch (error) {
    next(error);
  }
};

// Get login history
exports.getLoginHistory = async (req, res, next) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      loginHistory: user.loginHistory,
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Find and invalidate refresh token
    await Token.findOneAndUpdate(
      { token: refreshToken, type: "refresh" },
      { isUsed: true }
    );

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Test email configuration
exports.testEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Send test email
    await sendVerificationEmail(email, "test-token");

    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
    });
  } catch (error) {
    next(error);
  }
};

// --- Forgot password for mobile
/// Forgot Password
exports.sendForgotPasswordCode = async (req, res) => {

  const { email } = req.body;
  try {

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const codeValue = Math.floor(Math.random() * 1000000).toString();
    var info = await sendOtpToResetPassword(email, codeValue);

    if (info.accepted[0] === existingUser.email) {

      existingUser.forgotPasswordCode = codeValue;
      existingUser.forgotPasswordCodeValidation = Date.now();
      await existingUser.save();
      return res.status(200).json({ success: true, message: "Code sent!" });
    }
    return res.status(400).json({ success: false, message: "Code sent failed!" });

  } catch (e) {
    console.log(e);
  }
}

exports.verifyForgotPasswordCode = async (req, res) => {
  const { email, provideCode, newPassword } = req.body;
  try {

    const codeValue = provideCode.toString();

    const existingUser = await User.findOne({ email }).select("+forgotPasswordCode + forgotPasswordCodeValidation");

    if (!existingUser) {
      return res.status(400).json({ success: false, message: "User does not exists!" });
    }

    if (!existingUser.forgotPasswordCode || !existingUser.forgotPasswordCodeValidation) {
      return res.status(400).json({ success: false, message: "Something is wrong with the code!" });
    }

    if (Date.now() - existingUser.forgotPasswordCodeValidation > 5 * 60 * 1000) {
      return res.status(400).json({ success: false, message: "code has been expired!" });
    }

    if (codeValue === existingUser.forgotPasswordCode) {
      // const hashedPassword = await doHash(newPassword, 12);
      existingUser.password = newPassword;

      existingUser.forgotPasswordCode = undefined;
      existingUser.forgotPasswordCodeValidation = undefined;
      await existingUser.save();
      return res.status(200).json({ success: true, message: "Password Updated" });
    }

    return res.status(400).json({ success: false, message: "unexpected occured!" });

  } catch (e) { console.log(e); }
}
