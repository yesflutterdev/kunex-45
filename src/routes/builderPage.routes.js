const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth.mw');
const builderPageController = require('../controllers/builderPage.controller');

// Destructure functions from the controller
const {
  createPage,
  getPages,
  getPageById,
  getPublicPage,
  updatePage,
  deletePage,
  publishPage,
  unpublishPage,
  clonePage,
  getPageVersions,
  revertToVersion,
  getPageAnalytics,
  searchPages,
  getPageTemplates,
  getSocialLinks,
  updateSocialLinks,
  getCallToAction,
  updateCallToAction,
  getPageFormData,
  getServiceHours,
  updateWeeklyHours,
  addEventDate,
  updateEventDate,
  removeEventDate,
  getCurrentHours,
  reportPage
} = builderPageController;

/**
 * @swagger
 * components:
 *   schemas:
 *     BuilderPage:
 *       type: object
 *       required:
 *         - title
 *         - slug
 *         - pageType
 *         - template
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the page
 *         userId:
 *           type: string
 *           description: User ID who owns the page
 *         businessId:
 *           type: string
 *           description: Business profile ID if associated
 *         title:
 *           type: string
 *           description: Page title
 *           maxLength: 200
 *         slug:
 *           type: string
 *           description: URL-friendly page identifier
 *           maxLength: 100
 *         description:
 *           type: string
 *           description: Page description
 *           maxLength: 500
 *         pageType:
 *           type: string
 *           enum: [landing, product, service, about, contact, portfolio, blog, custom]
 *           description: Type of page
 *         template:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: Template name
 *             version:
 *               type: string
 *               default: '1.0'
 *             category:
 *               type: string
 *               enum: [business, portfolio, ecommerce, blog, restaurant, agency, personal]
 *         layout:
 *           type: object
 *           description: Page layout configuration
 *         styling:
 *           type: object
 *           description: Page styling settings
 *         seo:
 *           type: object
 *           description: SEO settings
 *         settings:
 *           type: object
 *           description: Page settings
 *         analytics:
 *           type: object
 *           description: Page analytics data
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CreatePageRequest:
 *       type: object
 *       required:
 *         - title
 *         - slug
 *         - pageType
 *         - template
 *       properties:
 *         title:
 *           type: string
 *           description: Page title
 *         slug:
 *           type: string
 *           description: URL-friendly identifier
 *         description:
 *           type: string
 *           description: Page description
 *         pageType:
 *           type: string
 *           enum: [landing, product, service, about, contact, portfolio, blog, custom]
 *         template:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             category:
 *               type: string
 *         businessId:
 *           type: string
 *           description: Optional business profile ID
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/builder/pages:
 *   post:
 *     summary: Create a new builder page
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePageRequest'
 *     responses:
 *       201:
 *         description: Page created successfully
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
 *                     page:
 *                       $ref: '#/components/schemas/BuilderPage'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth, createPage);

/**
 * @swagger
 * /api/builder/pages:
 *   get:
 *     summary: Get all pages for authenticated user
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *         description: Filter by business ID
 *       - in: query
 *         name: pageType
 *         schema:
 *           type: string
 *         description: Filter by page type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [published, draft]
 *         description: Filter by publication status
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
 *           default: updatedAt
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
 *         description: Pages retrieved successfully
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
 *                     pages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BuilderPage'
 *                     pagination:
 *                       type: object
 */
router.get('/', auth, getPages);

/**
 * @swagger
 * /api/builder/pages/search:
 *   get:
 *     summary: Search public pages
 *     tags: [Builder Pages]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Template category filter
 *       - in: query
 *         name: pageType
 *         schema:
 *           type: string
 *         description: Page type filter
 *       - in: query
 *         name: published
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Only published pages
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Missing search query
 */
router.get('/search', searchPages);

/**
 * @swagger
 * /api/builder/pages/templates:
 *   get:
 *     summary: Get available page templates
 *     tags: [Builder Pages]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by template category
 *       - in: query
 *         name: pageType
 *         schema:
 *           type: string
 *         description: Filter by page type
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
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
 *                     templates:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/templates', getPageTemplates);

/**
 * @swagger
 * /api/builder/pages/{pageId}:
 *   get:
 *     summary: Get page by ID
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Page retrieved successfully
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
 *                     page:
 *                       $ref: '#/components/schemas/BuilderPage'
 *                     widgets:
 *                       type: array
 *                     currentVersion:
 *                       type: number
 *       404:
 *         description: Page not found
 */
router.get('/:pageId', auth, getPageById);

/**
 * @swagger
 * /api/builder/pages/{pageId}:
 *   put:
 *     summary: Update page
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               layout:
 *                 type: object
 *               styling:
 *                 type: object
 *               seo:
 *                 type: object
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Page updated successfully
 *       404:
 *         description: Page not found
 */
router.put('/:pageId', auth, updatePage);

/**
 * @swagger
 * /api/builder/pages/{pageId}:
 *   delete:
 *     summary: Delete page
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Page deleted successfully
 *       404:
 *         description: Page not found
 */
router.delete('/:pageId', auth, deletePage);

/**
 * @swagger
 * /api/builder/pages/{pageId}/publish:
 *   post:
 *     summary: Publish page
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Page published successfully
 *       404:
 *         description: Page not found
 */
router.post('/:pageId/publish', auth, publishPage);

/**
 * @swagger
 * /api/builder/pages/{pageId}/unpublish:
 *   post:
 *     summary: Unpublish page
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Page unpublished successfully
 *       404:
 *         description: Page not found
 */
router.post('/:pageId/unpublish', auth, unpublishPage);

/**
 * @swagger
 * /api/builder/pages/{pageId}/clone:
 *   post:
 *     summary: Clone page
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID to clone
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slug
 *             properties:
 *               title:
 *                 type: string
 *                 description: New page title
 *               slug:
 *                 type: string
 *                 description: New page slug
 *     responses:
 *       201:
 *         description: Page cloned successfully
 *       400:
 *         description: Slug already exists
 *       404:
 *         description: Original page not found
 */
router.post('/:pageId/clone', auth, clonePage);

/**
 * @swagger
 * /api/builder/pages/{pageId}/versions:
 *   get:
 *     summary: Get page versions
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Versions retrieved successfully
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
 *                     versions:
 *                       type: array
 *                     currentVersion:
 *                       type: number
 *       404:
 *         description: Page not found
 */
router.get('/:pageId/versions', auth, getPageVersions);

/**
 * @swagger
 * /api/builder/pages/{pageId}/revert:
 *   post:
 *     summary: Revert page to specific version
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - versionNumber
 *             properties:
 *               versionNumber:
 *                 type: number
 *                 description: Version number to revert to
 *     responses:
 *       200:
 *         description: Page reverted successfully
 *       400:
 *         description: Version not found
 *       404:
 *         description: Page not found
 */
router.post('/:pageId/revert', auth, revertToVersion);

/**
 * @swagger
 * /api/builder/pages/{pageId}/analytics:
 *   get:
 *     summary: Get page analytics
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: 30d
 *         description: Analytics period
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
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
 *                     page:
 *                       type: object
 *                     widgets:
 *                       type: array
 *                     summary:
 *                       type: object
 *       404:
 *         description: Page not found
 */
router.get('/:pageId/analytics', auth, getPageAnalytics);

// Public routes (no authentication required)

/**
 * @swagger
 * /api/builder/public/{slug}:
 *   get:
 *     summary: Get public page by slug
 *     tags: [Builder Pages]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Page slug
 *     responses:
 *       200:
 *         description: Public page retrieved successfully
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
 *                     page:
 *                       $ref: '#/components/schemas/BuilderPage'
 *                     widgets:
 *                       type: array
 *       404:
 *         description: Page not found
 */
router.get('/public/:slug', getPublicPage);

/**
 * @swagger
 * /api/builder/public/{username}/{slug}:
 *   get:
 *     summary: Get public page by business username and slug
 *     tags: [Builder Pages]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Business username
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Page slug
 *     responses:
 *       200:
 *         description: Public page retrieved successfully
 *       404:
 *         description: Page or business not found
 */
router.get('/public/:username/:slug', getPublicPage);

/**
 * @swagger
 * /api/builder/pages/{pageId}/social-links:
 *   get:
 *     summary: Get social links for a page
 *     tags: [Builder Pages]
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Social links retrieved successfully
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
 *                     socialLinks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           platform:
 *                             type: string
 *                           url:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           order:
 *                             type: number
 *       404:
 *         description: Page not found
 */
router.get('/:pageId/social-links', getSocialLinks);

/**
 * @swagger
 * /api/builder/pages/{pageId}/social-links:
 *   put:
 *     summary: Update social links for a page
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - socialLinks
 *             properties:
 *               socialLinks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - platform
 *                     - url
 *                   properties:
 *                     platform:
 *                       type: string
 *                       enum: [facebook, twitter, linkedin, instagram, youtube, tiktok, pinterest, snapchat, whatsapp, telegram, discord, reddit, github, website, blog, other]
 *                     url:
 *                       type: string
 *                       format: uri
 *                     displayName:
 *                       type: string
 *                       maxLength: 50
 *                     isActive:
 *                       type: boolean
 *                       default: true
 *                     order:
 *                       type: number
 *                       default: 0
 *     responses:
 *       200:
 *         description: Social links updated successfully
 *       400:
 *         description: Invalid social links data
 *       404:
 *         description: Page not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:pageId/social-links', auth, updateSocialLinks);

/**
 * @swagger
 * /api/builder/pages/{pageId}/call-to-action:
 *   get:
 *     summary: Get call-to-action configuration for a page
 *     tags: [Builder Pages]
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Call-to-action configuration retrieved successfully
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
 *                     callToAction:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                         button:
 *                           type: object
 *                           properties:
 *                             text:
 *                               type: string
 *                             bgColor:
 *                               type: string
 *                             textColor:
 *                               type: string
 *                             radius:
 *                               type: number
 *                             action:
 *                               type: string
 *                             actionData:
 *                               type: object
 *                             size:
 *                               type: object
 *                             position:
 *                               type: string
 *       404:
 *         description: Page not found
 */
router.get('/:pageId/call-to-action', getCallToAction);

/**
 * @swagger
 * /api/builder/pages/{pageId}/call-to-action:
 *   put:
 *     summary: Update call-to-action configuration for a page
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - callToAction
 *             properties:
 *               callToAction:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   button:
 *                     type: object
 *                     properties:
 *                       text:
 *                         type: string
 *                         maxLength: 50
 *                       bgColor:
 *                         type: string
 *                         pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *                       textColor:
 *                         type: string
 *                         pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *                       radius:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 50
 *                       action:
 *                         type: string
 *                         enum: [make_call, send_email, open_url, download_file, book_appointment, make_purchase, subscribe_newsletter, contact_form, social_media, custom]
 *                       actionData:
 *                         type: object
 *                         properties:
 *                           phoneNumber:
 *                             type: string
 *                           emailAddress:
 *                             type: string
 *                           url:
 *                             type: string
 *                           fileUrl:
 *                             type: string
 *                           appointmentUrl:
 *                             type: string
 *                           productId:
 *                             type: string
 *                           newsletterId:
 *                             type: string
 *                           formId:
 *                             type: string
 *                           socialPlatform:
 *                             type: string
 *                           customAction:
 *                             type: string
 *                       size:
 *                         type: object
 *                         properties:
 *                           width:
 *                             type: number
 *                             minimum: 100
 *                             maximum: 400
 *                           height:
 *                             type: number
 *                             minimum: 40
 *                             maximum: 80
 *                       position:
 *                         type: string
 *                         enum: [top-left, top-center, top-right, middle-left, middle-center, middle-right, bottom-left, bottom-center, bottom-right, floating]
 *                       isFloating:
 *                         type: boolean
 *                       showOnScroll:
 *                         type: boolean
 *                       scrollThreshold:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 100
 *     responses:
 *       200:
 *         description: Call-to-action updated successfully
 *       400:
 *         description: Invalid call-to-action data
 *       404:
 *         description: Page not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:pageId/call-to-action', auth, updateCallToAction);

/**
 * @swagger
 * /api/builder-pages/{pageId}/form-data:
 *   get:
 *     summary: Get all form submissions for a builder page
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Builder page ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, read, replied, archived, spam]
 *         description: Filter by submission status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by priority
 *       - in: query
 *         name: submissionType
 *         schema:
 *           type: string
 *           enum: [contact, newsletter, booking, inquiry, feedback, custom]
 *         description: Filter by submission type
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
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, status, priority]
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
 *         description: Form submissions retrieved successfully
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
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           widgetId:
 *                             type: string
 *                           widgetName:
 *                             type: string
 *                           widgetType:
 *                             type: string
 *                           formData:
 *                             type: object
 *                           formFields:
 *                             type: array
 *                           submissionType:
 *                             type: string
 *                           status:
 *                             type: string
 *                           priority:
 *                             type: string
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               username:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalSubmissions:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         new:
 *                           type: integer
 *                         read:
 *                           type: integer
 *                         replied:
 *                           type: integer
 *                         archived:
 *                           type: integer
 *                         spam:
 *                           type: integer
 *       404:
 *         description: Page not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:pageId/form-data', auth, getPageFormData);

// Service Hours Routes

/**
 * @swagger
 * /api/builder/pages/{pageId}/service-hours:
 *   get:
 *     summary: Get service hours for a page
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Service hours retrieved successfully
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
 *                     serviceHours:
 *                       type: object
 *                     currentHours:
 *                       type: object
 *                     isCurrentlyOpen:
 *                       type: boolean
 *       404:
 *         description: Page not found
 */
router.get('/:pageId/service-hours', auth, getServiceHours);

/**
 * @swagger
 * /api/builder/pages/{pageId}/service-hours/weekly:
 *   put:
 *     summary: Update weekly service hours
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - weeklyHours
 *             properties:
 *               weeklyHours:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                       enum: [Mon, Tues, Wed, Thur, Fri, Sat, Sun]
 *                     startTime:
 *                       type: string
 *                       pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                     endTime:
 *                       type: string
 *                       pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                     isClosed:
 *                       type: boolean
 *                       default: false
 *               timezone:
 *                 type: string
 *                 default: 'UTC'
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Weekly hours updated successfully
 *       400:
 *         description: Invalid weekly hours data
 *       404:
 *         description: Page not found
 */
router.put('/:pageId/service-hours/weekly', auth, updateWeeklyHours);

/**
 * @swagger
 * /api/builder/pages/{pageId}/service-hours/events:
 *   post:
 *     summary: Add event date
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventName
 *               - eventDate
 *               - startTime
 *               - endTime
 *             properties:
 *               eventName:
 *                 type: string
 *                 maxLength: 100
 *               eventDate:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               endTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               isRecurring:
 *                 type: boolean
 *                 default: false
 *               recurringPattern:
 *                 type: string
 *                 enum: [daily, weekly, monthly, yearly]
 *                 default: weekly
 *               recurringEndDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Event date added successfully
 *       400:
 *         description: Invalid event data
 *       404:
 *         description: Page not found
 */
router.post('/:pageId/service-hours/events', auth, addEventDate);

/**
 * @swagger
 * /api/builder/pages/{pageId}/service-hours/events/{eventId}:
 *   put:
 *     summary: Update event date
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventName:
 *                 type: string
 *               eventDate:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               description:
 *                 type: string
 *               isRecurring:
 *                 type: boolean
 *               recurringPattern:
 *                 type: string
 *               recurringEndDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Event date updated successfully
 *       404:
 *         description: Page or event not found
 */
router.put('/:pageId/service-hours/events/:eventId', auth, updateEventDate);

/**
 * @swagger
 * /api/builder/pages/{pageId}/service-hours/events/{eventId}:
 *   delete:
 *     summary: Remove event date
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event date removed successfully
 *       404:
 *         description: Page not found
 */
router.delete('/:pageId/service-hours/events/:eventId', auth, removeEventDate);

/**
 * @swagger
 * /api/builder/pages/{pageId}/service-hours/current:
 *   get:
 *     summary: Get current hours status
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Current hours status retrieved successfully
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
 *                     currentHours:
 *                       type: object
 *                     isCurrentlyOpen:
 *                       type: boolean
 *                     serviceHoursType:
 *                       type: string
 *       404:
 *         description: Page not found
 */
router.get('/:pageId/service-hours/current', auth, getCurrentHours);

/**
 * @swagger
 * /api/builder/pages/{pageId}/report:
 *   post:
 *     summary: Report a page
 *     tags: [Builder Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID to report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - description
 *             properties:
 *               category:
 *                 type: string
 *                 description: Report category
 *               description:
 *                 type: string
 *                 description: Detailed description of the report
 *               attachment:
 *                 type: string
 *                 description: Optional attachment URL or string
 *     responses:
 *       201:
 *         description: Page reported successfully
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
 *                     report:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         pageId:
 *                           type: string
 *                         userId:
 *                           type: string
 *                         category:
 *                           type: string
 *                         description:
 *                           type: string
 *                         attachment:
 *                           type: string
 *                         status:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error - missing required fields
 *       404:
 *         description: Page not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:pageId/report', auth, reportPage);

module.exports = router; 