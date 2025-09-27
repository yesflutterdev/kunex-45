const mongoose = require('mongoose');

const formSubmissionSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BuilderPage',
      required: true
    },
    widgetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Widget',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessProfile'
    },
    // Form data submitted by the user
    formData: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    // Form fields configuration from the widget
    formFields: [{
      name: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'radio', 'file', 'date', 'number', 'url'],
        required: true
      },
      label: String,
      placeholder: String,
      required: {
        type: Boolean,
        default: false
      },
      validation: {
        minLength: Number,
        maxLength: Number,
        pattern: String,
        minValue: Number,
        maxValue: Number
      },
      options: [String] // For select, radio, checkbox fields
    }],
    // Submission metadata
    submissionType: {
      type: String,
      enum: ['contact', 'newsletter', 'booking', 'inquiry', 'feedback', 'custom'],
      default: 'contact'
    },
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'archived', 'spam'],
      default: 'new'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    // IP address and user agent for spam detection
    ipAddress: String,
    userAgent: String,
    // Referrer information
    referrer: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    // Response tracking
    respondedAt: Date,
    responseMessage: String,
    // Analytics
    timeOnPage: Number, // seconds spent on page before submission
    formCompletionTime: Number, // time taken to fill the form
    // Custom fields for different form types
    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient querying
formSubmissionSchema.index({ pageId: 1, createdAt: -1 });
formSubmissionSchema.index({ widgetId: 1, status: 1 });
formSubmissionSchema.index({ businessId: 1, status: 1 });
formSubmissionSchema.index({ userId: 1, createdAt: -1 });
formSubmissionSchema.index({ status: 1, priority: 1 });
formSubmissionSchema.index({ createdAt: -1 });

// Text search index
formSubmissionSchema.index({
  'formData': 'text',
  'responseMessage': 'text'
});

// Virtual for submission age
formSubmissionSchema.virtual('age').get(function () {
  if (!this.createdAt) return 0;
  return Date.now() - this.createdAt.getTime();
});

// Virtual for isNew (submissions less than 24 hours old)
formSubmissionSchema.virtual('isNew').get(function () {
  if (!this.createdAt) return true; // New documents are considered "new"
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return this.age < twentyFourHours;
});

// Pre-save middleware
formSubmissionSchema.pre('save', function (next) {
  // Set priority based on form type and business rules
  if (this.submissionType === 'booking' || this.submissionType === 'urgent') {
    this.priority = 'high';
  }
  
  // Auto-archive old submissions (older than 90 days)
  // Only check age if createdAt exists (for existing documents)
  if (this.createdAt && this.isModified && !this.isNew) {
    const age = Date.now() - this.createdAt.getTime();
    if (age > 90 * 24 * 60 * 60 * 1000) {
      this.status = 'archived';
    }
  }
  
  next();
});

// Instance methods
formSubmissionSchema.methods.markAsRead = function () {
  this.status = 'read';
  return this.save();
};

formSubmissionSchema.methods.markAsReplied = function (responseMessage = '') {
  this.status = 'replied';
  this.respondedAt = new Date();
  if (responseMessage) {
    this.responseMessage = responseMessage;
  }
  return this.save();
};

formSubmissionSchema.methods.archive = function () {
  this.status = 'archived';
  return this.save();
};

formSubmissionSchema.methods.markAsSpam = function () {
  this.status = 'spam';
  return this.save();
};

// Static methods
formSubmissionSchema.statics.getByPage = function (pageId, filters = {}) {
  return this.find({ pageId, ...filters })
    .sort({ createdAt: -1 });
};

formSubmissionSchema.statics.getByBusiness = function (businessId, filters = {}) {
  return this.find({ businessId, ...filters })
    .populate('pageId', 'title slug')
    .populate('widgetId', 'name type')
    .sort({ createdAt: -1 });
};

formSubmissionSchema.statics.getUnreadCount = function (businessId) {
  return this.countDocuments({ 
    businessId, 
    status: { $in: ['new', 'read'] } 
  });
};

formSubmissionSchema.statics.getSubmissionStats = function (businessId, period = '30d') {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        businessId: mongoose.Types.ObjectId(businessId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 },
        new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
        replied: { $sum: { $cond: [{ $eq: ['$status', 'replied'] }, 1, 0] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

module.exports = mongoose.model('FormSubmission', formSubmissionSchema);
