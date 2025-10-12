const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema(
  {
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityTopic',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      default: null
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    implementationStatus: {
      type: String,
      enum: ['completed', 'in-progress', 'planned'],
      default: 'planned'
    },
    likes: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    likeCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    metadata: {
      tags: [{
        type: String,
        trim: true,
        maxlength: 50
      }],
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      estimatedEffort: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      }
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better performance
communityPostSchema.index({ topicId: 1, createdAt: -1 });
communityPostSchema.index({ userId: 1 });
communityPostSchema.index({ businessId: 1 });
communityPostSchema.index({ implementationStatus: 1 });
communityPostSchema.index({ likeCount: -1 });
communityPostSchema.index({ isActive: 1 });

// Virtual for author name (will be populated)
communityPostSchema.virtual('authorName').get(function() {
  if (this.businessId && this.businessId.businessName) {
    return this.businessId.businessName;
  }
  if (this.userId && this.userId.username) {
    return this.userId.username;
  }
  return 'Anonymous';
});

// Virtual for author type
communityPostSchema.virtual('authorType').get(function() {
  return this.businessId ? 'business' : 'user';
});

// Static method to get posts by topic
communityPostSchema.statics.getPostsByTopic = function(topicId, options = {}) {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  
  const query = { topicId, isActive: true };
  
  const sortOptions = {};
  switch (sortBy) {
    case 'likes':
      sortOptions.likeCount = sortOrder === 'desc' ? -1 : 1;
      break;
    case 'title':
      sortOptions.title = sortOrder === 'desc' ? -1 : 1;
      break;
    case 'status':
      sortOptions.implementationStatus = sortOrder === 'desc' ? -1 : 1;
      break;
    default:
      sortOptions.createdAt = sortOrder === 'desc' ? -1 : 1;
  }
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .populate('topicId', 'name description')
    .populate('userId', 'username email')
    .populate('businessId', 'businessName username logo')
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static method to get posts by user
communityPostSchema.statics.getPostsByUser = function(userId, options = {}) {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  
  const query = { userId, isActive: true };
  
  const sortOptions = {};
  switch (sortBy) {
    case 'likes':
      sortOptions.likeCount = sortOrder === 'desc' ? -1 : 1;
      break;
    case 'title':
      sortOptions.title = sortOrder === 'desc' ? -1 : 1;
      break;
    case 'status':
      sortOptions.implementationStatus = sortOrder === 'desc' ? -1 : 1;
      break;
    default:
      sortOptions.createdAt = sortOrder === 'desc' ? -1 : 1;
  }
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .populate('topicId', 'name description')
    .populate('userId', 'username email')
    .populate('businessId', 'businessName username logo')
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .lean();
};

// Instance method to toggle like
communityPostSchema.methods.toggleLike = function(userId) {
  const existingLikeIndex = this.likes.findIndex(
    like => like.userId.toString() === userId.toString()
  );
  
  if (existingLikeIndex > -1) {
    // Unlike: remove the like
    this.likes.splice(existingLikeIndex, 1);
    this.likeCount = Math.max(0, this.likeCount - 1);
  } else {
    // Like: add the like
    this.likes.push({ userId });
    this.likeCount += 1;
  }
  
  return this.save();
};

// Instance method to check if user liked the post
communityPostSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.userId.toString() === userId.toString());
};

// Pre-save middleware to update topic post count
communityPostSchema.pre('save', async function(next) {
  if (this.isNew) {
    const CommunityTopic = mongoose.model('CommunityTopic');
    await CommunityTopic.findByIdAndUpdate(this.topicId, {
      $inc: { postCount: 1 }
    });
  }
  next();
});

// Pre-remove middleware to update topic post count
communityPostSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  const CommunityTopic = mongoose.model('CommunityTopic');
  await CommunityTopic.findByIdAndUpdate(this.topicId, {
    $inc: { postCount: -1 }
  });
  next();
});

const CommunityPost = mongoose.model('CommunityPost', communityPostSchema);

module.exports = CommunityPost;
