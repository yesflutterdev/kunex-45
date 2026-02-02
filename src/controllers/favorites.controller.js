const mongoose = require('mongoose');
const Favorite = require('../models/favorite.model');
const Folder = require('../models/folder.model');
const Widget = require('../models/widget.model');
const BuilderPage = require('../models/builderPage.model');
const BusinessProfile = require('../models/businessProfile.model');
const {
  validateFavorite,
  validateFavoriteUpdate,
  validateGetFavorites,
  validateBulkFavoriteOperation,
  validateAnalyticsQuery,
  validateReminderSettings,
  validateFavoritedBusinessWidgets,
  validateFavoritedBusinessDetails
} = require('../utils/favoritesValidation');

exports.addFavorite = async (req, res, next) => {
  try {
    const { error, value } = validateFavorite(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const { type, widgetId, productId, eventId, folderId, notes, tags, rating, isPrivate, metadata } = value;

    let content;
    let specificProduct = null;
    
    switch (type) {
      case 'Page':
        content = await BusinessProfile.findById(widgetId);
        if (content) {
          content._isBusinessProfile = true;
        }
        break;
      case 'Product':
        content = await Widget.findById(widgetId);
        if (content && productId) {
          const products = content.settings?.specific?.products || [];
          specificProduct = products.find(p => p._id?.toString() === productId);
          if (!specificProduct) {
            return res.status(404).json({
              success: false,
              message: 'Product not found in widget',
            });
          }
        }
        break;
      case 'Promotion':
        content = await Widget.findById(widgetId);
        break;
      case 'Event':
        content = await Widget.findById(widgetId);
        if (content && eventId) {
          const events = content.settings?.specific?.event || [];
          const specificEvent = events.find(e => e._id?.toString() === eventId);
          if (!specificEvent) {
            return res.status(404).json({
              success: false,
              message: 'Event not found in widget',
            });
          }
        }
        break;
      case 'BusinessProfile':
        content = await BusinessProfile.findById(widgetId);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid content type',
        });
    }

    if (!content) {
      return res.status(404).json({
        success: false,
        message: `${type} not found`,
      });
    }

    const query = { userId, widgetId, type };
    if (type === 'Product') {
      query.productId = productId;
    } else if (type === 'Event') {
      query.eventId = eventId;
    }
    const existingFavorite = await Favorite.findOne(query);
    if (existingFavorite) {
      await existingFavorite.deleteOne();
      
      if (type === 'Page' && content && content._isBusinessProfile) {
        await BusinessProfile.findByIdAndUpdate(widgetId, {
          $inc: { 'metrics.favoriteCount': -1 }
        }, {
          runValidators: false
        });
        
        const businessProfile = await BusinessProfile.findById(widgetId);
        if (businessProfile?.builderPageId) {
          await BuilderPage.findByIdAndUpdate(businessProfile.builderPageId, {
            $inc: { 'analytics.favoriteCount': -1 }
          }, {
            runValidators: false
          });
        }
      }
      
      return res.status(200).json({
        success: true,
        message: `${type} removed from favorites successfully`,
        data: { 
          removed: true,
          favoriteId: existingFavorite._id 
        }
      });
    }

    let targetFolder;
    if (folderId) {
      targetFolder = await Folder.findOne({ _id: folderId, userId });
      if (!targetFolder) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found',
        });
      }
    } else {
      targetFolder = await Folder.getDefaultFolder(userId);
      if (!targetFolder) {
        targetFolder = await Folder.createDefaultFolder(userId);
      }
    }

    const favoriteData = {
      userId,
      type,
      widgetId,
      folderId: targetFolder._id,
      notes,
      tags,
      rating,
      isPrivate,
      metadata: {
        ...metadata,
        deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop'
      }
    };

    if (type === 'Product') {
      favoriteData.productId = productId;
    } else if (type === 'Event') {
      favoriteData.eventId = eventId;
    }

    const favorite = new Favorite(favoriteData);

    await favorite.save();

    if (type === 'Page' && content && content._isBusinessProfile) {
      await BusinessProfile.findByIdAndUpdate(widgetId, {
        $inc: { 'metrics.favoriteCount': 1 }
      }, {
        runValidators: false
      });
      
      const businessProfile = await BusinessProfile.findById(widgetId);
      if (businessProfile?.builderPageId) {
        await BuilderPage.findByIdAndUpdate(businessProfile.builderPageId, {
          $inc: { 'analytics.favoriteCount': 1 }
        }, {
          runValidators: false
        });
      }
    }

    let populatedFavorite = await Favorite.findById(favorite._id)
      .populate({
        path: 'folderId',
        select: 'name color icon'
      })
      .lean();

    if (type === 'Page') {
      if (content._isBusinessProfile) {
        const businessProfile = await BusinessProfile.findById(widgetId)
          .select('_id businessName username description logo coverImage industry priceRange location metrics.favoriteCount')
          .lean();
        
        populatedFavorite.pageData = {
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
          industry: businessProfile.industry || null,
          favoriteCount: businessProfile.metrics?.favoriteCount || 0
        };
      } else {
        populatedFavorite.pageData = {
          _id: content._id,
          title: content.title,
          slug: content.slug,
          description: content.description,
          pageType: content.pageType,
          logo: content.logo,
          cover: content.cover,
          isPublished: content.settings?.isPublished || false,
          priceRange: content.priceRange,
          location: content.location
        };
      }
    } else if (type === 'Product' && specificProduct) {
      populatedFavorite.productData = {
        _id: productId,
        productName: specificProduct.productName,
        productImage: specificProduct.productImage,
        price: specificProduct.price,
        currency: specificProduct.currency,
        productUrl: specificProduct.productUrl,
        widgetId: content._id,
        widgetName: content.name,
        widgetType: content.type
      };
    } else if (type === 'Event' && eventId) {
      const events = content.settings?.specific?.event || [];
      const specificEvent = events.find(e => e._id?.toString() === eventId);
      if (specificEvent) {
        populatedFavorite.eventData = {
          _id: eventId,
          title: specificEvent.title,
          eventImage: specificEvent.eventImage,
          date: specificEvent.date,
          location: specificEvent.location,
          ticketUrl: specificEvent.ticketUrl,
          enddate: specificEvent.enddate,
          category: specificEvent.category,
          widgetId: content._id,
          widgetName: content.name,
          widgetType: content.type
        };
      } else {
        populatedFavorite.widgetData = {
          _id: content._id,
          name: content.name,
          type: content.type,
          settings: content.settings,
          layout: content.layout,
          status: content.status
        };
      }
    } else {
      populatedFavorite.widgetData = {
        _id: content._id,
        name: content.name,
        type: content.type,
        settings: content.settings,
        layout: content.layout,
        status: content.status
      };
    }

    res.status(201).json({
      success: true,
      message: `${type} added to favorites successfully`,
      data: { 
        favorite: populatedFavorite,
        added: true
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getFavorites = async (req, res, next) => {
  try {
    const { error, value } = validateGetFavorites(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const { folderId, tags, rating, search, isPrivate } = value;

    const options = {
      folderId,
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : undefined),
      rating,
      search
    };

    if (isPrivate !== undefined) {
      options.isPrivate = isPrivate;
    }

    const favoritesByType = await Favorite.getFavoritesGroupedByType(userId, options);

    const response = {
      pages: [],
      products: [],
      promotions: [],
      events: []
    };

    favoritesByType.forEach(group => {
      const type = group._id.toLowerCase();
      if (response.hasOwnProperty(type + 's')) {
        response[type + 's'] = group.favorites;
      }
    });

    const query = { userId };
    if (folderId) query.folderId = folderId;
    if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    if (rating) query.rating = { $gte: rating };
    if (search) query.$text = { $search: search };
    if (isPrivate !== undefined) query.isPrivate = isPrivate;

    const totalCount = await Favorite.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        ...response,
        totalCount,
        appliedFilters: {
          folderId,
          tags,
          rating,
          search,
          isPrivate
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getFavoritesDetailed = async (req, res, next) => {
  try {
    const { error, value } = validateGetFavorites(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const { folderId, tags, rating, sortBy, sortOrder, limit, page, search, isPrivate } = value;

    // Build query options
    const options = {
      folderId,
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : undefined),
      rating,
      sortBy,
      sortOrder,
      limit,
      page,
      search
    };

    if (isPrivate !== undefined) {
      options.isPrivate = isPrivate;
    }

    const favorites = await Favorite.getUserFavoritesByType(userId, options);

    const query = { userId };
    if (folderId) query.folderId = folderId;
    if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    if (rating) query.rating = { $gte: rating };
    if (search) query.$text = { $search: search };
    if (isPrivate !== undefined) query.isPrivate = isPrivate;

    const totalCount = await Favorite.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: {
        favorites,
        pagination: {
          currentPage: page,
          totalPages,
          totalFavorites: totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit
        },
        appliedFilters: {
          folderId,
          tags,
          rating,
          search,
          isPrivate
        },
        sortedBy: `${sortBy}_${sortOrder}`
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getFavorite = async (req, res, next) => {
  try {
    const { favoriteId } = req.params;
    const userId = req.user.id;

    const favorite = await Favorite.findOne({ _id: favoriteId, userId })
      .populate({
        path: 'folderId',
        select: 'name color icon'
      })
      .lean();

    if (favorite) {
      // Add content data based on type
      if (favorite.type === 'Page') {
        let page = await BuilderPage.findById(favorite.widgetId).lean();
        if (page) {
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
            location: page.location
          };
        } else {
          const businessProfile = await BusinessProfile.findById(favorite.widgetId).lean();
          if (businessProfile) {
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
              location: businessProfile.location
            };
          }
        }
      } else {
        const widget = await Widget.findById(favorite.widgetId).lean();
        if (widget) {
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

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found',
      });
    }

    await Favorite.findByIdAndUpdate(favoriteId, {
      $inc: { 'analytics.viewCount': 1 },
      $set: { 'analytics.lastInteraction': new Date() }
    });

    res.status(200).json({
      success: true,
      data: { favorite },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateFavorite = async (req, res, next) => {
  try {
    const { favoriteId } = req.params;
    const { error, value } = validateFavoriteUpdate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const { folderId, notes, tags, rating, isPrivate, metadata } = value;

    // Check if favorite exists
    const favorite = await Favorite.findOne({ _id: favoriteId, userId });
    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found',
      });
    }

    // If moving to different folder, verify folder exists
    if (folderId && folderId !== favorite.folderId.toString()) {
      const targetFolder = await Folder.findOne({ _id: folderId, userId });
      if (!targetFolder) {
        return res.status(404).json({
          success: false,
          message: 'Target folder not found',
        });
      }
    }

    const updateData = {};
    if (folderId) updateData.folderId = folderId;
    if (notes !== undefined) updateData.notes = notes;
    if (tags) updateData.tags = tags;
    if (rating) updateData.rating = rating;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (metadata) updateData.metadata = { ...favorite.metadata, ...metadata };

    const updatedFavorite = await Favorite.findByIdAndUpdate(
      favoriteId,
      { $set: updateData },
      { new: true }
    )
    .populate({
      path: 'folderId',
      select: 'name color icon'
    })
    .lean();

    // Add content data based on type
    if (updatedFavorite) {
      if (updatedFavorite.type === 'Page') {
        // Try BuilderPage first
        let page = await BuilderPage.findById(updatedFavorite.widgetId).lean();
        if (page) {
          updatedFavorite.pageData = {
            _id: page._id,
            title: page.title,
            slug: page.slug,
            description: page.description,
            pageType: page.pageType,
            logo: page.logo,
            cover: page.cover,
            isPublished: page.settings?.isPublished || false,
            priceRange: page.priceRange,
            location: page.location
          };
        } else {
          // If not found in BuilderPage, try BusinessProfile
          const businessProfile = await BusinessProfile.findById(updatedFavorite.widgetId).lean();
          if (businessProfile) {
            updatedFavorite.pageData = {
              _id: businessProfile._id,
              title: businessProfile.businessName,
              slug: businessProfile.username,
              description: businessProfile.description?.short || businessProfile.description?.full,
              pageType: "business",
              logo: businessProfile.logo,
              cover: businessProfile.coverImage || null,
              isPublished: true,
              priceRange: businessProfile.priceRange,
              location: businessProfile.location
            };
          }
        }
      } else {
        const widget = await Widget.findById(updatedFavorite.widgetId).lean();
        if (widget) {
          updatedFavorite.widgetData = {
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

    res.status(200).json({
      success: true,
      message: 'Favorite updated successfully',
      data: { favorite: updatedFavorite },
    });
  } catch (error) {
    next(error);
  }
};

exports.removeFavorite = async (req, res, next) => {
  try {
    const { favoriteId } = req.params;
    const userId = req.user.id;

    const favorite = await Favorite.findOne({ _id: favoriteId, userId });
    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found',
      });
    }

    if (favorite.type === 'Page' && favorite.widgetId) {
      await BusinessProfile.findByIdAndUpdate(favorite.widgetId, {
        $inc: { 'metrics.favoriteCount': -1 }
      }, {
        runValidators: false
      });
      
      const businessProfile = await BusinessProfile.findById(favorite.widgetId);
      if (businessProfile?.builderPageId) {
        await BuilderPage.findByIdAndUpdate(businessProfile.builderPageId, {
          $inc: { 'analytics.favoriteCount': -1 }
        }, {
          runValidators: false
        });
      }
    }

    await favorite.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Favorite removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.checkFavoriteStatus = async (req, res, next) => {
  try {
    const { widgetId } = req.params;
    const userId = req.user.id;

    const favorite = await Favorite.findOne({ userId, widgetId })
      .populate('folderId', 'name color icon')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        isFavorited: !!favorite,
        favorite: favorite || null
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getPopularTags = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    const tags = await Favorite.getPopularTags(userId, parseInt(limit));

    res.status(200).json({
      success: true,
      data: { tags },
    });
  } catch (error) {
    next(error);
  }
};

exports.bulkOperation = async (req, res, next) => {
  try {
    const { error, value } = validateBulkFavoriteOperation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const { favoriteIds, operation, targetFolderId, tags } = value;

    // Verify all favorites belong to user
    const favorites = await Favorite.find({
      _id: { $in: favoriteIds },
      userId
    });

    if (favorites.length !== favoriteIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Some favorites not found',
      });
    }

    let result;
    switch (operation) {
      case 'move':
        // Verify target folder exists
        const targetFolder = await Folder.findOne({ _id: targetFolderId, userId });
        if (!targetFolder) {
          return res.status(404).json({
            success: false,
            message: 'Target folder not found',
          });
        }

        result = await Favorite.updateMany(
          { _id: { $in: favoriteIds } },
          { $set: { folderId: targetFolderId } }
        );
        break;

      case 'delete':
        result = await Favorite.deleteMany({ _id: { $in: favoriteIds } });
        break;

      case 'tag':
        result = await Favorite.updateMany(
          { _id: { $in: favoriteIds } },
          { $addToSet: { tags: { $each: tags } } }
        );
        break;

      case 'untag':
        result = await Favorite.updateMany(
          { _id: { $in: favoriteIds } },
          { $pullAll: { tags: tags } }
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid operation',
        });
    }

    res.status(200).json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      data: {
        modifiedCount: result.modifiedCount || result.deletedCount,
        operation
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const { error, value } = validateAnalyticsQuery(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const { timeframe, folderId, groupBy, limit } = value;

    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Build aggregation pipeline
    const matchStage = { userId: new mongoose.Types.ObjectId(userId) };
    if (timeframe !== 'all') {
      matchStage.createdAt = { $gte: startDate };
    }
    if (folderId) {
      matchStage.folderId = new mongoose.Types.ObjectId(folderId);
    }

    let groupStage;
    switch (groupBy) {
      case 'folder':
        groupStage = {
          _id: '$folderId',
          count: { $sum: 1 },
          totalViews: { $sum: '$analytics.viewCount' },
          totalShares: { $sum: '$analytics.shareCount' },
          avgRating: { $avg: '$rating' }
        };
        break;
      case 'type':
        groupStage = {
          _id: '$type',
          count: { $sum: 1 },
          totalViews: { $sum: '$analytics.viewCount' },
          totalShares: { $sum: '$analytics.shareCount' },
          avgRating: { $avg: '$rating' }
        };
        break;
      default:
        const dateFormat = groupBy === 'day' ? '%Y-%m-%d' : 
                          groupBy === 'week' ? '%Y-%U' : '%Y-%m';
        groupStage = {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          count: { $sum: 1 },
          totalViews: { $sum: '$analytics.viewCount' },
          totalShares: { $sum: '$analytics.shareCount' }
        };
    }

    const pipeline = [
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { _id: -1 } },
      { $limit: limit }
    ];

    const analytics = await Favorite.aggregate(pipeline);

    const summary = await Favorite.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalFavorites: { $sum: 1 },
          totalViews: { $sum: '$analytics.viewCount' },
          totalShares: { $sum: '$analytics.shareCount' },
          avgRating: { $avg: '$rating' },
          mostRecentAdd: { $max: '$createdAt' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        analytics,
        summary: summary[0] || {},
        timeframe,
        groupBy
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.setReminder = async (req, res, next) => {
  try {
    const { error, value } = validateReminderSettings(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const { favoriteId, reminderDate, reminderNote } = value;

    const favorite = await Favorite.findOne({ _id: favoriteId, userId });
    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found',
      });
    }

    favorite.metadata.reminderDate = reminderDate;
    favorite.metadata.reminderNote = reminderNote;
    await favorite.save();

    res.status(200).json({
      success: true,
      message: 'Reminder set successfully',
      data: {
        reminderDate,
        reminderNote
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUpcomingReminders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const reminders = await Favorite.getUpcomingReminders(userId, parseInt(days));

    res.status(200).json({
      success: true,
      data: { reminders },
    });
  } catch (error) {
    next(error);
  }
};

exports.getFavoritedBusinessWidgets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      widgetType, 
      businessId, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const favorites = await Favorite.find({
      userId,
      type: { $in: ['Page', 'BusinessProfile'] }
    })
      .select('widgetId createdAt')
      .lean();

    if (favorites.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          widgets: [],
          pagination: {
            currentPage: parseInt(page),
            totalPages: 0,
            totalWidgets: 0,
            hasNextPage: false,
            hasPrevPage: false,
            limit: parseInt(limit)
          }
        }
      });
    }

    const businessFavoriteMap = new Map();
    favorites.forEach(fav => {
      const bid = fav.widgetId.toString();
      const favoritedAt = fav.createdAt;
      
      if (!businessFavoriteMap.has(bid) || 
          businessFavoriteMap.get(bid) < favoritedAt) {
        businessFavoriteMap.set(bid, favoritedAt);
      }
    });

    const businessIds = Array.from(businessFavoriteMap.keys()).map(id => new mongoose.Types.ObjectId(id));
    
    if (businessId && !businessIds.some(id => id.toString() === businessId)) {
      return res.status(200).json({
        success: true,
        data: {
          widgets: [],
          pagination: {
            currentPage: parseInt(page),
            totalPages: 0,
            totalWidgets: 0,
            hasNextPage: false,
            hasPrevPage: false,
            limit: parseInt(limit)
          }
        }
      });
    }

    const targetBusinessIds = businessId 
      ? [new mongoose.Types.ObjectId(businessId)] 
      : businessIds;

    const matchStage = {
      businessId: { $in: targetBusinessIds },
      status: 'active',
      isVisible: true
    };

    if (widgetType) {
      matchStage.type = widgetType;
    }

    const widgets = await Widget.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'businessprofiles',
          localField: 'businessId',
          foreignField: '_id',
          as: 'business'
        }
      },
      {
        $unwind: {
          path: '$business',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          businessInfo: {
            _id: '$business._id',
            businessName: '$business.businessName',
            username: '$business.username',
            logo: '$business.logo',
            industry: '$business.industry'
          }
        }
      },
      {
        $project: {
          business: 0
        }
      }
    ]);

    const filteredWidgets = widgets.filter(widget => {
      const bid = widget.businessId?.toString();
      const favoritedAt = businessFavoriteMap.get(bid);
      return favoritedAt && new Date(widget.createdAt) > new Date(favoritedAt);
    });

    filteredWidgets.forEach(widget => {
      const bid = widget.businessId?.toString();
      widget.favoritedAt = businessFavoriteMap.get(bid);
    });

    const sortField = sortBy === 'createdAt' ? 'createdAt' : sortBy;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    
    filteredWidgets.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal < bVal) return -sortDirection;
      if (aVal > bVal) return sortDirection;
      return 0;
    });

    const totalCount = filteredWidgets.length;
    const paginatedWidgets = filteredWidgets.slice(skip, skip + parseInt(limit));
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        widgets: paginatedWidgets,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalWidgets: totalCount,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getFavoritedBusinessesOverview = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const favorites = await Favorite.find({
      userId: new mongoose.Types.ObjectId(userId),
      type: { $in: ['Page', 'BusinessProfile'] },
      widgetId: { $exists: true, $ne: null }
    })
      .select('widgetId createdAt')
      .lean();

    if (!favorites || favorites.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const businessFavoriteMap = new Map();
    const validBusinessIds = [];

    for (const fav of favorites) {
      if (!fav || !fav.widgetId) continue;

      const bid = fav.widgetId.toString();
      if (!mongoose.Types.ObjectId.isValid(bid)) continue;

      const favoritedAt = fav.createdAt ? new Date(fav.createdAt) : null;
      if (!favoritedAt || isNaN(favoritedAt.getTime())) continue;

      if (!businessFavoriteMap.has(bid) || 
          businessFavoriteMap.get(bid) < favoritedAt) {
        businessFavoriteMap.set(bid, favoritedAt);
        if (!validBusinessIds.includes(bid)) {
          validBusinessIds.push(bid);
        }
      }
    }

    if (validBusinessIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const businessObjectIds = validBusinessIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    if (businessObjectIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const widgets = await Widget.find({
      businessId: { $in: businessObjectIds },
      status: 'active',
      isVisible: true,
      createdAt: { $exists: true, $ne: null }
    })
      .select('businessId createdAt')
      .lean();

    const businessesWithNewWidgets = new Map();

    for (const widget of widgets) {
      if (!widget || !widget.businessId || !widget.createdAt) continue;

      const bid = widget.businessId.toString();
      if (!mongoose.Types.ObjectId.isValid(bid)) continue;

      const favoritedAt = businessFavoriteMap.get(bid);
      if (!favoritedAt) continue;

      const widgetCreatedAt = new Date(widget.createdAt);
      if (isNaN(widgetCreatedAt.getTime())) continue;

      if (widgetCreatedAt > favoritedAt) {
        if (!businessesWithNewWidgets.has(bid)) {
          businessesWithNewWidgets.set(bid, {
            businessId: bid,
            favoritedAt
          });
        }
      }
    }

    if (businessesWithNewWidgets.size === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const businessIdsWithNewWidgets = Array.from(businessesWithNewWidgets.keys())
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    if (businessIdsWithNewWidgets.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const businesses = await BusinessProfile.find({
      _id: { $in: businessIdsWithNewWidgets }
    })
      .select('_id businessName logo builderPageId')
      .lean();

    const result = businesses
      .filter(business => business && business._id)
      .map(business => ({
        logo: business.logo || null,
        name: business.businessName || null,
        pageId: business.builderPageId && mongoose.Types.ObjectId.isValid(business.builderPageId)
          ? business.builderPageId.toString()
          : null,
        businessId: business._id.toString()
      }))
      .filter(item => item.name && item.businessId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

exports.getFavoritedBusinessDetails = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const { error, value } = validateFavoritedBusinessDetails(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { pageId, businessId } = value;

    let business = null;
    let builderPage = null;
    let pageIdToUse = null;

    if (businessId) {
      if (!mongoose.Types.ObjectId.isValid(businessId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid businessId format'
        });
      }

      business = await BusinessProfile.findById(businessId)
        .select('_id businessName logo coverImage builderPageId industry location.address location.city location.state location.country')
        .lean();

      if (!business || !business._id) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      if (business.builderPageId && mongoose.Types.ObjectId.isValid(business.builderPageId)) {
        builderPage = await BuilderPage.findById(business.builderPageId)
          .select('_id title cover logo')
          .lean();
        pageIdToUse = business.builderPageId;
      }
    } else if (pageId) {
      if (!mongoose.Types.ObjectId.isValid(pageId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pageId format'
        });
      }

      builderPage = await BuilderPage.findById(pageId)
        .select('_id title cover logo businessId')
        .lean();

      if (!builderPage || !builderPage._id) {
        return res.status(404).json({
          success: false,
          message: 'Page not found'
        });
      }

      pageIdToUse = builderPage._id;

      if (builderPage.businessId && mongoose.Types.ObjectId.isValid(builderPage.businessId)) {
        business = await BusinessProfile.findById(builderPage.businessId)
          .select('_id businessName logo coverImage industry location.address location.city location.state location.country')
          .lean();
      }
    }

    if (!business || !business._id) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (!pageIdToUse) {
      return res.status(404).json({
        success: false,
        message: 'Builder page not found for this business'
      });
    }

    const favorite = await Favorite.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      type: { $in: ['Page', 'BusinessProfile'] },
      widgetId: business._id
    })
      .select('createdAt')
      .sort({ createdAt: -1 })
      .lean();

    if (!favorite || !favorite.createdAt) {
      return res.status(403).json({
        success: false,
        message: 'Business is not favorited by user'
      });
    }

    const favoritedAt = new Date(favorite.createdAt);
    if (isNaN(favoritedAt.getTime())) {
      return res.status(500).json({
        success: false,
        message: 'Invalid favorite date'
      });
    }

    const newWidgets = await Widget.find({
      pageId: pageIdToUse,
      status: 'active',
      isVisible: true,
      createdAt: { $gt: favoritedAt, $exists: true, $ne: null }
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    let latestWidgetDate = favoritedAt;
    if (newWidgets && newWidgets.length > 0) {
      const validDates = newWidgets
        .map(w => w.createdAt ? new Date(w.createdAt) : null)
        .filter(date => date && !isNaN(date.getTime()));

      if (validDates.length > 0) {
        latestWidgetDate = new Date(Math.max(...validDates.map(d => d.getTime())));
      }
    }

    const addressParts = [];
    if (business.location?.address) {
      addressParts.push(business.location.address);
    }
    if (business.location?.city) {
      addressParts.push(business.location.city);
    }
    if (business.location?.state) {
      addressParts.push(business.location.state);
    }
    const address = addressParts.length > 0 ? addressParts.join(', ') : null;

    res.status(200).json({
      success: true,
      data: {
        pageData: {
          coverImage: builderPage?.cover || business.coverImage || null,
          logo: builderPage?.logo || business.logo || null,
          name: business.businessName || null,
          pageId: pageIdToUse.toString(),
          businessId: business._id.toString(),
          industry: business.industry || null,
          address: address,
          timeWidgetAdded: latestWidgetDate
        },
        widgets: newWidgets || []
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }
    next(error);
  }
}; 