const passport = require('passport');

// Middleware to authenticate JWT token
exports.authenticate = (req, res, next) => {
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