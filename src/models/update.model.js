const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
    },
    widgetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Widget',
      default: null,
    },
    action: {
      type: String,
      enum: ['added', 'removed'],
      required: true,
    },
    widgetType: {
      type: String,
      default: null,
    },
    widgetName: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

updateSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
updateSchema.index({ businessId: 1, widgetId: 1 });

module.exports = mongoose.model('Update', updateSchema);
