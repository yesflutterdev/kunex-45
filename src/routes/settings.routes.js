const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate, authenticateAllowDeactivated } = require('../middleware/auth.mw.js');

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: User settings and account management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserSettings:
 *       type: object
 *       properties:
 *         preferences:
 *           type: object
 *           properties:
 *             language:
 *               type: string
 *               enum: [en, es, fr, de, it, pt, ja, ko, zh]
 *             currency:
 *               type: string
 *               enum: [USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR]
 *             timezone:
 *               type: string
 *             distanceUnit:
 *               type: string
 *               enum: [km, mi]
 *             dateFormat:
 *               type: string
 *               enum: [MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD]
 *             timeFormat:
 *               type: string
 *               enum: [12h, 24h]
 *         privacy:
 *           type: object
 *           properties:
 *             profileVisibility:
 *               type: string
 *               enum: [public, private, friends_only]
 *             allowSearchEngines:
 *               type: boolean
 *             showOnlineStatus:
 *               type: boolean
 *             allowDirectMessages:
 *               type: boolean
 *         notifications:
 *           type: object
 *           properties:
 *             email:
 *               type: object
 *               properties:
 *                 marketing:
 *                   type: boolean
 *                 updates:
 *                   type: boolean
 *                 security:
 *                   type: boolean
 *                 billing:
 *                   type: boolean
 *                 newsletter:
 *                   type: boolean
 *             push:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                 marketing:
 *                   type: boolean
 *                 updates:
 *                   type: boolean
 *                 security:
 *                   type: boolean
 *             sms:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                 security:
 *                   type: boolean
 *                 billing:
 *                   type: boolean
 *     AccountDetails:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         profilePicture:
 *           type: string
 *         isVerified:
 *           type: boolean
 *         isTwoFactorEnabled:
 *           type: boolean
 *         role:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// KON-47: Account details endpoints
/**
 * @swagger
 * /api/settings/account:
 *   get:
 *     summary: Get account details and settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account details retrieved successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/AccountDetails'
 *                     settings:
 *                       $ref: '#/components/schemas/UserSettings'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/account', authenticate, settingsController.getAccountDetails);

/**
 * @swagger
 * /api/settings/account:
 *   put:
 *     summary: Update account details
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account details updated successfully
 *       400:
 *         description: Invalid input or no valid fields to update
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put('/account', authenticate, settingsController.updateAccountDetails);

/**
 * @swagger
 * /api/settings/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input or incorrect current password
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post('/change-password', authenticate, settingsController.changePassword);

/**
 * @swagger
 * /api/settings/preferences:
 *   put:
 *     summary: Update user settings and preferences
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSettings'
 *     responses:
 *       200:
 *         description: User settings updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put('/preferences', authenticate, settingsController.updateUserSettings);

// KON-48: Billing endpoints
/**
 * @swagger
 * /api/settings/billing:
 *   get:
 *     summary: Get billing information including current plan, status, and payment methods
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billing information retrieved successfully
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
 *                     paymentSettings:
 *                       type: object
 *                     currentSubscription:
 *                       type: object
 *                     paymentMethods:
 *                       type: array
 *                       items:
 *                         type: object
 *                     recentTransactions:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/billing', authenticate, settingsController.getBillingInfo);

/**
 * @swagger
 * /api/settings/billing:
 *   put:
 *     summary: Update billing settings
 *     tags: [Settings]
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
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   company:
 *                     type: string
 *                   address1:
 *                     type: string
 *                   address2:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *                   country:
 *                     type: string
 *                   phone:
 *                     type: string
 *               autoRenew:
 *                 type: boolean
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR]
 *               invoiceSettings:
 *                 type: object
 *                 properties:
 *                   receiveInvoices:
 *                     type: boolean
 *                   invoiceEmail:
 *                     type: string
 *                   invoicePrefix:
 *                     type: string
 *                   invoiceNotes:
 *                     type: string
 *     responses:
 *       200:
 *         description: Billing settings updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put('/billing', authenticate, settingsController.updateBillingSettings);

/**
 * @swagger
 * /api/settings/billing/renew:
 *   post:
 *     summary: Renew current subscription
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription renewed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No subscription found
 */
router.post('/billing/renew', authenticate, settingsController.renewSubscription);

// KON-49: Subscription history endpoints
/**
 * @swagger
 * /api/settings/subscription-history:
 *   get:
 *     summary: Get subscription history
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Subscription history retrieved successfully
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
 *                     subscriptions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         itemsPerPage:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/subscription-history', authenticate, settingsController.getSubscriptionHistory);

/**
 * @swagger
 * /api/settings/transaction-history:
 *   get:
 *     summary: Get transaction history
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [subscription_payment, one_time_purchase, refund, credit, chargeback]
 *         description: Filter by transaction type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded, disputed]
 *         description: Filter by transaction status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering transactions
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering transactions
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/transaction-history', authenticate, settingsController.getTransactionHistory);

// KON-50: Static content endpoints
/**
 * @swagger
 * /api/settings/help-center:
 *   get:
 *     summary: Get Help Center content
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Help Center content retrieved successfully
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
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           articles:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 title:
 *                                   type: string
 *                                 content:
 *                                   type: string
 *                                 lastUpdated:
 *                                   type: string
 *                                   format: date-time
 *                     searchTags:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/help-center', settingsController.getHelpCenter);

/**
 * @swagger
 * /api/settings/community:
 *   get:
 *     summary: Get Community information
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Community information retrieved successfully
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
 *                     overview:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         memberCount:
 *                           type: integer
 *                         activeDiscussions:
 *                           type: integer
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                     channels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           memberCount:
 *                             type: integer
 *                           url:
 *                             type: string
 *                     recentUpdates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           summary:
 *                             type: string
 */
router.get('/community', settingsController.getCommunityInfo);

/**
 * @swagger
 * /api/settings/terms:
 *   get:
 *     summary: Get Terms of Service and policy information
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Terms and policies retrieved successfully
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
 *                     termsOfService:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                         version:
 *                           type: string
 *                         effectiveDate:
 *                           type: string
 *                           format: date-time
 *                         url:
 *                           type: string
 *                         sections:
 *                           type: array
 *                           items:
 *                             type: string
 *                     privacyPolicy:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                         version:
 *                           type: string
 *                         effectiveDate:
 *                           type: string
 *                           format: date-time
 *                         url:
 *                           type: string
 *                         sections:
 *                           type: array
 *                           items:
 *                             type: string
 *                     cookiePolicy:
 *                       type: object
 *                     dataProcessingAgreement:
 *                       type: object
 */
router.get('/terms', settingsController.getTermsAndPolicies);

// Additional endpoints for account management
/**
 * @swagger
 * /api/settings/export-data:
 *   get:
 *     summary: Export account data (GDPR compliance)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account data exported successfully
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
 *                     exportDate:
 *                       type: string
 *                       format: date-time
 *                     user:
 *                       type: object
 *                     userSettings:
 *                       type: object
 *                     paymentSettings:
 *                       type: object
 *                     subscriptions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     paymentMethods:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/export-data', authenticate, settingsController.exportAccountData);

/**
 * @swagger
 * /api/settings/deactivate-account:
 *   patch:
 *     summary: Deactivate user account (temporary - can be reactivated)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 *       400:
 *         description: Incorrect password
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       409:
 *         description: Account is already deactivated
 */
router.patch('/deactivate-account', authenticate, settingsController.deactivateAccount);

/**
 * @swagger
 * /api/settings/reactivate-account:
 *   patch:
 *     summary: Reactivate a deactivated account
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account reactivated successfully
 *       400:
 *         description: Incorrect password
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Account permanently deleted and cannot be reactivated
 *       404:
 *         description: User not found
 *       409:
 *         description: Account is already active
 */
router.patch('/reactivate-account', authenticateAllowDeactivated, settingsController.reactivateAccount);

/**
 * @swagger
 * /api/settings/delete-account:
 *   post:
 *     summary: Delete user account (permanent)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account deletion initiated successfully
 *       400:
 *         description: Incorrect password
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post('/delete-account', authenticate, settingsController.deleteAccount);

module.exports = router; 