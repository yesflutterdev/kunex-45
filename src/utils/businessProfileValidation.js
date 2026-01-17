const Joi = require('joi');

// Validate business profile creation
exports.validateCreateBusinessProfile = (data) => {
  const schema = Joi.object({
    businessName: Joi.string().trim().max(100).required(),
    username: Joi.string()
      .trim()
      .lowercase()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens'
      }),
    businessType: Joi.string()
      .valid(
        'Small business',
        'Medium sized business',
        'Franchise',
        'Corporation',
        'Non profit organizations',
        'Startup',
        'Online business',
        'Others'
      )
      .required(),
    subBusinessType: Joi.string().trim().max(100).allow(''),
    logo: Joi.string().uri().trim().allow('', null),
    coverImage: Joi.string().uri().trim().allow('', null),
    professionType: Joi.string()
      .valid(
        'Freelancer',
        'Contractor',
        'Consultant',
        'Self employed',
        'Employer',
        'Entrepreneur',
        'Remote worker',
        'Others'
      )
      .allow(''),
    industryId: Joi.string().hex().length(24).required(),
    subIndustryId: Joi.string().trim().max(100).allow('', null),
    isBusiness: Joi.boolean().default(true),
    industryTags: Joi.array().items(Joi.string().trim().max(50)).max(10),
    description: Joi.object({
      short: Joi.string().trim().max(200).allow(''),
      full: Joi.string().trim().max(2000).allow('')
    }),
    priceRange: Joi.string().valid('$', '$$', '$$$', '$$$$').allow(''),
    contactInfo: Joi.object({
      email: Joi.string().email().trim().lowercase().allow(''),
      phone: Joi.string().trim().max(20).allow(''),
      website: Joi.string().uri().trim().allow('')
    }),
    businessHours: Joi.array().items(
      Joi.object({
        day: Joi.string()
          .valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
          .required(),
        open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(''),
        close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(''),
        isClosed: Joi.boolean().default(false)
      })
    ).max(7),
    features: Joi.array().items(Joi.string().trim().max(100)).max(20),
    themeColor: Joi.object({
      primary: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#007bff'),
      secondary: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#6c757d'),
      text: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#212529'),
      background: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#ffffff')
    }),
    callToAction: Joi.object({
      primaryAction: Joi.string()
        .valid('open_url', 'send_email', 'click_to_call', 'share_vcard', 'none')
        .default('none'),
      buttonColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#007bff'),
      buttonText: Joi.string().trim().max(50).default('Contact Us')
    }),
    virtualContact: Joi.object({
      firstName: Joi.string().trim().max(50).allow(''),
      lastName: Joi.string().trim().max(50).allow(''),
      company: Joi.string().trim().max(100).allow(''),
      workPhone: Joi.string().trim().max(20).allow(''),
      workEmail: Joi.string().email().trim().lowercase().allow(''),
      workAddress: Joi.string().trim().max(200).allow(''),
      city: Joi.string().trim().max(100).allow(''),
      state: Joi.string().trim().max(100).allow(''),
      zipCode: Joi.string().trim().max(20).allow(''),
      country: Joi.string().trim().max(100).allow('')
    })
  });

  return schema.validate(data, { allowUnknown: false, stripUnknown: true });
};

// Validate business profile update
exports.validateUpdateBusinessProfile = (data) => {
  const schema = Joi.object({
    businessName: Joi.string().trim().max(100),
    username: Joi.string()
      .trim()
      .lowercase()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens'
      }),
    businessType: Joi.string()
      .valid(
        'Small business',
        'Medium sized business',
        'Franchise',
        'Corporation',
        'Non profit organizations',
        'Startup',
        'Online business',
        'Others'
      ),
    subBusinessType: Joi.string().trim().max(100).allow(''),
    professionType: Joi.string()
      .valid(
        'Freelancer',
        'Contractor',
        'Consultant',
        'Self employed',
        'Employer',
        'Entrepreneur',
        'Remote worker',
        'Others'
      )
      .allow(''),
    industryId: Joi.string().hex().length(24),
    subIndustryId: Joi.string().trim().max(100).allow('', null),
    isBusiness: Joi.boolean(),
    industryTags: Joi.array().items(Joi.string().trim().max(50)).max(10),
    description: Joi.object({
      short: Joi.string().trim().max(200).allow(''),
      full: Joi.string().trim().max(2000).allow('')
    }),
    priceRange: Joi.string().valid('$', '$$', '$$$', '$$$$').allow(''),
    contactInfo: Joi.object({
      email: Joi.string().email().trim().lowercase().allow(''),
      phone: Joi.string().trim().max(20).allow(''),
      website: Joi.string().uri().trim().allow('')
    }),
    location: Joi.object({
      isOnlineOnly: Joi.boolean(),
      address: Joi.string().trim().max(200).allow(''),
      city: Joi.string().trim().max(100).allow(''),
      state: Joi.string().trim().max(100).allow(''),
      country: Joi.string().trim().max(100).allow(''),
      postalCode: Joi.string().trim().max(20).allow(''),
      coordinates: Joi.object({
        type: Joi.string().valid('Point').default('Point'),
        coordinates: Joi.array()
          .items(Joi.number())
          .length(2)
          .custom((value, helpers) => {
            const [longitude, latitude] = value;
            if (longitude < -180 || longitude > 180) {
              return helpers.error('coordinates.longitude');
            }
            if (latitude < -90 || latitude > 90) {
              return helpers.error('coordinates.latitude');
            }
            return value;
          })
          .messages({
            'coordinates.longitude': 'Longitude must be between -180 and 180',
            'coordinates.latitude': 'Latitude must be between -90 and 90'
          })
      })
    }),
    businessHours: Joi.array().items(
      Joi.object({
        day: Joi.string()
          .valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
          .required(),
        open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(''),
        close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(''),
        isClosed: Joi.boolean().default(false)
      })
    ).max(7),
    features: Joi.array().items(Joi.string().trim().max(100)).max(20),
    themeColor: Joi.object({
      primary: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
      secondary: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
      text: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
      background: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    }),
    callToAction: Joi.object({
      primaryAction: Joi.string()
        .valid('open_url', 'send_email', 'click_to_call', 'share_vcard', 'none'),
      buttonColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
      buttonText: Joi.string().trim().max(50)
    }),
    virtualContact: Joi.object({
      firstName: Joi.string().trim().max(50).allow(''),
      lastName: Joi.string().trim().max(50).allow(''),
      company: Joi.string().trim().max(100).allow(''),
      workPhone: Joi.string().trim().max(20).allow(''),
      workEmail: Joi.string().email().trim().lowercase().allow(''),
      workAddress: Joi.string().trim().max(200).allow(''),
      city: Joi.string().trim().max(100).allow(''),
      state: Joi.string().trim().max(100).allow(''),
      zipCode: Joi.string().trim().max(20).allow(''),
      country: Joi.string().trim().max(100).allow('')
    })
  });

  return schema.validate(data, { allowUnknown: false, stripUnknown: true });
};

// Validate search business profiles
exports.validateSearchBusinessProfiles = (data) => {
  const schema = Joi.object({
    search: Joi.string().trim().max(100).allow(''),
    businessType: Joi.string()
      .valid(
        'Small business',
        'Medium sized business',
        'Franchise',
        'Corporation',
        'Non profit organizations',
        'Startup',
        'Online business',
        'Others'
      )
      .allow(''),
    industry: Joi.string().trim().max(100).allow(''),
    priceRange: Joi.string().valid('$', '$$', '$$$', '$$$$').allow(''),
    city: Joi.string().trim().max(100).allow(''),
    state: Joi.string().trim().max(100).allow(''),
    country: Joi.string().trim().max(100).allow(''),
    features: Joi.alternatives().try(
      Joi.string().trim(),
      Joi.array().items(Joi.string().trim())
    ),
    minRating: Joi.number().min(0).max(5).allow(''),
    isOnlineOnly: Joi.boolean().allow(''),
    openedStatus: Joi.string().valid('open', 'closed', 'any').default('any'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    sortBy: Joi.string()
      .valid('createdAt', 'updatedAt', 'businessName', 'ratingAverage', 'viewCount')
      .default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  });

  return schema.validate(data);
};

// Validate location search parameters
exports.validateLocationSearch = (data) => {
  const schema = Joi.object({
    longitude: Joi.number().min(-180).max(180).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    maxDistance: Joi.number().min(100).max(100000).default(10000), // 100m to 100km
    limit: Joi.number().min(1).max(50).default(10),
    businessType: Joi.string()
      .valid(
        'Small business',
        'Medium sized business',
        'Franchise',
        'Corporation',
        'Non profit organizations',
        'Startup',
        'Online business',
        'Others'
      )
      .allow(''),
    industry: Joi.string().trim().max(100).allow(''),
    priceRange: Joi.string().valid('$', '$$', '$$$', '$$$$').allow(''),
    minRating: Joi.number().min(0).max(5).allow(''),
    openedStatus: Joi.string().valid('open', 'closed', 'any').default('any')
  });

  return schema.validate(data);
};

// Validate logo/cover image upload
exports.validateImageUpload = (file) => {
  if (!file) {
    return { error: { details: [{ message: 'Image file is required' }] } };
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

// Validate multiple image uploads
exports.validateMultipleImageUpload = (files) => {
  if (!files || files.length === 0) {
    return { error: { details: [{ message: 'At least one image file is required' }] } };
  }

  if (files.length > 5) {
    return { error: { details: [{ message: 'Maximum 5 images allowed' }] } };
  }

  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  for (const file of files) {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return { error: { details: [{ message: 'Only JPEG, PNG, and WebP images are allowed' }] } };
    }

    if (file.size > maxSize) {
      return { error: { details: [{ message: 'Each file size must be less than 5MB' }] } };
    }
  }

  return { value: files };
};

// Validate username availability
exports.validateUsername = (data) => {
  const schema = Joi.object({
    username: Joi.string()
      .trim()
      .lowercase()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens'
      })
  });

  return schema.validate(data);
};

// Validate business hours
exports.validateBusinessHours = (data) => {
  const schema = Joi.array().items(
    Joi.object({
      day: Joi.string()
        .valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
        .required(),
      open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(''),
      close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(''),
      isClosed: Joi.boolean().default(false)
    }).custom((value, helpers) => {
      if (!value.isClosed && (!value.open || !value.close)) {
        return helpers.error('businessHours.openClose');
      }
      if (!value.isClosed && value.open >= value.close) {
        return helpers.error('businessHours.timeOrder');
      }
      return value;
    })
      .messages({
        'businessHours.openClose': 'Open and close times are required when not closed',
        'businessHours.timeOrder': 'Open time must be before close time'
      })
  ).max(7).unique('day');

  return schema.validate(data);
}; 