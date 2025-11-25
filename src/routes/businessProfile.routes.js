const express = require('express');
const router = express.Router();
const businessProfileController = require('../controllers/businessProfile.controller');
const { authenticate, isVerified } = require('../middleware/auth.mw');
const { upload } = require('../utils/cloudinary');

/**
 * @swagger
 * tags:
 *   name: Business Profile
 *   description: Business profile management operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BusinessProfile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Profile ID
 *         userId:
 *           type: string
 *           description: User ID reference
 *         businessName:
 *           type: string
 *           maxLength: 100
 *           description: Name of the business
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *           pattern: '^[a-zA-Z0-9_-]+$'
 *           description: Unique username for the business
 *         logo:
 *           type: string
 *           description: URL to business logo
 *         coverImages:
 *           type: array
 *           items:
 *             type: string
 *           description: URLs to cover images
 *         businessType:
 *           type: string
 *           enum: [Small business, Medium sized business, Franchise, Corporation, Non profit organizations, Startup, Online business, Others]
 *         subBusinessType:
 *           type: string
 *           maxLength: 100
 *         professionType:
 *           type: string
 *           enum: [Freelancer, Contractor, Consultant, Self employed, Employer, Entrepreneur, Remote worker, Others]
 *         industry:
 *           type: string
 *           maxLength: 100
 *         subIndustry:
 *           type: string
 *           maxLength: 100
 *         industryTags:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 10
 *         description:
 *           type: object
 *           properties:
 *             short:
 *               type: string
 *               maxLength: 200
 *             full:
 *               type: string
 *               maxLength: 2000
 *         priceRange:
 *           type: string
 *           enum: [$, $$, $$$, $$$$]
 *         contactInfo:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *               format: email
 *             phone:
 *               type: string
 *               maxLength: 20
 *             website:
 *               type: string
 *               format: uri
 *         location:
 *           type: object
 *           properties:
 *             isOnlineOnly:
 *               type: boolean
 *               default: false
 *             address:
 *               type: string
 *               maxLength: 200
 *             city:
 *               type: string
 *               maxLength: 100
 *             state:
 *               type: string
 *               maxLength: 100
 *             country:
 *               type: string
 *               maxLength: 100
 *             postalCode:
 *               type: string
 *               maxLength: 20
 *             coordinates:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [Point]
 *                 coordinates:
 *                   type: array
 *                   items:
 *                     type: number
 *                   minItems: 2
 *                   maxItems: 2
 *                   description: [longitude, latitude]
 *         businessHours:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               day:
 *                 type: string
 *                 enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *               open:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                 description: Opening time in HH:MM format
 *               close:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                 description: Closing time in HH:MM format
 *               isClosed:
 *                 type: boolean
 *                 default: false
 *           maxItems: 7
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 20
 *         themeColor:
 *           type: object
 *           properties:
 *             primary:
 *               type: string
 *               pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *               default: '#007bff'
 *             secondary:
 *               type: string
 *               pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *               default: '#6c757d'
 *             text:
 *               type: string
 *               pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *               default: '#212529'
 *             background:
 *               type: string
 *               pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *               default: '#ffffff'
 *         callToAction:
 *           type: object
 *           properties:
 *             primaryAction:
 *               type: string
 *               enum: [open_url, send_email, click_to_call, share_vcard, none]
 *               default: none
 *             buttonColor:
 *               type: string
 *               pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *               default: '#007bff'
 *             buttonText:
 *               type: string
 *               maxLength: 50
 *               default: 'Contact Us'
 *         completionPercentage:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *         virtualContact:
 *           type: object
 *           properties:
 *             firstName:
 *               type: string
 *               maxLength: 50
 *             lastName:
 *               type: string
 *               maxLength: 50
 *             company:
 *               type: string
 *               maxLength: 100
 *             workPhone:
 *               type: string
 *               maxLength: 20
 *             workEmail:
 *               type: string
 *               format: email
 *             workAddress:
 *               type: string
 *               maxLength: 200
 *             city:
 *               type: string
 *               maxLength: 100
 *             state:
 *               type: string
 *               maxLength: 100
 *             zipCode:
 *               type: string
 *               maxLength: 20
 *             country:
 *               type: string
 *               maxLength: 100
 *             photo:
 *               type: string
 *               description: URL to contact photo
 *         metrics:
 *           type: object
 *           properties:
 *             viewCount:
 *               type: number
 *               minimum: 0
 *             favoriteCount:
 *               type: number
 *               minimum: 0
 *             ratingAverage:
 *               type: number
 *               minimum: 0
 *               maximum: 5
 *             ratingCount:
 *               type: number
 *               minimum: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     BusinessProfileInput:
 *       type: object
 *       required:
 *         - businessName
 *         - username
 *         - businessType
 *         - industry
 *       properties:
 *         businessName:
 *           type: string
 *           maxLength: 100
 *           description: Name of the business
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *           pattern: '^[a-zA-Z0-9_-]+$'
 *           description: Unique username for the business
 *         businessType:
 *           type: string
 *           enum: [Small business, Medium sized business, Franchise, Corporation, Non profit organizations, Startup, Online business, Others]
 *         subBusinessType:
 *           type: string
 *           maxLength: 100
 *         professionType:
 *           type: string
 *           enum: [Freelancer, Contractor, Consultant, Self employed, Employer, Entrepreneur, Remote worker, Others]
 *         industry:
 *           type: string
 *           maxLength: 100
 *         subIndustry:
 *           type: string
 *           maxLength: 100
 *         industryTags:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 10
 *         description:
 *           type: object
 *           properties:
 *             short:
 *               type: string
 *               maxLength: 200
 *             full:
 *               type: string
 *               maxLength: 2000
 *         priceRange:
 *           type: string
 *           enum: [$, $$, $$$, $$$$]
 *         contactInfo:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *               format: email
 *             phone:
 *               type: string
 *               maxLength: 20
 *             website:
 *               type: string
 *               format: uri
 *         location:
 *           type: object
 *           properties:
 *             isOnlineOnly:
 *               type: boolean
 *             address:
 *               type: string
 *               maxLength: 200
 *             city:
 *               type: string
 *               maxLength: 100
 *             state:
 *               type: string
 *               maxLength: 100
 *             country:
 *               type: string
 *               maxLength: 100
 *             postalCode:
 *               type: string
 *               maxLength: 20
 *             coordinates:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [Point]
 *                 coordinates:
 *                   type: array
 *                   items:
 *                     type: number
 *                   minItems: 2
 *                   maxItems: 2
 *                   description: [longitude, latitude]
 *         businessHours:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               day:
 *                 type: string
 *                 enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *               open:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               close:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               isClosed:
 *                 type: boolean
 *           maxItems: 7
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 20
 *         themeColor:
 *           type: object
 *           properties:
 *             primary:
 *               type: string
 *               pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *             secondary:
 *               type: string
 *               pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *             text:
 *               type: string
 *               pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *             background:
 *               type: string
 *               pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *         callToAction:
 *           type: object
 *           properties:
 *             primaryAction:
 *               type: string
 *               enum: [open_url, send_email, click_to_call, share_vcard, none]
 *             buttonColor:
 *               type: string
 *               pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *             buttonText:
 *               type: string
 *               maxLength: 50
 *         virtualContact:
 *           type: object
 *           properties:
 *             firstName:
 *               type: string
 *               maxLength: 50
 *             lastName:
 *               type: string
 *               maxLength: 50
 *             company:
 *               type: string
 *               maxLength: 100
 *             workPhone:
 *               type: string
 *               maxLength: 20
 *             workEmail:
 *               type: string
 *               format: email
 *             workAddress:
 *               type: string
 *               maxLength: 200
 *             city:
 *               type: string
 *               maxLength: 100
 *             state:
 *               type: string
 *               maxLength: 100
 *             zipCode:
 *               type: string
 *               maxLength: 20
 *             country:
 *               type: string
 *               maxLength: 100
 */

/**
 * @swagger
 * /api/profile/business:
 *   post:
 *     summary: Create business profile
 *     tags: [Business Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BusinessProfileInput'
 *     responses:
 *       201:
 *         description: Business profile created successfully
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
 *                     profile:
 *                       $ref: '#/components/schemas/BusinessProfile'
 *                     completionPercentage:
 *                       type: number
 *       400:
 *         description: Validation error or profile already exists
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, isVerified, businessProfileController.createProfile);

/**
 * @swagger
 * /api/profile/business:
 *   get:
 *     summary: Get own business profile
 *     tags: [Business Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Business profile retrieved successfully
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
 *                     profile:
 *                       $ref: '#/components/schemas/BusinessProfile'
 *                     completionPercentage:
 *                       type: number
 *                     todayHours:
 *                       type: object
 *                     isCurrentlyOpen:
 *                       type: boolean
 *       404:
 *         description: Business profile not found
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, isVerified, businessProfileController.getProfile);

/**
 * @swagger
 * /api/profile/business:
 *   put:
 *     summary: Update business profile
 *     tags: [Business Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BusinessProfileInput'
 *     responses:
 *       200:
 *         description: Business profile updated successfully
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
 *                     profile:
 *                       $ref: '#/components/schemas/BusinessProfile'
 *                     completionPercentage:
 *                       type: number
 *       400:
 *         description: Validation error
 *       404:
 *         description: Business profile not found
 *       401:
 *         description: Unauthorized
 */
router.put('/', authenticate, isVerified, businessProfileController.updateProfile);

/**
 * @swagger
 * /api/profile/business:
 *   delete:
 *     summary: Delete business profile
 *     tags: [Business Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Business profile deleted successfully
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
 *         description: Business profile not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/', authenticate, isVerified, businessProfileController.deleteProfile);

/**
 * @swagger
 * /api/profile/business/public/{username}:
 *   get:
 *     summary: Get public business profile by username
 *     tags: [Business Profile]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Business username
 *     responses:
 *       200:
 *         description: Public business profile retrieved successfully
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
 *                     profile:
 *                       $ref: '#/components/schemas/BusinessProfile'
 *                     todayHours:
 *                       type: object
 *                     isCurrentlyOpen:
 *                       type: boolean
 *       404:
 *         description: Business profile not found
 */
router.get('/public/:username', businessProfileController.getPublicProfile);

/**
 * @swagger
 * /api/profile/business/logo:
 *   post:
 *     summary: Upload business logo
 *     tags: [Business Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo image file (JPEG, PNG, WebP, max 5MB)
 *     responses:
 *       200:
 *         description: Logo uploaded successfully
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
 *                     logo:
 *                       type: string
 *                       description: URL of uploaded logo
 *       400:
 *         description: Invalid file or validation error
 *       404:
 *         description: Business profile not found
 *       401:
 *         description: Unauthorized
 */
router.post('/logo', authenticate, isVerified, upload.single('logo'), businessProfileController.uploadLogo);

/**
 * @swagger
 * /api/profile/business/logo:
 *   delete:
 *     summary: Delete business logo
 *     tags: [Business Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logo deleted successfully
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
 *         description: No logo to delete
 *       404:
 *         description: Business profile not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/logo', authenticate, isVerified, businessProfileController.deleteLogo);

/**
 * @swagger
 * /api/profile/business/cover-images:
 *   post:
 *     summary: Upload business cover images
 *     tags: [Business Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               coverImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Cover image files (JPEG, PNG, WebP, max 5MB each, max 5 files)
 *     responses:
 *       200:
 *         description: Cover images uploaded successfully
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
 *                     coverImages:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: URLs of uploaded cover images
 *       400:
 *         description: Invalid files or validation error
 *       404:
 *         description: Business profile not found
 *       401:
 *         description: Unauthorized
 */
router.post('/cover-images', authenticate, isVerified, upload.array('coverImages', 5), businessProfileController.uploadCoverImages);

/**
 * @swagger
 * /api/profile/business/cover-images:
 *   delete:
 *     summary: Delete business cover images
 *     tags: [Business Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cover images deleted successfully
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
 *         description: No cover images to delete
 *       404:
 *         description: Business profile not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/cover-images', authenticate, isVerified, businessProfileController.deleteCoverImages);

/**
 * @swagger
 * /api/profile/business/search:
 *   get:
 *     summary: Search business profiles
 *     tags: [Business Profile]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for business name, description, or industry
 *       - in: query
 *         name: businessType
 *         schema:
 *           type: string
 *           enum: [Small business, Medium sized business, Franchise, Corporation, Non profit organizations, Startup, Online business, Others]
 *         description: Filter by business type
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *         description: Filter by industry
 *       - in: query
 *         name: priceRange
 *         schema:
 *           type: string
 *           enum: [$, $$, $$$, $$$$]
 *         description: Filter by price range
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *       - in: query
 *         name: features
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by features
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *         description: Minimum rating filter
 *       - in: query
 *         name: isOnlineOnly
 *         schema:
 *           type: boolean
 *         description: Filter online-only businesses
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
 *         description: Results per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, businessName, ratingAverage, viewCount]
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
 *         description: Business profiles retrieved successfully
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
 *                     profiles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BusinessProfile'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalProfiles:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                         limit:
 *                           type: integer
 *       400:
 *         description: Validation error
 */
router.get('/search', businessProfileController.searchProfiles);

/**
 * @swagger
 * /api/profile/business/industry/{industry}:
 *   get:
 *     summary: Get business profiles by industry with optional filters
 *     tags: [Business Profile]
 *     parameters:
 *       - in: path
 *         name: industry
 *         required: true
 *         schema:
 *           type: string
 *         description: Industry name (Restaurant, Photography & Videography, Pet Grooming, Hair Salon, Business man)
 *       - in: query
 *         name: openNow
 *         schema:
 *           type: boolean
 *         description: Filter businesses that are currently open
 *       - in: query
 *         name: nearby
 *         schema:
 *           type: boolean
 *         description: Filter businesses nearby (requires latitude and longitude)
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude coordinate (required for nearby filter)
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude coordinate (required for nearby filter)
 *       - in: query
 *         name: maxDistance
 *         schema:
 *           type: number
 *           minimum: 100
 *           maximum: 100000
 *           default: 25000
 *         description: Maximum distance in meters for nearby filter
 *       - in: query
 *         name: topRated
 *         schema:
 *           type: boolean
 *         description: Filter top-rated businesses (3.5+ stars with at least 10 reviews)
 *       - in: query
 *         name: price
 *         schema:
 *           type: string
 *           enum: [$, $$, $$$, $$$$]
 *         description: Filter by price range
 *     responses:
 *       200:
 *         description: Business profiles retrieved successfully
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
 *                     profiles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BusinessProfile'
 *       400:
 *         description: Validation error
 */
// Get business profiles by allowed industry via URL param (public)
router.get('/industry/:industry', businessProfileController.getProfilesByIndustryParam);

/**
 * @swagger
 * /api/profile/business/nearby:
 *   get:
 *     summary: Find nearby business profiles
 *     tags: [Business Profile]
 *     parameters:
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude coordinate
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude coordinate
 *       - in: query
 *         name: maxDistance
 *         schema:
 *           type: number
 *           minimum: 100
 *           maximum: 100000
 *           default: 10000
 *         description: Maximum distance in meters
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of results
 *       - in: query
 *         name: businessType
 *         schema:
 *           type: string
 *           enum: [Small business, Medium sized business, Franchise, Corporation, Non profit organizations, Startup, Online business, Others]
 *         description: Filter by business type
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *         description: Filter by industry
 *       - in: query
 *         name: priceRange
 *         schema:
 *           type: string
 *           enum: [$, $$, $$$, $$$$]
 *         description: Filter by price range
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *         description: Minimum rating filter
 *     responses:
 *       200:
 *         description: Nearby business profiles retrieved successfully
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
 *                     profiles:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/BusinessProfile'
 *                           - type: object
 *                             properties:
 *                               distance:
 *                                 type: number
 *                                 description: Distance in kilometers
 *                     searchCenter:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                     maxDistance:
 *                       type: number
 *                       description: Maximum search distance in kilometers
 *       400:
 *         description: Validation error
 */
router.get('/nearby', businessProfileController.findNearbyProfiles);

/**
 * @swagger
 * /api/profile/business/username/check:
 *   post:
 *     summary: Check username availability
 *     tags: [Business Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: '^[a-zA-Z0-9_-]+$'
 *     responses:
 *       200:
 *         description: Username availability checked
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
 *                     username:
 *                       type: string
 *                     isAvailable:
 *                       type: boolean
 *                     message:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/username/check', authenticate, isVerified, businessProfileController.checkUsernameAvailability);

/**
 * @swagger
 * /api/profile/business/hours:
 *   put:
 *     summary: Update business hours
 *     tags: [Business Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - day
 *               properties:
 *                 day:
 *                   type: string
 *                   enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *                 open:
 *                   type: string
 *                   pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                   description: Opening time in HH:MM format
 *                 close:
 *                   type: string
 *                   pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                   description: Closing time in HH:MM format
 *                 isClosed:
 *                   type: boolean
 *                   default: false
 *             maxItems: 7
 *     responses:
 *       200:
 *         description: Business hours updated successfully
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
 *                     businessHours:
 *                       type: array
 *                       items:
 *                         type: object
 *                     todayHours:
 *                       type: object
 *                     isCurrentlyOpen:
 *                       type: boolean
 *       400:
 *         description: Validation error
 *       404:
 *         description: Business profile not found
 *       401:
 *         description: Unauthorized
 */
router.put('/hours', authenticate, isVerified, businessProfileController.updateBusinessHours);

/**
 * @swagger
 * /api/profile/business/analytics:
 *   get:
 *     summary: Get business analytics and metrics
 *     tags: [Business Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Business analytics retrieved successfully
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
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         viewCount:
 *                           type: number
 *                         favoriteCount:
 *                           type: number
 *                         ratingAverage:
 *                           type: number
 *                         ratingCount:
 *                           type: number
 *                     completionPercentage:
 *                       type: number
 *                     profileAge:
 *                       type: number
 *                       description: Profile age in days
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                     hasLogo:
 *                       type: boolean
 *                     hasCoverImages:
 *                       type: boolean
 *                     hasBusinessHours:
 *                       type: boolean
 *                     hasLocation:
 *                       type: boolean
 *                     hasCoordinates:
 *                       type: boolean
 *       404:
 *         description: Business profile not found
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics', authenticate, isVerified, businessProfileController.getAnalytics);

module.exports = router; 