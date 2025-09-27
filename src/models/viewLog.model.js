const mongoose = require('mongoose');

const viewLogSchema = new mongoose.Schema(
  {
    // Target business or entity being viewed
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    targetType: {
      type: String,
      enum: ['business', 'profile', 'socialMedia', 'favorite', 'other'],
      required: true
    },
    
    // Viewer information
    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
      // Can be null for anonymous views
    },
    viewerType: {
      type: String,
      enum: ['authenticated', 'anonymous'],
      default: 'anonymous'
    },
    
    // Session and interaction data
    sessionId: {
      type: String,
      required: true
    },
    interactionType: {
      type: String,
      enum: ['view', 'click', 'share', 'favorite', 'contact', 'visit_website', 'call', 'email'],
      required: true
    },
    
    // Geographic data (KON-38)
    location: {
      country: {
        type: String
      },
      countryCode: {
        type: String,
        maxlength: 3
      },
      region: {
        type: String
      },
      city: {
        type: String
      },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: [Number] // [longitude, latitude]
      },
      ipAddress: {
        type: String
      },
      timezone: String,
      accuracy: {
        type: String,
        enum: ['country', 'region', 'city', 'precise'],
        default: 'city'
      }
    },
    
    // Device and technical information
    deviceInfo: {
      type: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop', 'other']
      },
      os: String,
      browser: String,
      screenResolution: String,
      userAgent: String
    },
    
    // Referral and source tracking (KON-39)
    referral: {
      source: {
        type: String,
        enum: ['direct', 'search', 'social', 'email', 'qr_code', 'referral', 'other'],
        default: 'direct'
      },
      medium: String,
      campaign: String,
      referrerUrl: String,
      searchQuery: String,
      utmSource: String,
      utmMedium: String,
      utmCampaign: String,
      utmContent: String,
      utmTerm: String
    },
    
    // Link and click tracking (KON-39)
    linkData: {
      linkType: {
        type: String,
        enum: ['social_media', 'website', 'phone', 'email', 'address', 'menu', 'booking', 'other']
      },
      linkUrl: String,
      linkText: String,
      linkPosition: String, // e.g., 'header', 'footer', 'main_content'
      socialPlatform: {
        type: String,
        enum: ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'other']
      },
      wasExternal: Boolean
    },
    
    // Timing information for peak hour analysis (KON-40)
    timing: {
      hour: {
        type: Number,
        min: 0,
        max: 23
      },
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6 // 0 = Sunday, 6 = Saturday
      },
      dayOfMonth: {
        type: Number,
        min: 1,
        max: 31
      },
      month: {
        type: Number,
        min: 1,
        max: 12
      },
      year: {
        type: Number
      },
      quarter: {
        type: Number,
        min: 1,
        max: 4
      },
      timezoneName: String,
      timezoneOffset: Number // minutes from UTC
    },
    
    // Performance and quality metrics
    metrics: {
      loadTime: Number, // milliseconds
      bounceRate: Boolean, // true if single page view
      timeOnPage: Number, // seconds
      scrollDepth: Number, // percentage
      engagementScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      }
    },
    
    // Additional metadata
    metadata: {
      pageTitle: String,
      pageUrl: String,
      previousPage: String,
      abTestVariant: String,
      customDimensions: [{
        key: String,
        value: String
      }],
      tags: [String]
    }
  },
  {
    timestamps: true
  }
);

// Create all indexes using schema.index() to avoid duplicates
viewLogSchema.index({ targetId: 1 });
viewLogSchema.index({ targetType: 1 });
viewLogSchema.index({ viewerId: 1 }, { sparse: true });
viewLogSchema.index({ viewerType: 1 });
viewLogSchema.index({ sessionId: 1 });
viewLogSchema.index({ interactionType: 1 });
viewLogSchema.index({ 'location.country': 1 });
viewLogSchema.index({ 'location.countryCode': 1 });
viewLogSchema.index({ 'location.region': 1 });
viewLogSchema.index({ 'location.city': 1 });
viewLogSchema.index({ 'location.ipAddress': 1 });
viewLogSchema.index({ 'deviceInfo.type': 1 });
viewLogSchema.index({ 'referral.source': 1 });
viewLogSchema.index({ 'linkData.linkType': 1 });
viewLogSchema.index({ 'timing.hour': 1 });
viewLogSchema.index({ 'timing.dayOfWeek': 1 });
viewLogSchema.index({ 'timing.dayOfMonth': 1 });
viewLogSchema.index({ 'timing.month': 1 });
viewLogSchema.index({ 'timing.year': 1 });
viewLogSchema.index({ 'timing.quarter': 1 });

// Compound indexes for better query performance
viewLogSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });
viewLogSchema.index({ targetId: 1, 'timing.hour': 1 });
viewLogSchema.index({ targetId: 1, 'timing.dayOfWeek': 1 });
viewLogSchema.index({ targetId: 1, 'location.country': 1 });
viewLogSchema.index({ targetId: 1, 'location.city': 1 });
viewLogSchema.index({ targetId: 1, 'linkData.linkType': 1 });
viewLogSchema.index({ targetId: 1, 'referral.source': 1 });
viewLogSchema.index({ targetId: 1, 'deviceInfo.type': 1 });
viewLogSchema.index({ sessionId: 1, createdAt: -1 });
viewLogSchema.index({ viewerId: 1, createdAt: -1 }, { sparse: true });

// Pre-save middleware to populate timing information
viewLogSchema.pre('save', function(next) {
  const date = this.createdAt || new Date();
  
  this.timing = {
    hour: date.getHours(),
    dayOfWeek: date.getDay(),
    dayOfMonth: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    quarter: Math.ceil((date.getMonth() + 1) / 3),
    timezoneName: 'UTC',
    timezoneOffset: date.getTimezoneOffset()
  };
  
  next();
});

// Static methods for analytics queries (KON-37 to KON-41)

/**
 * Get location analytics (KON-38)
 * @param {string} targetId - Target business/entity ID
 * @param {object} options - Query options
 * @returns {Promise<Array>} Location analytics data
 */
viewLogSchema.statics.getLocationAnalytics = function(targetId, options = {}) {
  const {
    targetType = 'business',
    startDate,
    endDate,
    groupBy = 'country',
    limit = 50
  } = options;

  const matchStage = {
    targetId: new mongoose.Types.ObjectId(targetId),
    targetType
  };

  // Add date filter if provided
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const groupField = groupBy === 'country' ? '$location.country' :
                    groupBy === 'region' ? '$location.region' :
                    groupBy === 'city' ? '$location.city' : '$location.country';

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupField,
        totalViews: { $sum: 1 },
        uniqueViewers: { $addToSet: '$viewerId' },
        totalInteractions: {
          $sum: {
            $cond: [{ $ne: ['$interactionType', 'view'] }, 1, 0]
          }
        },
        avgEngagementScore: { $avg: '$metrics.engagementScore' },
        countries: { $addToSet: '$location.country' },
        lastActivity: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        _id: 1,
        totalViews: 1,
        uniqueViewers: { $size: '$uniqueViewers' },
        totalInteractions: 1,
        engagementRate: {
          $round: [
            {
              $multiply: [
                { $divide: ['$totalInteractions', '$totalViews'] },
                100
              ]
            },
            2
          ]
        },
        avgEngagementScore: { $round: ['$avgEngagementScore', 2] },
        lastActivity: 1
      }
    },
    { $sort: { totalViews: -1 } },
    { $limit: limit }
  ]);
};

/**
 * Get link analytics (KON-39)
 * @param {string} targetId - Target business/entity ID
 * @param {object} options - Query options
 * @returns {Promise<Array>} Link analytics data
 */
viewLogSchema.statics.getLinkAnalytics = function(targetId, options = {}) {
  const {
    targetType = 'business',
    startDate,
    endDate,
    linkType,
    groupBy = 'linkType',
    limit = 20
  } = options;

  const matchStage = {
    targetId: new mongoose.Types.ObjectId(targetId),
    targetType,
    interactionType: 'click',
    linkData: { $exists: true }
  };

  // Add date filter if provided
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  // Add link type filter if provided
  if (linkType) {
    matchStage['linkData.linkType'] = linkType;
  }

  const groupField = groupBy === 'platform' ? '$linkData.socialPlatform' : '$linkData.linkType';

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupField,
        totalClicks: { $sum: 1 },
        uniqueClickers: { $addToSet: '$viewerId' },
        avgEngagementScore: { $avg: '$metrics.engagementScore' },
        uniqueUrls: { $addToSet: '$linkData.linkUrl' },
        linkPositions: { $addToSet: '$linkData.linkPosition' },
        lastClicked: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        _id: 1,
        totalClicks: 1,
        uniqueClickers: { $size: '$uniqueClickers' },
        avgEngagementScore: { $round: ['$avgEngagementScore', 2] },
        uniqueUrls: { $size: '$uniqueUrls' },
        linkPositions: 1,
        clickThroughRate: {
          $round: [
            {
              $multiply: [
                { $divide: [{ $size: '$uniqueClickers' }, '$totalClicks'] },
                100
              ]
            },
            2
          ]
        },
        lastClicked: 1
      }
    },
    { $sort: { totalClicks: -1 } },
    { $limit: limit }
  ]);
};

/**
 * Get peak hour analytics (KON-40)
 * @param {string} targetId - Target business/entity ID
 * @param {object} options - Query options
 * @returns {Promise<Array>} Peak hour analytics data
 */
viewLogSchema.statics.getPeakHourAnalytics = function(targetId, options = {}) {
  const {
    targetType = 'business',
    startDate,
    endDate,
    groupBy = 'hour',
    timezone = 'UTC'
  } = options;

  const matchStage = {
    targetId: new mongoose.Types.ObjectId(targetId),
    targetType
  };

  // Add date filter if provided
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  let groupField;
  switch (groupBy) {
    case 'dayOfWeek':
      groupField = '$timing.dayOfWeek';
      break;
    case 'hourOfWeek':
      groupField = {
        hour: '$timing.hour',
        dayOfWeek: '$timing.dayOfWeek'
      };
      break;
    default: // hour
      groupField = '$timing.hour';
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupField,
        totalViews: { $sum: 1 },
        uniqueViewers: { $addToSet: '$viewerId' },
        totalInteractions: {
          $sum: {
            $cond: [{ $ne: ['$interactionType', 'view'] }, 1, 0]
          }
        },
        avgEngagementScore: { $avg: '$metrics.engagementScore' },
        avgTimeOnPage: { $avg: '$metrics.timeOnPage' }
      }
    },
    {
      $project: {
        _id: 1,
        totalViews: 1,
        uniqueViewers: { $size: '$uniqueViewers' },
        totalInteractions: 1,
        engagementRate: {
          $round: [
            {
              $multiply: [
                { $divide: ['$totalInteractions', '$totalViews'] },
                100
              ]
            },
            2
          ]
        },
        avgEngagementScore: { $round: ['$avgEngagementScore', 2] },
        avgTimeOnPage: { $round: ['$avgTimeOnPage', 1] }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

/**
 * Get time-filtered analytics (KON-41)
 * @param {string} targetId - Target business/entity ID
 * @param {object} options - Query options
 * @returns {Promise<Array>} Time-filtered analytics data
 */
viewLogSchema.statics.getTimeFilteredAnalytics = function(targetId, options = {}) {
  const {
    targetType = 'business',
    timeframe = 'month',
    startDate,
    endDate,
    groupBy = 'day'
  } = options;

  const matchStage = {
    targetId: new mongoose.Types.ObjectId(targetId),
    targetType
  };

  // Calculate date range based on timeframe if custom dates not provided
  let calculatedStartDate = startDate;
  let calculatedEndDate = endDate;

  if (!startDate && !endDate) {
    const now = new Date();
    switch (timeframe) {
      case 'week':
        calculatedStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        calculatedStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        calculatedStartDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    calculatedEndDate = now;
  }

  if (calculatedStartDate || calculatedEndDate) {
    matchStage.createdAt = {};
    if (calculatedStartDate) matchStage.createdAt.$gte = new Date(calculatedStartDate);
    if (calculatedEndDate) matchStage.createdAt.$lte = new Date(calculatedEndDate);
  }

  // Define grouping based on granularity
  let groupId;
  switch (groupBy) {
    case 'hour':
      groupId = {
        year: '$timing.year',
        month: '$timing.month',
        day: '$timing.dayOfMonth',
        hour: '$timing.hour'
      };
      break;
    case 'week':
      groupId = {
        year: '$timing.year',
        week: { $week: '$createdAt' }
      };
      break;
    case 'month':
      groupId = {
        year: '$timing.year',
        month: '$timing.month'
      };
      break;
    default: // day
      groupId = {
        year: '$timing.year',
        month: '$timing.month',
        day: '$timing.dayOfMonth'
      };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupId,
        totalViews: { $sum: 1 },
        uniqueViewers: { $addToSet: '$viewerId' },
        totalInteractions: {
          $sum: {
            $cond: [{ $ne: ['$interactionType', 'view'] }, 1, 0]
          }
        },
        avgEngagementScore: { $avg: '$metrics.engagementScore' },
        avgTimeOnPage: { $avg: '$metrics.timeOnPage' },
        bounces: {
          $sum: {
            $cond: ['$metrics.bounceRate', 1, 0]
          }
        },
        totalSessions: { $addToSet: '$sessionId' }
      }
    },
    {
      $project: {
        _id: 1,
        totalViews: 1,
        uniqueViewers: { $size: '$uniqueViewers' },
        totalInteractions: 1,
        avgEngagementScore: { $round: ['$avgEngagementScore', 2] },
        avgTimeOnPage: { $round: ['$avgTimeOnPage', 1] },
        bounceRate: {
          $round: [
            {
              $multiply: [
                { $divide: ['$bounces', '$totalViews'] },
                100
              ]
            },
            2
          ]
        },
        totalSessions: { $size: '$totalSessions' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
  ]);
};

/**
 * Get comprehensive analytics overview
 * @param {string} targetId - Target business/entity ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Comprehensive analytics data
 */
viewLogSchema.statics.getAnalyticsOverview = function(targetId, options = {}) {
  const {
    targetType = 'business',
    startDate,
    endDate
  } = options;

  const matchStage = {
    targetId: new mongoose.Types.ObjectId(targetId),
    targetType
  };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalViews: { $sum: 1 },
        uniqueViewers: { $addToSet: '$viewerId' },
        uniqueSessions: { $addToSet: '$sessionId' },
        totalInteractions: {
          $sum: {
            $cond: [{ $ne: ['$interactionType', 'view'] }, 1, 0]
          }
        },
        avgEngagementScore: { $avg: '$metrics.engagementScore' },
        avgTimeOnPage: { $avg: '$metrics.timeOnPage' },
        totalBounces: {
          $sum: {
            $cond: ['$metrics.bounceRate', 1, 0]
          }
        },
        topCountries: { $push: '$location.country' },
        topDevices: { $push: '$deviceInfo.type' },
        topSources: { $push: '$referral.source' }
      }
    },
    {
      $project: {
        _id: 0,
        totalViews: 1,
        uniqueViewers: { $size: '$uniqueViewers' },
        uniqueSessions: { $size: '$uniqueSessions' },
        totalInteractions: 1,
        avgEngagementScore: { $round: ['$avgEngagementScore', 2] },
        avgTimeOnPage: { $round: ['$avgTimeOnPage', 1] },
        bounceRate: {
          $round: [
            {
              $multiply: [
                { $divide: ['$totalBounces', '$totalViews'] },
                100
              ]
            },
            2
          ]
        },
        interactionRate: {
          $round: [
            {
              $multiply: [
                { $divide: ['$totalInteractions', '$totalViews'] },
                100
              ]
            },
            2
          ]
        }
      }
    }
  ]).then(results => results[0] || {
    totalViews: 0,
    uniqueViewers: 0,
    uniqueSessions: 0,
    totalInteractions: 0,
    avgEngagementScore: 0,
    avgTimeOnPage: 0,
    bounceRate: 0,
    interactionRate: 0
  });
};

const ViewLog = mongoose.model('ViewLog', viewLogSchema);

module.exports = ViewLog; 