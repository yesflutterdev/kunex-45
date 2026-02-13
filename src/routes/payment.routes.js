const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.mw.js');
const {
  paymentSettingsController,
  paymentMethodController,
  transactionController,
  paymentIntentController,
  makePayment,
  getPaymentHistory,
  getCurrentSubscription,
  getSubscriptionPlans
} = require('../controllers/payment.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentSettings:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         defaultPaymentMethodId:
 *           type: string
 *         billingAddress:
 *           type: object
 *           properties:
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             company:
 *               type: string
 *             address1:
 *               type: string
 *             address2:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             postalCode:
 *               type: string
 *             country:
 *               type: string
 *             phone:
 *               type: string
 *         taxInformation:
 *           type: object
 *           properties:
 *             taxId:
 *               type: string
 *             taxType:
 *               type: string
 *               enum: [vat, gst, sales_tax, none]
 *             businessName:
 *               type: string
 *             businessAddress:
 *               type: object
 *         invoiceSettings:
 *           type: object
 *           properties:
 *             receiveInvoices:
 *               type: boolean
 *             invoiceEmail:
 *               type: string
 *             invoicePrefix:
 *               type: string
 *             invoiceNotes:
 *               type: string
 *         autoRenew:
 *           type: boolean
 *         paymentReminders:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             daysBeforeDue:
 *               type: number
 *         currency:
 *           type: string
 *           enum: [USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR]
 *         status:
 *           type: string
 *           enum: [active, suspended, delinquent]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [credit_card, debit_card, paypal, bank_account, apple_pay, google_pay, other]
 *         isDefault:
 *           type: boolean
 *         status:
 *           type: string
 *           enum: [active, expired, invalid]
 *         card:
 *           type: object
 *           properties:
 *             brand:
 *               type: string
 *             last4:
 *               type: string
 *             expiryMonth:
 *               type: number
 *             expiryYear:
 *               type: number
 *             cardholderName:
 *               type: string
 *             country:
 *               type: string
 *         paypal:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *             payerId:
 *               type: string
 *         bankAccount:
 *           type: object
 *           properties:
 *             bankName:
 *               type: string
 *             accountType:
 *               type: string
 *             last4:
 *               type: string
 *             routingNumber:
 *               type: string
 *             country:
 *               type: string
 *         digitalWallet:
 *           type: object
 *           properties:
 *             walletType:
 *               type: string
 *             deviceId:
 *               type: string
 *             tokenId:
 *               type: string
 *         processorData:
 *           type: object
 *           properties:
 *             processorName:
 *               type: string
 *             tokenId:
 *               type: string
 *             customerId:
 *               type: string
 *             paymentMethodId:
 *               type: string
 *         billingAddress:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Transaction:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         subscriptionId:
 *           type: string
 *         paymentMethodId:
 *           type: string
 *         transactionType:
 *           type: string
 *           enum: [subscription_payment, one_time_purchase, refund, credit, chargeback]
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, refunded, disputed]
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         description:
 *           type: string
 *         metadata:
 *           type: object
 *         paymentProcessor:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             transactionId:
 *               type: string
 *             fee:
 *               type: number
 *         billingAddress:
 *           type: object
 *         taxDetails:
 *           type: object
 *         refundDetails:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   - name: Payment Settings
 *     description: User payment settings management
 *   - name: Payment Methods
 *     description: Payment method management
 *   - name: Transactions
 *     description: Transaction history and management
 *   - name: Payment Intents
 *     description: One-time payment processing
 */

// Payment Settings Routes
/**
 * @swagger
 * /api/payments/settings:
 *   get:
 *     summary: Get user's payment settings
 *     tags: [Payment Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PaymentSettings'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/settings', authenticate, paymentSettingsController.getPaymentSettings);

/**
 * @swagger
 * /api/payments/settings:
 *   put:
 *     summary: Update user's payment settings
 *     tags: [Payment Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               billingAddress:
 *                 type: object
 *               taxInformation:
 *                 type: object
 *               invoiceSettings:
 *                 type: object
 *               autoRenew:
 *                 type: boolean
 *               paymentReminders:
 *                 type: object
 *               currency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PaymentSettings'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/settings', authenticate, paymentSettingsController.updatePaymentSettings);

// Payment Methods Routes
/**
 * @swagger
 * /api/payments/methods:
 *   get:
 *     summary: Get all payment methods for user
 *     tags: [Payment Methods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, invalid]
 *         description: Filter by payment method status
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PaymentMethod'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/methods', authenticate, paymentMethodController.getPaymentMethods);

/**
 * @swagger
 * /api/payments/methods:
 *   post:
 *     summary: Add new payment method
 *     tags: [Payment Methods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - processorData
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [credit_card, debit_card, paypal, bank_account, apple_pay, google_pay, other]
 *               isDefault:
 *                 type: boolean
 *               card:
 *                 type: object
 *               paypal:
 *                 type: object
 *               bankAccount:
 *                 type: object
 *               digitalWallet:
 *                 type: object
 *               processorData:
 *                 type: object
 *                 required:
 *                   - paymentMethodId
 *                 properties:
 *                   processorName:
 *                     type: string
 *                   paymentMethodId:
 *                     type: string
 *               billingAddress:
 *                 type: object
 *     responses:
 *       201:
 *         description: Payment method added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PaymentMethod'
 *       400:
 *         description: Validation error or Stripe error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/methods', authenticate, paymentMethodController.addPaymentMethod);

/**
 * @swagger
 * /api/payments/methods/{id}:
 *   put:
 *     summary: Update payment method
 *     tags: [Payment Methods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment method ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isDefault:
 *                 type: boolean
 *               status:
 *                 type: string
 *               billingAddress:
 *                 type: object
 *     responses:
 *       200:
 *         description: Payment method updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PaymentMethod'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment method not found
 *       500:
 *         description: Server error
 */
router.put('/methods/:id', authenticate, paymentMethodController.updatePaymentMethod);

/**
 * @swagger
 * /api/payments/methods/{id}:
 *   delete:
 *     summary: Delete payment method
 *     tags: [Payment Methods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment method ID
 *     responses:
 *       200:
 *         description: Payment method deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment method not found
 *       500:
 *         description: Server error
 */
router.delete('/methods/:id', authenticate, paymentMethodController.deletePaymentMethod);

/**
 * @swagger
 * /api/payments/methods/{id}/default:
 *   put:
 *     summary: Set payment method as default
 *     tags: [Payment Methods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment method ID
 *     responses:
 *       200:
 *         description: Default payment method updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PaymentMethod'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment method not found
 *       500:
 *         description: Server error
 */
router.put('/methods/:id/default', authenticate, paymentMethodController.setDefaultPaymentMethod);

// Transaction Routes
/**
 * @swagger
 * /api/payments/transactions:
 *   get:
 *     summary: Get user transactions with filtering and pagination
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded, disputed]
 *         description: Filter by transaction status
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [subscription_payment, one_time_purchase, refund, credit, chargeback]
 *         description: Filter by transaction type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Minimum amount filter
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Maximum amount filter
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         description: Currency filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         pages:
 *                           type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/transactions', authenticate, transactionController.getTransactions);

/**
 * @swagger
 * /api/payments/transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.get('/transactions/:id', authenticate, transactionController.getTransaction);

/**
 * @swagger
 * /api/payments/transactions/{id}/refund:
 *   post:
 *     summary: Refund a transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refundReason
 *             properties:
 *               refundAmount:
 *                 type: number
 *                 description: Amount to refund (defaults to full amount)
 *               refundReason:
 *                 type: string
 *                 description: Reason for refund
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction:
 *                       $ref: '#/components/schemas/Transaction'
 *                     refund:
 *                       type: object
 *       400:
 *         description: Validation error or refund not allowed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.post('/transactions/:id/refund', authenticate, transactionController.refundTransaction);

/**
 * @swagger
 * /api/payments/transactions/statistics:
 *   get:
 *     summary: Get transaction statistics
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *     responses:
 *       200:
 *         description: Transaction statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAmount:
 *                       type: number
 *                     totalTransactions:
 *                       type: number
 *                     averageAmount:
 *                       type: number
 *                     totalFees:
 *                       type: number
 *                     totalTax:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/transactions/statistics', authenticate, transactionController.getTransactionStatistics);

// Payment Intent Routes
/**
 * @swagger
 * /api/payments/intents:
 *   post:
 *     summary: Create payment intent for one-time payment
 *     tags: [Payment Intents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 50
 *                 description: Amount in cents (minimum 50 cents)
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR]
 *                 default: USD
 *               paymentMethodId:
 *                 type: string
 *                 description: Payment method ID (optional)
 *               description:
 *                 type: string
 *                 description: Payment description
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       201:
 *         description: Payment intent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     clientSecret:
 *                       type: string
 *                       description: Client secret for frontend payment confirmation
 *                     paymentIntentId:
 *                       type: string
 *                       description: Payment intent ID
 *       400:
 *         description: Validation error or Stripe error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/intents', authenticate, paymentIntentController.createPaymentIntent);

/**
 * @swagger
 * /api/payments/intents/{id}/confirm:
 *   post:
 *     summary: Confirm payment intent
 *     tags: [Payment Intents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment intent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *                 description: Payment method ID
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *                 description: Return URL for 3D Secure
 *     responses:
 *       200:
 *         description: Payment intent confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Stripe payment intent object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/intents/:id/confirm', authenticate, paymentIntentController.confirmPaymentIntent);

// NEW PAYMENT ROUTES
/**
 * @swagger
 * /api/payments/make-payment:
 *   post:
 *     summary: Process payment for subscription
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptionPlan
 *               - amountPaid
 *               - subscriptionPlanId
 *             properties:
 *               subscriptionPlan:
 *                 type: string
 *               amountPaid:
 *                 type: number
 *                 minimum: 0
 *               subscriptionPlanId:
 *                 type: string
 *                 format: objectId
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         transaction:
 *                           type: object
 *                           properties:
 *                             amount:
 *                               type: number
 *                             currency:
 *                               type: string
 *                             status:
 *                               type: string
 *                             method:
 *                               type: string
 *                             date:
 *                               type: string
 *                               format: date-time
 *                             formattedAmount:
 *                               type: string
 *                         subscription:
 *                           type: object
 *                           properties:
 *                             planId:
 *                               type: string
 *                             planName:
 *                               type: string
 *                             planType:
 *                               type: string
 *                             description:
 *                               type: string
 *                             duration:
 *                               type: object
 *                               properties:
 *                                 startDate:
 *                                   type: string
 *                                   format: date-time
 *                                 endDate:
 *                                   type: string
 *                                   format: date-time
 *                                 daysRemaining:
 *                                   type: number
 *                                 isActive:
 *                                   type: boolean
 *                             trial:
 *                               type: object
 *                               properties:
 *                                 hasTrial:
 *                                   type: boolean
 *                                 trialDays:
 *                                   type: number
 *                                 isTrialActive:
 *                                   type: boolean
 *                         features:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               included:
 *                                 type: boolean
 *                               limit:
 *                                 type: number
 *                               highlighted:
 *                                 type: boolean
 *                         limits:
 *                           type: object
 *                           properties:
 *                             products:
 *                               type: number
 *                             storage:
 *                               type: string
 *                             bandwidth:
 *                               type: string
 *                             customDomain:
 *                               type: boolean
 *                             apiCalls:
 *                               type: number
 *                             teamMembers:
 *                               type: number
 *                         pricing:
 *                           type: object
 *                           properties:
 *                             originalAmount:
 *                               type: number
 *                             amountPaid:
 *                               type: number
 *                             discount:
 *                               type: number
 *                             tax:
 *                               type: number
 *                             currency:
 *                               type: string
 *                             formatted:
 *                               type: object
 *                               properties:
 *                                 original:
 *                                   type: string
 *                                 paid:
 *                                   type: string
 *                                 discount:
 *                                   type: string
 *                         metadata:
 *                           type: object
 *                           properties:
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *                             stripeData:
 *                               type: object
 *                               properties:
 *                                 productId:
 *                                   type: string
 *                                 priceId:
 *                                   type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         subscriptionPlan:
 *                           type: string
 *                         subscriptionDate:
 *                           type: string
 *                           format: date-time
 *                         subscriptionExpireDate:
 *                           type: string
 *                           format: date-time
 *                         isActiveSubscription:
 *                           type: boolean
 *                         planSubscribedTo:
 *                           type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalSpent:
 *                           type: number
 *                         subscriptionStatus:
 *                           type: string
 *                         trialStatus:
 *                           type: string
 *                         nextBillingDate:
 *                           type: string
 *                           format: date-time
 *                         planCategory:
 *                           type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Subscription plan not found
 */
router.post('/make-payment', authenticate, makePayment);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get user payment history with structured data
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *         description: Filter by payment status
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [stripe, paypal, bank_transfer]
 *         description: Filter by payment method
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments until this date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           transaction:
 *                             type: object
 *                             properties:
 *                               amount:
 *                                 type: number
 *                               currency:
 *                                 type: string
 *                               status:
 *                                 type: string
 *                               method:
 *                                 type: string
 *                               date:
 *                                 type: string
 *                                 format: date-time
 *                               formattedAmount:
 *                                 type: string
 *                           subscription:
 *                             type: object
 *                             properties:
 *                               planId:
 *                                 type: string
 *                               planName:
 *                                 type: string
 *                               planType:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               duration:
 *                                 type: object
 *                                 properties:
 *                                   startDate:
 *                                     type: string
 *                                     format: date-time
 *                                   endDate:
 *                                     type: string
 *                                     format: date-time
 *                                   daysRemaining:
 *                                     type: number
 *                                   isActive:
 *                                     type: boolean
 *                               trial:
 *                                 type: object
 *                                 properties:
 *                                   hasTrial:
 *                                     type: boolean
 *                                   trialDays:
 *                                     type: number
 *                                   isTrialActive:
 *                                     type: boolean
 *                           features:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                 description:
 *                                   type: string
 *                                 included:
 *                                   type: boolean
 *                                 limit:
 *                                   type: number
 *                                 highlighted:
 *                                   type: boolean
 *                           limits:
 *                             type: object
 *                             properties:
 *                               products:
 *                                 type: number
 *                               storage:
 *                                 type: string
 *                               bandwidth:
 *                                 type: string
 *                               customDomain:
 *                                 type: boolean
 *                               apiCalls:
 *                                 type: number
 *                               teamMembers:
 *                                 type: number
 *                           pricing:
 *                             type: object
 *                             properties:
 *                               originalAmount:
 *                                 type: number
 *                               amountPaid:
 *                                 type: number
 *                               discount:
 *                                 type: number
 *                               tax:
 *                                 type: number
 *                               currency:
 *                                 type: string
 *                               formatted:
 *                                 type: object
 *                                 properties:
 *                                   original:
 *                                     type: string
 *                                   paid:
 *                                     type: string
 *                                   discount:
 *                                     type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalPayments:
 *                           type: number
 *                         totalSpent:
 *                           type: number
 *                         activeSubscriptions:
 *                           type: number
 *                         trialSubscriptions:
 *                           type: number
 *                         planTypes:
 *                           type: array
 *                           items:
 *                             type: string
 *                         paymentMethods:
 *                           type: array
 *                           items:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         totalCount:
 *                           type: number
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *                         limit:
 *                           type: number
 */
router.get('/history', authenticate, getPaymentHistory);

/**
 * @swagger
 * /api/payments/current-subscription:
 *   get:
 *     summary: Get user current subscription
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription retrieved successfully
 */
router.get('/current-subscription', authenticate, getCurrentSubscription);

/**
 * @swagger
 * /api/payments/subscription-plans:
 *   get:
 *     summary: Get all available subscription plans organized by category
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Subscription plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: object
 *                       properties:
 *                         free:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                               price:
 *                                 type: object
 *                                 properties:
 *                                   amount:
 *                                     type: number
 *                                   currency:
 *                                     type: string
 *                                   interval:
 *                                     type: string
 *                                   formatted:
 *                                     type: string
 *                               features:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     name:
 *                                       type: string
 *                                     description:
 *                                       type: string
 *                                     included:
 *                                       type: boolean
 *                                     limit:
 *                                       type: number
 *                                     highlighted:
 *                                       type: boolean
 *                               limits:
 *                                 type: object
 *                                 properties:
 *                                   products:
 *                                     type: number
 *                                   storage:
 *                                     type: string
 *                                   bandwidth:
 *                                     type: string
 *                                   customDomain:
 *                                     type: boolean
 *                                   apiCalls:
 *                                     type: number
 *                                   teamMembers:
 *                                     type: number
 *                               trialPeriod:
 *                                 type: object
 *                                 properties:
 *                                   days:
 *                                     type: number
 *                                   hasTrial:
 *                                     type: boolean
 *                               metadata:
 *                                 type: object
 *                                 properties:
 *                                   popular:
 *                                     type: boolean
 *                                   recommendedFor:
 *                                     type: string
 *                                   highlights:
 *                                     type: array
 *                                     items:
 *                                       type: string
 *                         paid:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/SubscriptionPlan'
 *                         enterprise:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/SubscriptionPlan'
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalPlans:
 *                           type: number
 *                         freePlans:
 *                           type: number
 *                         paidPlans:
 *                           type: number
 *                         enterprisePlans:
 *                           type: number
 */
router.get('/subscription-plans', getSubscriptionPlans);

module.exports = router; 