const mongoose = require('mongoose');
const Folder = require('../models/folder.model');
const Favorite = require('../models/favorite.model');
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

    // Update item counts from businessPages and ensure new fields are present
    folders = await Promise.all(folders.map(async (folder) => {
      const businessPages = folder.businessPages || [];
      const thumbnails = folder.thumbnails || [];
      const lastUpdatedPage = folder.lastUpdatedPage || null;
      
      let populatedBusinessPages = businessPages;
      
      // Optionally populate business pages with full data
      if (populatePages && businessPages.length > 0) {
        try {
          populatedBusinessPages = await folder.getBusinessPages();
        } catch (error) {
          console.error('Error populating business pages:', error);
          populatedBusinessPages = businessPages; // Fallback to IDs only
        }
      }
      
      return {
        ...folder,
        businessPages: populatedBusinessPages,
        thumbnails: thumbnails,
        lastUpdatedPage: lastUpdatedPage,
        itemCount: businessPages.length
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

// Get business pages from a folder (KON-35)
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

    // Get business pages with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const businessPages = await folder.getBusinessPages();
    const totalCount = businessPages.length;
    const paginatedPages = businessPages.slice(skip, skip + parseInt(limit));

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

    // Verify page exists and belongs to user
    const BuilderPage = require('../models/builderPage.model');
    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found or access denied'
      });
    }

    // Add page to folder
    await folder.addBusinessPage(pageId);
    
    // Update thumbnails
    await folder.updateThumbnails();

    res.status(200).json({
      success: true,
      message: 'Business page added to folder successfully',
      data: {
        folder: {
          _id: folder._id,
          name: folder.name,
          itemCount: folder.itemCount,
          thumbnails: folder.thumbnails
        },
        page: {
          _id: page._id,
          title: page.title,
          slug: page.slug
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

    // Remove page from folder
    await folder.removeBusinessPage(pageId);
    
    // Update thumbnails
    await folder.updateThumbnails();

    res.status(200).json({
      success: true,
      message: 'Business page removed from folder successfully',
      data: {
        folder: {
          _id: folder._id,
          name: folder.name,
          itemCount: folder.itemCount,
          thumbnails: folder.thumbnails
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

    // Verify page exists in source folder
    if (!fromFolder.businessPages.some(id => id.toString() === pageId)) {
      return res.status(404).json({
        success: false,
        message: 'Page not found in source folder'
      });
    }

    // Move page between folders
    const result = await fromFolder.moveBusinessPageTo(pageId, toFolderId);
    
    // Update thumbnails for both folders
    await Promise.all([
      result.fromFolder.updateThumbnails(),
      result.toFolder.updateThumbnails()
    ]);

    res.status(200).json({
      success: true,
      message: 'Business page moved successfully',
      data: {
        pageId,
        fromFolder: {
          _id: result.fromFolder._id,
          name: result.fromFolder.name,
          itemCount: result.fromFolder.itemCount
        },
        toFolder: {
          _id: result.toFolder._id,
          name: result.toFolder.name,
          itemCount: result.toFolder.itemCount
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