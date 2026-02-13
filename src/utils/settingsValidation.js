const Joi = require('joi');

// Validation schema for user preferences
const preferencesSchema = Joi.object({
  language: Joi.string().valid('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'),
  currency: Joi.string().valid('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'),
  timezone: Joi.string().min(1).max(50),
  distanceUnit: Joi.string().valid('km', 'mi'),
  dateFormat: Joi.string().valid('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'),
  timeFormat: Joi.string().valid('12h', '24h')
});

// Validation schema for privacy settings
const privacySchema = Joi.object({
  profileVisibility: Joi.string().valid('public', 'private', 'friends_only'),
  allowSearchEngines: Joi.boolean(),
  showOnlineStatus: Joi.boolean(),
  allowDirectMessages: Joi.boolean()
});

// Validation schema for notification settings
const notificationSchema = Joi.object({
  email: Joi.object({
    marketing: Joi.boolean(),
    updates: Joi.boolean(),
    security: Joi.boolean(),
    billing: Joi.boolean(),
    newsletter: Joi.boolean()
  }),
  push: Joi.object({
    enabled: Joi.boolean(),
    marketing: Joi.boolean(),
    updates: Joi.boolean(),
    security: Joi.boolean()
  }),
  sms: Joi.object({
    enabled: Joi.boolean(),
    security: Joi.boolean(),
    billing: Joi.boolean()
  })
});

// Validation schema for security settings
const securitySchema = Joi.object({
  loginNotifications: Joi.boolean(),
  unusualActivityNotifications: Joi.boolean(),
  sessionTimeout: Joi.number().integer().min(15).max(1440),
  passwordChangeRequired: Joi.boolean()
});

// Validation schema for data settings
const dataSettingsSchema = Joi.object({
  allowDataCollection: Joi.boolean(),
  allowAnalytics: Joi.boolean(),
  allowPersonalization: Joi.boolean(),
  dataRetentionPeriod: Joi.number().integer().min(30).max(2555) // 30 days to 7 years
});

// Validation schema for account details update
const accountDetailsSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50),
  lastName: Joi.string().trim().min(1).max(50),
  profilePicture: Joi.string().uri().max(500)
});

// Validation schema for password change
const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    })
});

// Validation schema for billing address
const billingAddressSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50),
  lastName: Joi.string().trim().min(1).max(50),
  company: Joi.string().trim().max(100).allow(''),
  address1: Joi.string().trim().min(1).max(200),
  address2: Joi.string().trim().max(200).allow(''),
  city: Joi.string().trim().min(1).max(100),
  state: Joi.string().trim().min(1).max(100),
  postalCode: Joi.string().trim().min(1).max(20),
  country: Joi.string().trim().min(1).max(100),
  phone: Joi.string().trim().max(20).allow('')
});

// Validation schema for billing settings
const billingSettingsSchema = Joi.object({
  billingAddress: billingAddressSchema,
  autoRenew: Joi.boolean(),
  currency: Joi.string().valid('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'),
  invoiceSettings: Joi.object({
    receiveInvoices: Joi.boolean(),
    invoiceEmail: Joi.string().email().max(255),
    invoicePrefix: Joi.string().trim().max(10),
    invoiceNotes: Joi.string().trim().max(500)
  }),
  paymentReminders: Joi.object({
    enabled: Joi.boolean(),
    daysBeforeDue: Joi.number().integer().min(1).max(30)
  })
});

// Validation schema for account deletion
const accountDeletionSchema = Joi.object({
  password: Joi.string().required(),
  reason: Joi.string().trim().max(500).allow('')
});

// Validation schema for account deactivation
const accountDeactivationSchema = Joi.object({
  password: Joi.string().required(),
  reason: Joi.string().trim().max(500).allow('')
});

// Validation schema for account reactivation
const accountReactivationSchema = Joi.object({
  password: Joi.string().required()
});

// Main user settings validation schema
const userSettingsSchema = Joi.object({
  preferences: preferencesSchema,
  privacy: privacySchema,
  notifications: notificationSchema,
  security: securitySchema,
  dataSettings: dataSettingsSchema
});

// Validation functions
exports.validateAccountDetails = (data) => {
  return accountDetailsSchema.validate(data, { allowUnknown: false, stripUnknown: true });
};

exports.validatePasswordChange = (data) => {
  return passwordChangeSchema.validate(data, { allowUnknown: false });
};

exports.validateUserSettings = (data) => {
  return userSettingsSchema.validate(data, { allowUnknown: false, stripUnknown: true });
};

exports.validateBillingSettings = (data) => {
  return billingSettingsSchema.validate(data, { allowUnknown: false, stripUnknown: true });
};

exports.validateAccountDeletion = (data) => {
  return accountDeletionSchema.validate(data, { allowUnknown: false });
};

exports.validateAccountDeactivation = (data) => {
  return accountDeactivationSchema.validate(data, { allowUnknown: false });
};

exports.validateAccountReactivation = (data) => {
  return accountReactivationSchema.validate(data, { allowUnknown: false });
};

// Individual component validators
exports.validatePreferences = (data) => {
  return preferencesSchema.validate(data, { allowUnknown: false, stripUnknown: true });
};

exports.validatePrivacySettings = (data) => {
  return privacySchema.validate(data, { allowUnknown: false, stripUnknown: true });
};

exports.validateNotificationSettings = (data) => {
  return notificationSchema.validate(data, { allowUnknown: false, stripUnknown: true });
};

exports.validateSecuritySettings = (data) => {
  return securitySchema.validate(data, { allowUnknown: false, stripUnknown: true });
};

exports.validateDataSettings = (data) => {
  return dataSettingsSchema.validate(data, { allowUnknown: false, stripUnknown: true });
};

// Helper function to sanitize user input
exports.sanitizeUserInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, ''); // Remove basic HTML tags
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = exports.sanitizeUserInput(value);
    }
    return sanitized;
  }
  return input;
};

// Password strength checker
exports.checkPasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  let strength = 'weak';
  if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  
  return {
    score,
    strength,
    checks,
    isValid: score >= 4
  };
}; 