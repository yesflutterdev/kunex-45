const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // Check which email service is being used
  if (process.env.EMAIL_SERVICE && process.env.EMAIL_SERVICE.toLowerCase() === 'gmail') {
    // For Gmail, use OAuth2 or app password approach
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD, // Try app password first, fall back to regular password
      },
      debug: true, // Enable debug output
    });
  } else if (process.env.EMAIL_SERVICE && process.env.EMAIL_SERVICE.toLowerCase() === 'smtp') {
    // For custom SMTP configuration
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      debug: true, // Enable debug output
    });
  } else {
    // For other email services, use regular authentication
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      debug: true, // Enable debug output
    });
  }
};

// Send verification email
exports.sendVerificationEmail = async (email, token) => {
  const transporter = createTransporter();

  // in mobile app we don't have frontend url, so I use it directly
  const verificationUrl = `${process.env.FRONTEND_URL}/api/auth/verify-email/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Email Verification',
    html: `
      <h1>Email Verification</h1>
      <p>Thank you for registering. Please verify your email by clicking the link below:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, token) => {
  const transporter = createTransporter();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset',
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset. Please click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

// Send password change notification email
exports.sendPasswordChangeNotification = async (email, firstName) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Password Changed Successfully',
    html: `
      <h1>Password Changed</h1>
      <p>Hello ${firstName || 'User'},</p>
      <p>Your account password has been successfully changed on ${new Date().toLocaleDateString()}.</p>
      <p>If you did not make this change, please contact our support team immediately.</p>
      <p>For your security, we recommend:</p>
      <ul>
        <li>Using a strong, unique password</li>
        <li>Enabling two-factor authentication</li>
        <li>Regularly reviewing your account activity</li>
      </ul>
      <p>If you have any concerns, please contact our support team.</p>
      <p>Best regards,<br>Your Security Team</p>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error(`Failed to send password change notification: ${error.message}`);
  }
};

exports.sendOtpToResetPassword = async (email, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset',
    html: `
      <h1>Password Reset OTP: ${otp}</h1>
      <p>You requested a password reset. Use this OTP to reset password</p>
     
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};
