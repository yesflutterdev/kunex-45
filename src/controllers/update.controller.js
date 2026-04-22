const Update = require('../models/update.model');

const getUpdates = async (req, res) => {
  try {
    const updates = await Update.find({ userId: req.user._id, isRead: false })
      .sort({ createdAt: -1 })
      .populate('businessId', 'businessName logo username')
      .lean();

    return res.status(200).json({ success: true, data: updates });
  } catch (err) {
    console.error('[getUpdates]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const markRead = async (req, res) => {
  try {
    const update = await Update.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!update) return res.status(404).json({ success: false, message: 'Update not found' });
    return res.status(200).json({ success: true, data: update });
  } catch (err) {
    console.error('[markRead]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    await Update.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    return res.status(200).json({ success: true, message: 'All updates marked as read' });
  } catch (err) {
    console.error('[markAllRead]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getUpdates, markRead, markAllRead };
