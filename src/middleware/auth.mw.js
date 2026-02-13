const passport = require('passport');
const UserSettings = require('../models/userSettings.model');

// Middleware to authenticate JWT token and check account status
exports.authenticate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, async (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid or expired token',
      });
    }

    req.user = user;

    // Check if account is deactivated
    try {
      const settings = await UserSettings.findOne({ userId: user.id });
      if (settings && !settings.accountStatus.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please reactivate your account to continue.',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }
    } catch (dbErr) {
      return next(dbErr);
    }

    next();
  })(req, res, next);
};

// Authenticate without checking account status (used for reactivate endpoint)
exports.authenticateAllowDeactivated = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid or expired token',
      });
    }

    req.user = user;
    next();
  })(req, res, next);
};

// Alias for authenticate (commonly used as protect in routes)
exports.protect = exports.authenticate;

// Middleware to check if user has admin role
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Forbidden - Admin access required',
    });
  }
};

// Middleware to check if user is verified
exports.isVerified = (req, res, next) => {
  if (req.user && req.user.isVerified) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Forbidden - Email verification required',
    });
  }
};

// Standalone middleware to check if account is active (kept for granular use)
exports.isActiveAccount = async (req, res, next) => {
  try {
    const settings = await UserSettings.findOne({ userId: req.user.id });

    if (settings && !settings.accountStatus.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please reactivate your account to continue.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};
