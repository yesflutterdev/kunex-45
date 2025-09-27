const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

/**
 * @swagger
 * tags:
 *   - name: Webhooks
 *     description: Stripe webhook endpoints
 */

/**
 * @swagger
 * /api/webhooks/stripe:
 *   post:
 *     summary: Handle Stripe webhooks
 *     tags: [Webhooks]
 *     description: |
 *       Endpoint for receiving Stripe webhook events. This endpoint handles various Stripe events including:
 *       - Subscription events (created, updated, deleted, trial ending)
 *       - Payment events (succeeded, failed, requires action)
 *       - Customer events (created, updated, deleted)
 *       - Invoice events (created, paid, payment failed)
 *       - Dispute events (created, updated)
 *       
 *       The webhook signature is verified using the Stripe webhook secret to ensure authenticity.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe webhook event object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid webhook signature or malformed request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid signature"
 *       500:
 *         description: Server error processing webhook
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Webhook processing failed"
 */

// Stripe webhook endpoint - requires raw body for signature verification
router.post('/stripe', express.raw({ type: 'application/json' }), webhookController.handleStripeWebhook);

module.exports = router; 