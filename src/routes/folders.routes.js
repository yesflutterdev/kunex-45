const express = require('express');
const router = express.Router();
const foldersController = require('../controllers/folders.controller');
const auth = require('../middleware/auth.mw');

/**
 * @swagger
 * components:
 *   schemas:
 *     Folder:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique folder ID
 *           example: "60d5ecb74b24a1234567890d"
 *         userId:
 *           type: string
 *           description: User ID who owns the folder
 *           example: "60d5ecb74b24a1234567890b"
 *         name:
 *           type: string
 *           description: Folder name
 *           example: "Coffee Shops"
 *         description:
 *           type: string
 *           description: Folder description
 *           example: "My favorite coffee places around the city"
 *         color:
 *           type: string
 *           pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *           description: Folder color in hex format
 *           example: "#3B82F6"
 *         icon:
 *           type: string
 *           description: Folder icon name
 *           example: "coffee"
 *         isDefault:
 *           type: boolean
 *           description: Whether this is the default folder
 *           example: false
 *         isPublic:
 *           type: boolean
 *           description: Whether the folder is public
 *           example: false
 *         sortOrder:
 *           type: number
 *           description: Sort order for folder display
 *           example: 0
 *         itemCount:
 *           type: number
 *           description: Number of favorites in this folder
 *           example: 12
 *         metadata:
 *           type: object
 *           properties:
 *             tags:
 *               type: array
 *               items:
 *                 type: string
 *               description: Folder tags
 *               example: ["food", "drinks"]
 *             category:
 *               type: string
 *               enum: ['business', 'personal', 'work', 'travel', 'food', 'entertainment', 'other']
 *               description: Folder category
 *               example: "food"
 *             lastAccessed:
 *               type: string
 *               format: date-time
 *               description: Last time folder was accessed
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     FolderInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: Folder name
 *           example: "Coffee Shops"
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Folder description
 *           example: "My favorite coffee places around the city"
 *         color:
 *           type: string
 *           pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *           description: Folder color in hex format
 *           example: "#3B82F6"
 *         icon:
 *           type: string
 *           maxLength: 50
 *           description: Folder icon name
 *           example: "coffee"
 *         isPublic:
 *           type: boolean
 *           description: Whether the folder is public
 *           example: false
 *         sortOrder:
 *           type: number
 *           minimum: 0
 *           description: Sort order for folder display
 *           example: 0
 *         metadata:
 *           type: object
 *           properties:
 *             tags:
 *               type: array
 *               items:
 *                 type: string
 *                 maxLength: 50
 *               maxItems: 10
 *               description: Folder tags
 *               example: ["food", "drinks"]
 *             category:
 *               type: string
 *               enum: ['business', 'personal', 'work', 'travel', 'food', 'entertainment', 'other']
 *               description: Folder category
 *               example: "food"
 */

/**
 * @swagger
 * /api/folders:
 *   post:
 *     summary: Create new folder (KON-35)
 *     description: Create a new folder for organizing favorites
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FolderInput'
 *     responses:
 *       201:
 *         description: Folder created successfully
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
 *                   example: "Folder created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     folder:
 *                       $ref: '#/components/schemas/Folder'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Folder with this name already exists
 */
router.post('/', auth.authenticate, foldersController.createFolder);

/**
 * @swagger
 * /api/folders:
 *   get:
 *     summary: Get user's folders (KON-34)
 *     description: Retrieve user's folders with optional filtering and sorting
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeEmpty
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include folders with no favorites
 *         example: true
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: ['sortOrder', 'name', 'created', 'updated', 'itemCount']
 *           default: 'sortOrder'
 *         description: Sort criteria
 *         example: "name"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of folders to return
 *         example: 20
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: ['business', 'personal', 'work', 'travel', 'food', 'entertainment', 'other']
 *         description: Filter by category
 *         example: "food"
 *     responses:
 *       200:
 *         description: Folders retrieved successfully
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
 *                     folders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Folder'
 *                     totalCount:
 *                       type: number
 *                       example: 8
 *                     appliedFilters:
 *                       type: object
 *                       properties:
 *                         includeEmpty:
 *                           type: boolean
 *                         category:
 *                           type: string
 *                         sortBy:
 *                           type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth.authenticate, foldersController.getFolders);

/**
 * @swagger
 * /api/folders/{folderId}:
 *   get:
 *     summary: Get single folder details
 *     description: Retrieve detailed information about a specific folder
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Folder ID
 *         example: "60d5ecb74b24a1234567890d"
 *     responses:
 *       200:
 *         description: Folder details retrieved successfully
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
 *                     folder:
 *                       $ref: '#/components/schemas/Folder'
 *                     recentFavorites:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           businessId:
 *                             type: object
 *                             properties:
 *                               businessName:
 *                                 type: string
 *                               logo:
 *                                 type: string
 *                               industry:
 *                                 type: string
 *                               location:
 *                                 type: object
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Folder not found
 */
router.get('/:folderId', auth.authenticate, foldersController.getFolder);

/**
 * @swagger
 * /api/folders/{folderId}:
 *   put:
 *     summary: Update folder
 *     description: Update folder details like name, description, color, etc.
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Folder ID
 *         example: "60d5ecb74b24a1234567890d"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Update folder name
 *                 example: "Updated Coffee Shops"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Update folder description
 *                 example: "Updated description"
 *               color:
 *                 type: string
 *                 pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *                 description: Update folder color
 *                 example: "#FF6B6B"
 *               icon:
 *                 type: string
 *                 maxLength: 50
 *                 description: Update folder icon
 *                 example: "restaurant"
 *               isPublic:
 *                 type: boolean
 *                 description: Update privacy status
 *                 example: true
 *               sortOrder:
 *                 type: number
 *                 minimum: 0
 *                 description: Update sort order
 *                 example: 5
 *               metadata:
 *                 type: object
 *                 properties:
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                       maxLength: 50
 *                     maxItems: 10
 *                   category:
 *                     type: string
 *                     enum: ['business', 'personal', 'work', 'travel', 'food', 'entertainment', 'other']
 *     responses:
 *       200:
 *         description: Folder updated successfully
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
 *                   example: "Folder updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     folder:
 *                       $ref: '#/components/schemas/Folder'
 *       400:
 *         description: Validation error or cannot modify default folder
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Folder not found
 *       409:
 *         description: Folder name already exists
 */
router.put('/:folderId', auth.authenticate, foldersController.updateFolder);

/**
 * @swagger
 * /api/folders/{folderId}:
 *   delete:
 *     summary: Delete folder
 *     description: Delete a folder and move its favorites to default folder
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Folder ID
 *         example: "60d5ecb74b24a1234567890d"
 *     responses:
 *       200:
 *         description: Folder deleted successfully
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
 *                   example: "Folder deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     movedFavoritesCount:
 *                       type: number
 *                       description: Number of favorites moved to default folder
 *                       example: 5
 *       400:
 *         description: Cannot delete default folder
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Folder not found
 */
router.delete('/:folderId', auth.authenticate, foldersController.deleteFolder);

/**
 * @swagger
 * /api/folders/search:
 *   get:
 *     summary: Search folders
 *     description: Search folders by name, description, or tags
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search query
 *         example: "coffee"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of results
 *         example: 10
 *       - in: query
 *         name: includeEmpty
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include empty folders in search
 *         example: false
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
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     folders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Folder'
 *                     searchQuery:
 *                       type: string
 *                       example: "coffee"
 *                     totalFound:
 *                       type: number
 *                       example: 3
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/search', auth.authenticate, foldersController.searchFolders);

/**
 * @swagger
 * /api/folders/reorder:
 *   post:
 *     summary: Reorder folders
 *     description: Update the sort order of multiple folders
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - folderOrders
 *             properties:
 *               folderOrders:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   required:
 *                     - folderId
 *                     - sortOrder
 *                   properties:
 *                     folderId:
 *                       type: string
 *                       pattern: '^[0-9a-fA-F]{24}$'
 *                       description: Folder ID
 *                       example: "60d5ecb74b24a1234567890d"
 *                     sortOrder:
 *                       type: number
 *                       minimum: 0
 *                       description: New sort order
 *                       example: 0
 *                 description: Array of folder ID and sort order pairs
 *                 example: [
 *                   {"folderId": "60d5ecb74b24a1234567890d", "sortOrder": 0},
 *                   {"folderId": "60d5ecb74b24a1234567890e", "sortOrder": 1}
 *                 ]
 *     responses:
 *       200:
 *         description: Folders reordered successfully
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
 *                   example: "Folders reordered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     updatedCount:
 *                       type: number
 *                       example: 5
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Some folders not found
 */
router.post('/reorder', auth.authenticate, foldersController.reorderFolders);

/**
 * @swagger
 * /api/folders/stats:
 *   get:
 *     summary: Get folder statistics
 *     description: Get comprehensive statistics about user's folders
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Folder statistics retrieved successfully
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
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalFolders:
 *                           type: number
 *                           example: 8
 *                         totalItems:
 *                           type: number
 *                           example: 45
 *                         avgItemsPerFolder:
 *                           type: number
 *                           example: 5.6
 *                         publicFolders:
 *                           type: number
 *                           example: 2
 *                         privateFolders:
 *                           type: number
 *                           example: 6
 *                     categoryDistribution:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "food"
 *                           count:
 *                             type: number
 *                             example: 3
 *                           totalItems:
 *                             type: number
 *                             example: 15
 *                     mostActiveFolders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           itemCount:
 *                             type: number
 *                           color:
 *                             type: string
 *                           icon:
 *                             type: string
 *                           metadata:
 *                             type: object
 *                             properties:
 *                               lastAccessed:
 *                                 type: string
 *                                 format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', auth.authenticate, foldersController.getFolderStats);

/**
 * @swagger
 * /api/folders/{folderId}/duplicate:
 *   post:
 *     summary: Duplicate folder
 *     description: Create a copy of an existing folder with optional favorites copying
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Source folder ID
 *         example: "60d5ecb74b24a1234567890d"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 description: Name for the duplicate folder (defaults to "Original Name (Copy)")
 *                 example: "Coffee Shops - Work"
 *               copyFavorites:
 *                 type: boolean
 *                 description: Whether to copy favorites from source folder
 *                 example: true
 *     responses:
 *       201:
 *         description: Folder duplicated successfully
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
 *                   example: "Folder duplicated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     folder:
 *                       $ref: '#/components/schemas/Folder'
 *                     copiedFavoritesCount:
 *                       type: number
 *                       description: Number of favorites copied
 *                       example: 8
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Source folder not found
 *       409:
 *         description: Folder name already exists
 */
router.post('/:folderId/duplicate', auth.authenticate, foldersController.duplicateFolder);

/**
 * @swagger
 * /api/folders/{folderId}/business-pages:
 *   get:
 *     summary: Get business pages from a folder
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Folder ID
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
 *         description: Number of items per page
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
 *         description: Business pages retrieved successfully
 *       404:
 *         description: Folder not found
 */
router.get('/:folderId/business-pages', auth.authenticate, foldersController.getFolderBusinessPages);

/**
 * @swagger
 * /api/folders/{folderId}/business-pages:
 *   post:
 *     summary: Add business page to folder
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Folder ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pageId
 *             properties:
 *               pageId:
 *                 type: string
 *                 description: Business page ID to add
 *     responses:
 *       200:
 *         description: Business page added successfully
 *       404:
 *         description: Folder or page not found
 */
router.post('/:folderId/business-pages', auth.authenticate, foldersController.addBusinessPageToFolder);

/**
 * @swagger
 * /api/folders/{folderId}/business-pages/{pageId}:
 *   delete:
 *     summary: Remove business page from folder
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Folder ID
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Business page ID to remove
 *     responses:
 *       200:
 *         description: Business page removed successfully
 *       404:
 *         description: Folder not found
 */
router.delete('/:folderId/business-pages/:pageId', auth.authenticate, foldersController.removeBusinessPageFromFolder);

/**
 * @swagger
 * /api/folders/move-page/{pageId}:
 *   put:
 *     summary: Move business page between folders
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Business page ID to move
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromFolderId
 *               - toFolderId
 *             properties:
 *               fromFolderId:
 *                 type: string
 *                 description: Source folder ID
 *               toFolderId:
 *                 type: string
 *                 description: Target folder ID
 *     responses:
 *       200:
 *         description: Business page moved successfully
 *       404:
 *         description: Folder or page not found
 */
router.put('/move-page/:pageId', auth.authenticate, foldersController.moveBusinessPageBetweenFolders);

/**
 * @swagger
 * /api/folders/{folderId}/thumbnails:
 *   put:
 *     summary: Update folder thumbnails
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Folder ID
 *     responses:
 *       200:
 *         description: Folder thumbnails updated successfully
 *       404:
 *         description: Folder not found
 */
router.put('/:folderId/thumbnails', auth.authenticate, foldersController.updateFolderThumbnails);

module.exports = router; 