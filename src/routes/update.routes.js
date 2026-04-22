const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.mw');
const { getUpdates, markRead, markAllRead } = require('../controllers/update.controller');

router.get('/', authenticate, getUpdates);
router.put('/read-all', authenticate, markAllRead);
router.put('/:id/read', authenticate, markRead);

module.exports = router;
