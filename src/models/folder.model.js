const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    color: {
      type: String,
      default: '#3B82F6', // Default blue color
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/ // Hex color validation
    },
    icon: {
      type: String,
      default: 'folder',
      maxlength: 50
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    itemCount: {
      type: Number,
      default: 0,
      min: 0
    },
    // Business pages tracking - REMOVED: Now using favorites system
    // Thumbnails for the folder (from business pages)
    thumbnails: [{
      type: String, // URL to thumbnail image
      default: ''
    }],
    // Last updated business page for quick access
    lastUpdatedPage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BuilderPage'
    },
    metadata: {
      tags: [{
        type: String,
        trim: true,
        maxlength: 50
      }],
      category: {
        type: String,
        enum: ['business', 'personal', 'work', 'travel', 'food', 'entertainment', 'other'],
        default: 'other'
      },
      lastAccessed: {
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
folderSchema.index({ userId: 1 });
folderSchema.index({ userId: 1, name: 1 }, { unique: true });
folderSchema.index({ userId: 1, sortOrder: 1 });
folderSchema.index({ userId: 1, isDefault: 1 });
folderSchema.index({ userId: 1, 'metadata.category': 1 });
folderSchema.index({ createdAt: -1 });

// Static method to get user's folders with item counts
folderSchema.statics.getUserFolders = function(userId, options = {}) {
  const { includeEmpty = true, sortBy = 'sortOrder', limit = 50 } = options;
  
  const query = { userId };
  if (!includeEmpty) {
    query.itemCount = { $gt: 0 };
  }

  const sortOptions = {};
  switch (sortBy) {
    case 'name':
      sortOptions.name = 1;
      break;
    case 'created':
      sortOptions.createdAt = -1;
      break;
    case 'updated':
      sortOptions.updatedAt = -1;
      break;
    case 'itemCount':
      sortOptions.itemCount = -1;
      break;
    default:
      sortOptions.sortOrder = 1;
      sortOptions.createdAt = 1;
  }

  return this.find(query)
    .sort(sortOptions)
    .limit(limit)
    .lean();
};

// Static method to get default folder for user (creates one if it doesn't exist)
folderSchema.statics.getDefaultFolder = async function(userId) {
  let defaultFolder = await this.findOne({ userId, isDefault: true });
  
  // If no default folder exists, create one
  if (!defaultFolder) {
    try {
      defaultFolder = await this.createDefaultFolder(userId);
      console.log(`[Folder] Created default folder for user: ${userId}`);
    } catch (error) {
      console.error(`[Folder] Error creating default folder for user ${userId}:`, error);
      // If creation fails (e.g., duplicate name), try to find it again
      defaultFolder = await this.findOne({ userId, isDefault: true });
    }
  }
  
  return defaultFolder;
};

// Static method to create default folder for new user
folderSchema.statics.createDefaultFolder = function(userId) {
  return this.create({
    userId,
    name: 'My Favorites',
    description: 'Default folder for your favorite businesses',
    isDefault: true,
    sortOrder: 0
  });
};

// Instance method to increment item count
folderSchema.methods.incrementItemCount = function() {
  this.itemCount += 1;
  this.metadata.lastAccessed = new Date();
  return this.save();
};

// Instance method to decrement item count
folderSchema.methods.decrementItemCount = function() {
  if (this.itemCount > 0) {
    this.itemCount -= 1;
  }
  this.metadata.lastAccessed = new Date();
  return this.save();
};

// Instance method to add a business page to folder
folderSchema.methods.addBusinessPage = async function(pageId) {
  if (!this.businessPages.includes(pageId)) {
    this.businessPages.push(pageId);
    this.itemCount = this.businessPages.length;
    this.lastUpdatedPage = pageId;
    this.metadata.lastAccessed = new Date();
    await this.save();
  }
  return this;
};

// Instance method to remove a business page from folder
folderSchema.methods.removeBusinessPage = async function(pageId) {
  this.businessPages = this.businessPages.filter(id => !id.equals(pageId));
  this.itemCount = this.businessPages.length;
  this.metadata.lastAccessed = new Date();
  await this.save();
  return this;
};

// Instance method to move business page to another folder
folderSchema.methods.moveBusinessPageTo = async function(pageId, targetFolderId) {
  const targetFolder = await this.constructor.findById(targetFolderId);
  if (!targetFolder) {
    throw new Error('Target folder not found');
  }
  
  // Remove from current folder
  await this.removeBusinessPage(pageId);
  
  // Add to target folder
  await targetFolder.addBusinessPage(pageId);
  
  return { fromFolder: this, toFolder: targetFolder };
};

// Instance method to get business pages with full data
folderSchema.methods.getBusinessPages = async function() {
  const BuilderPage = mongoose.model('BuilderPage');
  return await BuilderPage.find({ _id: { $in: this.businessPages } })
    .select('title slug description pageType socialLinks createdAt updatedAt')
    .sort({ updatedAt: -1 });
};

// Instance method to update thumbnails from business pages
folderSchema.methods.updateThumbnails = async function() {
  const BuilderPage = mongoose.model('BuilderPage');
  const pages = await BuilderPage.find({ _id: { $in: this.businessPages } })
    .select('title socialLinks')
    .limit(4); // Limit to 4 thumbnails
  
  this.thumbnails = pages.map(page => {
    // Try to get thumbnail from social links or use a default
    const socialLink = page.socialLinks?.find(link => link.platform === 'website');
    return socialLink?.url || `https://via.placeholder.com/150x150?text=${encodeURIComponent(page.title)}`;
  });
  
  await this.save();
  return this;
};

// Pre-save middleware to ensure only one default folder per user
folderSchema.pre('save', async function(next) {
  if (this.isModified('isDefault') && this.isDefault) {
    // Remove default flag from other folders for this user
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Pre-remove middleware to handle folder deletion
folderSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    // Move all favorites from this folder to default folder
    const Favorite = mongoose.model('Favorite');
    // getDefaultFolder is now async and will create one if it doesn't exist
    const defaultFolder = await this.constructor.getDefaultFolder(this.userId);
    
    if (defaultFolder && !this.isDefault) {
      await Favorite.updateMany(
        { folderId: this._id },
        { $set: { folderId: defaultFolder._id } }
      );
      
      // Update item counts
      const movedCount = await Favorite.countDocuments({ folderId: defaultFolder._id });
      await defaultFolder.updateOne({ $set: { itemCount: movedCount } });
    }
    
    next();
  } catch (error) {
    console.error('[Folder] Error in pre-delete middleware:', error);
    next(error);
  }
});

const Folder = mongoose.model('Folder', folderSchema);

module.exports = Folder; 