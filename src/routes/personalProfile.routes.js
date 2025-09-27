const express = require('express');
const router = express.Router();
const personalProfileController = require('../controllers/personalProfile.controller');
const { authenticate, isVerified } = require('../middleware/auth.mw');
const { upload } = require('../utils/cloudinary');

/**
 * @swagger
 * tags:
 *   name: Personal Profile
 *   description: Personal profile management operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PersonalProfile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Profile ID
 *         userId:
 *           type: string
 *           description: User ID reference
 *         firstName:
 *           type: string
 *           maxLength: 50
 *         lastName:
 *           type: string
 *           maxLength: 50
 *         profilePhoto:
 *           type: string
 *           description: URL to profile photo
 *         bio:
 *           type: string
 *           maxLength: 500
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         gender:
 *           type: string
 *           enum: [male, female, other, prefer_not_to_say]
 *         interests:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 20
 *         location:
 *           type: object
 *           properties:
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
 *         socialMedia:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [instagram, facebook, twitter, linkedin, tiktok, youtube, pinterest, snapchat, github, other]
 *               handle:
 *                 type: string
 *                 maxLength: 100
 *               url:
 *                 type: string
 *                 format: uri
 *               isVerified:
 *                 type: boolean
 *           maxItems: 10
 *         preferences:
 *           type: object
 *           properties:
 *             language:
 *               type: string
 *               enum: [en, es, fr, de, it, pt, ru, zh, ja, ko, ar]
 *               default: en
 *             currency:
 *               type: string
 *               enum: [USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR]
 *               default: USD
 *             distanceUnit:
 *               type: string
 *               enum: [km, mi]
 *               default: mi
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     PersonalProfileInput:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           maxLength: 50
 *         lastName:
 *           type: string
 *           maxLength: 50
 *         bio:
 *           type: string
 *           maxLength: 500
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         gender:
 *           type: string
 *           enum: [male, female, other, prefer_not_to_say]
 *         interests:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 20
 *         location:
 *           type: object
 *           properties:
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
 *         socialMedia:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [instagram, facebook, twitter, linkedin, tiktok, youtube, pinterest, snapchat, github, other]
 *               handle:
 *                 type: string
 *                 maxLength: 100
 *               url:
 *                 type: string
 *                 format: uri
 *               isVerified:
 *                 type: boolean
 *           maxItems: 10
 *         preferences:
 *           type: object
 *           properties:
 *             language:
 *               type: string
 *               enum: [en, es, fr, de, it, pt, ru, zh, ja, ko, ar]
 *             currency:
 *               type: string
 *               enum: [USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR]
 *             distanceUnit:
 *               type: string
 *               enum: [km, mi]
 */

/**
 * @swagger
 * /api/profile/personal:
 *   post:
 *     summary: Create a new personal profile
 *     tags: [Personal Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PersonalProfileInput'
 *     responses:
 *       201:
 *         description: Personal profile created successfully
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
 *                       $ref: '#/components/schemas/PersonalProfile'
 *                     completionPercentage:
 *                       type: number
 *       400:
 *         description: Validation error or profile already exists
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, isVerified, personalProfileController.createProfile);

/**
 * @swagger
 * /api/profile/personal:
 *   get:
 *     summary: Get current user's personal profile
 *     tags: [Personal Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personal profile retrieved successfully
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
 *                       $ref: '#/components/schemas/PersonalProfile'
 *                     completionPercentage:
 *                       type: number
 *       404:
 *         description: Personal profile not found
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, personalProfileController.getProfile);

/**
 * @swagger
 * /api/profile/personal/{profileId}:
 *   get:
 *     summary: Get personal profile by ID (public view)
 *     tags: [Personal Profile]
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile ID
 *     responses:
 *       200:
 *         description: Personal profile retrieved successfully
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
 *                       type: object
 *                       description: Limited public profile information
 *       404:
 *         description: Personal profile not found
 */
router.get('/:profileId', personalProfileController.getProfileById);

/**
 * @swagger
 * /api/profile/personal:
 *   put:
 *     summary: Update personal profile
 *     tags: [Personal Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PersonalProfileInput'
 *     responses:
 *       200:
 *         description: Personal profile updated successfully
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
 *                       $ref: '#/components/schemas/PersonalProfile'
 *                     completionPercentage:
 *                       type: number
 *       400:
 *         description: Validation error
 *       404:
 *         description: Personal profile not found
 *       401:
 *         description: Unauthorized
 */
router.put('/', authenticate, isVerified, personalProfileController.updateProfile);

/**
 * @swagger
 * /api/profile/personal/photo:
 *   post:
 *     summary: Upload profile photo
 *     tags: [Personal Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo file (JPEG, PNG, WebP, max 5MB)
 *     responses:
 *       200:
 *         description: Profile photo uploaded successfully
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
 *                     profilePhoto:
 *                       type: string
 *                       description: URL of uploaded photo
 *       400:
 *         description: Invalid file or validation error
 *       404:
 *         description: Personal profile not found
 *       401:
 *         description: Unauthorized
 */
router.post('/photo', authenticate, isVerified, upload.single('profilePhoto'), personalProfileController.uploadProfilePhoto);

/**
 * @swagger
 * /api/profile/personal/photo:
 *   delete:
 *     summary: Delete profile photo
 *     tags: [Personal Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile photo deleted successfully
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
 *         description: No profile photo to delete
 *       404:
 *         description: Personal profile not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/photo', authenticate, isVerified, personalProfileController.deleteProfilePhoto);

/**
 * @swagger
 * /api/profile/personal/search:
 *   get:
 *     summary: Search personal profiles
 *     tags: [Personal Profile]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name or bio
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *       - in: query
 *         name: interests
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by interests
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [male, female, other, prefer_not_to_say]
 *         description: Filter by gender
 *       - in: query
 *         name: ageMin
 *         schema:
 *           type: integer
 *           minimum: 13
 *           maximum: 120
 *         description: Minimum age filter
 *       - in: query
 *         name: ageMax
 *         schema:
 *           type: integer
 *           minimum: 13
 *           maximum: 120
 *         description: Maximum age filter
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
 *         description: Number of results per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, firstName, lastName]
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
 *         description: Search results retrieved successfully
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
 *                         type: object
 *                         description: Limited profile information
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
router.get('/search', personalProfileController.searchProfiles);

/**
 * @swagger
 * /api/profile/personal/nearby:
 *   get:
 *     summary: Find nearby personal profiles
 *     tags: [Personal Profile]
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
 *     responses:
 *       200:
 *         description: Nearby profiles retrieved successfully
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
 *                         type: object
 *                         properties:
 *                           distance:
 *                             type: number
 *                             description: Distance in kilometers
 *                     searchLocation:
 *                       type: object
 *                       properties:
 *                         longitude:
 *                           type: number
 *                         latitude:
 *                           type: number
 *                     maxDistance:
 *                       type: number
 *       400:
 *         description: Validation error
 */
router.get('/nearby', personalProfileController.findNearbyProfiles);

/**
 * @swagger
 * /api/profile/personal:
 *   delete:
 *     summary: Delete personal profile
 *     tags: [Personal Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personal profile deleted successfully
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
 *         description: Personal profile not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/', authenticate, isVerified, personalProfileController.deleteProfile);

module.exports = router; 