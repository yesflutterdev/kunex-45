const Joi = require('joi');

// Validate social media link creation
exports.validateCreateSocialMediaLink = (data) => {
  const schema = Joi.object({
    businessId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null, ''),
    platform: Joi.string()
      .valid(
        'instagram',
        'tiktok',
        'facebook',
        'twitter',
        'linkedin',
        'youtube',
        'pinterest',
        'snapchat',
        'github',
        'website',
        'whatsapp',
        'other'
      )
      .required(),
    handle: Joi.string().trim().max(100).allow(''),
    displayName: Joi.string().trim().max(100).allow(''),
    originalUrl: Joi.string().uri().trim().max(500).required(),
    displayUrl: Joi.string().trim().max(200).allow(''),
    metadata: Joi.object({
      title: Joi.string().trim().max(200).allow(''),
      description: Joi.string().trim().max(500).allow(''),
      thumbnailUrl: Joi.string().uri().trim().max(500).allow(''),
      followerCount: Joi.number().min(0).default(0),
      postCount: Joi.number().min(0).default(0),
      isVerified: Joi.boolean().default(false)
    }),
    embedSettings: Joi.object({
      showHeader: Joi.boolean().default(true),
      showCaption: Joi.boolean().default(true),
      maxPosts: Joi.number().min(1).max(50).default(6),
      layout: Joi.string().valid('grid', 'carousel', 'list').default('grid')
    }),
    status: Joi.string().valid('active', 'broken', 'pending_verification').default('active'),
    isPublic: Joi.boolean().default(true),
    displayOrder: Joi.number().min(0).default(0)
  });

  return schema.validate(data, { allowUnknown: false, stripUnknown: true });
};

// Validate social media link update
exports.validateUpdateSocialMediaLink = (data) => {
  const schema = Joi.object({
    businessId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null, ''),
    platform: Joi.string()
      .valid(
        'instagram',
        'tiktok',
        'facebook',
        'twitter',
        'linkedin',
        'youtube',
        'pinterest',
        'snapchat',
        'github',
        'website',
        'whatsapp',
        'other'
      ),
    handle: Joi.string().trim().max(100).allow(''),
    displayName: Joi.string().trim().max(100).allow(''),
    originalUrl: Joi.string().uri().trim().max(500),
    displayUrl: Joi.string().trim().max(200).allow(''),
    metadata: Joi.object({
      title: Joi.string().trim().max(200).allow(''),
      description: Joi.string().trim().max(500).allow(''),
      thumbnailUrl: Joi.string().uri().trim().max(500).allow(''),
      followerCount: Joi.number().min(0),
      postCount: Joi.number().min(0),
      isVerified: Joi.boolean()
    }),
    embedSettings: Joi.object({
      showHeader: Joi.boolean(),
      showCaption: Joi.boolean(),
      maxPosts: Joi.number().min(1).max(50),
      layout: Joi.string().valid('grid', 'carousel', 'list')
    }),
    status: Joi.string().valid('active', 'broken', 'pending_verification'),
    isPublic: Joi.boolean(),
    displayOrder: Joi.number().min(0)
  });

  return schema.validate(data, { allowUnknown: false, stripUnknown: true });
};

// Validate social media link search/filter
exports.validateSearchSocialMediaLinks = (data) => {
  const schema = Joi.object({
    businessId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(''),
    platform: Joi.string()
      .valid(
        'instagram',
        'tiktok',
        'facebook',
        'twitter',
        'linkedin',
        'youtube',
        'pinterest',
        'snapchat',
        'github',
        'website',
        'whatsapp',
        'other'
      )
      .allow(''),
    status: Joi.string().valid('active', 'broken', 'pending_verification').allow(''),
    isPublic: Joi.boolean().allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    sortBy: Joi.string()
      .valid('createdAt', 'updatedAt', 'displayOrder', 'clicks', 'platform')
      .default('displayOrder'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  });

  return schema.validate(data);
};

// Validate bulk update display order
exports.validateBulkUpdateOrder = (data) => {
  const schema = Joi.object({
    links: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
          displayOrder: Joi.number().min(0).required()
        })
      )
      .min(1)
      .max(50)
      .required()
  });

  return schema.validate(data);
};

// Validate embed settings update
exports.validateEmbedSettings = (data) => {
  const schema = Joi.object({
    showHeader: Joi.boolean().required(),
    showCaption: Joi.boolean().required(),
    maxPosts: Joi.number().min(1).max(50).required(),
    layout: Joi.string().valid('grid', 'carousel', 'list').required()
  });

  return schema.validate(data);
};

// Validate metadata update
exports.validateMetadataUpdate = (data) => {
  const schema = Joi.object({
    title: Joi.string().trim().max(200).allow(''),
    description: Joi.string().trim().max(500).allow(''),
    thumbnailUrl: Joi.string().uri().trim().max(500).allow(''),
    followerCount: Joi.number().min(0),
    postCount: Joi.number().min(0),
    isVerified: Joi.boolean()
  });

  return schema.validate(data);
};

// Validate URL for platform compatibility
exports.validatePlatformUrl = (platform, url) => {
  const platformPatterns = {
    instagram: /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/,
    tiktok: /^https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+\/?$/,
    facebook: /^https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9_.]+\/?$/,
    twitter: /^https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+\/?$/,
    linkedin: /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9-]+\/?$/,
    youtube: /^https?:\/\/(www\.)?youtube\.com\/(c\/|channel\/|user\/|@)?[a-zA-Z0-9_-]+\/?$/,
    pinterest: /^https?:\/\/(www\.)?pinterest\.com\/[a-zA-Z0-9_]+\/?$/,
    snapchat: /^https?:\/\/(www\.)?snapchat\.com\/add\/[a-zA-Z0-9_.]+\/?$/,
    github: /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/,
    whatsapp: /^https?:\/\/(wa\.me\/|whatsapp\.com\/send\?phone=)\d+/,
    website: /^https?:\/\/.+/,
    other: /^https?:\/\/.+/
  };

  const pattern = platformPatterns[platform];
  if (!pattern) {
    return { isValid: false, message: 'Invalid platform' };
  }

  const isValid = pattern.test(url);
  return {
    isValid,
    message: isValid ? 'Valid URL' : `Invalid ${platform} URL format`
  };
};

// Validate social media link ID
exports.validateSocialMediaLinkId = (data) => {
  const schema = Joi.object({
    id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  });

  return schema.validate(data);
}; 