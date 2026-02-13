const { stripe } = require('../utils/stripe');
const PaymentSettings = require('../models/paymentSettings.model');
const PaymentMethod = require('../models/paymentMethod.model');
const Transaction = require('../models/transaction.model');
const SubscriptionPlan = require('../models/subscriptionPlan.model');
const Subscription = require('../models/subscription.model');
const PaymentHistory = require('../models/paymentHistory.model');
const User = require('../models/user.model');
const {
  paymentSettingsValidation,
  paymentMethodValidation,
  transactionValidation,
  subscriptionPlanValidation,
  subscriptionValidation,
  paymentIntentValidation
} = require('../utils/paymentValidation');

// Payment Settings Controllers
const paymentSettingsController = {
  // Get user's payment settings
  getPaymentSettings: async (req, res) => {
    try {
      const userId = req.user.id;
      
      let paymentSettings = await PaymentSettings.findOne({ userId })
        .populate('defaultPaymentMethodId');
      
      if (!paymentSettings) {
        // Create default payment settings
        paymentSettings = new PaymentSettings({ userId });
        await paymentSettings.save();
      }
      
      res.status(200).json({
        success: true,
        data: paymentSettings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching payment settings',
        error: error.message
      });
    }
  },

  // Update payment settings
  updatePaymentSettings: async (req, res) => {
    try {
      const { error } = paymentSettingsValidation.update.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message
        });
      }

      const userId = req.user.id;
      
      let paymentSettings = await PaymentSettings.findOne({ userId });
      if (!paymentSettings) {
        paymentSettings = new PaymentSettings({ userId, ...req.body });
      } else {
        Object.assign(paymentSettings, req.body);
      }
      
      await paymentSettings.save();
      
      res.status(200).json({
        success: true,
        message: 'Payment settings updated successfully',
        data: paymentSettings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating payment settings',
        error: error.message
      });
    }
  }
};

// Payment Method Controllers
const paymentMethodController = {
  // Get all payment methods for user
  getPaymentMethods: async (req, res) => {
    try {
      const userId = req.user.id;
      const { status } = req.query;
      
      const filter = { userId };
      if (status) filter.status = status;
      
      const paymentMethods = await PaymentMethod.find(filter)
        .sort({ isDefault: -1, createdAt: -1 });
      
      res.status(200).json({
        success: true,
        data: paymentMethods
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching payment methods',
        error: error.message
      });
    }
  },

  // Add new payment method
  addPaymentMethod: async (req, res) => {
    try {
      const { error } = paymentMethodValidation.create.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message
        });
      }

      const userId = req.user.id;
      
      // Create Stripe customer if doesn't exist
      let customer;
      try {
        const existingCustomer = await stripe.customers.list({
          email: req.user.email,
          limit: 1
        });
        
        if (existingCustomer.data.length > 0) {
          customer = existingCustomer.data[0];
        } else {
          customer = await stripe.customers.create({
            email: req.user.email,
            name: `${req.user.firstName} ${req.user.lastName}`,
            metadata: { userId: userId.toString() }
          });
        }
      } catch (stripeError) {
        return res.status(400).json({
          success: false,
          message: 'Error creating Stripe customer',
          error: stripeError.message
        });
      }

      // Attach payment method to customer
      try {
        await stripe.paymentMethods.attach(req.body.processorData.paymentMethodId, {
          customer: customer.id
        });
      } catch (stripeError) {
        return res.status(400).json({
          success: false,
          message: 'Error attaching payment method',
          error: stripeError.message
        });
      }

      // Get payment method details from Stripe
      const stripePaymentMethod = await stripe.paymentMethods.retrieve(
        req.body.processorData.paymentMethodId
      );

      // Create payment method in database
      const paymentMethodData = {
        ...req.body,
        userId,
        processorData: {
          ...req.body.processorData,
          customerId: customer.id
        }
      };

      // Extract card details if it's a card
      if (stripePaymentMethod.card) {
        paymentMethodData.card = {
          brand: stripePaymentMethod.card.brand,
          last4: stripePaymentMethod.card.last4,
          expiryMonth: stripePaymentMethod.card.exp_month,
          expiryYear: stripePaymentMethod.card.exp_year,
          fingerprint: stripePaymentMethod.card.fingerprint,
          country: stripePaymentMethod.card.country
        };
      }

      const paymentMethod = new PaymentMethod(paymentMethodData);
      await paymentMethod.save();

      // Set as default if it's the first payment method or explicitly requested
      if (req.body.isDefault || await PaymentMethod.countDocuments({ userId }) === 1) {
        await paymentMethod.setAsDefault();
      }

      res.status(201).json({
        success: true,
        message: 'Payment method added successfully',
        data: paymentMethod
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error adding payment method',
        error: error.message
      });
    }
  },

  // Update payment method
  updatePaymentMethod: async (req, res) => {
    try {
      const { error } = paymentMethodValidation.update.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      
      const paymentMethod = await PaymentMethod.findOne({ _id: id, userId });
      if (!paymentMethod) {
        return res.status(404).json({
          success: false,
          message: 'Payment method not found'
        });
      }

      Object.assign(paymentMethod, req.body);
      await paymentMethod.save();

      if (req.body.isDefault) {
        await paymentMethod.setAsDefault();
      }

      res.status(200).json({
        success: true,
        message: 'Payment method updated successfully',
        data: paymentMethod
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating payment method',
        error: error.message
      });
    }
  },

  // Delete payment method
  deletePaymentMethod: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const paymentMethod = await PaymentMethod.findOne({ _id: id, userId });
      if (!paymentMethod) {
        return res.status(404).json({
          success: false,
          message: 'Payment method not found'
        });
      }

      // Detach from Stripe
      try {
        await stripe.paymentMethods.detach(paymentMethod.processorData.paymentMethodId);
      } catch (stripeError) {
        console.error('Error detaching payment method from Stripe:', stripeError);
      }

      await PaymentMethod.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Payment method deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting payment method',
        error: error.message
      });
    }
  },

  // Set default payment method
  setDefaultPaymentMethod: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const paymentMethod = await PaymentMethod.findOne({ _id: id, userId });
      if (!paymentMethod) {
        return res.status(404).json({
          success: false,
          message: 'Payment method not found'
        });
      }

      await paymentMethod.setAsDefault();

      res.status(200).json({
        success: true,
        message: 'Default payment method updated successfully',
        data: paymentMethod
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error setting default payment method',
        error: error.message
      });
    }
  }
};

// Transaction Controllers
const transactionController = {
  // Get user transactions
  getTransactions: async (req, res) => {
    try {
      const { error } = transactionValidation.search.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message
        });
      }

      const userId = req.user.id;
      const { 
        status, 
        transactionType, 
        startDate, 
        endDate, 
        minAmount, 
        maxAmount, 
        currency,
        page = 1, 
        limit = 20 
      } = req.query;

      const filter = { userId };
      
      if (status) filter.status = status;
      if (transactionType) filter.transactionType = transactionType;
      if (currency) filter.currency = currency;
      
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }
      
      if (minAmount || maxAmount) {
        filter.amount = {};
        if (minAmount) filter.amount.$gte = minAmount;
        if (maxAmount) filter.amount.$lte = maxAmount;
      }

      const skip = (page - 1) * limit;
      
      const [transactions, total] = await Promise.all([
        Transaction.find(filter)
          .populate('subscriptionId', 'planId status')
          .populate('paymentMethodId', 'type card.brand card.last4')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Transaction.countDocuments(filter)
      ]);

      res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching transactions',
        error: error.message
      });
    }
  },

  // Get transaction by ID
  getTransaction: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const transaction = await Transaction.findOne({ _id: id, userId })
        .populate('subscriptionId')
        .populate('paymentMethodId');
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.status(200).json({
        success: true,
        data: transaction
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching transaction',
        error: error.message
      });
    }
  },

  // Refund transaction
  refundTransaction: async (req, res) => {
    try {
      const { error } = transactionValidation.refund.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const { refundAmount, refundReason } = req.body;
      
      const transaction = await Transaction.findOne({ _id: id, userId });
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      if (!transaction.canBeRefunded()) {
        return res.status(400).json({
          success: false,
          message: 'Transaction cannot be refunded'
        });
      }

      // Process refund with Stripe
      try {
        const refund = await stripe.refunds.create({
          payment_intent: transaction.paymentProcessor.transactionId,
          amount: refundAmount || transaction.amount
        });

        await transaction.processRefund(refundAmount, refundReason, userId);

        res.status(200).json({
          success: true,
          message: 'Refund processed successfully',
          data: {
            transaction,
            refund
          }
        });
      } catch (stripeError) {
        res.status(400).json({
          success: false,
          message: 'Error processing refund',
          error: stripeError.message
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing refund',
        error: error.message
      });
    }
  },

  // Get transaction statistics
  getTransactionStatistics: async (req, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const stats = await Transaction.getStatistics(userId, startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching transaction statistics',
        error: error.message
      });
    }
  }
};

// Payment Intent Controllers
const paymentIntentController = {
  // Create payment intent
  createPaymentIntent: async (req, res) => {
    try {
      const { error } = paymentIntentValidation.create.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message
        });
      }

      const userId = req.user.id;
      const { amount, currency, description, metadata } = req.body;

      // Get or create Stripe customer
      let customer;
      try {
        const existingCustomer = await stripe.customers.list({
          email: req.user.email,
          limit: 1
        });
        
        if (existingCustomer.data.length > 0) {
          customer = existingCustomer.data[0];
        } else {
          customer = await stripe.customers.create({
            email: req.user.email,
            name: `${req.user.firstName} ${req.user.lastName}`,
            metadata: { userId: userId.toString() }
          });
        }
      } catch (stripeError) {
        return res.status(400).json({
          success: false,
          message: 'Error with customer',
          error: stripeError.message
        });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customer.id,
        description,
        metadata: {
          userId: userId.toString(),
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true
        }
      });

      res.status(201).json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating payment intent',
        error: error.message
      });
    }
  },

  // Confirm payment intent
  confirmPaymentIntent: async (req, res) => {
    try {
      const { error } = paymentIntentValidation.confirm.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message
        });
      }

      const { id } = req.params;
      const { paymentMethodId, returnUrl } = req.body;

      const paymentIntent = await stripe.paymentIntents.confirm(id, {
        payment_method: paymentMethodId,
        return_url: returnUrl
      });

      res.status(200).json({
        success: true,
        data: paymentIntent
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error confirming payment intent',
        error: error.message
      });
    }
  }
};

// NEW PAYMENT FUNCTIONS
const makePayment = async (req, res) => {
  try {
    const { subscriptionPlan, amountPaid, subscriptionPlanId } = req.body;
    const userId = req.user.id;

    // Get subscription plan details
    const plan = await SubscriptionPlan.findById(subscriptionPlanId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    // Validate amount (check if plan has price object)
    const planPrice = plan.price?.amount || 0;
    if (amountPaid !== planPrice) {
      return res.status(400).json({
        success: false,
        message: `Amount paid (${amountPaid}) does not match plan amount (${planPrice})`
      });
    }

    // Calculate subscription dates
    const subscriptionDate = new Date();
    const subscriptionExpireDate = new Date();
    
    // Handle trial period
    if (plan.trialPeriodDays > 0) {
      subscriptionExpireDate.setDate(subscriptionExpireDate.getDate() + plan.trialPeriodDays);
    } else {
      // For paid plans, calculate based on plan type or duration
      subscriptionExpireDate.setMonth(subscriptionExpireDate.getMonth() + 1); // Default 1 month
    }

    // Create payment history record
    const paymentHistory = new PaymentHistory({
      userId,
      subscriptionPlanId: plan._id,
      subscriptionPlanName: plan.name,
      subscriptionPlanType: plan.type,
      amountPaid,
      subscriptionStartDate: subscriptionDate,
      subscriptionEndDate: subscriptionExpireDate,
      trialPeriodDays: plan.trialPeriodDays,
      isTrialPeriod: plan.trialPeriodDays > 0,
      paymentStatus: 'completed', // For now, assume payment is successful
      metadata: {
        originalAmount: planPrice,
        planFeatures: plan.features?.map(f => f.name) || [],
        planLimits: plan.limits
      }
    });

    await paymentHistory.save();

    // Update user subscription
    await User.findByIdAndUpdate(userId, {
      subscriptionPlan: plan.type,
      subscriptionDate,
      subscriptionExpireDate,
      isActiveSubscription: true,
      planSubscribedTo: plan.type // Also update the existing field
    });

    // Structure the response for better frontend consumption
    const structuredResponse = {
      payment: {
        id: paymentHistory._id,
        transaction: {
          amount: paymentHistory.amountPaid,
          currency: paymentHistory.currency,
          status: paymentHistory.paymentStatus,
          method: paymentHistory.paymentMethod,
          date: paymentHistory.createdAt,
          formattedAmount: paymentHistory.amountPaid === 0 ? 'Free' : `$${paymentHistory.amountPaid}`
        },
        subscription: {
          planId: plan._id,
          planName: plan.name,
          planType: plan.type,
          description: plan.description,
          duration: {
            startDate: subscriptionDate,
            endDate: subscriptionExpireDate,
            daysRemaining: Math.max(0, Math.ceil((subscriptionExpireDate - new Date()) / (1000 * 60 * 60 * 24))),
            isActive: subscriptionExpireDate > new Date()
          },
          trial: {
            hasTrial: plan.trialPeriodDays > 0,
            trialDays: plan.trialPeriodDays,
            isTrialActive: plan.trialPeriodDays > 0 && subscriptionExpireDate > new Date()
          }
        },
        features: plan.features.map(feature => ({
          name: feature.name.replace('Dummy text ', ''), // Clean up feature names
          description: feature.description,
          included: feature.included,
          limit: feature.limit,
          highlighted: feature.highlighted
        })),
        limits: {
          products: plan.limits.products,
          storage: `${plan.limits.storage} MB`,
          bandwidth: `${plan.limits.bandwidth} MB`,
          customDomain: plan.limits.customDomain,
          apiCalls: plan.limits.apiCalls,
          teamMembers: plan.limits.teamMembers
        },
        pricing: {
          originalAmount: planPrice,
          amountPaid: paymentHistory.amountPaid,
          discount: paymentHistory.metadata.discountApplied,
          tax: paymentHistory.metadata.taxAmount,
          currency: paymentHistory.currency,
          formatted: {
            original: planPrice === 0 ? 'Free' : `$${planPrice}`,
            paid: paymentHistory.amountPaid === 0 ? 'Free' : `$${paymentHistory.amountPaid}`,
            discount: paymentHistory.metadata.discountApplied > 0 ? `$${paymentHistory.metadata.discountApplied} off` : 'No discount'
          }
        },
        metadata: {
          createdAt: paymentHistory.createdAt,
          stripeData: {
            productId: plan.stripeData?.productId,
            priceId: plan.stripeData?.priceId
          }
        }
      },
      user: {
        subscriptionPlan: plan.type,
        subscriptionDate,
        subscriptionExpireDate,
        isActiveSubscription: true,
        planSubscribedTo: plan.type
      },
      summary: {
        totalSpent: paymentHistory.amountPaid,
        subscriptionStatus: 'active',
        trialStatus: plan.trialPeriodDays > 0 ? 'active' : 'none',
        nextBillingDate: subscriptionExpireDate,
        planCategory: planPrice === 0 ? 'free' : (planPrice >= 100 ? 'enterprise' : 'paid')
      }
    };

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: structuredResponse
    });

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: error.message
    });
  }
};

// Get user payment history
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status, paymentMethod, startDate, endDate } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (paymentMethod) filters.paymentMethod = paymentMethod;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const paymentHistory = await PaymentHistory.getUserPaymentHistory(userId, page, limit, filters);

    // Build the same filter query for accurate count
    const countQuery = { userId };
    if (status) countQuery.paymentStatus = status;
    if (paymentMethod) countQuery.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      countQuery.createdAt = {};
      if (startDate) countQuery.createdAt.$gte = new Date(startDate);
      if (endDate) countQuery.createdAt.$lte = new Date(endDate);
    }
    const totalCount = await PaymentHistory.countDocuments(countQuery);

    // Structure payment history for better frontend consumption
    const structuredHistory = paymentHistory.map(payment => {
      const plan = payment.subscriptionPlanId;
      
      return {
        id: payment._id,
        transaction: {
          amount: payment.amountPaid,
          currency: payment.currency,
          status: payment.paymentStatus,
          method: payment.paymentMethod,
          date: payment.createdAt,
          formattedAmount: payment.amountPaid === 0 ? 'Free' : `$${payment.amountPaid}`
        },
        subscription: {
          planId: plan._id,
          planName: plan.name,
          planType: plan.type,
          description: plan.description,
          duration: {
            startDate: payment.subscriptionStartDate,
            endDate: payment.subscriptionEndDate,
            daysRemaining: Math.max(0, Math.ceil((new Date(payment.subscriptionEndDate) - new Date()) / (1000 * 60 * 60 * 24))),
            isActive: new Date(payment.subscriptionEndDate) > new Date()
          },
          trial: {
            hasTrial: payment.isTrialPeriod,
            trialDays: payment.trialPeriodDays,
            isTrialActive: payment.isTrialPeriod && new Date(payment.subscriptionEndDate) > new Date()
          }
        },
        features: plan.features.map(feature => ({
          name: feature.name.replace('Dummy text ', ''), // Clean up feature names
          description: feature.description,
          included: feature.included,
          limit: feature.limit,
          highlighted: feature.highlighted
        })),
        limits: {
          products: plan.limits.products,
          storage: `${plan.limits.storage} MB`,
          bandwidth: `${plan.limits.bandwidth} MB`,
          customDomain: plan.limits.customDomain,
          apiCalls: plan.limits.apiCalls,
          teamMembers: plan.limits.teamMembers
        },
        pricing: {
          originalAmount: payment.metadata.originalAmount,
          amountPaid: payment.amountPaid,
          discount: payment.metadata.discountApplied,
          tax: payment.metadata.taxAmount,
          currency: payment.currency,
          formatted: {
            original: payment.metadata.originalAmount === 0 ? 'Free' : `$${payment.metadata.originalAmount}`,
            paid: payment.amountPaid === 0 ? 'Free' : `$${payment.amountPaid}`,
            discount: payment.metadata.discountApplied > 0 ? `$${payment.metadata.discountApplied} off` : 'No discount'
          }
        },
        metadata: {
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          stripeData: {
            paymentIntentId: payment.stripePaymentIntentId,
            sessionId: payment.stripeSessionId
          }
        }
      };
    });

    // Calculate summary statistics
    const summary = {
      totalPayments: totalCount,
      totalSpent: paymentHistory.reduce((sum, payment) => sum + payment.amountPaid, 0),
      activeSubscriptions: paymentHistory.filter(payment => 
        payment.paymentStatus === 'completed' && 
        new Date(payment.subscriptionEndDate) > new Date()
      ).length,
      trialSubscriptions: paymentHistory.filter(payment => 
        payment.isTrialPeriod && 
        new Date(payment.subscriptionEndDate) > new Date()
      ).length,
      planTypes: [...new Set(paymentHistory.map(payment => payment.subscriptionPlanType))],
      paymentMethods: [...new Set(paymentHistory.map(payment => payment.paymentMethod))]
    };

    res.status(200).json({
      success: true,
      data: {
        payments: structuredHistory,
        summary,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
};

// Get user current subscription
const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('subscriptionPlan subscriptionDate subscriptionExpireDate isActiveSubscription planSubscribedTo');
    const activeSubscription = await PaymentHistory.getUserActiveSubscription(userId);

    res.status(200).json({
      success: true,
      data: {
        user,
        activeSubscription
      }
    });

  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current subscription',
      error: error.message
    });
  }
};

// Get all subscription plans
const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.getPublicPlans();

    // Structure plans by category
    const structuredPlans = {
      free: [],
      paid: [],
      enterprise: []
    };

    // Process each plan
    plans.forEach(plan => {
      const planData = {
        id: plan._id,
        name: plan.name,
        description: plan.description,
        type: plan.type,
        price: {
          amount: plan.price.amount,
          currency: plan.price.currency,
          interval: plan.price.interval,
          formatted: plan.price.amount === 0 ? 'Free' : `$${plan.price.amount}/${plan.price.interval}`
        },
        features: plan.features.map(feature => ({
          name: feature.name.replace('Dummy text ', ''), // Clean up feature names
          description: feature.description,
          included: feature.included,
          limit: feature.limit,
          highlighted: feature.highlighted
        })),
        limits: {
          products: plan.limits.products,
          storage: `${plan.limits.storage} MB`,
          bandwidth: `${plan.limits.bandwidth} MB`,
          customDomain: plan.limits.customDomain,
          apiCalls: plan.limits.apiCalls,
          teamMembers: plan.limits.teamMembers
        },
        trialPeriod: {
          days: plan.trialPeriodDays,
          hasTrial: plan.trialPeriodDays > 0
        },
        metadata: {
          popular: plan.metadata.popularPlan,
          recommendedFor: plan.metadata.recommendedFor,
          highlights: plan.metadata.comparisonHighlights
        },
        stripeData: {
          productId: plan.stripeData.productId,
          priceId: plan.stripeData.priceId
        },
        sortOrder: plan.sortOrder
      };

      // Categorize plans
      if (plan.price.amount === 0) {
        structuredPlans.free.push(planData);
      } else if (plan.type.toLowerCase().includes('enterprise') || plan.price.amount >= 100) {
        structuredPlans.enterprise.push(planData);
      } else {
        structuredPlans.paid.push(planData);
      }
    });

    // Sort each category by sortOrder
    Object.keys(structuredPlans).forEach(category => {
      structuredPlans[category].sort((a, b) => a.sortOrder - b.sortOrder);
    });

    res.status(200).json({
      success: true,
      data: {
        categories: structuredPlans,
        summary: {
          totalPlans: plans.length,
          freePlans: structuredPlans.free.length,
          paidPlans: structuredPlans.paid.length,
          enterprisePlans: structuredPlans.enterprise.length
        }
      }
    });

  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
      error: error.message
    });
  }
};

module.exports = {
  paymentSettingsController,
  paymentMethodController,
  transactionController,
  paymentIntentController,
  makePayment,
  getPaymentHistory,
  getCurrentSubscription,
  getSubscriptionPlans
}; 