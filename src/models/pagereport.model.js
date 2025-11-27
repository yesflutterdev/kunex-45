const mongoose = require('mongoose');

const pageReportSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BuilderPage',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    attachment: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient querying
pageReportSchema.index({ pageId: 1, createdAt: -1 });
pageReportSchema.index({ userId: 1, createdAt: -1 });
pageReportSchema.index({ status: 1, createdAt: -1 });
pageReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PageReport', pageReportSchema);

