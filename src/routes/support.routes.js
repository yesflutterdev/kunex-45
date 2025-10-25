const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth.mw');
const { uploadSupport } = require('../utils/cloudinary');
const {
  createTicket,
  getUserTickets,
  getTicketById,
  addMessage,
  updateTicketStatus,
  deleteTicket,
  getTicketStats,
  searchTickets,
  getTicketCategories,
  addCategory,
  getTicketPriorities
} = require('../controllers/support.controller');


/**
 * @swagger
 * components:
 *   schemas:
 *     SupportTicket:
 *       type: object
 *       required:
 *         - subject
 *         - category
 *         - description
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the ticket
 *         userId:
 *           type: string
 *           description: User ID who created the ticket
 *         ticketId:
 *           type: string
 *           description: Human-readable ticket ID (e.g., #001)
 *         subject:
 *           type: string
 *           description: Ticket subject/title
 *           maxLength: 200
 *         category:
 *           type: string
 *           enum: [Technical Issue, Account Problem, Billing Question, Feature Request, Bug Report, General Inquiry, Login Issue, Payment Issue, Other]
 *           description: Ticket category
 *         priority:
 *           type: string
 *           enum: [Low, Medium, High, Urgent]
 *           default: Medium
 *           description: Ticket priority
 *         status:
 *           type: string
 *           enum: [Open, In Progress, Resolved, Closed, Cancelled]
 *           default: Open
 *           description: Ticket status
 *         description:
 *           type: string
 *           description: Detailed ticket description
 *           maxLength: 5000
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               fileName:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *               fileType:
 *                 type: string
 *                 enum: [image, video, document]
 *               fileSize:
 *                 type: number
 *               publicId:
 *                 type: string
 *         messages:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               sender:
 *                 type: string
 *                 enum: [user, admin, system]
 *               message:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               isInternal:
 *                 type: boolean
 *         resolution:
 *           type: string
 *           description: Resolution details
 *         resolvedAt:
 *           type: string
 *           format: date-time
 *         resolvedBy:
 *           type: string
 *           description: User ID who resolved the ticket
 *         assignedTo:
 *           type: string
 *           description: User ID assigned to handle the ticket
 *         assignedAt:
 *           type: string
 *           format: date-time
 *         lastActivity:
 *           type: string
 *           format: date-time
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         isUrgent:
 *           type: boolean
 *           default: false
 *         estimatedResolution:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CreateTicketRequest:
 *       type: object
 *       required:
 *         - subject
 *         - category
 *         - description
 *       properties:
 *         subject:
 *           type: string
 *           description: Ticket subject
 *         category:
 *           type: string
 *           enum: [Technical Issue, Account Problem, Billing Question, Feature Request, Bug Report, General Inquiry, Login Issue, Payment Issue, Other]
 *         priority:
 *           type: string
 *           enum: [Low, Medium, High, Urgent]
 *           default: Medium
 *         description:
 *           type: string
 *           description: Detailed description
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *     
 *     SupportMessage:
 *       type: object
 *       required:
 *         - message
 *       properties:
 *         message:
 *           type: string
 *           description: Message content
 *     
 *     TicketStatusUpdate:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [Open, In Progress, Resolved, Closed, Cancelled]
 *         resolution:
 *           type: string
 *           description: Resolution details (required for Resolved/Closed status)
 */

/**
 * @swagger
 * /api/support/tickets:
 *   post:
 *     summary: Create a new support ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - category
 *               - description
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Ticket subject
 *               category:
 *                 type: string
 *                 enum: [Technical Issue, Account Problem, Billing Question, Feature Request, Bug Report, General Inquiry, Login Issue, Payment Issue, Other]
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High, Urgent]
 *                 default: Medium
 *               description:
 *                 type: string
 *                 description: Detailed description
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Optional attachments (images, videos, documents)
 *     responses:
 *       201:
 *         description: Ticket created successfully
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
 *                     ticket:
 *                       $ref: '#/components/schemas/SupportTicket'
 *                     ticketId:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/tickets', auth, uploadSupport.array('files', 10), createTicket);

/**
 * @swagger
 * /api/support/tickets:
 *   get:
 *     summary: Get user's support tickets
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Open, In Progress, Resolved, Closed, Cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Technical Issue, Account Problem, Billing Question, Feature Request, Bug Report, General Inquiry, Login Issue, Payment Issue, Other]
 *         description: Filter by category
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [Low, Medium, High, Urgent]
 *         description: Filter by priority
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, lastActivity, priority]
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
 *         description: Tickets retrieved successfully
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
 *                     tickets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SupportTicket'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalTickets:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                     stats:
 *                       type: object
 *                       description: Ticket statistics by status
 *       401:
 *         description: Unauthorized
 */
router.get('/tickets', auth, getUserTickets);

/**
 * @swagger
 * /api/support/tickets/{ticketId}:
 *   get:
 *     summary: Get ticket by ID
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket retrieved successfully
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
 *                     ticket:
 *                       $ref: '#/components/schemas/SupportTicket'
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.get('/tickets/:ticketId', auth, getTicketById);

/**
 * @swagger
 * /api/support/tickets/{ticketId}/messages:
 *   post:
 *     summary: Add message to ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: Message content
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Optional attachments
 *     responses:
 *       200:
 *         description: Message added successfully
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
 *                     ticket:
 *                       $ref: '#/components/schemas/SupportTicket'
 *       400:
 *         description: Validation error or closed ticket
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.post('/tickets/:ticketId/messages', auth, uploadSupport.array('files', 10), addMessage);

/**
 * @swagger
 * /api/support/tickets/{ticketId}/status:
 *   put:
 *     summary: Update ticket status
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TicketStatusUpdate'
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
 *                     ticket:
 *                       $ref: '#/components/schemas/SupportTicket'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.put('/tickets/:ticketId/status', auth, updateTicketStatus);

/**
 * @swagger
 * /api/support/tickets/{ticketId}:
 *   delete:
 *     summary: Delete ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/tickets/:ticketId', auth, deleteTicket);

/**
 * @swagger
 * /api/support/stats:
 *   get:
 *     summary: Get ticket statistics
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
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
 *                     stats:
 *                       type: object
 *                       description: Ticket counts by status
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', auth, getTicketStats);

/**
 * @swagger
 * /api/support/search:
 *   get:
 *     summary: Search tickets
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Open, In Progress, Resolved, Closed, Cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Technical Issue, Account Problem, Billing Question, Feature Request, Bug Report, General Inquiry, Login Issue, Payment Issue, Other]
 *         description: Filter by category
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [Low, Medium, High, Urgent]
 *         description: Filter by priority
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Search results
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
 *                     tickets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SupportTicket'
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/search', auth, searchTickets);

/**
 * @swagger
 * /api/support/categories:
 *   get:
 *     summary: Get ticket categories
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
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
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/categories', auth, getTicketCategories);

/**
 * @swagger
 * /api/support/categories:
 *   post:
 *     summary: Add a new support category
 *     tags: [Support]
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name
 *               description:
 *                 type: string
 *                 description: Category description
 *               icon:
 *                 type: string
 *                 description: Icon name
 *               color:
 *                 type: string
 *                 description: Hex color code
 *     responses:
 *       201:
 *         description: Category added successfully
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
 *                     category:
 *                       type: object
 *       400:
 *         description: Category already exists
 *       401:
 *         description: Unauthorized
 */
router.post('/categories', auth, addCategory);

/**
 * @swagger
 * /api/support/priorities:
 *   get:
 *     summary: Get ticket priorities
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Priorities retrieved successfully
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
 *                     priorities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           value:
 *                             type: string
 *                           label:
 *                             type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/priorities', auth, getTicketPriorities);

module.exports = router;
