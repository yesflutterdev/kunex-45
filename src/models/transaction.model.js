const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription'
    },
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentMethod'
    },
    transactionType: {
      type: String,
      enum: ['subscription_payment', 'one_time_purchase', 'refund', 'credit', 'chargeback'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'disputed'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'],
      default: 'USD',
      required: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    metadata: {
      invoiceId: {
        type: String,
        trim: true
      },
      receiptId: {
        type: String,
        trim: true
      },
      subscriptionPeriod: {
        start: Date,
        end: Date
      },
      planName: {
        type: String,
        trim: true
      },
      promoCode: {
        type: String,
        trim: true,
        uppercase: true
      },
      discount: {
        type: Number,
        min: 0,
        default: 0
      }
    },
    paymentProcessor: {
      name: {
        type: String,
        enum: ['stripe', 'paypal', 'braintree', 'adyen', 'other'],
        default: 'stripe'
      },
      transactionId: {
        type: String,
        trim: true,
        required: true
      },
      fee: {
        type: Number,
        min: 0,
        default: 0
      },
      processorResponse: {
        code: {
          type: String,
          trim: true
        },
        message: {
          type: String,
          trim: true
        },
        errorType: {
          type: String,
          trim: true
        }
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
    },
    taxDetails: {
      taxAmount: {
        type: Number,
        min: 0,
        default: 0
      },
      taxRate: {
        type: Number,
        min: 0,
        max: 1,
        default: 0
      },
      taxId: {
        type: String,
        trim: true
      },
      taxRegion: {
        type: String,
        trim: true
      }
    },
    refundDetails: {
      refundedAt: Date,
      refundAmount: {
        type: Number,
        min: 0
      },
      refundReason: {
        type: String,
        trim: true,
        maxlength: 500
      },
      refundedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      refundTransactionId: {
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
transactionSchema.index({ userId: 1 });
transactionSchema.index({ subscriptionId: 1 });
transactionSchema.index({ 'paymentProcessor.transactionId': 1 });
transactionSchema.index({ createdAt: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ transactionType: 1 });
transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ userId: 1, createdAt: -1 });

// Method to calculate net amount (amount - fees - taxes)
transactionSchema.methods.getNetAmount = function() {
  return this.amount - (this.paymentProcessor.fee || 0) - (this.taxDetails.taxAmount || 0);
};

// Method to format amount with currency
transactionSchema.methods.getFormattedAmount = function() {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  });
  return formatter.format(this.amount / 100); // Assuming amount is in cents
};

// Method to check if transaction can be refunded
transactionSchema.methods.canBeRefunded = function() {
  return (
    this.status === 'completed' &&
    this.transactionType !== 'refund' &&
    !this.refundDetails.refundedAt
  );
};

// Method to process refund
transactionSchema.methods.processRefund = async function(refundAmount, reason, refundedBy) {
  if (!this.canBeRefunded()) {
    throw new Error('Transaction cannot be refunded');
  }

  this.refundDetails = {
    refundedAt: new Date(),
    refundAmount: refundAmount || this.amount,
    refundReason: reason,
    refundedBy: refundedBy
  };

  if (refundAmount >= this.amount) {
    this.status = 'refunded';
  }

  return this.save();
};

// Static method to get transaction statistics
transactionSchema.statics.getStatistics = async function(userId, startDate, endDate) {
  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    status: 'completed'
  };

  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        averageAmount: { $avg: '$amount' },
        totalFees: { $sum: '$paymentProcessor.fee' },
        totalTax: { $sum: '$taxDetails.taxAmount' }
      }
    }
  ]);

  return stats[0] || {
    totalAmount: 0,
    totalTransactions: 0,
    averageAmount: 0,
    totalFees: 0,
    totalTax: 0
  };
};

// Virtual for receipt URL
transactionSchema.virtual('receiptUrl').get(function() {
  if (this.metadata.receiptId) {
    return `/api/payments/receipts/${this.metadata.receiptId}`;
  }
  return null;
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 