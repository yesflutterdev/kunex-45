const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true
    },
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentMethod'
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired'],
      required: true
    },
    currentPeriodStart: {
      type: Date,
      required: true
    },
    currentPeriodEnd: {
      type: Date,
      required: true
    },
    trialStart: Date,
    trialEnd: Date,
    canceledAt: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },
    cancelationReason: {
      type: String,
      trim: true,
      maxlength: 500
    },
    billing: {
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      currency: {
        type: String,
        enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'],
        default: 'USD'
      },
      interval: {
        type: String,
        enum: ['day', 'week', 'month', 'year'],
        default: 'month'
      },
      intervalCount: {
        type: Number,
        min: 1,
        default: 1
      }
    },
    discount: {
      couponId: {
        type: String,
        trim: true
      },
      percentOff: {
        type: Number,
        min: 0,
        max: 100
      },
      amountOff: {
        type: Number,
        min: 0
      },
      duration: {
        type: String,
        enum: ['once', 'repeating', 'forever']
      },
      durationInMonths: {
        type: Number,
        min: 1
      },
      validUntil: Date
    },
    usage: {
      products: {
        current: {
          type: Number,
          default: 0,
          min: 0
        },
        limit: {
          type: Number,
          min: 0
        }
      },
      storage: {
        current: {
          type: Number,
          default: 0,
          min: 0
        },
        limit: {
          type: Number,
          min: 0
        }
      },
      bandwidth: {
        current: {
          type: Number,
          default: 0,
          min: 0
        },
        limit: {
          type: Number,
          min: 0
        }
      },
      apiCalls: {
        current: {
          type: Number,
          default: 0,
          min: 0
        },
        limit: {
          type: Number,
          min: 0
        }
      },
      teamMembers: {
        current: {
          type: Number,
          default: 1,
          min: 1
        },
        limit: {
          type: Number,
          min: 1,
          default: 1
        }
      }
    },
    metadata: {
      source: {
        type: String,
        enum: ['web', 'mobile', 'api', 'admin'],
        default: 'web'
      },
      upgradeFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan'
      },
      notes: {
        type: String,
        trim: true,
        maxlength: 1000
      }
    },
    // Stripe specific data
    stripeData: {
      subscriptionId: {
        type: String,
        trim: true
      },
      customerId: {
        type: String,
        trim: true
      },
      invoiceId: {
        type: String,
        trim: true
      }
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for performance
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ planId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ 'stripeData.subscriptionId': 1 });

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
  return ['active', 'trialing'].includes(this.status);
};

// Method to check if subscription is in trial
subscriptionSchema.methods.isInTrial = function() {
  return this.status === 'trialing' && 
         this.trialEnd && 
         new Date() < this.trialEnd;
};

// Method to check if subscription is expired
subscriptionSchema.methods.isExpired = function() {
  return new Date() > this.currentPeriodEnd;
};

// Method to get days until renewal
subscriptionSchema.methods.getDaysUntilRenewal = function() {
  const now = new Date();
  const renewalDate = this.currentPeriodEnd;
  const diffTime = renewalDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Method to check usage limit
subscriptionSchema.methods.checkUsageLimit = function(resource) {
  const usage = this.usage[resource];
  if (!usage || usage.limit === undefined) return { allowed: true };
  
  return {
    allowed: usage.current < usage.limit,
    current: usage.current,
    limit: usage.limit,
    percentage: (usage.current / usage.limit) * 100
  };
};

// Method to increment usage
subscriptionSchema.methods.incrementUsage = async function(resource, amount = 1) {
  const usageCheck = this.checkUsageLimit(resource);
  if (!usageCheck.allowed) {
    throw new Error(`${resource} limit exceeded`);
  }

  this.usage[resource].current += amount;
  return this.save();
};

// Method to reset usage (typically called at billing cycle)
subscriptionSchema.methods.resetUsage = async function() {
  const resetFields = ['bandwidth', 'apiCalls'];
  resetFields.forEach(field => {
    if (this.usage[field]) {
      this.usage[field].current = 0;
    }
  });
  return this.save();
};

// Method to cancel subscription
subscriptionSchema.methods.cancel = async function(reason, immediately = false) {
  this.cancelationReason = reason;
  this.canceledAt = new Date();
  
  if (immediately) {
    this.status = 'canceled';
    this.currentPeriodEnd = new Date();
  } else {
    this.cancelAtPeriodEnd = true;
  }
  
  return this.save();
};

// Method to reactivate subscription
subscriptionSchema.methods.reactivate = async function() {
  if (this.status === 'canceled' && !this.isExpired()) {
    this.status = 'active';
    this.cancelAtPeriodEnd = false;
    this.canceledAt = null;
    this.cancelationReason = null;
    return this.save();
  }
  throw new Error('Cannot reactivate expired or non-canceled subscription');
};

// Method to upgrade/downgrade plan
subscriptionSchema.methods.changePlan = async function(newPlanId, prorationBehavior = 'create_prorations') {
  const SubscriptionPlan = mongoose.model('SubscriptionPlan');
  const newPlan = await SubscriptionPlan.findById(newPlanId);
  
  if (!newPlan) {
    throw new Error('Invalid plan ID');
  }

  this.metadata.upgradeFrom = this.planId;
  this.planId = newPlanId;
  this.billing.amount = newPlan.price.amount;
  this.billing.currency = newPlan.price.currency;
  this.billing.interval = newPlan.price.interval;
  this.billing.intervalCount = newPlan.price.intervalCount;

  // Update usage limits
  if (newPlan.limits) {
    Object.keys(newPlan.limits).forEach(key => {
      if (this.usage[key] && newPlan.limits[key] !== undefined) {
        this.usage[key].limit = newPlan.limits[key];
      }
    });
  }

  return this.save();
};

// Static method to get active subscriptions expiring soon
subscriptionSchema.statics.getExpiringSubscriptions = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: { $in: ['active', 'trialing'] },
    currentPeriodEnd: { $lte: futureDate },
    cancelAtPeriodEnd: false
  }).populate('userId planId');
};

// Virtual for formatted billing amount
subscriptionSchema.virtual('formattedBillingAmount').get(function() {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.billing.currency
  });
  return formatter.format(this.billing.amount / 100); // Assuming amount is in cents
});

// Virtual for next billing date
subscriptionSchema.virtual('nextBillingDate').get(function() {
  if (this.cancelAtPeriodEnd) return null;
  return this.currentPeriodEnd;
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 