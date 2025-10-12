const mongoose = require('mongoose');

const communityTopicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    isActive: {
      type: Boolean,
      default: true
    },
    postCount: {
      type: Number,
      default: 0,
      min: 0
    },
    metadata: {
      color: {
        type: String,
        default: '#3B82F6',
        match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      },
      icon: {
        type: String,
        default: 'topic',
        maxlength: 50
      }
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better performance
// Note: name index is automatically created by unique: true
communityTopicSchema.index({ isActive: 1 });
communityTopicSchema.index({ postCount: -1 });

// Static method to get active topics
communityTopicSchema.statics.getActiveTopics = function() {
  return this.find({ isActive: true })
    .sort({ postCount: -1, name: 1 })
    .lean();
};

// Instance method to increment post count
communityTopicSchema.methods.incrementPostCount = function() {
  this.postCount += 1;
  return this.save();
};

// Instance method to decrement post count
communityTopicSchema.methods.decrementPostCount = function() {
  if (this.postCount > 0) {
    this.postCount -= 1;
  }
  return this.save();
};

const CommunityTopic = mongoose.model('CommunityTopic', communityTopicSchema);

module.exports = CommunityTopic;
