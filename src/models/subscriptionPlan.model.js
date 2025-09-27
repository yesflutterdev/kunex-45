const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    type: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise', 'custom'],
      required: true
    },
    price: {
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
    features: [{
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
      },
      description: {
        type: String,
        trim: true,
        maxlength: 300
      },
      included: {
        type: Boolean,
        default: true
      },
      limit: {
        type: Number,
        min: 0
      },
      highlighted: {
        type: Boolean,
        default: false
      }
    }],
    limits: {
      products: {
        type: Number,
        min: 0
      },
      storage: {
        type: Number,
        min: 0,
        description: 'Storage limit in MB'
      },
      bandwidth: {
        type: Number,
        min: 0,
        description: 'Bandwidth limit in MB'
      },
      customDomain: {
        type: Boolean,
        default: false
      },
      apiCalls: {
        type: Number,
        min: 0
      },
      teamMembers: {
        type: Number,
        min: 1,
        default: 1
      }
    },
    trialPeriodDays: {
      type: Number,
      min: 0,
      default: 0
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    metadata: {
      popularPlan: {
        type: Boolean,
        default: false
      },
      recommendedFor: {
        type: String,
        trim: true,
        maxlength: 200
      },
      comparisonHighlights: [{
        type: String,
        trim: true,
        maxlength: 100
      }]
    },
    // Stripe specific data
    stripeData: {
      productId: {
        type: String,
        trim: true
      },
      priceId: {
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
subscriptionPlanSchema.index({ type: 1 });
subscriptionPlanSchema.index({ 'price.amount': 1 });
subscriptionPlanSchema.index({ isActive: 1 });
subscriptionPlanSchema.index({ sortOrder: 1 });
subscriptionPlanSchema.index({ isPublic: 1, isActive: 1 });

// Method to get formatted price
subscriptionPlanSchema.methods.getFormattedPrice = function() {
  if (this.price.amount === 0) {
    return 'Free';
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.price.currency
  });

  const amount = formatter.format(this.price.amount / 100); // Assuming amount is in cents
  const interval = this.price.intervalCount > 1 
    ? `${this.price.intervalCount} ${this.price.interval}s`
    : this.price.interval;

  return `${amount}/${interval}`;
};

// Method to check if plan has feature
subscriptionPlanSchema.methods.hasFeature = function(featureName) {
  const feature = this.features.find(f => f.name === featureName);
  return feature ? feature.included : false;
};

// Method to get feature limit
subscriptionPlanSchema.methods.getFeatureLimit = function(featureName) {
  const feature = this.features.find(f => f.name === featureName);
  return feature ? feature.limit : null;
};

// Method to compare with another plan
subscriptionPlanSchema.methods.compareWith = function(otherPlan) {
  const comparison = {
    priceDifference: this.price.amount - otherPlan.price.amount,
    featureDifferences: [],
    limitDifferences: {}
  };

  // Compare features
  const allFeatures = new Set([
    ...this.features.map(f => f.name),
    ...otherPlan.features.map(f => f.name)
  ]);

  allFeatures.forEach(featureName => {
    const thisFeature = this.features.find(f => f.name === featureName);
    const otherFeature = otherPlan.features.find(f => f.name === featureName);

    if (thisFeature && !otherFeature) {
      comparison.featureDifferences.push(`+${featureName}`);
    } else if (!thisFeature && otherFeature) {
      comparison.featureDifferences.push(`-${featureName}`);
    }
  });

  // Compare limits
  const limitKeys = ['products', 'storage', 'bandwidth', 'apiCalls', 'teamMembers'];
  limitKeys.forEach(key => {
    if (this.limits[key] !== undefined && otherPlan.limits[key] !== undefined) {
      comparison.limitDifferences[key] = this.limits[key] - otherPlan.limits[key];
    }
  });

  return comparison;
};

// Static method to get public plans
subscriptionPlanSchema.statics.getPublicPlans = function() {
  return this.find({ isPublic: true, isActive: true }).sort({ sortOrder: 1 });
};

// Static method to get plan by type
subscriptionPlanSchema.statics.getByType = function(type) {
  return this.findOne({ type, isActive: true });
};

// Virtual for monthly equivalent price
subscriptionPlanSchema.virtual('monthlyEquivalentPrice').get(function() {
  if (this.price.amount === 0) return 0;

  let multiplier = 1;
  switch (this.price.interval) {
    case 'day':
      multiplier = 30;
      break;
    case 'week':
      multiplier = 4.33;
      break;
    case 'month':
      multiplier = 1;
      break;
    case 'year':
      multiplier = 1/12;
      break;
  }

  return Math.round(this.price.amount * multiplier * this.price.intervalCount);
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

module.exports = SubscriptionPlan; 