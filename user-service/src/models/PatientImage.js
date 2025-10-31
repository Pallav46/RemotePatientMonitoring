const mongoose = require('mongoose');

const patientImageSchema = new mongoose.Schema({
  imageId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imagePath: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'completed', 'failed'],
    default: 'uploaded'
  },
  metadata: {
    deviceType: String,
    submissionType: String
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  error: String
});

module.exports = mongoose.model('PatientImage', patientImageSchema);
