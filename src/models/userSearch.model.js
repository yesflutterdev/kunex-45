const mongoose = require('mongoose');

const userSearchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    searchTerm: {
      type: String,
      trim: true,
      maxlength: 200
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200
    },
    coordinates: {
      longitude: {
        type: Number,
        min: -180,
        max: 180
      },
      latitude: {
        type: Number,
        min: -90,
        max: 90
      }
    },
    filters: {
      priceRange: {
        type: [String],
        enum: ['$', '$$', '$$$', '$$$$']
      },
      businessType: {
        type: String,
        enum: [
          'Small business',
          'Medium sized business',
          'Franchise',
          'Corporation',
          'Non profit organizations',
          'Startup',
          'Online business',
          'Others'
        ]
      },
      features: [{
        type: String,
        trim: true,
        maxlength: 100
      }],
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      openedStatus: {
        type: String,
        enum: ['open', 'closed', 'any'],
        default: 'any'
      },
      maxDistance: {
        type: Number,
        min: 100,
        max: 200000
      }
    },
    sortBy: {
      type: String,
      enum: [
        'relevance',
        'distance',
        'rating',
        'popularity',
        'newest',
        'alphabetical'
      ],
      default: 'relevance'
    },
    resultCount: {
      type: Number,
      min: 0,
      default: 0
    },
    searchType: {
      type: String,
      enum: ['nearby', 'top-picks', 'on-the-rise', 'general', 'text-search'],
      default: 'general'
    },
    metadata: {
      deviceType: String,
      userAgent: String,
      ipAddress: String,
      sessionId: String
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
userSearchSchema.index({ userId: 1 });
userSearchSchema.index({ userId: 1, createdAt: -1 });
userSearchSchema.index({ searchTerm: 'text', category: 'text' });
userSearchSchema.index({ createdAt: -1 });
userSearchSchema.index({ userId: 1, searchType: 1 });

// Static method to get recent searches for a user
userSearchSchema.statics.getRecentSearches = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get popular searches
userSearchSchema.statics.getPopularSearches = function(timeframe = 'day', limit = 10) {
  const timeframeMap = {
    hour: 1,
    day: 24,
    week: 24 * 7,
    month: 24 * 30
  };

  const hoursBack = timeframeMap[timeframe] || 24;
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hoursBack);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        searchTerm: { $exists: true, $ne: '' }
      }
    },
    {
      $group: {
        _id: '$searchTerm',
        count: { $sum: 1 },
        lastSearched: { $max: '$createdAt' },
        avgResultCount: { $avg: '$resultCount' }
      }
    },
    {
      $sort: { count: -1, lastSearched: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        searchTerm: '$_id',
        count: 1,
        lastSearched: 1,
        avgResultCount: { $round: ['$avgResultCount', 0] },
        _id: 0
      }
    }
  ]);
};

// Static method to get trending categories
userSearchSchema.statics.getTrendingCategories = function(timeframe = 'day', limit = 10) {
  const timeframeMap = {
    hour: 1,
    day: 24,
    week: 24 * 7,
    month: 24 * 30
  };

  const hoursBack = timeframeMap[timeframe] || 24;
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hoursBack);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        category: { $exists: true, $ne: '' }
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        lastSearched: { $max: '$createdAt' },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $sort: { count: -1, uniqueUserCount: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        category: '$_id',
        count: 1,
        lastSearched: 1,
        uniqueUserCount: 1,
        _id: 0
      }
    }
  ]);
};

// Instance method to create search summary
userSearchSchema.methods.getSummary = function() {
  const summary = {
    id: this._id,
    searchTerm: this.searchTerm,
    category: this.category,
    location: this.location,
    timestamp: this.createdAt,
    resultCount: this.resultCount,
    searchType: this.searchType
  };

  // Add filters if they exist
  if (this.filters) {
    if (this.filters.priceRange && this.filters.priceRange.length > 0) {
      summary.priceRange = this.filters.priceRange;
    }
    if (this.filters.businessType) {
      summary.businessType = this.filters.businessType;
    }
    if (this.filters.rating) {
      summary.rating = this.filters.rating;
    }
    if (this.filters.features && this.filters.features.length > 0) {
      summary.features = this.filters.features;
    }
  }

  // Add coordinates if they exist
  if (this.coordinates && this.coordinates.longitude && this.coordinates.latitude) {
    summary.coordinates = this.coordinates;
  }

  return summary;
};

// Pre-save middleware to clean up old searches (keep only last 50 per user)
userSearchSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const searchCount = await this.constructor.countDocuments({ userId: this.userId });
      
      if (searchCount >= 50) {
        // Remove oldest searches, keeping only the 49 most recent
        const oldSearches = await this.constructor.find({ userId: this.userId })
          .sort({ createdAt: -1 })
          .skip(49)
          .select('_id');
        
        const idsToDelete = oldSearches.map(search => search._id);
        await this.constructor.deleteMany({ _id: { $in: idsToDelete } });
      }
    } catch (error) {
      console.error('Error cleaning up old searches:', error);
    }
  }
  next();
});

const UserSearch = mongoose.model('UserSearch', userSearchSchema);

module.exports = UserSearch; 