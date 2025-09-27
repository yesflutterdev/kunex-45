const express = require('express');
const router = express.Router();
const exploreController = require('../controllers/explore.controller');
const auth = require('../middleware/auth.mw');

/**
 * @swagger
 * components:
 *   schemas:
 *     ExploreFilters:
 *       type: object
 *       properties:
 *         category:
 *           type: string
 *           description: Business category/industry filter
 *           example: "Restaurant"
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Minimum rating filter
 *           example: 4.0
 *         priceRange:
 *           oneOf:
 *             - type: string
 *               enum: ['$', '$$', '$$$', '$$$$']
 *             - type: array
 *               items:
 *                 type: string
 *                 enum: ['$', '$$', '$$$', '$$$$']
 *           description: Price range filter
 *           example: "$$"
 *         openedStatus:
 *           type: string
 *           enum: ['open', 'closed', 'any']
 *           description: Filter by current open status
 *           example: "open"
 *         businessType:
 *           type: string
 *           enum: ['Small business', 'Medium sized business', 'Franchise', 'Corporation', 'Non profit organizations', 'Startup', 'Online business', 'Others']
 *           description: Type of business
 *           example: "Small business"
 *         features:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *           description: Business features filter
 *           example: ["Outdoor seating", "Delivery"]
 *     
 *     BusinessWithDistance:
 *       allOf:
 *         - $ref: '#/components/schemas/BusinessProfile'
 *         - type: object
 *           properties:
 *             distance:
 *               type: number
 *               description: Distance from search center in kilometers
 *               example: 2.5
 *             distanceUnit:
 *               type: string
 *               description: Unit of distance measurement
 *               example: "km"
 *             isCurrentlyOpen:
 *               type: boolean
 *               description: Whether the business is currently open
 *               example: true
 *             topPickScore:
 *               type: number
 *               description: Score for top picks ranking (0-1)
 *               example: 0.85
 *             riseScore:
 *               type: number
 *               description: Score for "on the rise" ranking (0-1)
 *               example: 0.72
 *             isNewBusiness:
 *               type: boolean
 *               description: Whether the business is newly created
 *               example: false
 *     
 *     RecentSearch:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique search ID
 *           example: "search_123"
 *         searchTerm:
 *           type: string
 *           description: Search term used
 *           example: "coffee shops"
 *         category:
 *           type: string
 *           description: Category searched
 *           example: "Food & Beverage"
 *         location:
 *           type: string
 *           description: Location searched
 *           example: "Downtown"
 *         priceRange:
 *           type: string
 *           description: Price range filter used
 *           example: "$$"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the search was performed
 *         resultCount:
 *           type: number
 *           description: Number of results found
 *           example: 15
 */

/**
 * @swagger
 * /api/explore/nearby:
 *   get:
 *     summary: Get nearby businesses using geo-queries (KON-31)
 *     description: Fetch businesses near a specific location with comprehensive filtering options
 *     tags: [Explore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude coordinate
 *         example: -74.006
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude coordinate
 *         example: 40.7128
 *       - in: query
 *         name: maxDistance
 *         schema:
 *           type: number
 *           minimum: 100
 *           maximum: 100000
 *           default: 10000
 *         description: Maximum search distance in meters
 *         example: 5000
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Maximum number of results
 *         example: 20
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by business category
 *         example: "Restaurant"
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         description: Minimum rating filter
 *         example: 4.0
 *       - in: query
 *         name: priceRange
 *         schema:
 *           type: string
 *           enum: ['$', '$$', '$$$', '$$$$']
 *         description: Price range filter
 *         example: "$$"
 *       - in: query
 *         name: openedStatus
 *         schema:
 *           type: string
 *           enum: ['open', 'closed', 'any']
 *           default: 'any'
 *         description: Filter by current open status
 *         example: "open"
 *       - in: query
 *         name: businessType
 *         schema:
 *           type: string
 *           enum: ['Small business', 'Medium sized business', 'Franchise', 'Corporation', 'Non profit organizations', 'Startup', 'Online business', 'Others']
 *         description: Type of business
 *         example: "Small business"
 *       - in: query
 *         name: features
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Business features filter
 *         example: ["Outdoor seating", "Delivery"]
 *     responses:
 *       200:
 *         description: Nearby businesses retrieved successfully
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
 *                     businesses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BusinessWithDistance'
 *                     searchCenter:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                           example: 40.7128
 *                         longitude:
 *                           type: number
 *                           example: -74.006
 *                     maxDistance:
 *                       type: number
 *                       description: Maximum search distance in kilometers
 *                       example: 10
 *                     totalFound:
 *                       type: number
 *                       description: Total number of businesses found
 *                       example: 15
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/nearby', auth.authenticate, exploreController.getNearbyBusinesses);

/**
 * @swagger
 * /api/explore/top-picks:
 *   get:
 *     summary: Get top picks businesses (KON-32)
 *     description: Fetch highly-rated and popular businesses with optional location filtering
 *     tags: [Explore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude coordinate (optional)
 *         example: -74.006
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude coordinate (optional)
 *         example: 40.7128
 *       - in: query
 *         name: maxDistance
 *         schema:
 *           type: number
 *           minimum: 1000
 *           maximum: 100000
 *           default: 25000
 *         description: Maximum search distance in meters
 *         example: 25000
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 30
 *           default: 15
 *         description: Maximum number of results
 *         example: 15
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by business category
 *         example: "Restaurant"
 *       - in: query
 *         name: priceRange
 *         schema:
 *           type: string
 *           enum: ['$', '$$', '$$$', '$$$$']
 *         description: Price range filter
 *         example: "$$"
 *     responses:
 *       200:
 *         description: Top picks retrieved successfully
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
 *                     businesses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BusinessWithDistance'
 *                     searchCenter:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         latitude:
 *                           type: number
 *                           example: 40.7128
 *                         longitude:
 *                           type: number
 *                           example: -74.006
 *                     totalFound:
 *                       type: number
 *                       description: Total number of businesses found
 *                       example: 12
 *                     sortedBy:
 *                       type: string
 *                       example: "topPicks"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/top-picks', auth.authenticate, exploreController.getTopPicks);

/**
 * @swagger
 * /api/explore/on-the-rise:
 *   get:
 *     summary: Get "On The Rise" businesses (KON-32)
 *     description: Fetch recently created or updated businesses that are gaining popularity
 *     tags: [Explore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude coordinate (optional)
 *         example: -74.006
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude coordinate (optional)
 *         example: 40.7128
 *       - in: query
 *         name: maxDistance
 *         schema:
 *           type: number
 *           minimum: 1000
 *           maximum: 100000
 *           default: 25000
 *         description: Maximum search distance in meters
 *         example: 25000
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 30
 *           default: 15
 *         description: Maximum number of results
 *         example: 15
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by business category
 *         example: "Restaurant"
 *       - in: query
 *         name: priceRange
 *         schema:
 *           type: string
 *           enum: ['$', '$$', '$$$', '$$$$']
 *         description: Price range filter
 *         example: "$$"
 *       - in: query
 *         name: daysBack
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to look back for recent activity
 *         example: 30
 *     responses:
 *       200:
 *         description: On the rise businesses retrieved successfully
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
 *                     businesses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BusinessWithDistance'
 *                     searchCenter:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         latitude:
 *                           type: number
 *                           example: 40.7128
 *                         longitude:
 *                           type: number
 *                           example: -74.006
 *                     totalFound:
 *                       type: number
 *                       description: Total number of businesses found
 *                       example: 8
 *                     sortedBy:
 *                       type: string
 *                       example: "onTheRise"
 *                     daysBack:
 *                       type: number
 *                       description: Number of days looked back
 *                       example: 30
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/on-the-rise', auth.authenticate, exploreController.getOnTheRise);

/**
 * @swagger
 * /api/explore/businesses:
 *   get:
 *     summary: Comprehensive business exploration with all filters (KON-33)
 *     description: Advanced business search with comprehensive filtering, sorting, and pagination
 *     tags: [Explore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude coordinate (optional)
 *         example: -74.006
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude coordinate (optional)
 *         example: 40.7128
 *       - in: query
 *         name: maxDistance
 *         schema:
 *           type: number
 *           minimum: 1000
 *           maximum: 200000
 *           default: 50000
 *         description: Maximum search distance in meters
 *         example: 50000
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Maximum number of results per page
 *         example: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: ['relevance', 'distance', 'rating', 'popularity', 'newest', 'alphabetical']
 *           default: 'relevance'
 *         description: Sort criteria
 *         example: "rating"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Text search query
 *         example: "coffee shop"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by business category
 *         example: "Restaurant"
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         description: Minimum rating filter
 *         example: 4.0
 *       - in: query
 *         name: priceRange
 *         schema:
 *           type: string
 *           enum: ['$', '$$', '$$$', '$$$$']
 *         description: Price range filter
 *         example: "$$"
 *       - in: query
 *         name: openedStatus
 *         schema:
 *           type: string
 *           enum: ['open', 'closed', 'any']
 *           default: 'any'
 *         description: Filter by current open status
 *         example: "open"
 *       - in: query
 *         name: businessType
 *         schema:
 *           type: string
 *           enum: ['Small business', 'Medium sized business', 'Franchise', 'Corporation', 'Non profit organizations', 'Startup', 'Online business', 'Others']
 *         description: Type of business
 *         example: "Small business"
 *       - in: query
 *         name: features
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Business features filter
 *         example: ["Outdoor seating", "Delivery"]
 *     responses:
 *       200:
 *         description: Businesses retrieved successfully
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
 *                     businesses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BusinessWithDistance'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                           example: 1
 *                         totalPages:
 *                           type: number
 *                           example: 5
 *                         totalBusinesses:
 *                           type: number
 *                           example: 95
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *                         limit:
 *                           type: number
 *                           example: 20
 *                     searchCenter:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         latitude:
 *                           type: number
 *                           example: 40.7128
 *                         longitude:
 *                           type: number
 *                           example: -74.006
 *                     appliedFilters:
 *                       type: object
 *                       properties:
 *                         category:
 *                           type: string
 *                           example: "Restaurant"
 *                         rating:
 *                           type: number
 *                           example: 4.0
 *                         priceRange:
 *                           type: string
 *                           example: "$$"
 *                         openedStatus:
 *                           type: string
 *                           example: "open"
 *                         businessType:
 *                           type: string
 *                           example: "Small business"
 *                         features:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["Outdoor seating"]
 *                         search:
 *                           type: string
 *                           example: "coffee shop"
 *                     sortedBy:
 *                       type: string
 *                       example: "rating"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/businesses', auth.authenticate, exploreController.exploreBusinesses);

/**
 * @swagger
 * /api/explore/recent-searches:
 *   get:
 *     summary: Get user's recent searches
 *     description: Retrieve the user's recent search history for quick access
 *     tags: [Explore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of recent searches to return
 *         example: 10
 *     responses:
 *       200:
 *         description: Recent searches retrieved successfully
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
 *                     recentSearches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RecentSearch'
 *                     totalCount:
 *                       type: number
 *                       description: Total number of recent searches
 *                       example: 5
 *       401:
 *         description: Unauthorized
 */
router.get('/recent-searches', auth.authenticate, exploreController.getRecentSearches);

/**
 * @swagger
 * /api/explore/recent-searches:
 *   post:
 *     summary: Save a search to recent searches
 *     description: Save the current search parameters to the user's recent searches
 *     tags: [Explore]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchTerm:
 *                 type: string
 *                 description: Search term used
 *                 example: "coffee shops"
 *               category:
 *                 type: string
 *                 description: Category searched
 *                 example: "Food & Beverage"
 *               location:
 *                 type: string
 *                 description: Location searched
 *                 example: "Downtown"
 *               priceRange:
 *                 type: string
 *                 enum: ['$', '$$', '$$$', '$$$$']
 *                 description: Price range filter used
 *                 example: "$$"
 *               businessType:
 *                 type: string
 *                 enum: ['Small business', 'Medium sized business', 'Franchise', 'Corporation', 'Non profit organizations', 'Startup', 'Online business', 'Others']
 *                 description: Business type filter used
 *                 example: "Small business"
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Features filter used
 *                 example: ["Outdoor seating", "Delivery"]
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating filter used
 *                 example: 4.0
 *               resultCount:
 *                 type: number
 *                 minimum: 0
 *                 description: Number of results found
 *                 example: 15
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   longitude:
 *                     type: number
 *                     minimum: -180
 *                     maximum: 180
 *                     example: -74.006
 *                   latitude:
 *                     type: number
 *                     minimum: -90
 *                     maximum: 90
 *                     example: 40.7128
 *                 description: Search coordinates
 *     responses:
 *       201:
 *         description: Search saved successfully
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
 *                   example: "Search saved to recent searches"
 *                 data:
 *                   type: object
 *                   properties:
 *                     searchId:
 *                       type: string
 *                       example: "1234567890"
 *                     userId:
 *                       type: string
 *                       example: "user_123"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/recent-searches', auth.authenticate, exploreController.saveRecentSearch);

module.exports = router; 