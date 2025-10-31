const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { retryFailedNotifications } = require('../services/emailService');

// Get notifications by userId
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit, type } = req.query;

    const query = { userId };
    if (type) query.type = type;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 50);

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get failed notifications
router.get('/failed', async (req, res) => {
  try {
    const failedNotifications = await Notification.find({
      emailSent: false,
      emailError: { $exists: true }
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: failedNotifications.length,
      data: failedNotifications
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retry failed notifications
router.post('/retry-failed', async (req, res) => {
  try {
    await retryFailedNotifications();
    res.status(200).json({
      success: true,
      message: 'Retry process initiated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notification statistics
router.get('/statistics', async (req, res) => {
  try {
    const [total, sent, failed, byType] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ emailSent: true }),
      Notification.countDocuments({ emailSent: false, emailError: { $exists: true } }),
      Notification.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        sent,
        failed,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
