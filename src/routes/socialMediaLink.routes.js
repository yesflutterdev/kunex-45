const express = require('express');
const router = express.Router();
const {
  createSocialMediaLink,
  getSocialMediaLinks,
  getSocialMediaLinkById,
  updateSocialMediaLink,
  deleteSocialMediaLink,
  updateEmbedSettings,
  updateMetadata,
  bulkUpdateOrder,
  trackClick,
  getPublicBusinessLinks,
  getPublicUserLinks,
  getAnalytics
} = require('../controllers/socialMediaLink.controller');
const { protect } = require('../middleware/auth.mw');

/**
 * @swagger
 * components:
 *   schemas:
 *     SocialMediaLink:
 *       type: object
 *       required:
 *         - platform
 *         - originalUrl
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the social media link
 *         userId:
 *           type: string
 *           description: ID of the user who owns this link
 *         businessId:
 *           type: string
 *           description: ID of the business profile (optional)
 *         platform:
 *           type: string
 *           enum: [instagram, tiktok, facebook, twitter, linkedin, youtube, pinterest, snapchat, github, website, whatsapp, other]
 *           description: Social media platform
 *         handle:
 *           type: string
 *           description: Username/handle on the platform
 *         displayName:
 *           type: string
 *           description: Display name for the link
 *         originalUrl:
 *           type: string
 *           description: Original URL provided by user
 *         normalizedUrl:
 *           type: string
 *           description: Normalized URL for the platform
 *         displayUrl:
 *           type: string
 *           description: URL for display purposes
 *         metadata:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *             description:
 *               type: string
 *             thumbnailUrl:
 *               type: string
 *             followerCount:
 *               type: number
 *             postCount:
 *               type: number
 *             isVerified:
 *               type: boolean
 *         embedSettings:
 *           type: object
 *           properties:
 *             showHeader:
 *               type: boolean
 *               default: true
 *             showCaption:
 *               type: boolean
 *               default: true
 *             maxPosts:
 *               type: number
 *               minimum: 1
 *               maximum: 50
 *               default: 6
 *             layout:
 *               type: string
 *               enum: [grid, carousel, list]
 *               default: grid
 *         status:
 *           type: string
 *           enum: [active, broken, pending_verification]
 *           default: active
 *         isPublic:
 *           type: boolean
 *           default: true
 *         displayOrder:
 *           type: number
 *           minimum: 0
 *           default: 0
 *         clicks:
 *           type: number
 *           minimum: 0
 *           default: 0
 *         lastChecked:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d0fe4f5311236168a109ca"
 *         userId: "60d0fe4f5311236168a109cb"
 *         businessId: "60d0fe4f5311236168a109cc"
 *         platform: "instagram"
 *         handle: "mybusiness"
 *         displayName: "My Business Instagram"
 *         originalUrl: "https://instagram.com/mybusiness"
 *         normalizedUrl: "https://instagram.com/mybusiness"
 *         displayUrl: "@mybusiness"
 *         metadata:
 *           title: "My Business"
 *           description: "Official Instagram account"
 *           followerCount: 1500
 *           isVerified: false
 *         embedSettings:
 *           showHeader: true
 *           showCaption: true
 *           maxPosts: 6
 *           layout: "grid"
 *         status: "active"
 *         isPublic: true
 *         displayOrder: 0
 *         clicks: 25
 */

/**
 * @swagger
 * /api/social-media:
 *   post:
 *     summary: Create a new social media link
 *     tags: [Social Media Links]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platform
 *               - originalUrl
 *             properties:
 *               businessId:
 *                 type: string
 *                 description: Business profile ID (optional)
 *               platform:
 *                 type: string
 *                 enum: [instagram, tiktok, facebook, twitter, linkedin, youtube, pinterest, snapchat, github, website, whatsapp, other]
 *               originalUrl:
 *                 type: string
 *                 format: uri
 *               displayName:
 *                 type: string
 *               metadata:
 *                 type: object
 *               embedSettings:
 *                 type: object
 *               isPublic:
 *                 type: boolean
 *               displayOrder:
 *                 type: number
 *     responses:
 *       201:
 *         description: Social media link created successfully
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
 *                   $ref: '#/components/schemas/SocialMediaLink'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Platform link already exists
 */
router.post('/', protect, createSocialMediaLink);

/**
 * @swagger
 * /api/social-media:
 *   get:
 *     summary: Get all social media links for authenticated user
 *     tags: [Social Media Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *         description: Filter by business profile ID
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [instagram, tiktok, facebook, twitter, linkedin, youtube, pinterest, snapchat, github, website, whatsapp, other]
 *         description: Filter by platform
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, broken, pending_verification]
 *         description: Filter by status
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
 *         description: Filter by public/private status
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
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, displayOrder, clicks, platform]
 *           default: displayOrder
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Social media links retrieved successfully
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
 *                     $ref: '#/components/schemas/SocialMediaLink'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *                     totalItems:
 *                       type: number
 *                     itemsPerPage:
 *                       type: number
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 */
router.get('/', protect, getSocialMediaLinks);

/**
 * @swagger
 * /api/social-media/analytics:
 *   get:
 *     summary: Get analytics for social media links
 *     tags: [Social Media Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *         description: Filter analytics by business profile ID
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
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
 *                     totalLinks:
 *                       type: number
 *                     totalClicks:
 *                       type: number
 *                     platformStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           count:
 *                             type: number
 *                           totalClicks:
 *                             type: number
 *                     statusStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           count:
 *                             type: number
 */
router.get('/analytics', protect, getAnalytics);

/**
 * @swagger
 * /api/social-media/bulk-order:
 *   put:
 *     summary: Bulk update display order of social media links
 *     tags: [Social Media Links]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - links
 *             properties:
 *               links:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - displayOrder
 *                   properties:
 *                     id:
 *                       type: string
 *                     displayOrder:
 *                       type: number
 *                       minimum: 0
 *     responses:
 *       200:
 *         description: Display order updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Some links not found
 */
router.put('/bulk-order', protect, bulkUpdateOrder);

/**
 * @swagger
 * /api/social-media/public/business/{username}:
 *   get:
 *     summary: Get public social media links for a business profile
 *     tags: [Social Media Links]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Business profile username
 *     responses:
 *       200:
 *         description: Public social media links retrieved successfully
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
 *                     $ref: '#/components/schemas/SocialMediaLink'
 *       404:
 *         description: Business profile not found
 */
router.get('/public/business/:username', getPublicBusinessLinks);

/**
 * @swagger
 * /api/social-media/public/user/{userId}:
 *   get:
 *     summary: Get public social media links for a user's personal profile
 *     tags: [Social Media Links]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Public social media links retrieved successfully
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
 *                     $ref: '#/components/schemas/SocialMediaLink'
 *       400:
 *         description: Invalid user ID
 */
router.get('/public/user/:userId', getPublicUserLinks);

/**
 * @swagger
 * /api/social-media/{id}:
 *   get:
 *     summary: Get social media link by ID
 *     tags: [Social Media Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Social media link ID
 *     responses:
 *       200:
 *         description: Social media link retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SocialMediaLink'
 *       404:
 *         description: Social media link not found
 */
router.get('/:id', protect, getSocialMediaLinkById);

/**
 * @swagger
 * /api/social-media/{id}:
 *   put:
 *     summary: Update social media link
 *     tags: [Social Media Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Social media link ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessId:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [instagram, tiktok, facebook, twitter, linkedin, youtube, pinterest, snapchat, github, website, whatsapp, other]
 *               originalUrl:
 *                 type: string
 *                 format: uri
 *               displayName:
 *                 type: string
 *               metadata:
 *                 type: object
 *               embedSettings:
 *                 type: object
 *               status:
 *                 type: string
 *                 enum: [active, broken, pending_verification]
 *               isPublic:
 *                 type: boolean
 *               displayOrder:
 *                 type: number
 *     responses:
 *       200:
 *         description: Social media link updated successfully
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
 *                   $ref: '#/components/schemas/SocialMediaLink'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Social media link not found
 *       409:
 *         description: Platform link already exists
 */
router.put('/:id', protect, updateSocialMediaLink);

/**
 * @swagger
 * /api/social-media/{id}:
 *   delete:
 *     summary: Delete social media link
 *     tags: [Social Media Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Social media link ID
 *     responses:
 *       200:
 *         description: Social media link deleted successfully
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
 *         description: Social media link not found
 */
router.delete('/:id', protect, deleteSocialMediaLink);

/**
 * @swagger
 * /api/social-media/{id}/embed-settings:
 *   put:
 *     summary: Update embed settings for a social media link
 *     tags: [Social Media Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Social media link ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - showHeader
 *               - showCaption
 *               - maxPosts
 *               - layout
 *             properties:
 *               showHeader:
 *                 type: boolean
 *               showCaption:
 *                 type: boolean
 *               maxPosts:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 50
 *               layout:
 *                 type: string
 *                 enum: [grid, carousel, list]
 *     responses:
 *       200:
 *         description: Embed settings updated successfully
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
 *                   $ref: '#/components/schemas/SocialMediaLink'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Social media link not found
 */
router.put('/:id/embed-settings', protect, updateEmbedSettings);

/**
 * @swagger
 * /api/social-media/{id}/metadata:
 *   put:
 *     summary: Update metadata for a social media link
 *     tags: [Social Media Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Social media link ID
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
 *               thumbnailUrl:
 *                 type: string
 *                 format: uri
 *               followerCount:
 *                 type: number
 *                 minimum: 0
 *               postCount:
 *                 type: number
 *                 minimum: 0
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Metadata updated successfully
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
 *                   $ref: '#/components/schemas/SocialMediaLink'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Social media link not found
 */
router.put('/:id/metadata', protect, updateMetadata);

/**
 * @swagger
 * /api/social-media/{id}/click:
 *   post:
 *     summary: Track click on social media link
 *     tags: [Social Media Links]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Social media link ID
 *     responses:
 *       200:
 *         description: Click tracked successfully
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
 *                     clicks:
 *                       type: number
 *       403:
 *         description: Social media link is not public
 *       404:
 *         description: Social media link not found
 */
router.post('/:id/click', trackClick);

module.exports = router; 