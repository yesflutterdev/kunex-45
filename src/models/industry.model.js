const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const industrySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    enum: ['business', 'individual', 'both'],
    required: true,
    index: true
  },
  subcategories: {
    type: [subcategorySchema],
    default: []
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  image: {
    type: String,
    trim: true,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
industrySchema.index({ type: 1, isActive: 1 });
industrySchema.index({ title: 1, type: 1 });

industrySchema.methods.findSubcategoryById = function(subcategoryId) {
  return this.subcategories.find(sub => sub.id === subcategoryId);
};

industrySchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

industrySchema.statics.getByType = function(type) {
  return this.find({ 
    type: { $in: [type, 'both'] },
    isActive: true 
  }).sort({ title: 1 });
};

module.exports = mongoose.model('Industry', industrySchema);

