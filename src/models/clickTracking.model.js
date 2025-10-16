const mongoose = require('mongoose');

const clickTrackingSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  targetId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  targetType: { 
    type: String, 
    enum: ['builderPage', 'customLink', 'view'],
    required: true 
  },
  targetOwnerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  targetUrl: String, // kunex.app/musefest
  targetTitle: String, // "2023 Official Muse Fest Recap"
  targetThumbnail: String, // Image URL for thumbnails
  
  // Location coordinates only
  longitude: { 
    type: Number, 
    required: true 
  },
  latitude: { 
    type: Number, 
    required: true 
  },
  
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  isUnique: { 
    type: Boolean, 
    default: true 
  },
  sessionId: String,
  userAgent: String,
  referrer: String
}, {
  timestamps: true
});

// Indexes for performance
clickTrackingSchema.index({ userId: 1, targetId: 1, targetType: 1 });
clickTrackingSchema.index({ targetOwnerId: 1, timestamp: -1 });
clickTrackingSchema.index({ timestamp: -1 });
clickTrackingSchema.index({ longitude: 1, latitude: 1 });

// Static method to get click analytics for a target
clickTrackingSchema.statics.getClickAnalytics = function(targetId, targetType, options = {}) {
  const {
    startDate,
    endDate,
    groupBy = 'city',
    limit = 50
  } = options;

  const matchStage = {
    targetId: new mongoose.Types.ObjectId(targetId),
    targetType: targetType
  };

  // Add date filter if provided
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = new Date(startDate);
    if (endDate) matchStage.timestamp.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          longitude: "$longitude",
          latitude: "$latitude"
        },
        clicks: { $sum: 1 },
        uniqueUsers: { $addToSet: "$userId" },
        lastClick: { $max: "$timestamp" }
      }
    },
    {
      $project: {
        _id: 1,
        clicks: 1,
        uniqueClicks: { $size: "$uniqueUsers" },
        lastClick: 1
      }
    },
    { $sort: { clicks: -1 } },
    { $limit: limit }
  ]);
};

// Static method to get user's click history
clickTrackingSchema.statics.getUserClickHistory = function(userId, options = {}) {
  const {
    startDate,
    endDate,
    targetType,
    limit = 50
  } = options;

  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId)
  };

  // Add date filter if provided
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = new Date(startDate);
    if (endDate) matchStage.timestamp.$lte = new Date(endDate);
  }

  // Add target type filter if provided
  if (targetType) {
    matchStage.targetType = targetType;
  }

  return this.find(matchStage)
    .populate('targetOwnerId', 'firstName lastName businessName')
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get top performing links (based on your Figma)
clickTrackingSchema.statics.getTopPerformingLinks = function(ownerId, options = {}) {
  const {
    startDate,
    endDate,
    period = '30d',
    limit = 10
  } = options;

  const matchStage = {
    targetOwnerId: new mongoose.Types.ObjectId(ownerId)
  };

  // Add date filter
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = new Date(startDate);
    if (endDate) matchStage.timestamp.$lte = new Date(endDate);
  } else {
    // For testing, use a wider date range to include sample data
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    matchStage.timestamp = { $gte: oneYearAgo };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          targetId: '$targetId',
          targetType: '$targetType',
          targetUrl: '$targetUrl',
          targetTitle: '$targetTitle',
          targetThumbnail: '$targetThumbnail'
        },
        clicks: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        lastClick: { $max: '$timestamp' }
      }
    },
    {
      $project: {
        targetId: '$_id.targetId',
        targetType: '$_id.targetType',
        targetUrl: '$_id.targetUrl',
        targetTitle: '$_id.targetTitle',
        targetThumbnail: '$_id.targetThumbnail',
        clicks: 1,
        uniqueClicks: { $size: '$uniqueUsers' },
        lastClick: 1,
        period: period,
        _id: 0
      }
    },
    { $sort: { clicks: -1 } },
    { $limit: limit }
  ]);
};

// Static method to get content performance (based on your Figma)
clickTrackingSchema.statics.getContentPerformance = function(targetId, targetType, options = {}) {
  const {
    startDate,
    endDate,
    period = '30d'
  } = options;

  const matchStage = {
    targetId: new mongoose.Types.ObjectId(targetId),
    targetType: targetType
  };

  // Add date filter
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = new Date(startDate);
    if (endDate) matchStage.timestamp.$lte = new Date(endDate);
  } else {
    // For testing, use a wider date range to include sample data
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    matchStage.timestamp = { $gte: oneYearAgo };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalClicks: { $sum: 1 },
        uniqueClicks: { $addToSet: '$userId' },
        targetUrl: { $first: '$targetUrl' },
        targetTitle: { $first: '$targetTitle' },
        targetThumbnail: { $first: '$targetThumbnail' }
      }
    },
    {
      $project: {
        targetUrl: 1,
        targetTitle: 1,
        targetThumbnail: 1,
        clicks: '$totalClicks',
        uniqueClicks: { $size: '$uniqueClicks' },
        period: period,
        _id: 0
      }
    }
  ]);
};

module.exports = mongoose.model('ClickTracking', clickTrackingSchema);
