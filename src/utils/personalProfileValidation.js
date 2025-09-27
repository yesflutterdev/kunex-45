const Joi = require('joi');

// Validate personal profile creation
exports.validateCreatePersonalProfile = (data) => {
  const schema = Joi.object({
    firstName: Joi.string().trim().max(50).allow(''),
    lastName: Joi.string().trim().max(50).allow(''),
    bio: Joi.string().max(500).allow(''),
    dateOfBirth: Joi.date().max('now').allow(null),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').allow(''),
    interests: Joi.array().items(Joi.string().trim().max(50)).max(20),
    location: Joi.object({
      address: Joi.string().trim().max(200).allow(''),
      city: Joi.string().trim().max(100).allow(''),
      state: Joi.string().trim().max(100).allow(''),
      country: Joi.string().trim().max(100).allow(''),
      postalCode: Joi.string().trim().max(20).allow(''),
      coordinates: Joi.object({
        type: Joi.string().valid('Point').default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2).custom((value, helpers) => {
          const [longitude, latitude] = value;
          if (longitude < -180 || longitude > 180) {
            return helpers.error('any.invalid', { message: 'Longitude must be between -180 and 180' });
          }
          if (latitude < -90 || latitude > 90) {
            return helpers.error('any.invalid', { message: 'Latitude must be between -90 and 90' });
          }
          return value;
        })
      }).allow(null)
    }).allow({}),
    contactInfo: Joi.object({
      email: Joi.string().email().trim().lowercase().allow(''),
      phone: Joi.string().trim().max(20).allow(''),
      website: Joi.string().uri({ scheme: ['http', 'https'] }).allow('')
    }).allow({}),
    socialMedia: Joi.array().items(
      Joi.object({
        platform: Joi.string().valid(
          'instagram', 'facebook', 'twitter', 'linkedin', 'tiktok',
          'youtube', 'pinterest', 'snapchat', 'github', 'other'
        ).required(),
        handle: Joi.string().trim().max(100).allow(''),
        url: Joi.string().uri().required(),
        isVerified: Joi.boolean().default(false)
      })
    ).max(10),
    preferences: Joi.object({
      language: Joi.string().valid('en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar').default('en'),
      currency: Joi.string().valid('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR').default('USD'),
      distanceUnit: Joi.string().valid('km', 'mi').default('mi')
    }).allow({})
  });

  return schema.validate(data, { allowUnknown: false, stripUnknown: true });
};

// Validate personal profile update
exports.validateUpdatePersonalProfile = (data) => {
  const schema = Joi.object({
    firstName: Joi.string().trim().max(50).allow(''),
    lastName: Joi.string().trim().max(50).allow(''),
    bio: Joi.string().max(500).allow(''),
    dateOfBirth: Joi.date().max('now').allow(null),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').allow(''),
    interests: Joi.array().items(Joi.string().trim().max(50)).max(20),
    location: Joi.object({
      address: Joi.string().trim().max(200).allow(''),
      city: Joi.string().trim().max(100).allow(''),
      state: Joi.string().trim().max(100).allow(''),
      country: Joi.string().trim().max(100).allow(''),
      postalCode: Joi.string().trim().max(20).allow(''),
      coordinates: Joi.object({
        type: Joi.string().valid('Point').default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2).custom((value, helpers) => {
          const [longitude, latitude] = value;
          if (longitude < -180 || longitude > 180) {
            return helpers.error('any.invalid', { message: 'Longitude must be between -180 and 180' });
          }
          if (latitude < -90 || latitude > 90) {
            return helpers.error('any.invalid', { message: 'Latitude must be between -90 and 90' });
          }
          return value;
        })
      }).allow(null)
    }),
    contactInfo: Joi.object({
      email: Joi.string().email().trim().lowercase().allow(''),
      phone: Joi.string().trim().max(20).allow(''),
      website: Joi.string().uri({ scheme: ['http', 'https'] }).allow('')
    }),
    socialMedia: Joi.array().items(
      Joi.object({
        platform: Joi.string().valid(
          'instagram', 'facebook', 'twitter', 'linkedin', 'tiktok',
          'youtube', 'pinterest', 'snapchat', 'github', 'other'
        ).required(),
        handle: Joi.string().trim().max(100).allow(''),
        url: Joi.string().uri().required(),
        isVerified: Joi.boolean().default(false)
      })
    ).max(10),
    preferences: Joi.object({
      language: Joi.string().valid('en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar'),
      currency: Joi.string().valid('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'),
      distanceUnit: Joi.string().valid('km', 'mi')
    })
  });

  return schema.validate(data, { allowUnknown: false, stripUnknown: true });
};

// Validate location search parameters
exports.validateLocationSearch = (data) => {
  const schema = Joi.object({
    longitude: Joi.number().min(-180).max(180).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    maxDistance: Joi.number().min(100).max(100000).default(10000), // 100m to 100km
    limit: Joi.number().min(1).max(50).default(10)
  });

  return schema.validate(data);
};

// Validate profile photo upload
exports.validateProfilePhotoUpload = (file) => {
  if (!file) {
    return { error: { details: [{ message: 'Profile photo is required' }] } };
  }

  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { error: { details: [{ message: 'Only JPEG, PNG, and WebP images are allowed' }] } };
  }

  if (file.size > maxSize) {
    return { error: { details: [{ message: 'File size must be less than 5MB' }] } };
  }

  return { value: file };
};

// Validate search and filter parameters
exports.validateSearchProfiles = (data) => {
  const schema = Joi.object({
    search: Joi.string().trim().max(100).allow(''),
    city: Joi.string().trim().max(100).allow(''),
    country: Joi.string().trim().max(100).allow(''),
    interests: Joi.array().items(Joi.string().trim().max(50)).max(10),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').allow(''),
    ageMin: Joi.number().min(13).max(120).allow(null),
    ageMax: Joi.number().min(13).max(120).allow(null),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(50).default(10),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'firstName', 'lastName').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  });

  return schema.validate(data);
}; 