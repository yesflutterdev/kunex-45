const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth.mw');

// Import controllers
const {
  createTopic,
  getTopics,
  getTopic,
  updateTopic,
  deleteTopic,
  getActiveTopics,
  getTopicStats
} = require('../controllers/communityTopic.controller');

const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  getPostLikes,
  updateStatus,
  getUserPosts,
  getTopicPosts,
  adminUpdatePost
} = require('../controllers/communityPost.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     CommunityTopic:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the topic
 *         name:
 *           type: string
 *           description: The name of the topic
 *           maxLength: 100
 *         description:
 *           type: string
 *           description: Description of the topic
 *           maxLength: 500
 *         isActive:
 *           type: boolean
 *           description: Whether the topic is active
 *           default: true
 *         postCount:
 *           type: number
 *           description: Number of posts in this topic
 *           default: 0
 *         metadata:
 *           type: object
 *           properties:
 *             color:
 *               type: string
 *               description: Hex color code for the topic
 *               pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *             icon:
 *               type: string
 *               description: Icon name for the topic
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CommunityPost:
 *       type: object
 *       required:
 *         - topicId
 *         - title
 *         - description
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the post
 *         topicId:
 *           type: string
 *           description: ID of the topic this post belongs to
 *         userId:
 *           type: string
 *           description: ID of the user who created the post
 *         businessId:
 *           type: string
 *           description: ID of the business profile (if user is a business)
 *         title:
 *           type: string
 *           description: Title of the post
 *           maxLength: 200
 *         description:
 *           type: string
 *           description: Description/content of the post
 *           maxLength: 2000
 *         implementationStatus:
 *           type: string
 *           enum: [completed, in-progress, planned]
 *           description: Implementation status of the post
 *           default: planned
 *         likes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               createdAt:
 *                 type: string
 *                 format: date-time
 *           description: Array of users who liked the post
 *         likeCount:
 *           type: number
 *           description: Total number of likes
 *           default: 0
 *         isActive:
 *           type: boolean
 *           description: Whether the post is active
 *           default: true
 *         metadata:
 *           type: object
 *           properties:
 *             tags:
 *               type: array
 *               items:
 *                 type: string
 *               maxItems: 10
 *             priority:
 *               type: string
 *               enum: [low, medium, high]
 *               default: medium
 *             estimatedEffort:
 *               type: string
 *               enum: [small, medium, large]
 *               default: medium
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// ==================== TOPIC ROUTES ====================

/**
 * @swagger
 * /api/community/topics:
 *   post:
 *     summary: Create a new community topic
 *     tags: [Community Topics]
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
 *                 maxLength: 100
 *                 example: "AI Topics"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Discussion about AI and machine learning topics"
 *               metadata:
 *                 type: object
 *                 properties:
 *                   color:
 *                     type: string
 *                     example: "#3B82F6"
 *                   icon:
 *                     type: string
 *                     example: "ai"
 *     responses:
 *       201:
 *         description: Topic created successfully
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
 *                     topic:
 *                       $ref: '#/components/schemas/CommunityTopic'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Topic name already exists
 */
router.post('/topics', auth, createTopic);

/**
 * @swagger
 * /api/community/topics:
 *   get:
 *     summary: Get all community topics
 *     tags: [Community Topics]
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
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
 *         description: Number of topics per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, postCount, createdAt, updatedAt]
 *           default: postCount
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
 *         description: Topics retrieved successfully
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
 *                     topics:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CommunityTopic'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         count:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 */
router.get('/topics', getTopics);

/**
 * @swagger
 * /api/community/topics/active:
 *   get:
 *     summary: Get active topics (for dropdowns)
 *     tags: [Community Topics]
 *     responses:
 *       200:
 *         description: Active topics retrieved successfully
 */
router.get('/topics/active', getActiveTopics);

/**
 * @swagger
 * /api/community/topics/stats:
 *   get:
 *     summary: Get topic statistics
 *     tags: [Community Topics]
 *     responses:
 *       200:
 *         description: Topic statistics retrieved successfully
 */
router.get('/topics/stats', getTopicStats);

/**
 * @swagger
 * /api/community/topics/{topicId}:
 *   get:
 *     summary: Get a single topic
 *     tags: [Community Topics]
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: Topic retrieved successfully
 *       404:
 *         description: Topic not found
 */
router.get('/topics/:topicId', getTopic);

/**
 * @swagger
 * /api/community/topics/{topicId}:
 *   put:
 *     summary: Update a topic
 *     tags: [Community Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               isActive:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *                 properties:
 *                   color:
 *                     type: string
 *                   icon:
 *                     type: string
 *     responses:
 *       200:
 *         description: Topic updated successfully
 *       404:
 *         description: Topic not found
 *       409:
 *         description: Topic name already exists
 */
router.put('/topics/:topicId', auth, updateTopic);

/**
 * @swagger
 * /api/community/topics/{topicId}:
 *   delete:
 *     summary: Delete a topic
 *     tags: [Community Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: Topic deleted successfully
 *       400:
 *         description: Cannot delete topic with posts
 *       404:
 *         description: Topic not found
 */
router.delete('/topics/:topicId', auth, deleteTopic);

// ==================== POST ROUTES ====================

/**
 * @swagger
 * /api/community/posts:
 *   post:
 *     summary: Create a new community post
 *     tags: [Community Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topicId
 *               - title
 *               - description
 *             properties:
 *               topicId:
 *                 type: string
 *                 description: ID of the topic
 *                 example: "68e68ec4c56abd99646a97ff"
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Integration with calendars"
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "This feature will help you connect faster with your customers within seconds."
 *               implementationStatus:
 *                 type: string
 *                 enum: [completed, in-progress, planned]
 *                 description: Optional - defaults to 'planned' if not provided
 *                 example: "planned"
 *               metadata:
 *                 type: object
 *                 description: Optional - defaults will be applied if not provided
 *                 properties:
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                     maxItems: 10
 *                     example: ["integration", "calendar", "ai"]
 *                   priority:
 *                     type: string
 *                     enum: [low, medium, high]
 *                     example: "medium"
 *                   estimatedEffort:
 *                     type: string
 *                     enum: [small, medium, large]
 *                     example: "medium"
 *     responses:
 *       201:
 *         description: Post created successfully
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
 *                     post:
 *                       $ref: '#/components/schemas/CommunityPost'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Topic not found
 */
router.post('/posts', auth, createPost);

/**
 * @swagger
 * /api/community/posts:
 *   get:
 *     summary: Get community posts
 *     tags: [Community Posts]
 *     parameters:
 *       - in: query
 *         name: topicId
 *         schema:
 *           type: string
 *         description: Filter by topic ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: implementationStatus
 *         schema:
 *           type: string
 *           enum: [completed, in-progress, planned]
 *         description: Filter by implementation status
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
 *         description: Number of posts per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title, likes, status]
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
 *         description: Posts retrieved successfully
 */
router.get('/posts', getPosts);

/**
 * @swagger
 * /api/community/posts/{postId}:
 *   get:
 *     summary: Get a single post
 *     tags: [Community Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *       404:
 *         description: Post not found
 */
router.get('/posts/:postId', getPost);

/**
 * @swagger
 * /api/community/posts/{postId}:
 *   put:
 *     summary: Update a post
 *     tags: [Community Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               implementationStatus:
 *                 type: string
 *                 enum: [completed, in-progress, planned]
 *               isActive:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *                 properties:
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                   priority:
 *                     type: string
 *                     enum: [low, medium, high]
 *                   estimatedEffort:
 *                     type: string
 *                     enum: [small, medium, large]
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       404:
 *         description: Post not found or no permission
 */
router.put('/posts/:postId', auth, updatePost);

/**
 * @swagger
 * /api/community/posts/{postId}:
 *   delete:
 *     summary: Delete a post
 *     tags: [Community Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       404:
 *         description: Post not found or no permission
 */
router.delete('/posts/:postId', auth, deletePost);

/**
 * @swagger
 * /api/community/posts/{postId}/admin:
 *   put:
 *     summary: Admin update post (with all fields)
 *     tags: [Community Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               implementationStatus:
 *                 type: string
 *                 enum: [completed, in-progress, planned]
 *               isActive:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *                 properties:
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                   priority:
 *                     type: string
 *                     enum: [low, medium, high]
 *                   estimatedEffort:
 *                     type: string
 *                     enum: [small, medium, large]
 *     responses:
 *       200:
 *         description: Post updated successfully by admin
 *       404:
 *         description: Post not found
 */
router.put('/posts/:postId/admin', auth, adminUpdatePost);

// ==================== LIKE ROUTES ====================

/**
 * @swagger
 * /api/community/posts/{postId}/like:
 *   post:
 *     summary: Toggle like on a post
 *     tags: [Community Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Like toggled successfully
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
 *                     post:
 *                       $ref: '#/components/schemas/CommunityPost'
 *                     isLiked:
 *                       type: boolean
 *                     likeCount:
 *                       type: number
 *       404:
 *         description: Post not found
 */
router.post('/posts/:postId/like', auth, toggleLike);

/**
 * @swagger
 * /api/community/posts/{postId}/likes:
 *   get:
 *     summary: Get post likes
 *     tags: [Community Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post likes retrieved successfully
 */
router.get('/posts/:postId/likes', getPostLikes);

// ==================== STATUS ROUTES ====================

/**
 * @swagger
 * /api/community/posts/{postId}/status:
 *   put:
 *     summary: Update implementation status
 *     tags: [Community Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - implementationStatus
 *             properties:
 *               implementationStatus:
 *                 type: string
 *                 enum: [completed, in-progress, planned]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       404:
 *         description: Post not found or no permission
 */
router.put('/posts/:postId/status', auth, updateStatus);

// ==================== USER/TOPIC SPECIFIC ROUTES ====================

/**
 * @swagger
 * /api/community/users/{userId}/posts:
 *   get:
 *     summary: Get posts by user
 *     tags: [Community Posts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *         description: Number of posts per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title, likes, status]
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
 *         description: User posts retrieved successfully
 */
router.get('/users/:userId/posts', getUserPosts);

/**
 * @swagger
 * /api/community/topics/{topicId}/posts:
 *   get:
 *     summary: Get posts by topic
 *     tags: [Community Posts]
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ID
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
 *         description: Number of posts per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title, likes, status]
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
 *         description: Topic posts retrieved successfully
 */
router.get('/topics/:topicId/posts', getTopicPosts);

module.exports = router;
