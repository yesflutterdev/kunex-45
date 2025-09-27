const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_account', 'apple_pay', 'google_pay', 'other'],
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'invalid'],
      default: 'active'
    },
    // For credit/debit cards
    card: {
      brand: {
        type: String,
        enum: ['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay', 'other']
      },
      last4: {
        type: String,
        maxlength: 4
      },
      expiryMonth: {
        type: Number,
        min: 1,
        max: 12
      },
      expiryYear: {
        type: Number,
        min: new Date().getFullYear()
      },
      cardholderName: {
        type: String,
        trim: true,
        maxlength: 100
      },
      fingerprint: {
        type: String,
        trim: true
      },
      country: {
        type: String,
        trim: true,
        maxlength: 2
      }
    },
    // For PayPal
    paypal: {
      email: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
          validator: function(email) {
            if (!email) return true;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
          },
          message: 'Please provide a valid email address'
        }
      },
      payerId: {
        type: String,
        trim: true
      }
    },
    // For bank accounts
    bankAccount: {
      bankName: {
        type: String,
        trim: true,
        maxlength: 100
      },
      accountType: {
        type: String,
        enum: ['checking', 'savings', 'business']
      },
      last4: {
        type: String,
        maxlength: 4
      },
      routingNumber: {
        type: String,
        trim: true,
        maxlength: 9
      },
      country: {
        type: String,
        trim: true,
        maxlength: 2
      }
    },
    // For digital wallets
    digitalWallet: {
      walletType: {
        type: String,
        enum: ['apple_pay', 'google_pay', 'samsung_pay']
      },
      deviceId: {
        type: String,
        trim: true
      },
      tokenId: {
        type: String,
        trim: true
      }
    },
    // Payment processor specific data
    processorData: {
      processorName: {
        type: String,
        enum: ['stripe', 'paypal', 'braintree', 'adyen', 'other'],
        default: 'stripe'
      },
      tokenId: {
        type: String,
        trim: true
      },
      customerId: {
        type: String,
        trim: true
      },
      paymentMethodId: {
        type: String,
        trim: true,
        required: true
      }
    },
    billingAddress: {
      firstName: {
        type: String,
        trim: true,
        maxlength: 50
      },
      lastName: {
        type: String,
        trim: true,
        maxlength: 50
      },
      address1: {
        type: String,
        trim: true,
        maxlength: 200
      },
      address2: {
        type: String,
        trim: true,
        maxlength: 200
      },
      city: {
        type: String,
        trim: true,
        maxlength: 100
      },
      state: {
        type: String,
        trim: true,
        maxlength: 100
      },
      postalCode: {
        type: String,
        trim: true,
        maxlength: 20
      },
      country: {
        type: String,
        trim: true,
        maxlength: 100
      }
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for performance
paymentMethodSchema.index({ userId: 1 });
paymentMethodSchema.index({ userId: 1, isDefault: 1 });
paymentMethodSchema.index({ 'card.fingerprint': 1 });
paymentMethodSchema.index({ 'processorData.paymentMethodId': 1 });
paymentMethodSchema.index({ status: 1 });

// Pre-save middleware to ensure only one default payment method per user
paymentMethodSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Remove default status from other payment methods for this user
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Method to set as default payment method
paymentMethodSchema.methods.setAsDefault = async function() {
  // Remove default status from other payment methods
  await this.constructor.updateMany(
    { userId: this.userId, _id: { $ne: this._id } },
    { isDefault: false }
  );
  
  this.isDefault = true;
  return this.save();
};

// Method to get display name for payment method
paymentMethodSchema.methods.getDisplayName = function() {
  switch (this.type) {
    case 'credit_card':
    case 'debit_card':
      return `${this.card.brand} •••• ${this.card.last4}`;
    case 'paypal':
      return `PayPal ${this.paypal.email}`;
    case 'bank_account':
      return `${this.bankAccount.bankName} •••• ${this.bankAccount.last4}`;
    case 'apple_pay':
      return 'Apple Pay';
    case 'google_pay':
      return 'Google Pay';
    default:
      return this.type;
  }
};

// Method to check if payment method is expired
paymentMethodSchema.methods.isExpired = function() {
  if (this.type === 'credit_card' || this.type === 'debit_card') {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    return (
      this.card.expiryYear < currentYear ||
      (this.card.expiryYear === currentYear && this.card.expiryMonth < currentMonth)
    );
  }
  return false;
};

// Virtual for formatted expiry date
paymentMethodSchema.virtual('formattedExpiry').get(function() {
  if (this.type === 'credit_card' || this.type === 'debit_card') {
    return `${String(this.card.expiryMonth).padStart(2, '0')}/${this.card.expiryYear}`;
  }
  return null;
});

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);

module.exports = PaymentMethod; 