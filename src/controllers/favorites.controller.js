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
  validateReminderSettings
} = require('../utils/favoritesValidation');

// Add widget to favorites
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
    const { type, widgetId, productId, folderId, notes, tags, rating, isPrivate, metadata } = value;

    // Check if content exists based on type
    let content;
    let specificProduct = null;
    
    switch (type) {
      case 'Page':
        // content = await BuilderPage.findById(widgetId);
        content = await BusinessProfile.findById(widgetId);
        if (content) {
          // Mark this as a BusinessProfile for response handling
          content._isBusinessProfile = true;
        }
        break;
      case 'Product':
        content = await Widget.findById(widgetId);
        if (content && productId) {
          // Find the specific product within the products array
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
      case 'Event':
        content = await Widget.findById(widgetId);
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

    // Check if already favorited - if so, remove it (toggle behavior)
    const existingFavorite = await Favorite.findOne({ 
      userId, 
      widgetId, 
      productId: productId || null 
    });
    if (existingFavorite) {
      await existingFavorite.deleteOne();
      return res.status(200).json({
        success: true,
        message: `${type} removed from favorites successfully`,
        data: { 
          removed: true,
          favoriteId: existingFavorite._id 
        }
      });
    }

    // Get or create default folder if no folder specified
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

    // Create favorite
    const favorite = new Favorite({
      userId,
      type,
      widgetId,
      productId: productId || undefined,
      folderId: targetFolder._id,
      notes,
      tags,
      rating,
      isPrivate,
      metadata: {
        ...metadata,
        deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop'
      }
    });

    await favorite.save();

    // Populate the response based on content type
    let populatedFavorite = await Favorite.findById(favorite._id)
      .populate({
        path: 'folderId',
        select: 'name color icon'
      })
      .lean();

    // Add content data based on type
    if (type === 'Page') {
      if (content._isBusinessProfile) {
        // Handle BusinessProfile as Page
        populatedFavorite.pageData = {
          _id: content._id,
          title: content.businessName,
          slug: content.username,
          description: content.description?.short || content.description?.full,
          pageType: "business",
          logo: content.logo,
          cover: content.coverImages?.[0] || null,
          isPublished: true,
          priceRange: content.priceRange,
          location: content.location
        };
      } else {
        // Handle BuilderPage as Page
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

// Get user's favorites grouped by type (main favorites view)
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

    // Build query options
    const options = {
      folderId,
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : undefined),
      rating,
      search
    };

    if (isPrivate !== undefined) {
      options.isPrivate = isPrivate;
    }

    // Get favorites grouped by type
    const favoritesByType = await Favorite.getFavoritesGroupedByType(userId, options);

    // Transform to the expected response format
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

    // Get total count for pagination
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

// Get user's favorites with filtering and search (detailed view)
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

    // Get favorites
    const favorites = await Favorite.getUserFavoritesByType(userId, options);

    // Get total count for pagination
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

// Get single favorite details
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
        // Try BuilderPage first
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
          // If not found in BuilderPage, try BusinessProfile
          const businessProfile = await BusinessProfile.findById(favorite.widgetId).lean();
          if (businessProfile) {
            favorite.pageData = {
              _id: businessProfile._id,
              title: businessProfile.businessName,
              slug: businessProfile.username,
              description: businessProfile.description?.short || businessProfile.description?.full,
              pageType: "business",
              logo: businessProfile.logo,
              cover: businessProfile.coverImages?.[0] || null,
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

    // Increment view count
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

// Update favorite
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

    // Update favorite
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
              cover: businessProfile.coverImages?.[0] || null,
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

// Remove favorite
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

    await favorite.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Favorite removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Check if widget is favorited
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

// Get popular tags for user
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

// Bulk operations on favorites
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

// Get favorites analytics
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

    // Calculate date range
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
        // Group by time periods
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

    // Get summary statistics
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

// Set reminder for favorite
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

// Get upcoming reminders
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