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
      type: String,
      required: function () {
        return this.type === 'Product';
      }
    },
    eventId: {
      type: String,
      required: function () {
        return this.type === 'Event';
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

favoriteSchema.index({ userId: 1 });
favoriteSchema.index({ widgetId: 1 });
favoriteSchema.index({ folderId: 1 });
favoriteSchema.index({ userId: 1, type: 1 });
favoriteSchema.index(
  { userId: 1, widgetId: 1, productId: 1 },
  { unique: true, partialFilterExpression: { type: 'Product' } }
);
favoriteSchema.index(
  { userId: 1, widgetId: 1, eventId: 1 },
  { unique: true, partialFilterExpression: { type: 'Event' } }
);
favoriteSchema.index({ userId: 1, folderId: 1 });
favoriteSchema.index({ userId: 1, createdAt: -1 });
favoriteSchema.index({ userId: 1, rating: -1 });
favoriteSchema.index({ userId: 1, visitCount: -1 });
favoriteSchema.index({ tags: 1 });
favoriteSchema.index({ 'metadata.reminderDate': 1 });
favoriteSchema.index({
  notes: 'text',
  tags: 'text'
});

function slimEventItem (e) {
  if (!e || typeof e !== 'object') return null;
  return {
    _id: e._id ?? null,
    eventImage: e.eventImage ?? null,
    title: e.title ?? null,
    date: e.date ?? null,
    location: e.location ?? null,
    ticketUrl: e.ticketUrl ?? null,
    enddate: e.enddate ?? null,
    category: e.category ?? null
  };
}

function slimEventList (raw) {
  if (Array.isArray(raw)) return raw.map(slimEventItem).filter(Boolean);
  if (raw != null && typeof raw === 'object') return [slimEventItem(raw)].filter(Boolean);
  return [];
}

function buildSlimEventContent (widget, userId) {
  const specific = widget.settings?.specific || {};
  return {
    _id: widget._id,
    userId: userId,
    pageId: widget.pageId ?? null,
    name: widget.name ?? '',
    type: 'event',
    events: slimEventList(specific.event)
  };
}

favoriteSchema.statics.getUserFavoritesByType = async function (userId, options = {}) {
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

  for (let favorite of favorites) {
    if (favorite.type === 'Page') {
      let page = await mongoose.model('BuilderPage').findById(favorite.widgetId).lean();
      if (page) {
        let industryInfo = { industry: null, subIndustry: null };
        if (page.businessId) {
          const bp = await mongoose.model('BusinessProfile').findById(page.businessId)
            .select('industryId subIndustryId')
            .lean();
          industryInfo = await resolveIndustryInfo(bp);
        }

        favorite.pageData = {
          _id: page._id,
          title: page.title,
          slug: page.slug,
          description: page.description,
          pageType: page.pageType,
          logo: page.logo,
          cover: page.cover,
          isPublished: page.settings?.isPublished || false,
          priceRange: page.priceRange,
          location: page.location,
          industry: industryInfo.industry,
          subIndustry: industryInfo.subIndustry
        };
      } else {
        const businessProfile = await mongoose.model('BusinessProfile').findById(favorite.widgetId)
          .select('_id businessName username description logo coverImage industryId subIndustryId priceRange location metrics.favoriteCount')
          .lean();
        if (businessProfile) {
          const industryInfo = await resolveIndustryInfo(businessProfile);

          favorite.pageData = {
            _id: businessProfile._id,
            title: businessProfile.businessName,
            slug: businessProfile.username,
            description: businessProfile.description?.short || businessProfile.description?.full,
            pageType: "business",
            logo: businessProfile.logo,
            cover: businessProfile.coverImage || null,
            isPublished: true,
            priceRange: businessProfile.priceRange,
            location: businessProfile.location,
            industry: industryInfo.industry,
            subIndustry: industryInfo.subIndustry,
            favoriteCount: businessProfile.metrics?.favoriteCount || 0
          };
        }
      }
    } else {
      const widget = await mongoose.model('Widget').findById(favorite.widgetId).lean();

      if (widget) {
        if (favorite.type === 'Product' && favorite.productId) {
          const products = widget.settings?.specific?.products || [];

          const specificProduct = products.find(p =>
            p._id?.toString() === favorite.productId ||
            p._id?.toString() === favorite.productId?.toString()
          );

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
          } else {
            favorite.widgetData = {
              _id: widget._id,
              name: widget.name,
              type: widget.type,
              settings: widget.settings,
              layout: widget.layout,
              status: widget.status
            };
          }
        } else if (favorite.type === 'Event' && favorite.eventId) {
          const events = widget.settings?.specific?.event || [];
          const specificEvent = events.find(e => e._id?.toString() === favorite.eventId);
          if (specificEvent) {
            favorite.eventData = {
              _id: favorite.eventId,
              title: specificEvent.title,
              eventImage: specificEvent.eventImage,
              date: specificEvent.date,
              location: specificEvent.location,
              ticketUrl: specificEvent.ticketUrl,
              enddate: specificEvent.enddate,
              category: specificEvent.category,
              widgetId: widget._id,
              widgetName: widget.name,
              widgetType: widget.type
            };
          }
        } else {
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

async function resolveIndustryInfo(businessProfile) {
  if (!businessProfile || !businessProfile.industryId) {
    return { industry: null, subIndustry: null };
  }

  const industry = await mongoose.model('Industry')
    .findById(businessProfile.industryId)
    .select('title subcategories')
    .lean();

  if (!industry) {
    return { industry: null, subIndustry: null };
  }

  let subIndustryTitle = null;
  if (businessProfile.subIndustryId && industry.subcategories) {
    const sub = industry.subcategories.find(s => s.id === businessProfile.subIndustryId);
    if (sub) subIndustryTitle = sub.title;
  }

  return { industry: industry.title, subIndustry: subIndustryTitle };
}

favoriteSchema.statics.getFavoritesGroupedByType = async function (userId, options = {}) {
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

  const favorites = await this.find(query)
    .populate({
      path: 'folderId',
      select: 'name color icon'
    })
    .lean();

  const groupedFavorites = {
    pages: [],
    products: [],
    promotions: [],
    events: []
  };

  for (const favorite of favorites) {
    let contentData = null;

    if (favorite.type === 'Page') {
      let page = await mongoose.model('BuilderPage').findById(favorite.widgetId).lean();
      if (page) {
        // Look up BusinessProfile for industry info
        let industryInfo = { industry: null, subIndustry: null };
        if (page.businessId) {
          const bp = await mongoose.model('BusinessProfile').findById(page.businessId)
            .select('industryId subIndustryId')
            .lean();
          industryInfo = await resolveIndustryInfo(bp);
        }

        contentData = {
          _id: page._id,
          pageId: page._id,
          businessId: page.businessId || null,
          title: page.title,
          slug: page.slug,
          description: page.description,
          pageType: page.pageType,
          logo: page.logo,
          cover: page.cover,
          isPublished: page.settings?.isPublished || false,
          priceRange: page.priceRange,
          location: page.location,
          industry: industryInfo.industry,
          subIndustry: industryInfo.subIndustry
        };
      } else {
        const businessProfile = await mongoose.model('BusinessProfile').findById(favorite.widgetId)
          .select('_id businessName username description logo coverImage industryId subIndustryId priceRange location metrics.favoriteCount')
          .lean();
        if (businessProfile) {
          // Look up the BuilderPage associated with this BusinessProfile
          const linkedPage = await mongoose.model('BuilderPage').findOne({ businessId: businessProfile._id })
            .select('_id')
            .lean();

          const industryInfo = await resolveIndustryInfo(businessProfile);

          contentData = {
            _id: businessProfile._id,
            pageId: linkedPage ? linkedPage._id : null,
            title: businessProfile.businessName,
            slug: businessProfile.username,
            description: businessProfile.description?.short || businessProfile.description?.full,
            pageType: "business",
            logo: businessProfile.logo,
            cover: businessProfile.coverImage || null,
            isPublished: true,
            priceRange: businessProfile.priceRange,
            location: businessProfile.location,
            industry: industryInfo.industry,
            subIndustry: industryInfo.subIndustry,
            favoriteCount: businessProfile.metrics?.favoriteCount || 0
          };
        }
      }
    } else {
      const widget = await mongoose.model('Widget').findById(favorite.widgetId).lean();
      if (widget) {
        let userPage = null;
        if (widget.pageId) {
          userPage = await mongoose.model('BuilderPage').findById(widget.pageId).lean();
        }

        if (favorite.type === 'Product' && favorite.productId) {
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
              widgetType: widget.type,
              pageId: widget.pageId,
              pageLogo: userPage?.logo || null,
              businessId: userPage?.businessId || null
            };
          }
        } else if (favorite.type === 'Event') {
          contentData = buildSlimEventContent(widget, favorite.userId);
        } else {
          contentData = {
            _id: widget._id,
            name: widget.name,
            type: widget.type,
            settings: widget.settings,
            layout: widget.layout,
            status: widget.status,
            pageId: widget.pageId,
            pageLogo: userPage?.logo || null,
            businessId: userPage?.businessId || null
          };
        }
      }
    }

    if (contentData) {
      const typeKey = favorite.type.toLowerCase() + 's';
      const isEvent = typeKey === 'events';
      const favoriteData = isEvent
        ? { _id: favorite._id, widgetId: favorite.widgetId, content: contentData }
        : {
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
      if (groupedFavorites.hasOwnProperty(typeKey)) {
        groupedFavorites[typeKey].push(favoriteData);
      }
    }
  }

  return Object.entries(groupedFavorites).map(([type, favorites]) => ({
    _id: type.slice(0, -1),
    favorites,
    count: favorites.length
  }));
};

favoriteSchema.statics.getFavoriteCountsByFolder = function (userId) {
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

favoriteSchema.statics.getPopularTags = function (userId, limit = 20) {
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

favoriteSchema.statics.isFavorited = function (userId, widgetId) {
  return this.findOne({ userId, widgetId }).lean();
};

favoriteSchema.statics.getUpcomingReminders = function (userId, days = 7) {
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

favoriteSchema.methods.incrementVisitCount = function () {
  this.visitCount += 1;
  this.lastVisited = new Date();
  this.analytics.lastInteraction = new Date();
  return this.save();
};

favoriteSchema.methods.incrementAnalytics = function (type) {
  if (['viewCount', 'shareCount', 'clickCount'].includes(type)) {
    this.analytics[type] += 1;
    this.analytics.lastInteraction = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

favoriteSchema.post('save', async function (doc) {
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

favoriteSchema.post('deleteOne', { document: true, query: false }, async function (doc) {
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