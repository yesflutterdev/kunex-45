const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth.mw');
const formSubmissionController = require('../controllers/formSubmission.controller');

// Destructure functions from the controller
const {
  submitForm,
  getSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  getSubmissionStats,
  deleteSubmission,
  bulkUpdateSubmissions
} = formSubmissionController;

/**
 * @swagger
 * components:
 *   schemas:
 *     FormSubmission:
 *       type: object
 *       required:
 *         - pageId
 *         - widgetId
 *         - formData
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the submission
 *         pageId:
 *           type: string
 *           description: ID of the page where form was submitted
 *         widgetId:
 *           type: string
 *           description: ID of the form widget
 *         businessId:
 *           type: string
 *           description: Business profile ID if associated
 *         formData:
 *           type: object
 *           description: Form data submitted by the user
 *         formFields:
 *           type: array
 *           description: Form fields configuration from the widget
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, email, phone, textarea, select, checkbox, radio, file, date, number, url]
 *               label:
 *                 type: string
 *               placeholder:
 *                 type: string
 *               required:
 *                 type: boolean
 *               validation:
 *                 type: object
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *         submissionType:
 *           type: string
 *           enum: [contact, newsletter, booking, inquiry, feedback, custom]
 *           default: contact
 *         status:
 *           type: string
 *           enum: [new, read, replied, archived, spam]
 *           default: new
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           default: medium
 *         ipAddress:
 *           type: string
 *         userAgent:
 *           type: string
 *         referrer:
 *           type: string
 *         utmSource:
 *           type: string
 *         utmMedium:
 *           type: string
 *         utmCampaign:
 *           type: string
 *         respondedAt:
 *           type: string
 *           format: date-time
 *         responseMessage:
 *           type: string
 *         timeOnPage:
 *           type: number
 *         formCompletionTime:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     SubmitFormRequest:
 *       type: object
 *       required:
 *         - pageId
 *         - widgetId
 *         - formData
 *       properties:
 *         pageId:
 *           type: string
 *           description: ID of the page where form is located
 *         widgetId:
 *           type: string
 *           description: ID of the form widget
 *         formData:
 *           type: object
 *           description: Form data to submit
 *         submissionType:
 *           type: string
 *           enum: [contact, newsletter, booking, inquiry, feedback, custom]
 *         timeOnPage:
 *           type: number
 *           description: Time spent on page before submission (seconds)
 *         formCompletionTime:
 *           type: number
 *           description: Time taken to fill the form (seconds)
 *         referrer:
 *           type: string
 *         utmSource:
 *           type: string
 *         utmMedium:
 *           type: string
 *         utmCampaign:
 *           type: string
 *     
 *     UpdateSubmissionStatusRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [read, replied, archived, spam]
 *         responseMessage:
 *           type: string
 *           description: Response message when marking as replied
 *     
 *     BulkUpdateRequest:
 *       type: object
 *       required:
 *         - submissionIds
 *         - action
 *       properties:
 *         submissionIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of submission IDs to update
 *         action:
 *           type: string
 *           enum: [mark_read, mark_replied, archive, mark_spam]
 *         responseMessage:
 *           type: string
 *           description: Response message for mark_replied action
 */

/**
 * @swagger
 * /api/forms/submit:
 *   post:
 *     summary: Submit form data from a user-built page
 *     tags: [Form Submissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitFormRequest'
 *     responses:
 *       201:
 *         description: Form submitted successfully
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
 *                     submissionId:
 *                       type: string
 *                     message:
 *                       type: string
 *       400:
 *         description: Validation error or missing fields
 *       404:
 *         description: Page or form widget not found
 */
router.post('/submit', submitForm);

/**
 * @swagger
 * /api/forms/submissions:
 *   get:
 *     summary: Get form submissions for a business (authenticated)
 *     tags: [Form Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *         description: Filter by business ID
 *       - in: query
 *         name: pageId
 *         schema:
 *           type: string
 *         description: Filter by page ID
 *       - in: query
 *         name: widgetId
 *         schema:
 *           type: string
 *         description: Filter by widget ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, read, replied, archived, spam]
 *         description: Filter by submission status
 *       - in: query
 *         name: submissionType
 *         schema:
 *           type: string
 *           enum: [contact, newsletter, booking, inquiry, feedback, custom]
 *         description: Filter by submission type
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by priority
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
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Submissions retrieved successfully
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
 *                     submissions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FormSubmission'
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/submissions', auth, getSubmissions);

/**
 * @swagger
 * /api/forms/submissions/{id}:
 *   get:
 *     summary: Get submission by ID
 *     tags: [Form Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Submission retrieved successfully
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
 *                     submission:
 *                       $ref: '#/components/schemas/FormSubmission'
 *       404:
 *         description: Submission not found
 *       403:
 *         description: Access denied
 */
router.get('/submissions/:id', auth, getSubmissionById);

/**
 * @swagger
 * /api/forms/submissions/{id}/status:
 *   put:
 *     summary: Update submission status
 *     tags: [Form Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSubmissionStatusRequest'
 *     responses:
 *       200:
 *         description: Status updated successfully
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
 *                     submission:
 *                       $ref: '#/components/schemas/FormSubmission'
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Submission not found
 *       403:
 *         description: Access denied
 */
router.put('/submissions/:id/status', auth, updateSubmissionStatus);

/**
 * @swagger
 * /api/forms/submissions/{id}:
 *   delete:
 *     summary: Delete submission
 *     tags: [Form Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Submission deleted successfully
 *       404:
 *         description: Submission not found
 *       403:
 *         description: Access denied
 */
router.delete('/submissions/:id', auth, deleteSubmission);

/**
 * @swagger
 * /api/forms/stats:
 *   get:
 *     summary: Get submission statistics
 *     tags: [Form Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *         description: Business ID for statistics
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     period:
 *                       type: string
 *                     stats:
 *                       type: array
 *                     summary:
 *                       type: object
 *       403:
 *         description: Access denied
 */
router.get('/stats', auth, getSubmissionStats);

/**
 * @swagger
 * /api/forms/bulk-update:
 *   post:
 *     summary: Bulk update submissions
 *     tags: [Form Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkUpdateRequest'
 *     responses:
 *       200:
 *         description: Bulk update completed successfully
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
 *                     updatedCount:
 *                       type: number
 *                     submissions:
 *                       type: array
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Access denied
 */
router.post('/bulk-update', auth, bulkUpdateSubmissions);

module.exports = router;
