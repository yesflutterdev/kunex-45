const express = require('express');
const router = express.Router();
const industryController = require('../controllers/industry.controller');

/**
 * @swagger
 * tags:
 *   name: Industries
 *   description: Industry and subcategory management
 */

/**
 * @swagger
 * /api/industries:
 *   get:
 *     summary: Get all industries with optional filtering
 *     tags: [Industries]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [business, individual]
 *         description: Filter by industry type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Industries retrieved successfully
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
 *                     industries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [business, individual, both]
 *                           subcategories:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 title:
 *                                   type: string
 *                                 viewCount:
 *                                   type: number
 *                           viewCount:
 *                             type: number
 *                           image:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                     total:
 *                       type: number
 */
router.get('/', industryController.getIndustries);

/**
 * @swagger
 * /api/industries/trending:
 *   get:
 *     summary: Get trending industries (top 6 by viewCount for business and professional)
 *     tags: [Industries]
 *     responses:
 *       200:
 *         description: Trending industries retrieved successfully
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
 *                     business:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           type:
 *                             type: string
 *                           subcategories:
 *                             type: array
 *                           viewCount:
 *                             type: number
 *                           image:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                     professional:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/trending', industryController.getTrendingIndustries);

/**
 * @swagger
 * /api/industries/search:
 *   get:
 *     summary: Search industries by title
 *     tags: [Industries]
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
 *           enum: [business, individual]
 *         description: Filter by type
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         description: Search query is required
 */
router.get('/search', industryController.searchIndustries);

/**
 * @swagger
 * /api/industries/type/{type}:
 *   get:
 *     summary: Get industries by type (business or individual)
 *     tags: [Industries]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [business, individual]
 *         description: Industry type
 *     responses:
 *       200:
 *         description: Industries retrieved successfully
 *       400:
 *         description: Invalid type
 */
router.get('/type/:type', industryController.getIndustriesByType);

/**
 * @swagger
 * /api/industries/{industryId}:
 *   get:
 *     summary: Get single industry by ID
 *     tags: [Industries]
 *     parameters:
 *       - in: path
 *         name: industryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Industry ID
 *     responses:
 *       200:
 *         description: Industry retrieved successfully
 *       404:
 *         description: Industry not found
 */
router.get('/:industryId', industryController.getIndustryById);

module.exports = router;

