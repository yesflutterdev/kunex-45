const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth.mw');
const { upload } = require('../utils/cloudinary');
const {
  createWidget,
  getWidgets,
  getWidgetById,
  updateWidget,
  deleteWidget,
  cloneWidget,
  updateWidgetOrder,
  updatePageWidgetOrder,
  getWidgetsByType,
  getWidgetsByPage,
  searchWidgets,
  getPopularWidgets,
  updateWidgetAnalytics,
  uploadWidgetAsset,
  getWidgetPreview,
  getWidgetTypes,
  reorderProducts,
  deleteProduct,
  updateProduct,
  insertProduct
} = require('../controllers/widget.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     Widget:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - pageId
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the widget
 *         userId:
 *           type: string
 *           description: User ID who owns the widget
 *         businessId:
 *           type: string
 *           description: Business profile ID if associated
 *         pageId:
 *           type: string
 *           description: Builder page ID this widget belongs to
 *         name:
 *           type: string
 *           description: Widget name/title
 *           maxLength: 100
 *         type:
 *           type: string
 *           enum: [text, image, video, audio, button, form, map, social_media, testimonial, gallery, slider, countdown, pricing_table, chart, embed, spacer, divider, icon, accordion, tabs, modal, calendar, booking, payment, newsletter, search, menu, breadcrumb, pagination, progress_bar, rating, timeline, custom_html, api_data, weather, clock, calculator, custom_link, media, promotions, products, event, dropdown, app_integration, google_reviews, google_maps, reservations, music_podcast, social_media_widgets]
 *           description: Widget type
 *         category:
 *           type: string
 *           enum: [content, media, form, navigation, ecommerce, social, utility, custom]
 *           description: Widget category
 *         settings:
 *           type: object
 *           description: Widget configuration settings
 *           properties:
 *             content:
 *               type: object
 *               description: Content-specific settings
 *             display:
 *               type: object
 *               description: Display settings
 *             style:
 *               type: object
 *               description: Styling settings
 *             animation:
 *               type: object
 *               description: Animation settings
 *             interactive:
 *               type: object
 *               description: Interactive behavior settings
 *             specific:
 *               $ref: '#/components/schemas/WidgetSpecificSettings'
 *               description: Type-specific widget settings
 *         layout:
 *           type: object
 *           description: Widget layout configuration
 *         order:
 *           type: number
 *           description: Widget order on the page
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether widget is active
 *         analytics:
 *           type: object
 *           description: Widget analytics data
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CreateWidgetRequest:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - pageId
 *       properties:
 *         name:
 *           type: string
 *           description: Widget name
 *         type:
 *           type: string
 *           enum: [text, image, video, audio, button, form, map, social_media, testimonial, gallery, slider, countdown, pricing_table, chart, embed, spacer, divider, icon, accordion, tabs, modal, calendar, booking, payment, newsletter, search, menu, breadcrumb, pagination, progress_bar, rating, timeline, custom_html, api_data, weather, clock, calculator, custom_link, media, promotions, products, event, dropdown, app_integration, google_reviews, google_maps, reservations, music_podcast, social_media_widgets]
 *         pageId:
 *           type: string
 *           description: Page ID this widget belongs to
 *         category:
 *           type: string
 *           enum: [content, media, form, navigation, ecommerce, social, utility, custom]
 *         settings:
 *           type: object
 *           description: Widget settings
 *           properties:
 *             content:
 *               type: object
 *               description: Content-specific settings
 *             display:
 *               type: object
 *               description: Display settings
 *             style:
 *               type: object
 *               description: Styling settings
 *             animation:
 *               type: object
 *               description: Animation settings
 *             interactive:
 *               type: object
 *               description: Interactive behavior settings
 *             specific:
 *               $ref: '#/components/schemas/WidgetSpecificSettings'
 *               description: Type-specific widget settings
 *         layout:
 *           type: object
 *           description: Layout configuration
 *
 *     WidgetOrderUpdate:
 *       type: object
 *       required:
 *         - widgets
 *       properties:
 *         widgets:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               order:
 *                 type: number
 *
 *     WidgetSpecificSettings:
 *       type: object
 *       description: Type-specific widget settings
 *       properties:
 *         customLink:
 *           type: object
 *           description: Custom link widget settings
 *           properties:
 *             title:
 *               type: string
 *               description: Link text/title
 *             url:
 *               type: string
 *               description: Target URL
 *         media:
 *           type: object
 *           description: Media widget settings (Photo/Video)
 *           properties:
 *             mediaType:
 *               type: string
 *               enum: [photo, video]
 *               description: Type of media
 *             photoType:
 *               type: string
 *               enum: [carousel, grid]
 *               description: Photo display type
 *             videoType:
 *               type: string
 *               enum: [youtube, upload]
 *               description: Video source type
 *             carousel:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                 url:
 *                   type: string
 *             grid:
 *               type: object
 *               properties:
 *                 photos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                       alt:
 *                         type: string
 *                 sameForAll:
 *                   type: boolean
 *                 gridTitle:
 *                   type: string
 *                 url:
 *                   type: string
 *             video:
 *               type: object
 *               properties:
 *                 videoUrl:
 *                   type: string
 *                 videoTitle:
 *                   type: string
 *                 thumbnailUrl:
 *                   type: string
 *         form:
 *           type: object
 *           description: Form widget settings
 *           properties:
 *             addMedia:
 *               type: string
 *               description: Optional media attachment
 *             titleTextBox:
 *               type: string
 *               description: Form title
 *             hasEmail:
 *               type: boolean
 *               description: Include email field
 *             emailPlaceholder:
 *               type: string
 *               default: "abc@123gmail.cm"
 *             hasPhoneNumber:
 *               type: boolean
 *               description: Include phone number field
 *             phoneNumberPlaceholder:
 *               type: string
 *         promotions:
 *           type: object
 *           description: Promotions widget settings
 *           properties:
 *             coverImage:
 *               type: string
 *               description: Promotion cover image URL
 *             title:
 *               type: string
 *               description: Promotion title
 *             url:
 *               type: string
 *               description: Promotion link URL
 *             startDate:
 *               type: string
 *               description: Start date (MM/DD/YYYY format)
 *             endDate:
 *               type: string
 *               description: End date (MM/DD/YYYY format)
 *         products:
 *           type: array
 *           description: Products widget settings
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: Product ID
 *               productImage:
 *                 type: string
 *                 description: Product image URL
 *               productName:
 *                 type: string
 *                 description: Product name
 *               price:
 *                 type: string
 *                 description: Product price
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, GBP, CAD]
 *                 default: USD
 *               productUrl:
 *                 type: string
 *                 description: Product page URL
 *               order:
 *                 type: number
 *                 description: Product order position
 *                 default: 0
 *         event:
 *           type: object
 *           description: Event widget settings
 *           properties:
 *             eventImage:
 *               type: string
 *               description: Event image URL
 *             title:
 *               type: string
 *               description: Event title
 *             date:
 *               type: string
 *               description: Event date (26 Oct 2024 format)
 *             location:
 *               type: string
 *               description: Event location
 *             ticketUrl:
 *               type: string
 *               description: Ticket purchase URL
 *         dropdown:
 *           type: object
 *           description: Drop down text widget settings
 *           properties:
 *             headings:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   text:
 *                     type: string
 *                     default: "Heading 1 Text"
 *                   description:
 *                     type: string
 *                     default: "Add a description of your business."
 *                   maxCharacters:
 *                     type: number
 *                     default: 140
 *             addAnotherTextBox:
 *               type: boolean
 *               description: Allow adding more text boxes
 *         appIntegration:
 *           type: object
 *           description: App integration widget settings
 *           properties:
 *             appleStoreUrl:
 *               type: string
 *               description: Apple App Store URL
 *             googlePlayUrl:
 *               type: string
 *               description: Google Play Store URL
 *         googleReviews:
 *           type: object
 *           description: Google Reviews widget settings
 *           properties:
 *             mediaImage:
 *               type: string
 *               description: Review media image URL
 *             title:
 *               type: string
 *               description: Review widget title
 *             googleBusinessProfileUrl:
 *               type: string
 *               default: "Google Business"
 *               description: Google Business Profile URL
 *         googleMaps:
 *           type: object
 *           description: Google Maps widget settings
 *           properties:
 *             location:
 *               type: string
 *               default: "Los Angeles"
 *               description: Map location
 *         reservations:
 *           type: object
 *           description: Reservations widget settings
 *           properties:
 *             reservationImage:
 *               type: string
 *               description: Reservation image URL
 *             reservationUrl:
 *               type: string
 *               default: "www.url.com"
 *               description: Reservation booking URL
 *         musicPodcast:
 *           type: object
 *           description: Music/Podcast widget settings
 *           properties:
 *             podcastImage:
 *               type: string
 *               description: Podcast/music image URL
 *             musicPodcastUrl:
 *               type: string
 *               default: "www.url.com"
 *               description: Music/podcast URL
 *         socialMedia:
 *           type: object
 *           description: Social media widgets settings
 *           properties:
 *             widgetType:
 *               type: string
 *               enum: [instagram_feed, tiktok_profile, facebook_profile]
 *               default: instagram_feed
 *               description: Social media platform type
 *             instagram:
 *               type: object
 *               properties:
 *                 handle:
 *                   type: string
 *                   description: Instagram handle
 *                 title:
 *                   type: string
 *                   description: Optional title
 *             tiktok:
 *               type: object
 *               properties:
 *                 handle:
 *                   type: string
 *                   description: TikTok handle
 *                 title:
 *                   type: string
 *                   description: Optional title
 *             facebook:
 *               type: object
 *               properties:
 *                 handle:
 *                   type: string
 *                   description: Facebook handle
 *                 title:
 *                   type: string
 *                   description: Optional title
 */

/**
 * @swagger
 * /api/builder/widgets:
 *   post:
 *     summary: Create a new widget
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateWidgetRequest'
 *     responses:
 *       201:
 *         description: Widget created successfully
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
 *                     widget:
 *                       $ref: '#/components/schemas/Widget'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Page not found
 */
router.post('/', auth, createWidget);

/**
 * @swagger
 * /api/builder/widgets:
 *   get:
 *     summary: Get all widgets for authenticated user
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pageId
 *         schema:
 *           type: string
 *         description: Filter by page ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by widget type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by widget category
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
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
 *         description: Number of widgets per page
 *     responses:
 *       200:
 *         description: Widgets retrieved successfully
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
 *                     widgets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Widget'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                         total:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth, getWidgets);

/**
 * @swagger
 * /api/builder/widgets/{id}:
 *   get:
 *     summary: Get widget by ID
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Widget ID
 *     responses:
 *       200:
 *         description: Widget retrieved successfully
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
 *                     widget:
 *                       $ref: '#/components/schemas/Widget'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Widget not found
 */
router.get('/:id', auth, getWidgetById);

/**
 * @swagger
 * /api/builder/widgets/{id}:
 *   put:
 *     summary: Update widget
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Widget ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               settings:
 *                 type: object
 *               layout:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Widget updated successfully
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
 *                     widget:
 *                       $ref: '#/components/schemas/Widget'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Widget not found
 */
router.put('/:id', auth, updateWidget);

/**
 * @swagger
 * /api/builder/widgets/{id}:
 *   delete:
 *     summary: Delete widget
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Widget ID
 *     responses:
 *       200:
 *         description: Widget deleted successfully
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
 *         description: Widget not found
 */
router.delete('/:id', auth, deleteWidget);

/**
 * @swagger
 * /api/builder/widgets/{id}/clone:
 *   post:
 *     summary: Clone widget
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Widget ID to clone
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New widget name
 *               pageId:
 *                 type: string
 *                 description: Target page ID (if different)
 *     responses:
 *       201:
 *         description: Widget cloned successfully
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
 *                     widget:
 *                       $ref: '#/components/schemas/Widget'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Widget not found
 */
router.post('/:id/clone', auth, cloneWidget);

/**
 * @swagger
 * /api/builder/widgets/order:
 *   put:
 *     summary: Update widget order
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WidgetOrderUpdate'
 *     responses:
 *       200:
 *         description: Widget order updated successfully
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
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/order', auth, updateWidgetOrder);

/**
 * @swagger
 * /api/builder/widgets/page/{pageId}/order:
 *   put:
 *     summary: Update widget order for a specific page
 *     tags: [Widgets]
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
 *             $ref: '#/components/schemas/WidgetOrderUpdate'
 *     responses:
 *       200:
 *         description: Widget order updated successfully for the page
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
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/page/:pageId/order', auth, updatePageWidgetOrder);

/**
 * @swagger
 * /api/builder/widgets/types/{type}:
 *   get:
 *     summary: Get widgets by type
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Widget type
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
 *     responses:
 *       200:
 *         description: Widgets retrieved successfully
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
 *                     widgets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Widget'
 *       401:
 *         description: Unauthorized
 */
router.get('/types/:type', auth, getWidgetsByType);

/**
 * @swagger
 * /api/builder/widgets/page/{pageId}:
 *   get:
 *     summary: Get widgets by page ID
 *     tags: [Widgets]
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
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Widgets retrieved successfully
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
 *                     widgets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Widget'
 *       401:
 *         description: Unauthorized
 */
router.get('/page/:pageId', auth, getWidgetsByPage);

/**
 * @swagger
 * /api/builder/widgets/search:
 *   get:
 *     summary: Search widgets
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by widget type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by widget category
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
 *                     widgets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Widget'
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/search', auth, searchWidgets);

/**
 * @swagger
 * /api/builder/widgets/popular:
 *   get:
 *     summary: Get popular widgets
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of widgets to return
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: Popular widgets retrieved successfully
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
 *                     widgets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Widget'
 *       401:
 *         description: Unauthorized
 */
router.get('/popular', auth, getPopularWidgets);

/**
 * @swagger
 * /api/builder/widgets/{id}/analytics:
 *   put:
 *     summary: Update widget analytics
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Widget ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [view, click, interaction, conversion]
 *               data:
 *                 type: object
 *                 description: Additional analytics data
 *     responses:
 *       200:
 *         description: Analytics updated successfully
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
 *         description: Widget not found
 */
router.put('/:id/analytics', auth, updateWidgetAnalytics);

/**
 * @swagger
 * /api/builder/widgets/{id}/upload:
 *   post:
 *     summary: Upload asset for widget
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Widget ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               assetType:
 *                 type: string
 *                 enum: [image, video, audio, document]
 *     responses:
 *       200:
 *         description: Asset uploaded successfully
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
 *                     url:
 *                       type: string
 *                     publicId:
 *                       type: string
 *       400:
 *         description: Upload error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Widget not found
 */
router.post('/:id/upload', auth, upload.single('file'), uploadWidgetAsset);

/**
 * @swagger
 * /api/builder/widgets/{id}/preview:
 *   get:
 *     summary: Get widget preview
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Widget ID
 *     responses:
 *       200:
 *         description: Widget preview generated
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
 *                     preview:
 *                       type: object
 *                       description: Widget preview data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Widget not found
 */
router.get('/:id/preview', auth, getWidgetPreview);

/**
 * @swagger
 * /api/builder/widgets/types:
 *   get:
 *     summary: Get available widget types
 *     tags: [Widgets]
 *     responses:
 *       200:
 *         description: Widget types retrieved successfully
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
 *                     types:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           category:
 *                             type: string
 *                           description:
 *                             type: string
 *                           icon:
 *                             type: string
 *                           settings:
 *                             type: object
 */
router.get('/types', getWidgetTypes);

/**
 * @swagger
 * /api/builder/widgets/{id}/products/reorder:
 *   put:
 *     summary: Reorder products within a products widget
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Widget ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - products
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - order
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: Product ID within the widget
 *                     order:
 *                       type: number
 *                       description: New order position for the product
 *                 description: Array of products with their new order positions
 *     responses:
 *       200:
 *         description: Products reordered successfully
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
 *                     widget:
 *                       $ref: '#/components/schemas/Widget'
 *                     reorderedProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: string
 *                           order:
 *                             type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Widget not found
 */
router.put('/:id/products/reorder', auth, reorderProducts);

/**
 * @swagger
 * /api/builder/widgets/{id}/products/{productId}:
 *   delete:
 *     summary: Delete a specific product from a products widget
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Widget ID
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID to delete
 *     responses:
 *       200:
 *         description: Product deleted successfully
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
 *                     widget:
 *                       $ref: '#/components/schemas/Widget'
 *                     deletedProductId:
 *                       type: string
 *       400:
 *         description: Invalid product ID format
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Widget or product not found
 */
router.delete('/:id/products/:productId', auth, deleteProduct);

/**
 * @swagger
 * /api/builder/widgets/{id}/products/{productId}:
 *   put:
 *     summary: Update a specific product in a products widget
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Widget ID
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *                 description: Product name
 *               productDescription:
 *                 type: string
 *                 description: Product description
 *               productPrice:
 *                 type: number
 *                 description: Product price
 *               productImage:
 *                 type: string
 *                 description: Product image URL
 *               productCategory:
 *                 type: string
 *                 description: Product category
 *               productStock:
 *                 type: number
 *                 description: Available stock
 *               productSku:
 *                 type: string
 *                 description: Product SKU
 *               productTags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Product tags
 *               isActive:
 *                 type: boolean
 *                 description: Whether product is active
 *     responses:
 *       200:
 *         description: Product updated successfully
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
 *                     widget:
 *                       $ref: '#/components/schemas/Widget'
 *                     updatedProduct:
 *                       type: object
 *                       description: The updated product object
 *       400:
 *         description: Invalid product ID format or widget is not a products widget
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No permission to access this widget
 *       404:
 *         description: Widget or product not found
 */
// Insert a new product into products widget
router.post('/:id/products', auth, insertProduct);

// Update specific product in products widget
router.put('/:id/products/:productId', auth, updateProduct);

module.exports = router; 