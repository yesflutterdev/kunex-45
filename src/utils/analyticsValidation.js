const Joi = require('joi');

// Validate location analytics query parameters
exports.validateLocationAnalytics = (data) => {
  const schema = Joi.object({
    targetId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    targetType: Joi.string().valid('business', 'profile', 'socialMedia', 'favorite', 'other').default('business'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    groupBy: Joi.string().valid('country', 'region', 'city').default('country'),
    limit: Joi.number().integer().min(1).max(100).default(50)
  });

  return schema.validate(data);
};

// Validate link analytics query parameters
exports.validateLinkAnalytics = (data) => {
  const schema = Joi.object({
    targetId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    targetType: Joi.string().valid('business', 'profile', 'socialMedia', 'favorite', 'other').default('business'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    linkType: Joi.string().valid('social_media', 'website', 'phone', 'email', 'address', 'menu', 'booking', 'other'),
    groupBy: Joi.string().valid('linkType', 'platform').default('linkType'),
    limit: Joi.number().integer().min(1).max(50).default(20)
  });

  return schema.validate(data);
};

// Validate peak hour analytics query parameters
exports.validatePeakHourAnalytics = (data) => {
  const schema = Joi.object({
    targetId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    targetType: Joi.string().valid('business', 'profile', 'socialMedia', 'favorite', 'other').default('business'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    groupBy: Joi.string().valid('hour', 'dayOfWeek', 'hourOfWeek').default('hour'),
    timezone: Joi.string().default('UTC')
  });

  return schema.validate(data);
};

// Validate time-filtered analytics query parameters
exports.validateTimeFilteredAnalytics = (data) => {
  const schema = Joi.object({
    targetId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    targetType: Joi.string().valid('business', 'profile', 'socialMedia', 'favorite', 'other').default('business'),
    timeframe: Joi.string().valid('week', 'month', 'year').default('month'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    groupBy: Joi.string().valid('hour', 'day', 'week', 'month').default('day')
  });

  return schema.validate(data);
};

// Validate view log creation data
exports.validateViewLogCreation = (data) => {
  const schema = Joi.object({
    targetId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    targetType: Joi.string().valid('business', 'profile', 'socialMedia', 'favorite', 'other').required(),
    viewerId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    viewerType: Joi.string().valid('authenticated', 'anonymous').default('anonymous'),
    sessionId: Joi.string().required(),
    interactionType: Joi.string().valid('view', 'click', 'share', 'favorite', 'contact', 'visit_website', 'call', 'email').required(),
    
    // Location data
    location: Joi.object({
      country: Joi.string().max(100),
      countryCode: Joi.string().max(3),
      region: Joi.string().max(100),
      city: Joi.string().max(100),
      coordinates: Joi.object({
        type: Joi.string().valid('Point').default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2)
      }),
      ipAddress: Joi.string().ip(),
      timezone: Joi.string(),
      accuracy: Joi.string().valid('country', 'region', 'city', 'precise').default('city')
    }),
    
    // Device information
    deviceInfo: Joi.object({
      type: Joi.string().valid('mobile', 'tablet', 'desktop', 'other'),
      os: Joi.string().max(50),
      browser: Joi.string().max(50),
      screenResolution: Joi.string().max(20),
      userAgent: Joi.string().max(500)
    }),
    
    // Referral data
    referral: Joi.object({
      source: Joi.string().valid('direct', 'search', 'social', 'email', 'qr_code', 'referral', 'other').default('direct'),
      medium: Joi.string().max(50),
      campaign: Joi.string().max(100),
      referrerUrl: Joi.string().uri(),
      searchQuery: Joi.string().max(200),
      utmSource: Joi.string().max(50),
      utmMedium: Joi.string().max(50),
      utmCampaign: Joi.string().max(100),
      utmContent: Joi.string().max(100),
      utmTerm: Joi.string().max(100)
    }),
    
    // Link data (for click events)
    linkData: Joi.object({
      linkType: Joi.string().valid('social_media', 'website', 'phone', 'email', 'address', 'menu', 'booking', 'other'),
      linkUrl: Joi.string().uri(),
      linkText: Joi.string().max(200),
      linkPosition: Joi.string().max(50),
      socialPlatform: Joi.string().valid('instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'other'),
      wasExternal: Joi.boolean()
    }),
    
    // Performance metrics
    metrics: Joi.object({
      loadTime: Joi.number().integer().min(0).max(60000), // max 60 seconds
      bounceRate: Joi.boolean(),
      timeOnPage: Joi.number().min(0).max(7200), // max 2 hours
      scrollDepth: Joi.number().min(0).max(100),
      engagementScore: Joi.number().min(0).max(100).default(0)
    }),
    
    // Additional metadata
    metadata: Joi.object({
      pageTitle: Joi.string().max(200),
      pageUrl: Joi.string().uri(),
      previousPage: Joi.string().uri(),
      abTestVariant: Joi.string().max(50),
      customDimensions: Joi.array().items(
        Joi.object({
          key: Joi.string().max(50),
          value: Joi.string().max(200)
        })
      ).max(10),
      tags: Joi.array().items(Joi.string().max(50)).max(20)
    })
  });

  return schema.validate(data);
};

// Validate analytics dashboard query
exports.validateAnalyticsDashboard = (data) => {
  const schema = Joi.object({
    targetId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    targetType: Joi.string().valid('business', 'profile', 'socialMedia', 'favorite', 'other').default('business'),
    timeframe: Joi.string().valid('today', 'week', 'month', 'quarter', 'year', 'custom').default('month'),
    startDate: Joi.date().iso().when('timeframe', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    endDate: Joi.date().iso().when('timeframe', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    includeLocation: Joi.boolean().default(true),
    includeDevices: Joi.boolean().default(true),
    includeReferrals: Joi.boolean().default(true),
    includePeakHours: Joi.boolean().default(true),
    includeLinks: Joi.boolean().default(true),
    groupBy: Joi.string().valid('hour', 'day', 'week', 'month').default('day')
  });

  return schema.validate(data);
};

// Validate bulk analytics data
exports.validateBulkAnalytics = (data) => {
  const schema = Joi.object({
    logs: Joi.array().items(
      Joi.object({
        targetId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
        targetType: Joi.string().valid('business', 'profile', 'socialMedia', 'favorite', 'other').required(),
        interactionType: Joi.string().valid('view', 'click', 'share', 'favorite', 'contact', 'visit_website', 'call', 'email').required(),
        timestamp: Joi.date().iso().default(Date.now),
        // Simplified schema for bulk operations
        deviceType: Joi.string().valid('mobile', 'tablet', 'desktop', 'other'),
        country: Joi.string(),
        source: Joi.string(),
        engagementScore: Joi.number().min(0).max(100)
      })
    ).min(1).max(1000) // Allow up to 1000 logs in one request
  });

  return schema.validate(data);
};

// Validate export analytics query
exports.validateExportAnalytics = (data) => {
  const schema = Joi.object({
    targetId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    targetType: Joi.string().valid('business', 'profile', 'socialMedia', 'favorite', 'other').default('business'),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().required().min(Joi.ref('startDate')),
    format: Joi.string().valid('json', 'csv', 'xlsx').default('json'),
    includeRawData: Joi.boolean().default(false),
    groupBy: Joi.string().valid('hour', 'day', 'week', 'month').default('day'),
    metrics: Joi.array().items(
      Joi.string().valid('views', 'clicks', 'engagement', 'locations', 'devices', 'referrals', 'peakHours')
    ).default(['views', 'clicks', 'engagement'])
  });

  return schema.validate(data);
};

// Validate real-time analytics query
exports.validateRealTimeAnalytics = (data) => {
  const schema = Joi.object({
    targetId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    targetType: Joi.string().valid('business', 'profile', 'socialMedia', 'favorite', 'other').default('business'),
    minutes: Joi.number().integer().min(5).max(1440).default(30), // 5 minutes to 24 hours
    includeActiveUsers: Joi.boolean().default(true),
    includePageViews: Joi.boolean().default(true),
    includeInteractions: Joi.boolean().default(true),
    includeTopPages: Joi.boolean().default(false),
    includeTopCountries: Joi.boolean().default(false)
  });

  return schema.validate(data);
};

// Validate comparison analytics query
exports.validateComparisonAnalytics = (data) => {
  const schema = Joi.object({
    targetIds: Joi.array().items(
      Joi.string().regex(/^[0-9a-fA-F]{24}$/)
    ).min(2).max(5).required(), // Compare 2-5 entities
    targetType: Joi.string().valid('business', 'profile', 'socialMedia', 'favorite', 'other').default('business'),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().required().min(Joi.ref('startDate')),
    metrics: Joi.array().items(
      Joi.string().valid('views', 'clicks', 'engagement', 'uniqueUsers', 'bounceRate', 'avgTimeOnPage')
    ).default(['views', 'clicks', 'engagement']),
    groupBy: Joi.string().valid('day', 'week', 'month').default('day')
  });

  return schema.validate(data);
};

// Validate funnel analytics query
exports.validateFunnelAnalytics = (data) => {
  const schema = Joi.object({
    targetId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    targetType: Joi.string().valid('business', 'profile', 'socialMedia', 'favorite', 'other').default('business'),
    steps: Joi.array().items(
      Joi.object({
        name: Joi.string().required().max(100),
        condition: Joi.object({
          interactionType: Joi.string().valid('view', 'click', 'share', 'favorite', 'contact', 'visit_website', 'call', 'email'),
          linkType: Joi.string(),
          timeOnPage: Joi.number(),
          scrollDepth: Joi.number()
        })
      })
    ).min(2).max(10).required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().required().min(Joi.ref('startDate')),
    groupBy: Joi.string().valid('day', 'week', 'month').default('day')
  });

  return schema.validate(data);
};

module.exports = exports; 