const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.mw.js');
const {
  subscriptionPlanController,
  subscriptionController
} = require('../controllers/subscription.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     SubscriptionPlan:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         type:
 *           type: string
 *           enum: [free, basic, premium, enterprise, custom]
 *         price:
 *           type: object
 *           properties:
 *             amount:
 *               type: number
 *             currency:
 *               type: string
 *               enum: [USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR]
 *             interval:
 *               type: string
 *               enum: [day, week, month, year]
 *             intervalCount:
 *               type: number
 *         features:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               included:
 *                 type: boolean
 *               limit:
 *                 type: number
 *               highlighted:
 *                 type: boolean
 *         limits:
 *           type: object
 *           properties:
 *             products:
 *               type: number
 *             storage:
 *               type: number
 *             bandwidth:
 *               type: number
 *             customDomain:
 *               type: boolean
 *             apiCalls:
 *               type: number
 *             teamMembers:
 *               type: number
 *         trialPeriodDays:
 *           type: number
 *         sortOrder:
 *           type: number
 *         isPublic:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         metadata:
 *           type: object
 *           properties:
 *             popularPlan:
 *               type: boolean
 *             recommendedFor:
 *               type: string
 *             comparisonHighlights:
 *               type: array
 *               items:
 *                 type: string
 *         stripeData:
 *           type: object
 *           properties:
 *             productId:
 *               type: string
 *             priceId:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Subscription:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         planId:
 *           type: string
 *         paymentMethodId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, canceled, past_due, unpaid, trialing, incomplete, incomplete_expired]
 *         currentPeriodStart:
 *           type: string
 *           format: date-time
 *         currentPeriodEnd:
 *           type: string
 *           format: date-time
 *         trialStart:
 *           type: string
 *           format: date-time
 *         trialEnd:
 *           type: string
 *           format: date-time
 *         canceledAt:
 *           type: string
 *           format: date-time
 *         cancelAtPeriodEnd:
 *           type: boolean
 *         cancelationReason:
 *           type: string
 *         billing:
 *           type: object
 *           properties:
 *             amount:
 *               type: number
 *             currency:
 *               type: string
 *             interval:
 *               type: string
 *             intervalCount:
 *               type: number
 *         discount:
 *           type: object
 *           properties:
 *             couponId:
 *               type: string
 *             percentOff:
 *               type: number
 *             amountOff:
 *               type: number
 *             duration:
 *               type: string
 *             durationInMonths:
 *               type: number
 *             validUntil:
 *               type: string
 *               format: date-time
 *         usage:
 *           type: object
 *           properties:
 *             products:
 *               type: object
 *               properties:
 *                 current:
 *                   type: number
 *                 limit:
 *                   type: number
 *             storage:
 *               type: object
 *               properties:
 *                 current:
 *                   type: number
 *                 limit:
 *                   type: number
 *             bandwidth:
 *               type: object
 *               properties:
 *                 current:
 *                   type: number
 *                 limit:
 *                   type: number
 *             apiCalls:
 *               type: object
 *               properties:
 *                 current:
 *                   type: number
 *                 limit:
 *                   type: number
 *             teamMembers:
 *               type: object
 *               properties:
 *                 current:
 *                   type: number
 *                 limit:
 *                   type: number
 *         metadata:
 *           type: object
 *         stripeData:
 *           type: object
 *           properties:
 *             subscriptionId:
 *               type: string
 *             customerId:
 *               type: string
 *             invoiceId:
 *               type: string
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
 *   - name: Subscription Plans
 *     description: Subscription plan management
 *   - name: Subscriptions
 *     description: User subscription management
 */

// Subscription Plan Routes
/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     summary: Get all public subscription plans
 *     tags: [Subscription Plans]
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 *       500:
 *         description: Server error
 */
router.get('/plans', subscriptionPlanController.getPublicPlans);

/**
 * @swagger
 * /api/subscriptions/plans/admin:
 *   get:
 *     summary: Get all subscription plans (admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [free, basic, premium, enterprise, custom]
 *         description: Filter by plan type
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/plans/admin', authenticate, subscriptionPlanController.getAllPlans);

/**
 * @swagger
 * /api/subscriptions/plans/{id}:
 *   get:
 *     summary: Get subscription plan by ID
 *     tags: [Subscription Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription plan retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SubscriptionPlan'
 *       404:
 *         description: Subscription plan not found
 *       500:
 *         description: Server error
 */
router.get('/plans/:id', subscriptionPlanController.getPlan);

/**
 * @swagger
 * /api/subscriptions/plans:
 *   post:
 *     summary: Create subscription plan (admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [free, basic, premium, enterprise, custom]
 *               price:
 *                 type: object
 *                 required:
 *                   - amount
 *                 properties:
 *                   amount:
 *                     type: number
 *                   currency:
 *                     type: string
 *                   interval:
 *                     type: string
 *                   intervalCount:
 *                     type: number
 *               features:
 *                 type: array
 *                 items:
 *                   type: object
 *               limits:
 *                 type: object
 *               trialPeriodDays:
 *                 type: number
 *               sortOrder:
 *                 type: number
 *               isPublic:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Subscription plan created successfully
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
 *                   $ref: '#/components/schemas/SubscriptionPlan'
 *       400:
 *         description: Validation error or Stripe error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/plans', authenticate, subscriptionPlanController.createPlan);

/**
 * @swagger
 * /api/subscriptions/plans/{id}:
 *   put:
 *     summary: Update subscription plan (admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               features:
 *                 type: array
 *               limits:
 *                 type: object
 *               trialPeriodDays:
 *                 type: number
 *               sortOrder:
 *                 type: number
 *               isPublic:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Subscription plan updated successfully
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
 *                   $ref: '#/components/schemas/SubscriptionPlan'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription plan not found
 *       500:
 *         description: Server error
 */
router.put('/plans/:id', authenticate, subscriptionPlanController.updatePlan);

/**
 * @swagger
 * /api/subscriptions/plans/{id}:
 *   delete:
 *     summary: Delete subscription plan (admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription plan deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Cannot delete plan with active subscriptions
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription plan not found
 *       500:
 *         description: Server error
 */
router.delete('/plans/:id', authenticate, subscriptionPlanController.deletePlan);

/**
 * @swagger
 * /api/subscriptions/plans/compare:
 *   get:
 *     summary: Compare subscription plans
 *     tags: [Subscription Plans]
 *     parameters:
 *       - in: query
 *         name: planIds
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *           minItems: 2
 *         description: Array of plan IDs to compare
 *     responses:
 *       200:
 *         description: Plan comparison retrieved successfully
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
 *                     plans:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SubscriptionPlan'
 *                     comparisons:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: At least 2 plan IDs required
 *       404:
 *         description: One or more plans not found
 *       500:
 *         description: Server error
 */
router.get('/plans/compare', subscriptionPlanController.comparePlans);

// Subscription Routes
/**
 * @swagger
 * /api/subscriptions/current:
 *   get:
 *     summary: Get user's current subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Subscription'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/current', authenticate, subscriptionController.getCurrentSubscription);

/**
 * @swagger
 * /api/subscriptions:
 *   post:
 *     summary: Create new subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 description: Subscription plan ID
 *               paymentMethodId:
 *                 type: string
 *                 description: Payment method ID
 *               trialPeriodDays:
 *                 type: number
 *                 description: Trial period in days
 *               couponId:
 *                 type: string
 *                 description: Coupon code
 *               metadata:
 *                 type: object
 *                 properties:
 *                   source:
 *                     type: string
 *                     enum: [web, mobile, api, admin]
 *                   notes:
 *                     type: string
 *     responses:
 *       201:
 *         description: Subscription created successfully
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
 *                   $ref: '#/components/schemas/Subscription'
 *       400:
 *         description: Validation error, user already has subscription, or Stripe error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Plan or payment method not found
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, subscriptionController.createSubscription);

/**
 * @swagger
 * /api/subscriptions/{id}:
 *   put:
 *     summary: Update subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *               cancelAtPeriodEnd:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Subscription updated successfully
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
 *                   $ref: '#/components/schemas/Subscription'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, subscriptionController.updateSubscription);

/**
 * @swagger
 * /api/subscriptions/{id}/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Cancellation reason
 *               immediately:
 *                 type: boolean
 *                 default: false
 *                 description: Cancel immediately or at period end
 *     responses:
 *       200:
 *         description: Subscription canceled successfully
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
 *                   $ref: '#/components/schemas/Subscription'
 *       400:
 *         description: Validation error or subscription not active
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Server error
 */
router.post('/:id/cancel', authenticate, subscriptionController.cancelSubscription);

/**
 * @swagger
 * /api/subscriptions/{id}/reactivate:
 *   post:
 *     summary: Reactivate subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     responses:
 *       200:
 *         description: Subscription reactivated successfully
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
 *                   $ref: '#/components/schemas/Subscription'
 *       400:
 *         description: Cannot reactivate expired or non-canceled subscription
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Server error
 */
router.post('/:id/reactivate', authenticate, subscriptionController.reactivateSubscription);

/**
 * @swagger
 * /api/subscriptions/{id}/change-plan:
 *   post:
 *     summary: Change subscription plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 description: New plan ID
 *               prorationBehavior:
 *                 type: string
 *                 enum: [create_prorations, none, always_invoice]
 *                 default: create_prorations
 *                 description: Proration behavior
 *     responses:
 *       200:
 *         description: Subscription plan changed successfully
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
 *                   $ref: '#/components/schemas/Subscription'
 *       400:
 *         description: Validation error, inactive subscription, or Stripe error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Server error
 */
router.post('/:id/change-plan', authenticate, subscriptionController.changeSubscriptionPlan);

/**
 * @swagger
 * /api/subscriptions/{id}/usage:
 *   get:
 *     summary: Get subscription usage
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     responses:
 *       200:
 *         description: Subscription usage retrieved successfully
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
 *                     subscription:
 *                       type: string
 *                     plan:
 *                       $ref: '#/components/schemas/SubscriptionPlan'
 *                     usage:
 *                       type: object
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           current:
 *                             type: number
 *                           limit:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                           unlimited:
 *                             type: boolean
 *                     daysUntilRenewal:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Server error
 */
router.get('/:id/usage', authenticate, subscriptionController.getSubscriptionUsage);

module.exports = router; 