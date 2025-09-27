const { stripe } = require('../utils/stripe');
const PaymentSettings = require('../models/paymentSettings.model');
const PaymentMethod = require('../models/paymentMethod.model');
const Transaction = require('../models/transaction.model');
const SubscriptionPlan = require('../models/subscriptionPlan.model');
const Subscription = require('../models/subscription.model');
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

module.exports = {
  paymentSettingsController,
  paymentMethodController,
  transactionController,
  paymentIntentController
}; 