const Joi = require('joi');

// Payment Settings Validation
const paymentSettingsValidation = {
  create: Joi.object({
    billingAddress: Joi.object({
      firstName: Joi.string().trim().max(50),
      lastName: Joi.string().trim().max(50),
      company: Joi.string().trim().max(100),
      address1: Joi.string().trim().max(200),
      address2: Joi.string().trim().max(200),
      city: Joi.string().trim().max(100),
      state: Joi.string().trim().max(100),
      postalCode: Joi.string().trim().max(20),
      country: Joi.string().trim().max(100),
      phone: Joi.string().trim().max(20)
    }),
    taxInformation: Joi.object({
      taxId: Joi.string().trim().max(50),
      taxType: Joi.string().valid('vat', 'gst', 'sales_tax', 'none'),
      businessName: Joi.string().trim().max(100),
      businessAddress: Joi.object({
        address1: Joi.string().trim().max(200),
        address2: Joi.string().trim().max(200),
        city: Joi.string().trim().max(100),
        state: Joi.string().trim().max(100),
        postalCode: Joi.string().trim().max(20),
        country: Joi.string().trim().max(100)
      })
    }),
    invoiceSettings: Joi.object({
      receiveInvoices: Joi.boolean(),
      invoiceEmail: Joi.string().email().trim().lowercase(),
      invoicePrefix: Joi.string().trim().max(10),
      invoiceNotes: Joi.string().trim().max(500)
    }),
    autoRenew: Joi.boolean(),
    paymentReminders: Joi.object({
      enabled: Joi.boolean(),
      daysBeforeDue: Joi.number().min(1).max(30)
    }),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR')
  }),

  update: Joi.object({
    billingAddress: Joi.object({
      firstName: Joi.string().trim().max(50),
      lastName: Joi.string().trim().max(50),
      company: Joi.string().trim().max(100),
      address1: Joi.string().trim().max(200),
      address2: Joi.string().trim().max(200),
      city: Joi.string().trim().max(100),
      state: Joi.string().trim().max(100),
      postalCode: Joi.string().trim().max(20),
      country: Joi.string().trim().max(100),
      phone: Joi.string().trim().max(20)
    }),
    taxInformation: Joi.object({
      taxId: Joi.string().trim().max(50),
      taxType: Joi.string().valid('vat', 'gst', 'sales_tax', 'none'),
      businessName: Joi.string().trim().max(100),
      businessAddress: Joi.object({
        address1: Joi.string().trim().max(200),
        address2: Joi.string().trim().max(200),
        city: Joi.string().trim().max(100),
        state: Joi.string().trim().max(100),
        postalCode: Joi.string().trim().max(20),
        country: Joi.string().trim().max(100)
      })
    }),
    invoiceSettings: Joi.object({
      receiveInvoices: Joi.boolean(),
      invoiceEmail: Joi.string().email().trim().lowercase(),
      invoicePrefix: Joi.string().trim().max(10),
      invoiceNotes: Joi.string().trim().max(500)
    }),
    autoRenew: Joi.boolean(),
    paymentReminders: Joi.object({
      enabled: Joi.boolean(),
      daysBeforeDue: Joi.number().min(1).max(30)
    }),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR')
  })
};

// Payment Method Validation
const paymentMethodValidation = {
  create: Joi.object({
    type: Joi.string().valid('credit_card', 'debit_card', 'paypal', 'bank_account', 'apple_pay', 'google_pay', 'other').required(),
    isDefault: Joi.boolean(),
    card: Joi.when('type', {
      is: Joi.string().valid('credit_card', 'debit_card'),
      then: Joi.object({
        brand: Joi.string().valid('visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay', 'other'),
        last4: Joi.string().length(4),
        expiryMonth: Joi.number().min(1).max(12),
        expiryYear: Joi.number().min(new Date().getFullYear()),
        cardholderName: Joi.string().trim().max(100),
        fingerprint: Joi.string().trim(),
        country: Joi.string().trim().length(2)
      }),
      otherwise: Joi.forbidden()
    }),
    paypal: Joi.when('type', {
      is: 'paypal',
      then: Joi.object({
        email: Joi.string().email().trim().lowercase(),
        payerId: Joi.string().trim()
      }),
      otherwise: Joi.forbidden()
    }),
    bankAccount: Joi.when('type', {
      is: 'bank_account',
      then: Joi.object({
        bankName: Joi.string().trim().max(100),
        accountType: Joi.string().valid('checking', 'savings', 'business'),
        last4: Joi.string().length(4),
        routingNumber: Joi.string().trim().max(9),
        country: Joi.string().trim().length(2)
      }),
      otherwise: Joi.forbidden()
    }),
    digitalWallet: Joi.when('type', {
      is: Joi.string().valid('apple_pay', 'google_pay'),
      then: Joi.object({
        walletType: Joi.string().valid('apple_pay', 'google_pay', 'samsung_pay'),
        deviceId: Joi.string().trim(),
        tokenId: Joi.string().trim()
      }),
      otherwise: Joi.forbidden()
    }),
    processorData: Joi.object({
      processorName: Joi.string().valid('stripe', 'paypal', 'braintree', 'adyen', 'other'),
      tokenId: Joi.string().trim(),
      customerId: Joi.string().trim(),
      paymentMethodId: Joi.string().trim().required()
    }).required(),
    billingAddress: Joi.object({
      firstName: Joi.string().trim().max(50),
      lastName: Joi.string().trim().max(50),
      address1: Joi.string().trim().max(200),
      address2: Joi.string().trim().max(200),
      city: Joi.string().trim().max(100),
      state: Joi.string().trim().max(100),
      postalCode: Joi.string().trim().max(20),
      country: Joi.string().trim().max(100)
    })
  }),

  update: Joi.object({
    isDefault: Joi.boolean(),
    status: Joi.string().valid('active', 'expired', 'invalid'),
    billingAddress: Joi.object({
      firstName: Joi.string().trim().max(50),
      lastName: Joi.string().trim().max(50),
      address1: Joi.string().trim().max(200),
      address2: Joi.string().trim().max(200),
      city: Joi.string().trim().max(100),
      state: Joi.string().trim().max(100),
      postalCode: Joi.string().trim().max(20),
      country: Joi.string().trim().max(100)
    })
  })
};

// Transaction Validation
const transactionValidation = {
  create: Joi.object({
    subscriptionId: Joi.string().hex().length(24),
    paymentMethodId: Joi.string().hex().length(24),
    transactionType: Joi.string().valid('subscription_payment', 'one_time_purchase', 'refund', 'credit', 'chargeback').required(),
    amount: Joi.number().min(0).required(),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'),
    description: Joi.string().trim().max(500),
    metadata: Joi.object({
      invoiceId: Joi.string().trim(),
      receiptId: Joi.string().trim(),
      subscriptionPeriod: Joi.object({
        start: Joi.date(),
        end: Joi.date()
      }),
      planName: Joi.string().trim(),
      promoCode: Joi.string().trim().uppercase(),
      discount: Joi.number().min(0)
    }),
    paymentProcessor: Joi.object({
      name: Joi.string().valid('stripe', 'paypal', 'braintree', 'adyen', 'other'),
      transactionId: Joi.string().trim().required(),
      fee: Joi.number().min(0)
    }).required()
  }),

  refund: Joi.object({
    refundAmount: Joi.number().min(0),
    refundReason: Joi.string().trim().max(500).required()
  }),

  search: Joi.object({
    status: Joi.string().valid('pending', 'completed', 'failed', 'refunded', 'disputed'),
    transactionType: Joi.string().valid('subscription_payment', 'one_time_purchase', 'refund', 'credit', 'chargeback'),
    startDate: Joi.date(),
    endDate: Joi.date(),
    minAmount: Joi.number().min(0),
    maxAmount: Joi.number().min(0),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20)
  })
};

// Subscription Plan Validation
const subscriptionPlanValidation = {
  create: Joi.object({
    name: Joi.string().trim().max(100).required(),
    description: Joi.string().trim().max(500),
    type: Joi.string().valid('free', 'basic', 'premium', 'enterprise', 'custom').required(),
    price: Joi.object({
      amount: Joi.number().min(0).required(),
      currency: Joi.string().valid('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'),
      interval: Joi.string().valid('day', 'week', 'month', 'year'),
      intervalCount: Joi.number().min(1)
    }).required(),
    features: Joi.array().items(Joi.object({
      name: Joi.string().trim().max(100).required(),
      description: Joi.string().trim().max(300),
      included: Joi.boolean(),
      limit: Joi.number().min(0),
      highlighted: Joi.boolean()
    })),
    limits: Joi.object({
      products: Joi.number().min(0),
      storage: Joi.number().min(0),
      bandwidth: Joi.number().min(0),
      customDomain: Joi.boolean(),
      apiCalls: Joi.number().min(0),
      teamMembers: Joi.number().min(1)
    }),
    trialPeriodDays: Joi.number().min(0),
    sortOrder: Joi.number(),
    isPublic: Joi.boolean(),
    isActive: Joi.boolean(),
    metadata: Joi.object({
      popularPlan: Joi.boolean(),
      recommendedFor: Joi.string().trim().max(200),
      comparisonHighlights: Joi.array().items(Joi.string().trim().max(100))
    }),
    stripeData: Joi.object({
      productId: Joi.string().trim(),
      priceId: Joi.string().trim()
    })
  }),

  update: Joi.object({
    name: Joi.string().trim().max(100),
    description: Joi.string().trim().max(500),
    features: Joi.array().items(Joi.object({
      name: Joi.string().trim().max(100).required(),
      description: Joi.string().trim().max(300),
      included: Joi.boolean(),
      limit: Joi.number().min(0),
      highlighted: Joi.boolean()
    })),
    limits: Joi.object({
      products: Joi.number().min(0),
      storage: Joi.number().min(0),
      bandwidth: Joi.number().min(0),
      customDomain: Joi.boolean(),
      apiCalls: Joi.number().min(0),
      teamMembers: Joi.number().min(1)
    }),
    trialPeriodDays: Joi.number().min(0),
    sortOrder: Joi.number(),
    isPublic: Joi.boolean(),
    isActive: Joi.boolean(),
    metadata: Joi.object({
      popularPlan: Joi.boolean(),
      recommendedFor: Joi.string().trim().max(200),
      comparisonHighlights: Joi.array().items(Joi.string().trim().max(100))
    })
  })
};

// Subscription Validation
const subscriptionValidation = {
  create: Joi.object({
    planId: Joi.string().hex().length(24).required(),
    paymentMethodId: Joi.string().hex().length(24),
    trialPeriodDays: Joi.number().min(0),
    couponId: Joi.string().trim(),
    metadata: Joi.object({
      source: Joi.string().valid('web', 'mobile', 'api', 'admin'),
      notes: Joi.string().trim().max(1000)
    })
  }),

  update: Joi.object({
    paymentMethodId: Joi.string().hex().length(24),
    cancelAtPeriodEnd: Joi.boolean(),
    metadata: Joi.object({
      notes: Joi.string().trim().max(1000)
    })
  }),

  cancel: Joi.object({
    reason: Joi.string().trim().max(500).required(),
    immediately: Joi.boolean().default(false)
  }),

  changePlan: Joi.object({
    planId: Joi.string().hex().length(24).required(),
    prorationBehavior: Joi.string().valid('create_prorations', 'none', 'always_invoice').default('create_prorations')
  })
};

// Stripe Webhook Validation
const webhookValidation = {
  stripeWebhook: Joi.object({
    id: Joi.string().required(),
    object: Joi.string().valid('event').required(),
    type: Joi.string().required(),
    data: Joi.object().required(),
    created: Joi.number().required(),
    livemode: Joi.boolean().required()
  })
};

// Payment Intent Validation
const paymentIntentValidation = {
  create: Joi.object({
    amount: Joi.number().min(50).required(), // Minimum 50 cents
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR').default('USD'),
    paymentMethodId: Joi.string().hex().length(24),
    description: Joi.string().trim().max(500),
    metadata: Joi.object().pattern(Joi.string(), Joi.string())
  }),

  confirm: Joi.object({
    paymentMethodId: Joi.string().trim(),
    returnUrl: Joi.string().uri()
  })
};

module.exports = {
  paymentSettingsValidation,
  paymentMethodValidation,
  transactionValidation,
  subscriptionPlanValidation,
  subscriptionValidation,
  webhookValidation,
  paymentIntentValidation
}; 