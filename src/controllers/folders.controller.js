const mongoose = require('mongoose');
const Folder = require('../models/folder.model');
const Favorite = require('../models/favorite.model');
const BusinessProfile = require('../models/businessProfile.model');
const Widget = require('../models/widget.model');
const {
  validateFolder,
  validateFolderUpdate,
  validateGetFolders,
  validateFolderSearch,
  validateFolderReorder
} = require('../utils/favoritesValidation');

// Create new folder (KON-35)
exports.createFolder = async (req, res, next) => {
  try {
    const { error, value } = validateFolder(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const { name, description, color, icon, isPublic, sortOrder, metadata } = value;

    // Check if folder name already exists for user
    const existingFolder = await Folder.findOne({ userId, name });
    if (existingFolder) {
      return res.status(409).json({
        success: false,
        message: 'Folder with this name already exists',
      });
    }

    // Create folder
    const folder = new Folder({
      userId,
      name,
      description,
      color,
      icon,
      isPublic,
      sortOrder,
      metadata
    });

    await folder.save();

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      data: { folder },
    });
  } catch (error) {
    next(error);
  }
};

// Get user's folders
exports.getFolders = async (req, res, next) => {
  try {
    const { error, value } = validateGetFolders(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const { includeEmpty, sortBy, limit, category, populatePages = false } = value;

    // Build query options
    const options = { includeEmpty, sortBy, limit };

    // Get folders
    let folders = await Folder.getUserFolders(userId, options);

    // Filter by category if specified
    if (category) {
      folders = folders.filter(folder => folder.metadata?.category === category);
    }

    // Update item counts from favorites and populate business pages
    folders = await Promise.all(folders.map(async (folder) => {
      // Get favorites in this folder
      const favorites = await Favorite.find({ folderId: folder._id, userId })
        .populate({
          path: 'folderId',
          select: 'name color icon'
        })
        .lean();

      // Separate favorites by type
      const pageFavorites = favorites.filter(f => f.type === 'Page');
      const productFavorites = favorites.filter(f => f.type === 'Product');
      const otherFavorites = favorites.filter(f => !['Page', 'Product'].includes(f.type));

      // Get business pages data from favorites
      let businessPages = [];
      let thumbnails = [];

      if (pageFavorites.length > 0) {
        // For Page favorites, the widgetId should actually be the BusinessProfile ID
        // But let's check both BusinessProfile and BuilderPage collections
        const pageIds = pageFavorites
          .filter(f => f.widgetId) // Make sure widgetId exists
          .map(f => f.widgetId);

        // Try BusinessProfile first
        let businessProfiles = await BusinessProfile.find({ _id: { $in: pageIds } })
          .select('businessName username description logo coverImages')
          .lean();

        // If no business profiles found, try BuilderPage
        if (businessProfiles.length === 0) {
          const BuilderPage = require('../models/builderPage.model');
          const builderPages = await BuilderPage.find({ _id: { $in: pageIds } })
            .select('title slug description pageType logo cover settings')
            .lean();

          // Convert BuilderPage to business page format
          businessProfiles = builderPages.map(page => ({
            _id: page._id,
            businessName: page.title,
            username: page.slug,
            description: { short: page.description },
            logo: page.logo,
            coverImages: page.cover ? [page.cover] : []
          }));
        }

        // Process the found profiles/pages
        if (businessProfiles.length > 0) {
          businessPages = businessProfiles.map(profile => {
            const thumbnail = profile.logo || profile.coverImages?.[0] || `https://via.placeholder.com/150x150?text=${encodeURIComponent(profile.businessName)}`;
            return {
              _id: profile._id,
              title: profile.businessName,
              slug: profile.username,
              description: profile.description?.short || profile.description?.full,
              pageType: "business",
              logo: profile.logo,
              cover: profile.coverImages?.[0] || null,
              thumbnail: thumbnail, // Link thumbnail to specific item
              isPublished: true
            };
          });

          // Generate thumbnails from business pages (linked to specific items)
          thumbnails = businessPages
            .map(page => page.thumbnail)
            .filter(Boolean)
            .slice(0, 4);
        }
      }

      // Also add Product favorites as business pages
      if (productFavorites.length > 0) {
        const productWidgetIds = productFavorites.map(f => f.widgetId);
        const productWidgets = await Widget.find({ _id: { $in: productWidgetIds } })
          .select('name type settings')
          .lean();

        for (const favorite of productFavorites) {
          const widget = productWidgets.find(w => w._id.toString() === favorite.widgetId.toString());

          if (widget && widget.settings?.specific?.products) {
            const product = widget.settings.specific.products.find(p => p._id.toString() === favorite.productId);

            if (product) {
              const thumbnail = product.productImage || `https://via.placeholder.com/150x150?text=${encodeURIComponent(product.productName)}`;
              businessPages.push({
                _id: favorite._id, // Use favorite ID as unique identifier
                title: product.productName,
                slug: `${widget.name}-${product.productName}`.toLowerCase().replace(/\s+/g, '-'),
                description: `Product from ${widget.name}`,
                pageType: "product",
                logo: product.productImage,
                cover: product.productImage,
                thumbnail: thumbnail, // Link thumbnail to specific product
                isPublished: true,
                price: product.price,
                currency: product.currency,
                productUrl: product.productUrl
              });

            } else {
              // Product not found - add the widget itself as a business page
              const thumbnail = `https://via.placeholder.com/150x150?text=${encodeURIComponent(widget.name)}`;
              businessPages.push({
                _id: favorite._id,
                title: widget.name,
                slug: widget.name.toLowerCase().replace(/\s+/g, '-'),
                description: `Widget: ${widget.name}`,
                pageType: "widget",
                logo: null,
                cover: null,
                thumbnail: thumbnail, // Link thumbnail to specific widget
                isPublished: true,
                widgetType: widget.type
              });
            }
          } else {
            // Widget has no products - add the widget itself
            const thumbnail = `https://via.placeholder.com/150x150?text=${encodeURIComponent(widget.name)}`;
            businessPages.push({
              _id: favorite._id,
              title: widget.name,
              slug: widget.name.toLowerCase().replace(/\s+/g, '-'),
              description: `Widget: ${widget.name}`,
              pageType: "widget",
              logo: null,
              cover: null,
              thumbnail: thumbnail, // Link thumbnail to specific widget
              isPublished: true,
              widgetType: widget.type
            });
          }
        }
      }


      // Generate final thumbnails from all business pages (linked to specific items)
      const finalThumbnails = businessPages
        .map(page => page.thumbnail)
        .filter(Boolean)
        .slice(0, 4);

      // Remove businessPages field from response and add computed fields
      const { businessPages: _, ...folderWithoutBusinessPages } = folder;
      
      return {
        ...folderWithoutBusinessPages,
        thumbnails: finalThumbnails,
        lastUpdatedPage: businessPages.length > 0 ? businessPages[0]._id : null,
        itemCount: favorites.length
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        folders,
        totalCount: folders.length,
        appliedFilters: {
          includeEmpty,
          category,
          sortBy
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single folder details
exports.getFolder = async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;

    const folder = await Folder.findOne({ _id: folderId, userId }).lean();
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
    }

    // Get favorites count and recent favorites
    const [favoriteCount, recentFavorites] = await Promise.all([
      Favorite.countDocuments({ folderId, userId }),
      Favorite.find({ folderId, userId })
        .populate({
          path: 'businessId',
          select: 'businessName logo industry location'
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    // Update last accessed
    await Folder.findByIdAndUpdate(folderId, {
      $set: { 'metadata.lastAccessed': new Date() }
    });

    res.status(200).json({
      success: true,
      data: {
        folder: {
          ...folder,
          itemCount: favoriteCount
        },
        recentFavorites
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update folder
exports.updateFolder = async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const { error, value } = validateFolderUpdate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const updateData = value;

    // Check if folder exists
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
    }

    // Check if trying to update name and it conflicts
    if (updateData.name && updateData.name !== folder.name) {
      const existingFolder = await Folder.findOne({ 
        userId, 
        name: updateData.name,
        _id: { $ne: folderId }
      });
      if (existingFolder) {
        return res.status(409).json({
          success: false,
          message: 'Folder with this name already exists',
        });
      }
    }

    // Prevent updating default folder's isDefault flag
    if (folder.isDefault && updateData.hasOwnProperty('isDefault') && !updateData.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove default flag from default folder',
      });
    }

    // Update folder
    const updatedFolder = await Folder.findByIdAndUpdate(
      folderId,
      { $set: updateData },
      { new: true }
    ).lean();

    res.status(200).json({
      success: true,
      message: 'Folder updated successfully',
      data: { folder: updatedFolder },
    });
  } catch (error) {
    next(error);
  }
};

// Delete folder
exports.deleteFolder = async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;

    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found',
      });
    }

    // Prevent deleting default folder
    if (folder.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default folder',
      });
    }

    // Get count of favorites that will be moved
    const favoritesCount = await Favorite.countDocuments({ folderId });

    // Delete folder (middleware will handle moving favorites)
    await folder.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Folder deleted successfully',
      data: {
        movedFavoritesCount: favoritesCount
      },
    });
  } catch (error) {
    next(error);
  }
};

// Search folders
exports.searchFolders = async (req, res, next) => {
  try {
    const { error, value } = validateFolderSearch(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const { query, limit, includeEmpty } = value;

    // Build search query
    const searchQuery = {
      userId,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { 'metadata.tags': { $in: [new RegExp(query, 'i')] } }
      ]
    };

    if (!includeEmpty) {
      searchQuery.itemCount = { $gt: 0 };
    }

    const folders = await Folder.find(searchQuery)
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        folders,
        searchQuery: query,
        totalFound: folders.length
      },
    });
  } catch (error) {
    next(error);
  }
};

// Reorder folders
exports.reorderFolders = async (req, res, next) => {
  try {
    const { error, value } = validateFolderReorder(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const { folderOrders } = value;

    // Verify all folders belong to user
    const folderIds = folderOrders.map(item => item.folderId);
    const folders = await Folder.find({
      _id: { $in: folderIds },
      userId
    });

    if (folders.length !== folderIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Some folders not found',
      });
    }

    // Update sort orders
    const updatePromises = folderOrders.map(({ folderId, sortOrder }) =>
      Folder.findByIdAndUpdate(folderId, { $set: { sortOrder } })
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Folders reordered successfully',
      data: {
        updatedCount: folderOrders.length
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get folder statistics
exports.getFolderStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get folder statistics
    const stats = await Folder.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalFolders: { $sum: 1 },
          totalItems: { $sum: '$itemCount' },
          avgItemsPerFolder: { $avg: '$itemCount' },
          publicFolders: {
            $sum: { $cond: ['$isPublic', 1, 0] }
          },
          privateFolders: {
            $sum: { $cond: ['$isPublic', 0, 1] }
          },
          categoryCounts: {
            $push: '$metadata.category'
          }
        }
      }
    ]);

    // Get category distribution
    const categoryStats = await Folder.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$metadata.category',
          count: { $sum: 1 },
          totalItems: { $sum: '$itemCount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get most active folders
    const mostActiveFolders = await Folder.find({ userId })
      .sort({ itemCount: -1, 'metadata.lastAccessed': -1 })
      .limit(5)
      .select('name itemCount metadata.lastAccessed color icon')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalFolders: 0,
          totalItems: 0,
          avgItemsPerFolder: 0,
          publicFolders: 0,
          privateFolders: 0
        },
        categoryDistribution: categoryStats,
        mostActiveFolders
      },
    });
  } catch (error) {
    next(error);
  }
};

// Duplicate folder
exports.duplicateFolder = async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;
    const { name, copyFavorites = false } = req.body;

    // Find source folder
    const sourceFolder = await Folder.findOne({ _id: folderId, userId });
    if (!sourceFolder) {
      return res.status(404).json({
        success: false,
        message: 'Source folder not found',
      });
    }

    // Check if new name conflicts
    const newName = name || `${sourceFolder.name} (Copy)`;
    const existingFolder = await Folder.findOne({ userId, name: newName });
    if (existingFolder) {
      return res.status(409).json({
        success: false,
        message: 'Folder with this name already exists',
      });
    }

    // Create duplicate folder
    const duplicateFolder = new Folder({
      userId,
      name: newName,
      description: sourceFolder.description,
      color: sourceFolder.color,
      icon: sourceFolder.icon,
      isPublic: sourceFolder.isPublic,
      sortOrder: sourceFolder.sortOrder + 1,
      metadata: {
        ...sourceFolder.metadata,
        category: sourceFolder.metadata?.category || 'other'
      }
    });

    await duplicateFolder.save();

    // Copy favorites if requested
    let copiedFavoritesCount = 0;
    if (copyFavorites) {
      const sourceFavorites = await Favorite.find({ folderId, userId });
      
      const duplicateFavorites = sourceFavorites.map(fav => ({
        userId: fav.userId,
        businessId: fav.businessId,
        folderId: duplicateFolder._id,
        notes: fav.notes,
        tags: fav.tags,
        rating: fav.rating,
        isPrivate: fav.isPrivate,
        metadata: fav.metadata
      }));

      if (duplicateFavorites.length > 0) {
        await Favorite.insertMany(duplicateFavorites);
        copiedFavoritesCount = duplicateFavorites.length;
        
        // Update folder item count
        duplicateFolder.itemCount = copiedFavoritesCount;
        await duplicateFolder.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Folder duplicated successfully',
      data: {
        folder: duplicateFolder,
        copiedFavoritesCount
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get business pages from a folder (KON-35) - Returns ALL types of favorites
exports.getFolderBusinessPages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;
    const { page = 1, limit = 20, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;

    // Verify folder ownership
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found or access denied'
      });
    }

    // Use the existing favorites system to get all types
    const options = {
      folderId,
      sortBy,
      sortOrder,
      limit: parseInt(limit),
      page: parseInt(page)
    };

    // Get all favorites using the existing method
    const favorites = await Favorite.getUserFavoritesByType(userId, options);

    // Organize favorites by type into separate arrays
    const organizedData = {
      business: [],
      products: [],
      events: [],
      promotions: [],
      widgets: []
    };

    for (const favorite of favorites) {
      let itemData = {
        _id: favorite._id,
        title: '',
        slug: '',
        description: '',
        logo: null,
        cover: null,
        isPublished: true,
        createdAt: favorite.createdAt,
        updatedAt: favorite.updatedAt,
        favoriteType: favorite.type
      };

      // Process based on favorite type and available data
      if (favorite.type === 'Page' && favorite.pageData) {
        itemData = {
          ...itemData,
          _id: favorite.pageData._id,
          title: favorite.pageData.title,
          slug: favorite.pageData.slug,
          description: favorite.pageData.description,
          logo: favorite.pageData.logo,
          cover: favorite.pageData.cover,
          isPublished: favorite.pageData.isPublished,
          priceRange: favorite.pageData.priceRange,
          location: favorite.pageData.location,
          pageType: favorite.pageData.pageType
        };
        organizedData.business.push(itemData);
        
      } else if (favorite.type === 'Product' && favorite.productData) {
        itemData = {
          ...itemData,
          _id: favorite.productData._id,
          title: favorite.productData.productName,
          slug: `${favorite.productData.widgetName}-${favorite.productData.productName}`.toLowerCase().replace(/\s+/g, '-'),
          description: `Product from ${favorite.productData.widgetName}`,
          logo: favorite.productData.productImage,
          cover: favorite.productData.productImage,
          price: favorite.productData.price,
          currency: favorite.productData.currency,
          productUrl: favorite.productData.productUrl,
          widgetType: favorite.productData.widgetType,
          widgetId: favorite.productData.widgetId
        };
        organizedData.products.push(itemData);
        
      } else if (favorite.type === 'Product' && favorite.widgetData) {
        // Product not found - add to products array with unavailable flag
        itemData = {
          ...itemData,
          _id: favorite._id,
          title: "Product Not Found",
          slug: `product-not-found-${favorite._id}`,
          description: "The favorited product is no longer available",
          logo: null,
          cover: null,
          isPublished: false,
          widgetType: favorite.widgetData.type,
          note: "This product has been removed or is no longer available",
          isUnavailable: true
        };
        organizedData.products.push(itemData);
        
      } else if (favorite.type === 'Promotion' && favorite.widgetData) {
        itemData = {
          ...itemData,
          _id: favorite.widgetData._id,
          title: favorite.widgetData.name,
          slug: favorite.widgetData.name.toLowerCase().replace(/\s+/g, '-'),
          description: `Promotion: ${favorite.widgetData.name}`,
          logo: null,
          cover: null,
          widgetType: favorite.widgetData.type,
          settings: favorite.widgetData.settings,
          layout: favorite.widgetData.layout,
          status: favorite.widgetData.status
        };
        organizedData.promotions.push(itemData);
        
      } else if (favorite.type === 'Event' && favorite.widgetData) {
        itemData = {
          ...itemData,
          _id: favorite.widgetData._id,
          title: favorite.widgetData.name,
          slug: favorite.widgetData.name.toLowerCase().replace(/\s+/g, '-'),
          description: `Event: ${favorite.widgetData.name}`,
          logo: null,
          cover: null,
          widgetType: favorite.widgetData.type,
          settings: favorite.widgetData.settings,
          layout: favorite.widgetData.layout,
          status: favorite.widgetData.status
        };
        organizedData.events.push(itemData);
        
      } else if (favorite.type === 'BusinessProfile' && favorite.widgetData) {
        itemData = {
          ...itemData,
          _id: favorite.widgetData._id,
          title: favorite.widgetData.name,
          slug: favorite.widgetData.name.toLowerCase().replace(/\s+/g, '-'),
          description: `Business: ${favorite.widgetData.name}`,
          logo: null,
          cover: null,
          widgetType: favorite.widgetData.type,
          settings: favorite.widgetData.settings,
          layout: favorite.widgetData.layout,
          status: favorite.widgetData.status
        };
        organizedData.business.push(itemData);
        
      } else if (favorite.widgetData) {
        // Generic widget fallback
        itemData = {
          ...itemData,
          _id: favorite.widgetData._id,
          title: favorite.widgetData.name,
          slug: favorite.widgetData.name.toLowerCase().replace(/\s+/g, '-'),
          description: `Widget: ${favorite.widgetData.name}`,
          logo: null,
          cover: null,
          widgetType: favorite.widgetData.type,
          settings: favorite.widgetData.settings,
          layout: favorite.widgetData.layout,
          status: favorite.widgetData.status
        };
        organizedData.widgets.push(itemData);
      }
    }

    // Get total count for pagination
    const totalCount = await Favorite.countDocuments({ folderId, userId });

    // Calculate totals for each category
    const totals = {
      business: organizedData.business.length,
      products: organizedData.products.length,
      events: organizedData.events.length,
      promotions: organizedData.promotions.length,
      widgets: organizedData.widgets.length,
      total: totalCount
    };

    res.status(200).json({
      success: true,
      data: {
        folder: {
          _id: folder._id,
          name: folder.name,
          description: folder.description,
          color: folder.color,
          icon: folder.icon,
          itemCount: folder.itemCount,
          thumbnails: folder.thumbnails
        },
        // Separate arrays for each type
        business: organizedData.business,
        products: organizedData.products,
        events: organizedData.events,
        promotions: organizedData.promotions,
        widgets: organizedData.widgets,
        // Summary counts
        counts: totals,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalCount / parseInt(limit)),
          count: totalCount,
          totalItems: totalCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add business page to folder (KON-35)
exports.addBusinessPageToFolder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;
    const { pageId } = req.body;

    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: 'Page ID is required'
      });
    }

    // Verify folder ownership
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found or access denied'
      });
    }

    // Check if page already exists in this folder
    const existingFavorite = await Favorite.findOne({ 
      folderId, 
      userId,
      $or: [
        { widgetId: pageId },
        { productId: pageId }
      ]
    });

    if (existingFavorite) {
      return res.status(409).json({
        success: false,
        message: 'Page already exists in this folder'
      });
    }

    // Create a new favorite for this page
    const favorite = new Favorite({
      userId,
      type: 'Page',
      widgetId: pageId,
      folderId: folder._id,
      metadata: {
        addedFrom: 'folder_management',
        deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop'
      }
    });

    await favorite.save();

    // Update folder item count
    const itemCount = await Favorite.countDocuments({ folderId, userId });
    await Folder.findByIdAndUpdate(folderId, { itemCount });

    res.status(200).json({
      success: true,
      message: 'Business page added to folder successfully',
      data: {
        folder: {
          _id: folder._id,
          name: folder.name,
          itemCount: itemCount
        },
        page: {
          _id: pageId,
          type: 'Page'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Remove business page from folder (KON-35)
exports.removeBusinessPageFromFolder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folderId, pageId } = req.params;

    // Verify folder ownership
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found or access denied'
      });
    }

    // Find and remove the favorite from the folder
    const favorite = await Favorite.findOne({ 
      folderId, 
      userId,
      $or: [
        { widgetId: pageId },
        { productId: pageId }
      ]
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Page not found in this folder'
      });
    }

    await favorite.deleteOne();

    // Update folder item count
    const itemCount = await Favorite.countDocuments({ folderId, userId });
    await Folder.findByIdAndUpdate(folderId, { itemCount });

    res.status(200).json({
      success: true,
      message: 'Business page removed from folder successfully',
      data: {
        folder: {
          _id: folder._id,
          name: folder.name,
          itemCount: itemCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Move business page between folders (KON-35)
exports.moveBusinessPageBetweenFolders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { fromFolderId, toFolderId } = req.body;

    if (!fromFolderId || !toFolderId) {
      return res.status(400).json({
        success: false,
        message: 'Both fromFolderId and toFolderId are required'
      });
    }

    if (fromFolderId === toFolderId) {
      return res.status(400).json({
        success: false,
        message: 'Source and target folders cannot be the same'
      });
    }

    // Verify both folders belong to user
    const [fromFolder, toFolder] = await Promise.all([
      Folder.findOne({ _id: fromFolderId, userId }),
      Folder.findOne({ _id: toFolderId, userId })
    ]);

    if (!fromFolder) {
      return res.status(404).json({
        success: false,
        message: 'Source folder not found or access denied'
      });
    }

    if (!toFolder) {
      return res.status(404).json({
        success: false,
        message: 'Target folder not found or access denied'
      });
    }

    // Find the favorite in the source folder
    const favorite = await Favorite.findOne({ 
      folderId: fromFolderId, 
      userId,
      $or: [
        { widgetId: pageId },
        { productId: pageId }
      ]
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Page not found in source folder'
      });
    }

    // Move the favorite to the target folder
    favorite.folderId = toFolderId;
    await favorite.save();

    // Update item counts for both folders
    const [fromFolderCount, toFolderCount] = await Promise.all([
      Favorite.countDocuments({ folderId: fromFolderId, userId }),
      Favorite.countDocuments({ folderId: toFolderId, userId })
    ]);

    await Promise.all([
      Folder.findByIdAndUpdate(fromFolderId, { itemCount: fromFolderCount }),
      Folder.findByIdAndUpdate(toFolderId, { itemCount: toFolderCount })
    ]);

    res.status(200).json({
      success: true,
      message: 'Business page moved successfully',
      data: {
        pageId,
        fromFolder: {
          _id: fromFolder._id,
          name: fromFolder.name,
          itemCount: fromFolderCount
        },
        toFolder: {
          _id: toFolder._id,
          name: toFolder.name,
          itemCount: toFolderCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update folder thumbnails (KON-35)
exports.updateFolderThumbnails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;

    // Verify folder ownership
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found or access denied'
      });
    }

    // Update thumbnails
    await folder.updateThumbnails();

    res.status(200).json({
      success: true,
      message: 'Folder thumbnails updated successfully',
      data: {
        folder: {
          _id: folder._id,
          name: folder.name,
          thumbnails: folder.thumbnails,
          itemCount: folder.itemCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get business pages from folder (simplified - no folder details)
exports.getFolderPages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;
    const { page = 1, limit = 20, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;

    // Verify folder ownership
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found or access denied'
      });
    }

    // Get favorites in this folder
    const favorites = await Favorite.find({ folderId, userId }).lean();

    // Separate favorites by type
    const pageFavorites = favorites.filter(f => f.type === 'Page');
    const productFavorites = favorites.filter(f => f.type === 'Product');
    const otherFavorites = favorites.filter(f => !['Page', 'Product'].includes(f.type));

    let businessPages = [];

    // Process Page favorites (business profiles and builder pages)
    if (pageFavorites.length > 0) {
      const pageIds = pageFavorites
        .filter(f => f.widgetId)
        .map(f => f.widgetId);

      // Try BusinessProfile first
      let businessProfiles = await BusinessProfile.find({ _id: { $in: pageIds } })
        .select('businessName username description logo coverImages createdAt updatedAt')
        .lean();

      // If no business profiles found, try BuilderPage
      if (businessProfiles.length === 0) {
        const BuilderPage = require('../models/builderPage.model');
        const builderPages = await BuilderPage.find({ _id: { $in: pageIds } })
          .select('title slug description pageType logo cover settings createdAt updatedAt')
          .lean();

        businessProfiles = builderPages.map(page => ({
          _id: page._id,
          businessName: page.title,
          username: page.slug,
          description: { short: page.description },
          logo: page.logo,
          coverImages: page.cover ? [page.cover] : [],
          createdAt: page.createdAt,
          updatedAt: page.updatedAt
        }));
      }

      businessPages = businessProfiles.map(profile => ({
        _id: profile._id,
        title: profile.businessName,
        slug: profile.username,
        description: profile.description?.short || profile.description?.full,
        pageType: "business",
        logo: profile.logo,
        cover: profile.coverImages?.[0] || null,
        isPublished: true,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      }));
    }

    // Process Product favorites
    if (productFavorites.length > 0) {
      const productWidgetIds = productFavorites.map(f => f.widgetId);
      const productWidgets = await Widget.find({ _id: { $in: productWidgetIds } })
        .select('name type settings createdAt updatedAt')
        .lean();

      for (const favorite of productFavorites) {
        const widget = productWidgets.find(w => w._id.toString() === favorite.widgetId.toString());

        if (widget && widget.settings?.specific?.products) {
          const product = widget.settings.specific.products.find(p => p._id.toString() === favorite.productId);
          if (product) {
            businessPages.push({
              _id: favorite._id,
              title: product.productName,
              slug: `${widget.name}-${product.productName}`.toLowerCase().replace(/\s+/g, '-'),
              description: `Product from ${widget.name}`,
              pageType: "product",
              logo: product.productImage,
              cover: product.productImage,
              isPublished: true,
              createdAt: favorite.createdAt,
              updatedAt: favorite.updatedAt,
              price: product.price,
              currency: product.currency,
              productUrl: product.productUrl
            });
          }
        } else if (widget) {
          // Widget has no products - add the widget itself
          businessPages.push({
            _id: favorite._id,
            title: widget.name,
            slug: widget.name.toLowerCase().replace(/\s+/g, '-'),
            description: `Widget: ${widget.name}`,
            pageType: "widget",
            logo: null,
            cover: null,
            isPublished: true,
            createdAt: favorite.createdAt,
            updatedAt: favorite.updatedAt,
            widgetType: widget.type
          });
        }
      }
    }

    // Sort business pages
    businessPages.sort((a, b) => {
      const aValue = a[sortBy] || a.createdAt;
      const bValue = b[sortBy] || b.createdAt;
      return sortOrder === 'desc' ? 
        new Date(bValue) - new Date(aValue) : 
        new Date(aValue) - new Date(bValue);
    });

    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = businessPages.length;
    const paginatedPages = businessPages.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        businessPages: paginatedPages,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalCount / parseInt(limit)),
          count: paginatedPages.length,
          totalItems: totalCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
}; 