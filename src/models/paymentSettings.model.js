const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    defaultPaymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentMethod'
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
      company: {
        type: String,
        trim: true,
        maxlength: 100
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
      },
      phone: {
        type: String,
        trim: true,
        maxlength: 20
      }
    },
    taxInformation: {
      taxId: {
        type: String,
        trim: true,
        maxlength: 50
      },
      taxType: {
        type: String,
        enum: ['vat', 'gst', 'sales_tax', 'none'],
        default: 'none'
      },
      businessName: {
        type: String,
        trim: true,
        maxlength: 100
      },
      businessAddress: {
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
    invoiceSettings: {
      receiveInvoices: {
        type: Boolean,
        default: true
      },
      invoiceEmail: {
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
      invoicePrefix: {
        type: String,
        trim: true,
        maxlength: 10,
        default: 'INV'
      },
      invoiceNotes: {
        type: String,
        trim: true,
        maxlength: 500
      }
    },
    autoRenew: {
      type: Boolean,
      default: true
    },
    paymentReminders: {
      enabled: {
        type: Boolean,
        default: true
      },
      daysBeforeDue: {
        type: Number,
        min: 1,
        max: 30,
        default: 3
      }
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'],
      default: 'USD'
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'delinquent'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for performance
paymentSettingsSchema.index({ status: 1 });

// Method to get formatted billing address
paymentSettingsSchema.methods.getFormattedBillingAddress = function() {
  const { billingAddress } = this;
  if (!billingAddress) return null;
  
  return {
    line1: billingAddress.address1,
    line2: billingAddress.address2,
    city: billingAddress.city,
    state: billingAddress.state,
    postal_code: billingAddress.postalCode,
    country: billingAddress.country
  };
};

// Method to update default payment method
paymentSettingsSchema.methods.updateDefaultPaymentMethod = function(paymentMethodId) {
  this.defaultPaymentMethodId = paymentMethodId;
  return this.save();
};

const PaymentSettings = mongoose.model('PaymentSettings', paymentSettingsSchema);

module.exports = PaymentSettings; 