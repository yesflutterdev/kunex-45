const mongoose = require('mongoose');
const CommunityTopic = require('../models/communityTopic.model');
const {
  createTopicSchema,
  updateTopicSchema,
  getTopicsSchema
} = require('../utils/communityValidation');

// Create new community topic
exports.createTopic = async (req, res, next) => {
  try {
    const { error, value } = createTopicSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const { name, description, metadata } = value;

    // Check if topic name already exists
    const existingTopic = await CommunityTopic.findOne({ name });
    if (existingTopic) {
      return res.status(409).json({
        success: false,
        message: 'Topic with this name already exists',
      });
    }

    // Create topic
    const topic = new CommunityTopic({
      name,
      description,
      metadata
    });

    await topic.save();

    res.status(201).json({
      success: true,
      message: 'Community topic created successfully',
      data: { topic },
    });
  } catch (error) {
    next(error);
  }
};

// Get all community topics
exports.getTopics = async (req, res, next) => {
  try {
    const { error, value } = getTopicsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const { isActive, page, limit, sortBy, sortOrder } = value;

    // Build query
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    // Build sort options
    const sortOptions = {};
    switch (sortBy) {
      case 'name':
        sortOptions.name = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'postCount':
        sortOptions.postCount = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'createdAt':
        sortOptions.createdAt = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'updatedAt':
        sortOptions.updatedAt = sortOrder === 'desc' ? -1 : 1;
        break;
      default:
        sortOptions.postCount = -1;
        sortOptions.name = 1;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get topics
    const [topics, totalCount] = await Promise.all([
      CommunityTopic.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      CommunityTopic.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        topics,
        pagination: {
          current: page,
          total: Math.ceil(totalCount / limit),
          count: topics.length,
          totalItems: totalCount
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single community topic
exports.getTopic = async (req, res, next) => {
  try {
    const { topicId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid topic ID',
      });
    }

    const topic = await CommunityTopic.findById(topicId).lean();
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { topic },
    });
  } catch (error) {
    next(error);
  }
};

// Update community topic
exports.updateTopic = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const { error, value } = updateTopicSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid topic ID',
      });
    }

    // Check if topic exists
    const topic = await CommunityTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    // Check if trying to update name and it conflicts
    if (value.name && value.name !== topic.name) {
      const existingTopic = await CommunityTopic.findOne({ 
        name: value.name,
        _id: { $ne: topicId }
      });
      if (existingTopic) {
        return res.status(409).json({
          success: false,
          message: 'Topic with this name already exists',
        });
      }
    }

    // Update topic
    const updatedTopic = await CommunityTopic.findByIdAndUpdate(
      topicId,
      { $set: value },
      { new: true }
    ).lean();

    res.status(200).json({
      success: true,
      message: 'Topic updated successfully',
      data: { topic: updatedTopic },
    });
  } catch (error) {
    next(error);
  }
};

// Delete community topic
exports.deleteTopic = async (req, res, next) => {
  try {
    const { topicId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid topic ID',
      });
    }

    // Check if topic exists
    const topic = await CommunityTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    // Check if topic has posts
    const CommunityPost = require('../models/communityPost.model');
    const postCount = await CommunityPost.countDocuments({ topicId });
    
    if (postCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete topic. It has ${postCount} posts. Please delete or move the posts first.`,
      });
    }

    // Delete topic
    await CommunityTopic.findByIdAndDelete(topicId);

    res.status(200).json({
      success: true,
      message: 'Topic deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get active topics (for dropdowns)
exports.getActiveTopics = async (req, res, next) => {
  try {
    const topics = await CommunityTopic.getActiveTopics();

    res.status(200).json({
      success: true,
      data: { topics },
    });
  } catch (error) {
    next(error);
  }
};

// Get topic statistics
exports.getTopicStats = async (req, res, next) => {
  try {
    const stats = await CommunityTopic.aggregate([
      {
        $group: {
          _id: null,
          totalTopics: { $sum: 1 },
          activeTopics: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          inactiveTopics: {
            $sum: { $cond: ['$isActive', 0, 1] }
          },
          totalPosts: { $sum: '$postCount' },
          avgPostsPerTopic: { $avg: '$postCount' }
        }
      }
    ]);

    // Get most popular topics
    const popularTopics = await CommunityTopic.find({ isActive: true })
      .sort({ postCount: -1 })
      .limit(5)
      .select('name postCount')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalTopics: 0,
          activeTopics: 0,
          inactiveTopics: 0,
          totalPosts: 0,
          avgPostsPerTopic: 0
        },
        popularTopics
      },
    });
  } catch (error) {
    next(error);
  }
};
