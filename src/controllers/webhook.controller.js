const { stripe, endpointSecret } = require('../utils/stripe');
const Subscription = require('../models/subscription.model');
const Transaction = require('../models/transaction.model');
const PaymentMethod = require('../models/paymentMethod.model');
const User = require('../models/user.model');

const webhookController = {
  // Handle Stripe webhooks
  handleStripeWebhook: async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // Handle the event
      switch (event.type) {
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object);
          break;

        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object);
          break;

        case 'payment_method.attached':
          await handlePaymentMethodAttached(event.data.object);
          break;

        case 'payment_method.detached':
          await handlePaymentMethodDetached(event.data.object);
          break;

        case 'customer.created':
          await handleCustomerCreated(event.data.object);
          break;

        case 'customer.updated':
          await handleCustomerUpdated(event.data.object);
          break;

        case 'charge.dispute.created':
          await handleChargeDisputeCreated(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing webhook',
        error: error.message
      });
    }
  }
};

// Helper functions for handling specific webhook events

async function handleSubscriptionCreated(stripeSubscription) {
  console.log('Subscription created:', stripeSubscription.id);
  
  try {
    // Find existing subscription in database
    const subscription = await Subscription.findOne({
      'stripeData.subscriptionId': stripeSubscription.id
    });

    if (subscription) {
      // Update subscription with Stripe data
      subscription.status = mapStripeStatus(stripeSubscription.status);
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      
      if (stripeSubscription.trial_start && stripeSubscription.trial_end) {
        subscription.trialStart = new Date(stripeSubscription.trial_start * 1000);
        subscription.trialEnd = new Date(stripeSubscription.trial_end * 1000);
      }

      await subscription.save();
    }
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(stripeSubscription) {
  console.log('Subscription updated:', stripeSubscription.id);
  
  try {
    const subscription = await Subscription.findOne({
      'stripeData.subscriptionId': stripeSubscription.id
    });

    if (subscription) {
      subscription.status = mapStripeStatus(stripeSubscription.status);
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;

      if (stripeSubscription.canceled_at) {
        subscription.canceledAt = new Date(stripeSubscription.canceled_at * 1000);
      }

      await subscription.save();
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(stripeSubscription) {
  console.log('Subscription deleted:', stripeSubscription.id);
  
  try {
    const subscription = await Subscription.findOne({
      'stripeData.subscriptionId': stripeSubscription.id
    });

    if (subscription) {
      subscription.status = 'canceled';
      subscription.canceledAt = new Date();
      await subscription.save();
    }
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  try {
    // Find subscription
    const subscription = await Subscription.findOne({
      'stripeData.subscriptionId': invoice.subscription
    }).populate('planId');

    if (subscription) {
      // Create transaction record
      const transaction = new Transaction({
        userId: subscription.userId,
        subscriptionId: subscription._id,
        paymentMethodId: subscription.paymentMethodId,
        transactionType: 'subscription_payment',
        status: 'completed',
        amount: invoice.amount_paid,
        currency: invoice.currency.toUpperCase(),
        description: `Subscription payment for ${subscription.planId?.name || 'subscription'}`,
        metadata: {
          invoiceId: invoice.id,
          subscriptionPeriod: {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd
          },
          planName: subscription.planId?.name
        },
        paymentProcessor: {
          name: 'stripe',
          transactionId: invoice.payment_intent,
          fee: invoice.application_fee_amount || 0
        },
        taxDetails: {
          taxAmount: invoice.tax || 0
        }
      });

      await transaction.save();

      // Reset usage for new billing period if needed
      if (subscription.status === 'active') {
        await subscription.resetUsage();
      }
    }
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('Invoice payment failed:', invoice.id);
  
  try {
    // Find subscription
    const subscription = await Subscription.findOne({
      'stripeData.subscriptionId': invoice.subscription
    });

    if (subscription) {
      // Update subscription status
      subscription.status = 'past_due';
      await subscription.save();

      // Create failed transaction record
      const transaction = new Transaction({
        userId: subscription.userId,
        subscriptionId: subscription._id,
        paymentMethodId: subscription.paymentMethodId,
        transactionType: 'subscription_payment',
        status: 'failed',
        amount: invoice.amount_due,
        currency: invoice.currency.toUpperCase(),
        description: `Failed subscription payment`,
        metadata: {
          invoiceId: invoice.id
        },
        paymentProcessor: {
          name: 'stripe',
          transactionId: invoice.payment_intent || invoice.id,
          processorResponse: {
            code: 'payment_failed',
            message: 'Invoice payment failed'
          }
        }
      });

      await transaction.save();
    }
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id);
  
  try {
    // Find existing transaction or create new one
    let transaction = await Transaction.findOne({
      'paymentProcessor.transactionId': paymentIntent.id
    });

    if (!transaction && paymentIntent.metadata.userId) {
      transaction = new Transaction({
        userId: paymentIntent.metadata.userId,
        transactionType: 'one_time_purchase',
        status: 'completed',
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        description: paymentIntent.description || 'One-time payment',
        metadata: paymentIntent.metadata,
        paymentProcessor: {
          name: 'stripe',
          transactionId: paymentIntent.id,
          fee: paymentIntent.application_fee_amount || 0
        }
      });

      await transaction.save();
    } else if (transaction) {
      transaction.status = 'completed';
      await transaction.save();
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log('Payment intent failed:', paymentIntent.id);
  
  try {
    let transaction = await Transaction.findOne({
      'paymentProcessor.transactionId': paymentIntent.id
    });

    if (!transaction && paymentIntent.metadata.userId) {
      transaction = new Transaction({
        userId: paymentIntent.metadata.userId,
        transactionType: 'one_time_purchase',
        status: 'failed',
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        description: paymentIntent.description || 'One-time payment',
        metadata: paymentIntent.metadata,
        paymentProcessor: {
          name: 'stripe',
          transactionId: paymentIntent.id,
          processorResponse: {
            code: paymentIntent.last_payment_error?.code,
            message: paymentIntent.last_payment_error?.message,
            errorType: paymentIntent.last_payment_error?.type
          }
        }
      });

      await transaction.save();
    } else if (transaction) {
      transaction.status = 'failed';
      transaction.paymentProcessor.processorResponse = {
        code: paymentIntent.last_payment_error?.code,
        message: paymentIntent.last_payment_error?.message,
        errorType: paymentIntent.last_payment_error?.type
      };
      await transaction.save();
    }
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}

async function handlePaymentMethodAttached(paymentMethod) {
  console.log('Payment method attached:', paymentMethod.id);
  
  try {
    // Update payment method status in database
    const dbPaymentMethod = await PaymentMethod.findOne({
      'processorData.paymentMethodId': paymentMethod.id
    });

    if (dbPaymentMethod) {
      dbPaymentMethod.status = 'active';
      await dbPaymentMethod.save();
    }
  } catch (error) {
    console.error('Error handling payment method attached:', error);
  }
}

async function handlePaymentMethodDetached(paymentMethod) {
  console.log('Payment method detached:', paymentMethod.id);
  
  try {
    // Update or remove payment method from database
    const dbPaymentMethod = await PaymentMethod.findOne({
      'processorData.paymentMethodId': paymentMethod.id
    });

    if (dbPaymentMethod) {
      await PaymentMethod.findByIdAndDelete(dbPaymentMethod._id);
    }
  } catch (error) {
    console.error('Error handling payment method detached:', error);
  }
}

async function handleCustomerCreated(customer) {
  console.log('Customer created:', customer.id);
  
  try {
    // Update user with Stripe customer ID if needed
    if (customer.metadata.userId) {
      const user = await User.findById(customer.metadata.userId);
      if (user && !user.stripeCustomerId) {
        user.stripeCustomerId = customer.id;
        await user.save();
      }
    }
  } catch (error) {
    console.error('Error handling customer created:', error);
  }
}

async function handleCustomerUpdated(customer) {
  console.log('Customer updated:', customer.id);
  
  try {
    // Update user information if needed
    if (customer.metadata.userId) {
      const user = await User.findById(customer.metadata.userId);
      if (user) {
        // Update user email if changed
        if (customer.email && customer.email !== user.email) {
          user.email = customer.email;
          await user.save();
        }
      }
    }
  } catch (error) {
    console.error('Error handling customer updated:', error);
  }
}

async function handleChargeDisputeCreated(dispute) {
  console.log('Charge dispute created:', dispute.id);
  
  try {
    // Find transaction and update status
    const transaction = await Transaction.findOne({
      'paymentProcessor.transactionId': dispute.payment_intent
    });

    if (transaction) {
      transaction.status = 'disputed';
      transaction.paymentProcessor.processorResponse = {
        code: 'dispute_created',
        message: `Dispute created: ${dispute.reason}`,
        errorType: 'dispute'
      };
      await transaction.save();
    }
  } catch (error) {
    console.error('Error handling charge dispute created:', error);
  }
}

// Helper function to map Stripe subscription status to our status
function mapStripeStatus(stripeStatus) {
  const statusMap = {
    'active': 'active',
    'canceled': 'canceled',
    'incomplete': 'incomplete',
    'incomplete_expired': 'incomplete_expired',
    'past_due': 'past_due',
    'trialing': 'trialing',
    'unpaid': 'unpaid'
  };

  return statusMap[stripeStatus] || stripeStatus;
}

module.exports = webhookController; 