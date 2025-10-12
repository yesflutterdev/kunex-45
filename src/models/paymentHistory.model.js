const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  subscriptionPlanName: {
    type: String,
    required: true
  },
  subscriptionPlanType: {
    type: String,
    required: true
  },
  amountPaid: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer'],
    default: 'stripe'
  },
  stripePaymentIntentId: {
    type: String,
    required: false
  },
  stripeSessionId: {
    type: String,
    required: false
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  subscriptionStartDate: {
    type: Date,
    required: true
  },
  subscriptionEndDate: {
    type: Date,
    required: true
  },
  trialPeriodDays: {
    type: Number,
    default: 0
  },
  isTrialPeriod: {
    type: Boolean,
    default: false
  },
  metadata: {
    discountApplied: {
      type: Number,
      default: 0
    },
    originalAmount: {
      type: Number,
      required: true
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    planFeatures: [{
      type: String
    }],
    planLimits: {
      type: Object
    }
  }
}, { timestamps: true });

// Indexes
paymentHistorySchema.index({ userId: 1, createdAt: -1 });
paymentHistorySchema.index({ paymentStatus: 1 });
paymentHistorySchema.index({ stripePaymentIntentId: 1 });

// Static methods
paymentHistorySchema.statics.getUserPaymentHistory = function(userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return this.find({ userId })
    .populate('subscriptionPlanId', 'name description type price features limits trialPeriodDays')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

paymentHistorySchema.statics.getUserActiveSubscription = function(userId) {
  return this.findOne({ 
    userId, 
    paymentStatus: 'completed',
    subscriptionEndDate: { $gt: new Date() }
  }).populate('subscriptionPlanId', 'name description type price features limits trialPeriodDays');
};

// Instance methods
paymentHistorySchema.methods.isActive = function() {
  return this.paymentStatus === 'completed' && this.subscriptionEndDate > new Date();
};

paymentHistorySchema.methods.getDaysRemaining = function() {
  if (!this.isActive()) return 0;
  const now = new Date();
  const diffTime = this.subscriptionEndDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('PaymentHistory', paymentHistorySchema);
