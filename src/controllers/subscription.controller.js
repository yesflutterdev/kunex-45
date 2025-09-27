const { stripe } = require('../utils/stripe');
const SubscriptionPlan = require('../models/subscriptionPlan.model');
const Subscription = require('../models/subscription.model');
const PaymentMethod = require('../models/paymentMethod.model');
const Transaction = require('../models/transaction.model');
const {
  subscriptionPlanValidation,
  subscriptionValidation
} = require('../utils/paymentValidation');

// Subscription Plan Controllers
const subscriptionPlanController = {
  // Get all public subscription plans
  getPublicPlans: async (req, res) => {
    try {
      const plans = await SubscriptionPlan.getPublicPlans();
      
      res.status(200).json({
        success: true,
        data: plans
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching subscription plans',
        error: error.message
      });
    }
  },

  // Get all subscription plans (admin only)
  getAllPlans: async (req, res) => {
    try {
      const { isActive, type } = req.query;
      
      const filter = {};
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (type) filter.type = type;
      
      const plans = await SubscriptionPlan.find(filter).sort({ sortOrder: 1 });
      
      res.status(200).json({
        success: true,
        data: plans
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching subscription plans',
        error: error.message
      });
    }
  },

  // Get subscription plan by ID
  getPlan: async (req, res) => {
    try {
      const { id } = req.params;
      
      const plan = await SubscriptionPlan.findById(id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Subscription plan not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: plan
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching subscription plan',
        error: error.message
      });
    }
  },

  // Create subscription plan (admin only)
  createPlan: async (req, res) => {
    try {
      const { error } = subscriptionPlanValidation.create.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message
        });
      }

      // Create Stripe product and price if not free plan
      let stripeData = {};
      if (req.body.price.amount > 0) {
        try {
          // Create Stripe product
          const product = await stripe.products.create({
            name: req.body.name,
            description: req.body.description,
            metadata: {
              type: req.body.type
            }
          });

          // Create Stripe price
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: req.body.price.amount,
            currency: req.body.price.currency,
            recurring: {
              interval: req.body.price.interval,
              interval_count: req.body.price.intervalCount
            },
            metadata: {
              planType: req.body.type
            }
          });

          stripeData = {
            productId: product.id,
            priceId: price.id
          };
        } catch (stripeError) {
          return res.status(400).json({
            success: false,
            message: 'Error creating Stripe product/price',
            error: stripeError.message
          });
        }
      }

      const plan = new SubscriptionPlan({
        ...req.body,
        stripeData
      });
      
      await plan.save();
      
      res.status(201).json({
        success: true,
        message: 'Subscription plan created successfully',
        data: plan
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating subscription plan',
        error: error.message
      });
    }
  },

  // Update subscription plan (admin only)
  updatePlan: async (req, res) => {
    try {
      const { error } = subscriptionPlanValidation.update.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message
        });
      }

      const { id } = req.params;
      
      const plan = await SubscriptionPlan.findById(id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Subscription plan not found'
        });
      }

      Object.assign(plan, req.body);
      await plan.save();
      
      res.status(200).json({
        success: true,
        message: 'Subscription plan updated successfully',
        data: plan
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating subscription plan',
        error: error.message
      });
    }
  },

  // Delete subscription plan (admin only)
  deletePlan: async (req, res) => {
    try {
      const { id } = req.params;
      
      const plan = await SubscriptionPlan.findById(id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Subscription plan not found'
        });
      }

      // Check if plan has active subscriptions
      const activeSubscriptions = await Subscription.countDocuments({
        planId: id,
        status: { $in: ['active', 'trialing'] }
      });

      if (activeSubscriptions > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete plan with active subscriptions'
        });
      }

      // Archive Stripe product if exists
      if (plan.stripeData.productId) {
        try {
          await stripe.products.update(plan.stripeData.productId, {
            active: false
          });
        } catch (stripeError) {
          console.error('Error archiving Stripe product:', stripeError);
        }
      }

      await SubscriptionPlan.findByIdAndDelete(id);
      
      res.status(200).json({
        success: true,
        message: 'Subscription plan deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting subscription plan',
        error: error.message
      });
    }
  },

  // Compare plans
  comparePlans: async (req, res) => {
    try {
      const { planIds } = req.query;
      
      if (!planIds || !Array.isArray(planIds) || planIds.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 plan IDs are required for comparison'
        });
      }

      const plans = await SubscriptionPlan.find({
        _id: { $in: planIds },
        isPublic: true,
        isActive: true
      });

      if (plans.length !== planIds.length) {
        return res.status(404).json({
          success: false,
          message: 'One or more plans not found'
        });
      }

      // Generate comparison data
      const comparison = {
        plans,
        comparisons: []
      };

      for (let i = 0; i < plans.length - 1; i++) {
        for (let j = i + 1; j < plans.length; j++) {
          comparison.comparisons.push({
            plan1: plans[i]._id,
            plan2: plans[j]._id,
            differences: plans[i].compareWith(plans[j])
          });
        }
      }

      res.status(200).json({
        success: true,
        data: comparison
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error comparing plans',
        error: error.message
      });
    }
  }
};

// Subscription Controllers
const subscriptionController = {
  // Get user's current subscription
  getCurrentSubscription: async (req, res) => {
    try {
      const userId = req.user.id;
      
      const subscription = await Subscription.findOne({ userId })
        .populate('planId')
        .populate('paymentMethodId')
        .sort({ createdAt: -1 });
      
      res.status(200).json({
        success: true,
        data: subscription
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching subscription',
        error: error.message
      });
    }
  },

  // Create new subscription
  createSubscription: async (req, res) => {
    try {
      const { error } = subscriptionValidation.create.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message
        });
      }

      const userId = req.user.id;
      const { planId, paymentMethodId, trialPeriodDays, couponId, metadata } = req.body;

      // Check if user already has an active subscription
      const existingSubscription = await Subscription.findOne({
        userId,
        status: { $in: ['active', 'trialing'] }
      });

      if (existingSubscription) {
        return res.status(400).json({
          success: false,
          message: 'User already has an active subscription'
        });
      }

      // Get plan details
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan || !plan.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Subscription plan not found or inactive'
        });
      }

      // Get payment method if provided
      let paymentMethod = null;
      if (paymentMethodId) {
        paymentMethod = await PaymentMethod.findOne({
          _id: paymentMethodId,
          userId,
          status: 'active'
        });

        if (!paymentMethod) {
          return res.status(404).json({
            success: false,
            message: 'Payment method not found'
          });
        }
      }

      // Calculate subscription dates
      const now = new Date();
      let currentPeriodStart = now;
      let currentPeriodEnd = new Date(now);
      let trialStart = null;
      let trialEnd = null;
      let status = 'active';

      // Handle trial period
      const trialDays = trialPeriodDays || plan.trialPeriodDays || 0;
      if (trialDays > 0) {
        status = 'trialing';
        trialStart = now;
        trialEnd = new Date(now.getTime() + (trialDays * 24 * 60 * 60 * 1000));
        currentPeriodEnd = trialEnd;
      } else {
        // Calculate next billing date
        switch (plan.price.interval) {
          case 'day':
            currentPeriodEnd.setDate(currentPeriodEnd.getDate() + plan.price.intervalCount);
            break;
          case 'week':
            currentPeriodEnd.setDate(currentPeriodEnd.getDate() + (7 * plan.price.intervalCount));
            break;
          case 'month':
            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + plan.price.intervalCount);
            break;
          case 'year':
            currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + plan.price.intervalCount);
            break;
        }
      }

      // Create subscription data
      const subscriptionData = {
        userId,
        planId,
        paymentMethodId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        trialStart,
        trialEnd,
        billing: {
          amount: plan.price.amount,
          currency: plan.price.currency,
          interval: plan.price.interval,
          intervalCount: plan.price.intervalCount
        },
        usage: {
          products: { current: 0, limit: plan.limits?.products },
          storage: { current: 0, limit: plan.limits?.storage },
          bandwidth: { current: 0, limit: plan.limits?.bandwidth },
          apiCalls: { current: 0, limit: plan.limits?.apiCalls },
          teamMembers: { current: 1, limit: plan.limits?.teamMembers || 1 }
        },
        metadata: {
          source: 'web',
          ...metadata
        }
      };

      // Handle coupon/discount
      if (couponId) {
        // In a real implementation, you would validate the coupon
        // For now, we'll just store it
        subscriptionData.discount = { couponId };
      }

      // Create Stripe subscription if not free plan
      if (plan.price.amount > 0 && plan.stripeData.priceId) {
        try {
          const stripeSubscriptionData = {
            customer: paymentMethod.processorData.customerId,
            items: [{ price: plan.stripeData.priceId }],
            metadata: {
              userId: userId.toString(),
              planId: planId.toString()
            }
          };

          if (paymentMethod) {
            stripeSubscriptionData.default_payment_method = paymentMethod.processorData.paymentMethodId;
          }

          if (trialDays > 0) {
            stripeSubscriptionData.trial_period_days = trialDays;
          }

          if (couponId) {
            stripeSubscriptionData.coupon = couponId;
          }

          const stripeSubscription = await stripe.subscriptions.create(stripeSubscriptionData);

          subscriptionData.stripeData = {
            subscriptionId: stripeSubscription.id,
            customerId: stripeSubscription.customer,
            invoiceId: stripeSubscription.latest_invoice
          };
        } catch (stripeError) {
          return res.status(400).json({
            success: false,
            message: 'Error creating Stripe subscription',
            error: stripeError.message
          });
        }
      }

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      // Create initial transaction record for paid plans
      if (plan.price.amount > 0 && status === 'active') {
        const transaction = new Transaction({
          userId,
          subscriptionId: subscription._id,
          paymentMethodId,
          transactionType: 'subscription_payment',
          status: 'completed',
          amount: plan.price.amount,
          currency: plan.price.currency,
          description: `Subscription payment for ${plan.name}`,
          metadata: {
            subscriptionPeriod: {
              start: currentPeriodStart,
              end: currentPeriodEnd
            },
            planName: plan.name
          },
          paymentProcessor: {
            name: 'stripe',
            transactionId: subscriptionData.stripeData?.subscriptionId || 'free_plan'
          }
        });

        await transaction.save();
      }

      await subscription.populate('planId paymentMethodId');

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: subscription
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating subscription',
        error: error.message
      });
    }
  },

  // Update subscription
  updateSubscription: async (req, res) => {
    try {
      const { error } = subscriptionValidation.update.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message
        });
      }

      const { id } = req.params;
      const userId = req.user.id;

      const subscription = await Subscription.findOne({ _id: id, userId });
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      Object.assign(subscription, req.body);
      await subscription.save();

      res.status(200).json({
        success: true,
        message: 'Subscription updated successfully',
        data: subscription
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating subscription',
        error: error.message
      });
    }
  },

  // Cancel subscription
  cancelSubscription: async (req, res) => {
    try {
      const { error } = subscriptionValidation.cancel.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const { reason, immediately } = req.body;

      const subscription = await Subscription.findOne({ _id: id, userId });
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      if (!subscription.isActive()) {
        return res.status(400).json({
          success: false,
          message: 'Subscription is not active'
        });
      }

      // Cancel Stripe subscription if exists
      if (subscription.stripeData.subscriptionId) {
        try {
          await stripe.subscriptions.update(subscription.stripeData.subscriptionId, {
            cancel_at_period_end: !immediately
          });

          if (immediately) {
            await stripe.subscriptions.cancel(subscription.stripeData.subscriptionId);
          }
        } catch (stripeError) {
          console.error('Error canceling Stripe subscription:', stripeError);
        }
      }

      await subscription.cancel(reason, immediately);

      res.status(200).json({
        success: true,
        message: 'Subscription canceled successfully',
        data: subscription
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error canceling subscription',
        error: error.message
      });
    }
  },

  // Reactivate subscription
  reactivateSubscription: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const subscription = await Subscription.findOne({ _id: id, userId });
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      await subscription.reactivate();

      res.status(200).json({
        success: true,
        message: 'Subscription reactivated successfully',
        data: subscription
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error reactivating subscription',
        error: error.message
      });
    }
  },

  // Change subscription plan
  changeSubscriptionPlan: async (req, res) => {
    try {
      const { error } = subscriptionValidation.changePlan.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const { planId, prorationBehavior } = req.body;

      const subscription = await Subscription.findOne({ _id: id, userId });
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      if (!subscription.isActive()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change plan for inactive subscription'
        });
      }

      // Update Stripe subscription if exists
      if (subscription.stripeData.subscriptionId) {
        const newPlan = await SubscriptionPlan.findById(planId);
        if (newPlan.stripeData.priceId) {
          try {
            await stripe.subscriptions.update(subscription.stripeData.subscriptionId, {
              items: [{
                id: subscription.stripeData.subscriptionId,
                price: newPlan.stripeData.priceId
              }],
              proration_behavior: prorationBehavior
            });
          } catch (stripeError) {
            return res.status(400).json({
              success: false,
              message: 'Error updating Stripe subscription',
              error: stripeError.message
            });
          }
        }
      }

      await subscription.changePlan(planId, prorationBehavior);

      res.status(200).json({
        success: true,
        message: 'Subscription plan changed successfully',
        data: subscription
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error changing subscription plan',
        error: error.message
      });
    }
  },

  // Get subscription usage
  getSubscriptionUsage: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const subscription = await Subscription.findOne({ _id: id, userId })
        .populate('planId');

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      const usage = {};
      Object.keys(subscription.usage).forEach(resource => {
        const resourceUsage = subscription.usage[resource];
        usage[resource] = {
          current: resourceUsage.current,
          limit: resourceUsage.limit,
          percentage: resourceUsage.limit ? (resourceUsage.current / resourceUsage.limit) * 100 : 0,
          unlimited: resourceUsage.limit === undefined || resourceUsage.limit === null
        };
      });

      res.status(200).json({
        success: true,
        data: {
          subscription: subscription._id,
          plan: subscription.planId,
          usage,
          daysUntilRenewal: subscription.getDaysUntilRenewal()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching subscription usage',
        error: error.message
      });
    }
  }
};

module.exports = {
  subscriptionPlanController,
  subscriptionController
}; 