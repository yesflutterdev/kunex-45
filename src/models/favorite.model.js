const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['Page', 'Product', 'Promotion', 'Event', 'BusinessProfile'],
      required: true
    },
    widgetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Widget',
      required: true
    },
    productId: {
      type: String, // For individual products within a products widget
      required: function() {
        return this.type === 'Product';
      }
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      required: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    visitCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastVisited: Date,
    isPrivate: {
      type: Boolean,
      default: false
    },
    metadata: {
      addedFrom: {
        type: String,
        enum: ['search', 'explore', 'profile', 'recommendation', 'share', 'other'],
        default: 'other'
      },
      deviceType: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop', 'other'],
        default: 'other'
      },
      location: {
        latitude: Number,
        longitude: Number,
        address: String
      },
      reminderDate: Date,
      reminderNote: String
    },
    analytics: {
      viewCount: {
        type: Number,
        default: 0
      },
      shareCount: {
        type: Number,
        default: 0
      },
      clickCount: {
        type: Number,
        default: 0
      },
      lastInteraction: {
        type: Date,
        default: Date.now
      }
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for better query performance
favoriteSchema.index({ userId: 1 });
favoriteSchema.index({ widgetId: 1 });
favoriteSchema.index({ folderId: 1 });
favoriteSchema.index({ userId: 1, type: 1 });
favoriteSchema.index({ userId: 1, widgetId: 1, productId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, folderId: 1 });
favoriteSchema.index({ userId: 1, createdAt: -1 });
favoriteSchema.index({ userId: 1, rating: -1 });
favoriteSchema.index({ userId: 1, visitCount: -1 });
favoriteSchema.index({ tags: 1 });
favoriteSchema.index({ 'metadata.reminderDate': 1 });

// Text index for search functionality
favoriteSchema.index({ 
  notes: 'text', 
  tags: 'text' 
});

// Static method to get user's favorites grouped by type
favoriteSchema.statics.getUserFavoritesByType = async function(userId, options = {}) {
  const {
    folderId,
    tags,
    rating,
    sortBy = 'created',
    sortOrder = 'desc',
    limit = 20,
    page = 1,
    search
  } = options;

  const query = { userId };
  
  if (folderId) {
    query.folderId = folderId;
  }
  
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }
  
  if (rating) {
    query.rating = { $gte: rating };
  }

  if (search) {
    query.$text = { $search: search };
  }

  const sortOptions = {};
  const sortDirection = sortOrder === 'desc' ? -1 : 1;
  
  switch (sortBy) {
    case 'name':
      // Will be handled in populate
      break;
    case 'rating':
      sortOptions.rating = sortDirection;
      break;
    case 'visits':
      sortOptions.visitCount = sortDirection;
      break;
    case 'lastVisited':
      sortOptions.lastVisited = sortDirection;
      break;
    case 'updated':
      sortOptions.updatedAt = sortDirection;
      break;
    default:
      sortOptions.createdAt = sortDirection;
  }

  const skip = (page - 1) * limit;

  const favorites = await this.find(query)
    .populate({
      path: 'folderId',
      select: 'name color icon'
    })
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .lean();

  // Populate content data based on type
  for (let favorite of favorites) {
    if (favorite.type === 'Page') {
      const page = await mongoose.model('BuilderPage').findById(favorite.widgetId).lean();
      if (page) {
        favorite.pageData = {
          _id: page._id,
          title: page.title,
          slug: page.slug,
          description: page.description,
          pageType: page.pageType,
          logo: page.logo,
          cover: page.cover,
          isPublished: page.settings.isPublished
        };
      }
    } else {
      const widget = await mongoose.model('Widget').findById(favorite.widgetId).lean();
      if (widget) {
        if (favorite.type === 'Product' && favorite.productId) {
          // Find the specific product within the products array
          const products = widget.settings?.specific?.products || [];
          const specificProduct = products.find(p => p._id?.toString() === favorite.productId);
          
          if (specificProduct) {
            favorite.productData = {
              _id: favorite.productId,
              productName: specificProduct.productName,
              productImage: specificProduct.productImage,
              price: specificProduct.price,
              currency: specificProduct.currency,
              productUrl: specificProduct.productUrl,
              widgetId: widget._id,
              widgetName: widget.name,
              widgetType: widget.type
            };
          }
        } else {
          // For other types (Promotion, Event) or Product without specific productId
          favorite.widgetData = {
            _id: widget._id,
            name: widget.name,
            type: widget.type,
            settings: widget.settings,
            layout: widget.layout,
            status: widget.status
          };
        }
      }
    }
  }

  return favorites;
};

// Static method to get favorites grouped by type for the main favorites view
favoriteSchema.statics.getFavoritesGroupedByType = async function(userId, options = {}) {
  const {
    folderId,
    tags,
    rating,
    search
  } = options;

  const query = { userId };
  
  if (folderId) {
    query.folderId = folderId;
  }
  
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }
  
  if (rating) {
    query.rating = { $gte: rating };
  }

  if (search) {
    query.$text = { $search: search };
  }

  // Get all favorites first
  const favorites = await this.find(query)
    .populate({
      path: 'folderId',
      select: 'name color icon'
    })
    .lean();

  // Group by type and populate content data
  const groupedFavorites = {
    pages: [],
    products: [],
    promotions: [],
    events: []
  };

  for (const favorite of favorites) {
    let contentData = null;
    
    if (favorite.type === 'Page') {
      const page = await mongoose.model('BuilderPage').findById(favorite.widgetId).lean();
      if (page) {
        contentData = {
          _id: page._id,
          title: page.title,
          slug: page.slug,
          description: page.description,
          pageType: page.pageType,
          logo: page.logo,
          cover: page.cover,
          isPublished: page.settings.isPublished
        };
      }
    } else {
      const widget = await mongoose.model('Widget').findById(favorite.widgetId).lean();
      if (widget) {
        if (favorite.type === 'Product' && favorite.productId) {
          // Find the specific product within the products array
          const products = widget.settings?.specific?.products || [];
          const specificProduct = products.find(p => p._id?.toString() === favorite.productId);
          
          if (specificProduct) {
            contentData = {
              _id: favorite.productId,
              productName: specificProduct.productName,
              productImage: specificProduct.productImage,
              price: specificProduct.price,
              currency: specificProduct.currency,
              productUrl: specificProduct.productUrl,
              widgetId: widget._id,
              widgetName: widget.name,
              widgetType: widget.type
            };
          }
        } else {
          // For other types (Promotion, Event) or Product without specific productId
          contentData = {
            _id: widget._id,
            name: widget.name,
            type: widget.type,
            settings: widget.settings,
            layout: widget.layout,
            status: widget.status
          };
        }
      }
    }

    if (contentData) {
      const favoriteData = {
        _id: favorite._id,
        widgetId: favorite.widgetId,
        content: contentData,
        folderId: favorite.folderId,
        folder: favorite.folderId,
        notes: favorite.notes,
        tags: favorite.tags,
        rating: favorite.rating,
        visitCount: favorite.visitCount,
        lastVisited: favorite.lastVisited,
        isPrivate: favorite.isPrivate,
        metadata: favorite.metadata,
        analytics: favorite.analytics,
        createdAt: favorite.createdAt,
        updatedAt: favorite.updatedAt
      };

      // Add to appropriate group
      const typeKey = favorite.type.toLowerCase() + 's';
      if (groupedFavorites.hasOwnProperty(typeKey)) {
        groupedFavorites[typeKey].push(favoriteData);
      }
    }
  }

  return Object.entries(groupedFavorites).map(([type, favorites]) => ({
    _id: type.slice(0, -1), // Remove 's' from end
    favorites,
    count: favorites.length
  }));
};

// Static method to get favorites count by folder
favoriteSchema.statics.getFavoriteCountsByFolder = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$folderId',
        count: { $sum: 1 },
        lastAdded: { $max: '$createdAt' }
      }
    },
    {
      $lookup: {
        from: 'folders',
        localField: '_id',
        foreignField: '_id',
        as: 'folder'
      }
    },
    {
      $unwind: '$folder'
    },
    {
      $project: {
        folderId: '$_id',
        folderName: '$folder.name',
        folderColor: '$folder.color',
        folderIcon: '$folder.icon',
        count: 1,
        lastAdded: 1
      }
    },
    {
      $sort: { 'folder.sortOrder': 1, 'folder.createdAt': 1 }
    }
  ]);
};

// Static method to get popular tags for user
favoriteSchema.statics.getPopularTags = function(userId, limit = 20) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 },
        lastUsed: { $max: '$createdAt' }
      }
    },
    { $sort: { count: -1, lastUsed: -1 } },
    { $limit: limit },
    {
      $project: {
        tag: '$_id',
        count: 1,
        lastUsed: 1,
        _id: 0
      }
    }
  ]);
};

// Static method to check if widget is favorited by user
favoriteSchema.statics.isFavorited = function(userId, widgetId) {
  return this.findOne({ userId, widgetId }).lean();
};

// Static method to get favorites with upcoming reminders
favoriteSchema.statics.getUpcomingReminders = function(userId, days = 7) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return this.find({
    userId,
    'metadata.reminderDate': {
      $gte: new Date(),
      $lte: endDate
    }
  })
  .populate({
    path: 'widgetId',
    select: 'name type settings'
  })
  .sort({ 'metadata.reminderDate': 1 })
  .lean();
};

// Instance method to increment visit count
favoriteSchema.methods.incrementVisitCount = function() {
  this.visitCount += 1;
  this.lastVisited = new Date();
  this.analytics.lastInteraction = new Date();
  return this.save();
};

// Instance method to increment analytics
favoriteSchema.methods.incrementAnalytics = function(type) {
  if (['viewCount', 'shareCount', 'clickCount'].includes(type)) {
    this.analytics[type] += 1;
    this.analytics.lastInteraction = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Pre-save middleware to update folder item count
favoriteSchema.post('save', async function(doc) {
  if (this.isNew) {
    const Folder = mongoose.model('Folder');
    await Folder.findByIdAndUpdate(
      doc.folderId,
      { 
        $inc: { itemCount: 1 },
        $set: { 'metadata.lastAccessed': new Date() }
      }
    );
  }
});

// Pre-remove middleware to update folder item count
favoriteSchema.post('deleteOne', { document: true, query: false }, async function(doc) {
  const Folder = mongoose.model('Folder');
  await Folder.findByIdAndUpdate(
    doc.folderId,
    { 
      $inc: { itemCount: -1 },
      $set: { 'metadata.lastAccessed': new Date() }
    }
  );
});

const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = Favorite; 