const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favorites.controller');
const auth = require('../middleware/auth.mw');

/**
 * @swagger
 * components:
 *   schemas:
 *     Favorite:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique favorite ID
 *           example: "60d5ecb74b24a1234567890a"
 *         userId:
 *           type: string
 *           description: User ID who favorited the widget
 *           example: "60d5ecb74b24a1234567890b"
 *         type:
 *           type: string
 *           enum: ['Page', 'Product', 'Promotion', 'Event', 'BusinessProfile']
 *           description: Type of favorited content
 *           example: "Product"
 *         widgetId:
 *           type: string
 *           description: ID of the favorited content
 *           example: "60d5ecb74b24a1234567890c"
 *         pageData:
 *           type: object
 *           description: Page details (for Page type)
 *           properties:
 *             _id:
 *               type: string
 *               example: "60d5ecb74b24a1234567890c"
 *             title:
 *               type: string
 *               example: "Business Homepage"
 *             slug:
 *               type: string
 *               example: "business-homepage"
 *             description:
 *               type: string
 *               example: "Welcome to our business"
 *             pageType:
 *               type: string
 *               example: "landing"
 *             logo:
 *               type: string
 *               example: "https://example.com/logo.jpg"
 *             cover:
 *               type: string
 *               example: "https://example.com/cover.jpg"
 *             isPublished:
 *               type: boolean
 *               example: true
 *         productData:
 *           type: object
 *           description: Product details (for Product type)
 *           properties:
 *             _id:
 *               type: string
 *               example: "60d5ecb74b24a1234567890c"
 *             productName:
 *               type: string
 *               example: "Product Name"
 *             productImage:
 *               type: string
 *               example: "https://example.com/product.jpg"
 *             price:
 *               type: string
 *               example: "29.99"
 *             currency:
 *               type: string
 *               example: "USD"
 *             productUrl:
 *               type: string
 *               example: "https://example.com/product"
 *             widgetId:
 *               type: string
 *             widgetName:
 *               type: string
 *             widgetType:
 *               type: string
 *         eventData:
 *           type: object
 *           description: Event details (for Event type) - Only event-specific fields, no widget settings
 *           properties:
 *             _id:
 *               type: string
 *               example: "60d5ecb74b24a1234567890c"
 *             title:
 *               type: string
 *               example: "Summer Music Festival"
 *             eventImage:
 *               type: string
 *               example: "https://example.com/event.jpg"
 *             date:
 *               type: string
 *               example: "15 Jul 2025"
 *             location:
 *               type: string
 *               example: "Central Park, New York"
 *             ticketUrl:
 *               type: string
 *               example: "https://example.com/tickets"
 *             enddate:
 *               type: string
 *               example: "17 Jul 2025"
 *             category:
 *               type: string
 *               example: "Music"
 *             widgetId:
 *               type: string
 *               description: Widget ID containing this event
 *             widgetName:
 *               type: string
 *               description: Widget name
 *             widgetType:
 *               type: string
 *               description: Widget type (always "event")
 *             pageId:
 *               type: string
 *               description: BuilderPage ID
 *             pageLogo:
 *               type: string
 *               nullable: true
 *               description: Page logo URL
 *             businessId:
 *               type: string
 *               description: BusinessProfile ID
 *         widgetData:
 *           type: object
 *           description: Widget details (for Promotion type or fallback)
 *           properties:
 *             _id:
 *               type: string
 *               example: "60d5ecb74b24a1234567890c"
 *             name:
 *               type: string
 *               example: "Product Showcase"
 *             type:
 *               type: string
 *               example: "products"
 *             settings:
 *               type: object
 *               description: Widget-specific settings
 *             layout:
 *               type: object
 *               description: Widget layout settings
 *             status:
 *               type: string
 *               example: "active"
 *         folderId:
 *           type: object
 *           description: Folder details (populated)
 *           properties:
 *             _id:
 *               type: string
 *               example: "60d5ecb74b24a1234567890d"
 *             name:
 *               type: string
 *               example: "My Favorites"
 *             color:
 *               type: string
 *               example: "#3B82F6"
 *             icon:
 *               type: string
 *               example: "heart"
 *         notes:
 *           type: string
 *           description: Personal notes about the widget
 *           example: "Great product showcase"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: User-defined tags
 *           example: ["products", "showcase", "featured"]
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Personal rating
 *           example: 4.5
 *         visitCount:
 *           type: number
 *           description: Number of times visited
 *           example: 3
 *         lastVisited:
 *           type: string
 *           format: date-time
 *           description: Last visit date
 *         isPrivate:
 *           type: boolean
 *           description: Whether the favorite is private
 *           example: false
 *         metadata:
 *           type: object
 *           properties:
 *             addedFrom:
 *               type: string
 *               enum: ['search', 'explore', 'profile', 'recommendation', 'share', 'other']
 *               example: "search"
 *             deviceType:
 *               type: string
 *               enum: ['mobile', 'tablet', 'desktop', 'other']
 *               example: "mobile"
 *             reminderDate:
 *               type: string
 *               format: date-time
 *               description: Reminder date
 *             reminderNote:
 *               type: string
 *               description: Reminder note
 *               example: "Check this product again"
 *         analytics:
 *           type: object
 *           properties:
 *             viewCount:
 *               type: number
 *               example: 15
 *             shareCount:
 *               type: number
 *               example: 2
 *             clickCount:
 *               type: number
 *               example: 8
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     FavoriteInput:
 *       type: object
 *       required:
 *         - type
 *         - widgetId
 *       properties:
 *         type:
 *           type: string
 *           enum: ['Page', 'Product', 'Promotion', 'Event', 'BusinessProfile']
 *           description: Type of content to favorite
 *           example: "Product"
 *         widgetId:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           description: Widget ID to favorite
 *           example: "68ccdddccb20f4f069b19300"
 *         productId:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           description: Product ID (required only when type is 'Product')
 *           example: "66faaa111111111111111111"
 *         eventId:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           description: Event ID (required only when type is 'Event')
 *           example: "66faaa111111111111111112"
 *         folderId:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           description: Folder ID (optional, uses default if not provided)
 *           example: "60d5ecb74b24a1234567890d"
 *         notes:
 *           type: string
 *           maxLength: 1000
 *           description: Personal notes
 *           example: "Great product showcase"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *             maxLength: 50
 *           maxItems: 20
 *           description: User-defined tags
 *           example: ["products", "showcase", "featured"]
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Personal rating
 *           example: 4.5
 *         isPrivate:
 *           type: boolean
 *           description: Whether the favorite is private
 *           example: false
 *         metadata:
 *           type: object
 *           properties:
 *             addedFrom:
 *               type: string
 *               enum: ['search', 'explore', 'profile', 'recommendation', 'share', 'other']
 *               example: "search"
 *             location:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                   minimum: -90
 *                   maximum: 90
 *                 longitude:
 *                   type: number
 *                   minimum: -180
 *                   maximum: 180
 *                 address:
 *                   type: string
 *                   maxLength: 200
 *             reminderDate:
 *               type: string
 *               format: date-time
 *             reminderNote:
 *               type: string
 *               maxLength: 200
 *     
 *     FavoritesGroupedResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             pages:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Favorite'
 *               description: Array of favorited pages
 *             products:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Favorite'
 *               description: Array of favorited products
 *             promotions:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Favorite'
 *               description: Array of favorited promotions
 *             events:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Favorite'
 *               description: Array of favorited events. Each event contains only event-specific data (title, eventImage, date, location, ticketUrl, enddate, category) in the content.eventData field. Widget settings, googleMaps, forms, and googleReviews are not included.
 *             totalCount:
 *               type: number
 *               example: 25
 *             appliedFilters:
 *               type: object
 *               properties:
 *                 folderId:
 *                   type: string
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: string
 *                 rating:
 *                   type: number
 *                 search:
 *                   type: string
 *                 isPrivate:
 *                   type: boolean
 */

/**
 * @swagger
 * /api/favorites:
 *   post:
 *     summary: Toggle widget favorites (add/remove)
 *     description: Add a widget to user's favorites or remove it if already favorited (toggle behavior). For Product type, productId is required. For Event type, eventId is required. For other types (Page, Promotion), productId/eventId are not needed.
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FavoriteInput'
 *     responses:
 *       200:
 *         description: Widget removed from favorites successfully (toggle behavior)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Widget removed from favorites successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     removed:
 *                       type: boolean
 *                       example: true
 *                     favoriteId:
 *                       type: string
 *                       example: "60d5ecb74b24a1234567890a"
 *       201:
 *         description: Widget added to favorites successfully (toggle behavior)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Widget added to favorites successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     favorite:
 *                       $ref: '#/components/schemas/Favorite'
 *                     added:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Widget or folder not found
 */
router.post('/', auth.authenticate, favoritesController.addFavorite);

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Get user's favorites grouped by type (main view)
 *     description: Retrieve user's favorite widgets grouped by type (Pages, Products, Promotions, Events) for the main favorites view
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by folder ID
 *         example: "60d5ecb74b24a1234567890d"
 *       - in: query
 *         name: tags
 *         schema:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *         style: form
 *         explode: true
 *         description: Filter by tags
 *         example: ["products", "featured"]
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         description: Minimum rating filter
 *         example: 4.0
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 200
 *         description: Text search in notes and tags
 *         example: "product showcase"
 *       - in: query
 *         name: isPrivate
 *         schema:
 *           type: boolean
 *         description: Filter by privacy status
 *         example: false
 *     responses:
 *       200:
 *         description: Favorites retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FavoritesGroupedResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth.authenticate, favoritesController.getFavorites);

/**
 * @swagger
 * /api/favorites/detailed:
 *   get:
 *     summary: Get user's favorites with filtering and search (detailed view)
 *     description: Retrieve user's favorite widgets with comprehensive filtering and search options in a detailed list format
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by folder ID
 *         example: "60d5ecb74b24a1234567890d"
 *       - in: query
 *         name: tags
 *         schema:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *         style: form
 *         explode: true
 *         description: Filter by tags
 *         example: ["products", "featured"]
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         description: Minimum rating filter
 *         example: 4.0
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: ['created', 'updated', 'name', 'rating', 'visits', 'lastVisited']
 *           default: 'created'
 *         description: Sort criteria
 *         example: "rating"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: ['asc', 'desc']
 *           default: 'desc'
 *         description: Sort order
 *         example: "desc"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results per page
 *         example: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 200
 *         description: Text search in notes and tags
 *         example: "product showcase"
 *       - in: query
 *         name: isPrivate
 *         schema:
 *           type: boolean
 *         description: Filter by privacy status
 *         example: false
 *     responses:
 *       200:
 *         description: Favorites retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     favorites:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Favorite'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                           example: 1
 *                         totalPages:
 *                           type: number
 *                           example: 3
 *                         totalFavorites:
 *                           type: number
 *                           example: 45
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *                         limit:
 *                           type: number
 *                           example: 20
 *                     appliedFilters:
 *                       type: object
 *                       properties:
 *                         folderId:
 *                           type: string
 *                         tags:
 *                           type: array
 *                           items:
 *                             type: string
 *                         rating:
 *                           type: number
 *                         search:
 *                           type: string
 *                         isPrivate:
 *                           type: boolean
 *                     sortedBy:
 *                       type: string
 *                       example: "rating_desc"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/detailed', auth.authenticate, favoritesController.getFavoritesDetailed);

/**
 * @swagger
 * /api/favorites/{favoriteId}:
 *   get:
 *     summary: Get single favorite details
 *     description: Retrieve detailed information about a specific favorite
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Favorite ID
 *         example: "60d5ecb74b24a1234567890a"
 *     responses:
 *       200:
 *         description: Favorite details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     favorite:
 *                       $ref: '#/components/schemas/Favorite'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Favorite not found
 */
router.get('/:favoriteId', auth.authenticate, favoritesController.getFavorite);

/**
 * @swagger
 * /api/favorites/{favoriteId}:
 *   put:
 *     summary: Update favorite
 *     description: Update favorite details including folder, notes, tags, and rating
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Favorite ID
 *         example: "60d5ecb74b24a1234567890a"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               folderId:
 *                 type: string
 *                 pattern: '^[0-9a-fA-F]{24}$'
 *                 description: Move to different folder
 *                 example: "60d5ecb74b24a1234567890d"
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Update notes
 *                 example: "Updated notes about this widget"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 20
 *                 description: Update tags
 *                 example: ["products", "showcase", "featured", "new"]
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Update rating
 *                 example: 4.5
 *               isPrivate:
 *                 type: boolean
 *                 description: Update privacy status
 *                 example: false
 *               metadata:
 *                 type: object
 *                 properties:
 *                   reminderDate:
 *                     type: string
 *                     format: date-time
 *                   reminderNote:
 *                     type: string
 *                     maxLength: 200
 *     responses:
 *       200:
 *         description: Favorite updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Favorite updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     favorite:
 *                       $ref: '#/components/schemas/Favorite'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Favorite or target folder not found
 */
router.put('/:favoriteId', auth.authenticate, favoritesController.updateFavorite);

/**
 * @swagger
 * /api/favorites/{favoriteId}:
 *   delete:
 *     summary: Remove favorite
 *     description: Remove a widget from user's favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Favorite ID
 *         example: "60d5ecb74b24a1234567890a"
 *     responses:
 *       200:
 *         description: Favorite removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Favorite removed successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Favorite not found
 */
router.delete('/:favoriteId', auth.authenticate, favoritesController.removeFavorite);

/**
 * @swagger
 * /api/favorites/check/{widgetId}:
 *   get:
 *     summary: Check if widget is favorited
 *     description: Check if a specific widget is in user's favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Widget ID
 *         example: "60d5ecb74b24a1234567890c"
 *     responses:
 *       200:
 *         description: Favorite status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     isFavorited:
 *                       type: boolean
 *                       example: true
 *                     favorite:
 *                       oneOf:
 *                         - $ref: '#/components/schemas/Favorite'
 *                         - type: null
 *       401:
 *         description: Unauthorized
 */
router.get('/check/:widgetId', auth.authenticate, favoritesController.checkFavoriteStatus);

/**
 * @swagger
 * /api/favorites/tags/popular:
 *   get:
 *     summary: Get popular tags
 *     description: Get user's most frequently used tags
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Maximum number of tags to return
 *         example: 20
 *     responses:
 *       200:
 *         description: Popular tags retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tag:
 *                             type: string
 *                             example: "products"
 *                           count:
 *                             type: number
 *                             example: 15
 *                           lastUsed:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/tags/popular', auth.authenticate, favoritesController.getPopularTags);

/**
 * @swagger
 * /api/favorites/bulk:
 *   post:
 *     summary: Bulk operations on favorites
 *     description: Perform bulk operations like move, delete, tag, or untag on multiple favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - favoriteIds
 *               - operation
 *             properties:
 *               favoriteIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   pattern: '^[0-9a-fA-F]{24}$'
 *                 minItems: 1
 *                 maxItems: 50
 *                 description: Array of favorite IDs
 *                 example: ["60d5ecb74b24a1234567890a", "60d5ecb74b24a1234567890b"]
 *               operation:
 *                 type: string
 *                 enum: ['move', 'delete', 'tag', 'untag']
 *                 description: Operation to perform
 *                 example: "move"
 *               targetFolderId:
 *                 type: string
 *                 pattern: '^[0-9a-fA-F]{24}$'
 *                 description: Target folder ID (required for move operation)
 *                 example: "60d5ecb74b24a1234567890d"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 minItems: 1
 *                 description: Tags to add or remove (required for tag/untag operations)
 *                 example: ["featured", "new"]
 *     responses:
 *       200:
 *         description: Bulk operation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Bulk move completed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     modifiedCount:
 *                       type: number
 *                       example: 5
 *                     operation:
 *                       type: string
 *                       example: "move"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Some favorites or target folder not found
 */
router.post('/bulk', auth.authenticate, favoritesController.bulkOperation);

/**
 * @swagger
 * /api/favorites/analytics:
 *   get:
 *     summary: Get favorites analytics
 *     description: Get analytics and statistics about user's favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: ['day', 'week', 'month', 'year', 'all']
 *           default: 'month'
 *         description: Time period for analytics
 *         example: "month"
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter analytics by folder
 *         example: "60d5ecb74b24a1234567890d"
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: ['day', 'week', 'month', 'folder', 'type']
 *           default: 'day'
 *         description: Group analytics by
 *         example: "type"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Limit number of results
 *         example: 10
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
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     analytics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "2024-01-15"
 *                           count:
 *                             type: number
 *                             example: 5
 *                           totalViews:
 *                             type: number
 *                             example: 25
 *                           totalShares:
 *                             type: number
 *                             example: 3
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalFavorites:
 *                           type: number
 *                           example: 45
 *                         totalViews:
 *                           type: number
 *                           example: 320
 *                         totalShares:
 *                           type: number
 *                           example: 15
 *                         avgRating:
 *                           type: number
 *                           example: 4.2
 *                         mostRecentAdd:
 *                           type: string
 *                           format: date-time
 *                     timeframe:
 *                       type: string
 *                       example: "month"
 *                     groupBy:
 *                       type: string
 *                       example: "type"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics', auth.authenticate, favoritesController.getAnalytics);

/**
 * @swagger
 * /api/favorites/reminders:
 *   post:
 *     summary: Set reminder for favorite
 *     description: Set a reminder for a specific favorite widget
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - favoriteId
 *               - reminderDate
 *             properties:
 *               favoriteId:
 *                 type: string
 *                 pattern: '^[0-9a-fA-F]{24}$'
 *                 description: Favorite ID
 *                 example: "60d5ecb74b24a1234567890a"
 *               reminderDate:
 *                 type: string
 *                 format: date-time
 *                 description: Reminder date (must be in the future)
 *                 example: "2024-02-15T10:00:00Z"
 *               reminderNote:
 *                 type: string
 *                 maxLength: 200
 *                 description: Optional reminder note
 *                 example: "Check this widget again"
 *     responses:
 *       200:
 *         description: Reminder set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Reminder set successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     reminderDate:
 *                       type: string
 *                       format: date-time
 *                     reminderNote:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Favorite not found
 */
router.post('/reminders', auth.authenticate, favoritesController.setReminder);

/**
 * @swagger
 * /api/favorites/reminders/upcoming:
 *   get:
 *     summary: Get upcoming reminders
 *     description: Get user's upcoming favorite reminders
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 365
 *           default: 7
 *         description: Number of days to look ahead
 *         example: 7
 *     responses:
 *       200:
 *         description: Upcoming reminders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     reminders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60d5ecb74b24a1234567890a"
 *                           widgetId:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: "Product Showcase"
 *                               type:
 *                                 type: string
 *                                 example: "products"
 *                               settings:
 *                                 type: object
 *                           metadata:
 *                             type: object
 *                             properties:
 *                               reminderDate:
 *                                 type: string
 *                                 format: date-time
 *                               reminderNote:
 *                                 type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/reminders/upcoming', auth.authenticate, favoritesController.getUpcomingReminders);

/**
 * @swagger
 * /api/favorites/businesses/widgets:
 *   get:
 *     summary: Get newly added widgets from favorited businesses
 *     description: Retrieve widgets that were added after the user favorited the business. Only returns widgets created after the favorite date.
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: widgetType
 *         schema:
 *           type: string
 *         description: Filter by widget type (e.g., products, promotions, event)
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by specific business ID
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
 *           default: 20
 *         description: Results per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, name, type]
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
 *         description: Widgets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     widgets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           businessId:
 *                             type: string
 *                           businessInfo:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               businessName:
 *                                 type: string
 *                               username:
 *                                 type: string
 *                               logo:
 *                                 type: string
 *                               industry:
 *                                 type: string
 *                           favoritedAt:
 *                             type: string
 *                             format: date-time
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
 *                         totalWidgets:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                         limit:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/businesses/widgets', auth.authenticate, favoritesController.getFavoritedBusinessWidgets);

/**
 * @swagger
 * /api/favorites/businesses/overview:
 *   get:
 *     summary: Get status overview of favorited businesses with new widgets
 *     description: Returns list of businesses that have new widgets added after being favorited (for status circles/overview)
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       logo:
 *                         type: string
 *                       name:
 *                         type: string
 *                       pageId:
 *                         type: string
 *                       businessId:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/businesses/overview', auth.authenticate, favoritesController.getFavoritedBusinessesOverview);

/**
 * @swagger
 * /api/favorites/businesses/details:
 *   get:
 *     summary: Get detailed data for specific favorited business
 *     description: Returns page data and widgets for a specific business/page that was favorited
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pageId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Builder page ID
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Business profile ID
 *     responses:
 *       200:
 *         description: Details retrieved successfully
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
 *                     pageData:
 *                       type: object
 *                       properties:
 *                         coverImage:
 *                           type: string
 *                         logo:
 *                           type: string
 *                         name:
 *                           type: string
 *                         pageId:
 *                           type: string
 *                         businessId:
 *                           type: string
 *                         industry:
 *                           type: string
 *                         address:
 *                           type: string
 *                         timeWidgetAdded:
 *                           type: string
 *                           format: date-time
 *                     widgets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Widget'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Business not favorited
 *       404:
 *         description: Business or page not found
 */
router.get('/businesses/details', auth.authenticate, favoritesController.getFavoritedBusinessDetails);

module.exports = router; 