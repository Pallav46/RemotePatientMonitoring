const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['error', 'alert', 'info'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  userId: {
    type: String,
    required: true
  },
  dataId: String,
  service: String,
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  emailTo: String,
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  emailError: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  correlationId: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ emailSent: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
