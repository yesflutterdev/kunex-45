const Joi = require('joi');

// Validate user registration
exports.validateRegistration = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().allow(''),
    lastName: Joi.string().allow(''),
  });

  return schema.validate(data);
};

// Validate user login
exports.validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  return schema.validate(data);
};

// Validate password reset
exports.validatePasswordReset = (data) => {
  const schema = Joi.object({
    password: Joi.string().min(8).required(),
  });

  return schema.validate(data);
};

// Validate 2FA verification
exports.validate2FAVerification = (data) => {
  const schema = Joi.object({
    tempToken: Joi.string().required(),
    code: Joi.string().required(),
  });

  return schema.validate(data);
};

// Validate refresh token
exports.validateRefreshToken = (data) => {
  const schema = Joi.object({
    refreshToken: Joi.string().required(),
  });

  return schema.validate(data);
};


exports.acceptFPCodeValidation = Joi.object(
  {
    email: Joi.string()
      .min(6)
      .max(60)
      .required()
      .email({
        tlds: { allow: ['com', 'net'] }
      }),
    newPassword: Joi.string()
      .required()
      .pattern(new RegExp('^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*?&]{8,}$')),

  }
);