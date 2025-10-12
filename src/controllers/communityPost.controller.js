const mongoose = require('mongoose');
const CommunityPost = require('../models/communityPost.model');
const CommunityTopic = require('../models/communityTopic.model');
const BusinessProfile = require('../models/businessProfile.model');
const {
  createPostSchema,
  updatePostSchema,
  updateStatusSchema,
  getPostsSchema
} = require('../utils/communityValidation');

// Create new community post
exports.createPost = async (req, res, next) => {
  try {
    const { error, value } = createPostSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const { topicId, title, description, implementationStatus, metadata } = value;

    // Verify topic exists
    const topic = await CommunityTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    // Check if user has a business profile
    let businessId = null;
    const businessProfile = await BusinessProfile.findOne({ userId });
    if (businessProfile) {
      businessId = businessProfile._id;
    }

    // Set default values for user-friendly post creation
    const defaultMetadata = {
      tags: [],
      priority: 'medium',
      estimatedEffort: 'medium'
    };

    // Create post with defaults
    const post = new CommunityPost({
      topicId,
      userId,
      businessId,
      title,
      description,
      implementationStatus: implementationStatus || 'planned', // Default to 'planned'
      metadata: metadata ? { ...defaultMetadata, ...metadata } : defaultMetadata
    });

    await post.save();

    // Populate the post for response
    const populatedPost = await CommunityPost.findById(post._id)
      .populate('topicId', 'name description')
      .populate('userId', 'username email')
      .populate('businessId', 'businessName username logo')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Community post created successfully',
      data: { post: populatedPost },
    });
  } catch (error) {
    next(error);
  }
};

// Get community posts
exports.getPosts = async (req, res, next) => {
  try {
    const { error, value } = getPostsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const { topicId, userId, implementationStatus, page, limit, sortBy, sortOrder } = value;

    // Build query
    const query = { isActive: true };
    if (topicId) query.topicId = topicId;
    if (userId) query.userId = userId;
    if (implementationStatus) query.implementationStatus = implementationStatus;

    // Build sort options
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
      case 'updatedAt':
        sortOptions.updatedAt = sortOrder === 'desc' ? -1 : 1;
        break;
      default:
        sortOptions.createdAt = sortOrder === 'desc' ? -1 : 1;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get posts
    const [posts, totalCount] = await Promise.all([
      CommunityPost.find(query)
        .populate('topicId', 'name description')
        .populate('userId', 'username email')
        .populate('businessId', 'businessName username logo')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      CommunityPost.countDocuments(query)
    ]);

    // Add author information to each post
    const postsWithAuthor = posts.map(post => ({
      ...post,
      authorName: post.businessId?.businessName || post.userId?.username || 'Anonymous',
      authorType: post.businessId ? 'business' : 'user',
      authorLogo: post.businessId?.logo || null
    }));

    res.status(200).json({
      success: true,
      data: {
        posts: postsWithAuthor,
        pagination: {
          current: page,
          total: Math.ceil(totalCount / limit),
          count: postsWithAuthor.length,
          totalItems: totalCount
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single community post
exports.getPost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID',
      });
    }

    const post = await CommunityPost.findOne({ _id: postId, isActive: true })
      .populate('topicId', 'name description')
      .populate('userId', 'username email')
      .populate('businessId', 'businessName username logo')
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // Add author information
    const postWithAuthor = {
      ...post,
      authorName: post.businessId?.businessName || post.userId?.username || 'Anonymous',
      authorType: post.businessId ? 'business' : 'user',
      authorLogo: post.businessId?.logo || null
    };

    res.status(200).json({
      success: true,
      data: { post: postWithAuthor },
    });
  } catch (error) {
    next(error);
  }
};

// Update community post
exports.updatePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { error, value } = updatePostSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID',
      });
    }

    const userId = req.user.id;

    // Check if post exists and user owns it
    const post = await CommunityPost.findOne({ _id: postId, userId, isActive: true });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or you do not have permission to edit it',
      });
    }

    // Update post
    const updatedPost = await CommunityPost.findByIdAndUpdate(
      postId,
      { $set: value },
      { new: true }
    )
      .populate('topicId', 'name description')
      .populate('userId', 'username email')
      .populate('businessId', 'businessName username logo')
      .lean();

    // Add author information
    const postWithAuthor = {
      ...updatedPost,
      authorName: updatedPost.businessId?.businessName || updatedPost.userId?.username || 'Anonymous',
      authorType: updatedPost.businessId ? 'business' : 'user',
      authorLogo: updatedPost.businessId?.logo || null
    };

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      data: { post: postWithAuthor },
    });
  } catch (error) {
    next(error);
  }
};

// Delete community post
exports.deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID',
      });
    }

    const userId = req.user.id;

    // Check if post exists and user owns it
    const post = await CommunityPost.findOne({ _id: postId, userId, isActive: true });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or you do not have permission to delete it',
      });
    }

    // Soft delete (set isActive to false)
    await CommunityPost.findByIdAndUpdate(postId, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Toggle like on a post
exports.toggleLike = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID',
      });
    }

    // Find the post
    const post = await CommunityPost.findOne({ _id: postId, isActive: true });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // Toggle like
    await post.toggleLike(userId);

    // Get updated post with like information
    const updatedPost = await CommunityPost.findById(postId)
      .populate('topicId', 'name description')
      .populate('userId', 'username email')
      .populate('businessId', 'businessName username logo')
      .lean();

    // Check if current user liked the post
    const isLiked = updatedPost.likes.some(like => 
      like.userId.toString() === userId.toString()
    );

    // Add author information
    const postWithAuthor = {
      ...updatedPost,
      authorName: updatedPost.businessId?.businessName || updatedPost.userId?.username || 'Anonymous',
      authorType: updatedPost.businessId ? 'business' : 'user',
      authorLogo: updatedPost.businessId?.logo || null,
      isLiked
    };

    res.status(200).json({
      success: true,
      message: isLiked ? 'Post liked successfully' : 'Post unliked successfully',
      data: { 
        post: postWithAuthor,
        isLiked,
        likeCount: updatedPost.likeCount
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get post likes
exports.getPostLikes = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID',
      });
    }

    const post = await CommunityPost.findOne({ _id: postId, isActive: true })
      .populate('likes.userId', 'username email')
      .select('likes likeCount')
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        likes: post.likes,
        likeCount: post.likeCount
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin update post (with all fields)
exports.adminUpdatePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { error, value } = updatePostSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID',
      });
    }

    // Check if post exists (admin can update any post)
    const post = await CommunityPost.findOne({ _id: postId, isActive: true });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // Update post (admin can update any field)
    const updatedPost = await CommunityPost.findByIdAndUpdate(
      postId,
      { $set: value },
      { new: true }
    )
      .populate('topicId', 'name description')
      .populate('userId', 'username email')
      .populate('businessId', 'businessName username logo')
      .lean();

    // Add author information
    const postWithAuthor = {
      ...updatedPost,
      authorName: updatedPost.businessId?.businessName || updatedPost.userId?.username || 'Anonymous',
      authorType: updatedPost.businessId ? 'business' : 'user',
      authorLogo: updatedPost.businessId?.logo || null
    };

    res.status(200).json({
      success: true,
      message: 'Post updated successfully by admin',
      data: { post: postWithAuthor },
    });
  } catch (error) {
    next(error);
  }
};

// Update implementation status
exports.updateStatus = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { error, value } = updateStatusSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID',
      });
    }

    const userId = req.user.id;
    const { implementationStatus } = value;

    // Check if post exists and user owns it
    const post = await CommunityPost.findOne({ _id: postId, userId, isActive: true });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or you do not have permission to update it',
      });
    }

    // Update status
    const updatedPost = await CommunityPost.findByIdAndUpdate(
      postId,
      { implementationStatus },
      { new: true }
    )
      .populate('topicId', 'name description')
      .populate('userId', 'username email')
      .populate('businessId', 'businessName username logo')
      .lean();

    // Add author information
    const postWithAuthor = {
      ...updatedPost,
      authorName: updatedPost.businessId?.businessName || updatedPost.userId?.username || 'Anonymous',
      authorType: updatedPost.businessId ? 'business' : 'user',
      authorLogo: updatedPost.businessId?.logo || null
    };

    res.status(200).json({
      success: true,
      message: 'Implementation status updated successfully',
      data: { post: postWithAuthor },
    });
  } catch (error) {
    next(error);
  }
};

// Get posts by user
exports.getUserPosts = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    const options = { page: parseInt(page), limit: parseInt(limit), sortBy, sortOrder };
    const posts = await CommunityPost.getPostsByUser(userId, options);

    // Add author information to each post
    const postsWithAuthor = posts.map(post => ({
      ...post,
      authorName: post.businessId?.businessName || post.userId?.username || 'Anonymous',
      authorType: post.businessId ? 'business' : 'user',
      authorLogo: post.businessId?.logo || null
    }));

    // Get total count
    const totalCount = await CommunityPost.countDocuments({ userId, isActive: true });

    res.status(200).json({
      success: true,
      data: {
        posts: postsWithAuthor,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalCount / parseInt(limit)),
          count: postsWithAuthor.length,
          totalItems: totalCount
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get posts by topic
exports.getTopicPosts = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid topic ID',
      });
    }

    // Verify topic exists
    const topic = await CommunityTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    const options = { page: parseInt(page), limit: parseInt(limit), sortBy, sortOrder };
    const posts = await CommunityPost.getPostsByTopic(topicId, options);

    // Add author information to each post
    const postsWithAuthor = posts.map(post => ({
      ...post,
      authorName: post.businessId?.businessName || post.userId?.username || 'Anonymous',
      authorType: post.businessId ? 'business' : 'user',
      authorLogo: post.businessId?.logo || null
    }));

    // Get total count
    const totalCount = await CommunityPost.countDocuments({ topicId, isActive: true });

    res.status(200).json({
      success: true,
      data: {
        topic: {
          _id: topic._id,
          name: topic.name,
          description: topic.description
        },
        posts: postsWithAuthor,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalCount / parseInt(limit)),
          count: postsWithAuthor.length,
          totalItems: totalCount
        }
      },
    });
  } catch (error) {
    next(error);
  }
};
