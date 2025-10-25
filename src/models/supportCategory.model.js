const mongoose = require('mongoose');

const supportCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    
    order: {
      type: Number,
      default: 0
    },
    
    icon: {
      type: String,
      trim: true,
      maxlength: 100
    },
    
    color: {
      type: String,
      trim: true,
      maxlength: 7, // Hex color code
      default: '#3B82F6'
    },
    
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    usageCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
supportCategorySchema.index({ name: 1 });
supportCategorySchema.index({ isActive: 1, order: 1 });
supportCategorySchema.index({ usageCount: -1 });

// Virtual for formatted name
supportCategorySchema.virtual('displayName').get(function() {
  return this.name;
});

// Static method to get active categories
supportCategorySchema.statics.getActiveCategories = function() {
  return this.find({ isActive: true })
    .sort({ order: 1, name: 1 })
    .select('name description icon color usageCount');
};

// Static method to increment usage count
supportCategorySchema.statics.incrementUsage = function(categoryName) {
  return this.findOneAndUpdate(
    { name: categoryName },
    { $inc: { usageCount: 1 } },
    { new: true }
  );
};

// Static method to get popular categories
supportCategorySchema.statics.getPopularCategories = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ usageCount: -1, name: 1 })
    .limit(limit)
    .select('name description icon color usageCount');
};

// Pre-save middleware to ensure unique name
supportCategorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.trim();
  }
  next();
});

module.exports = mongoose.model('SupportCategory', supportCategorySchema);
