const mongoose = require('mongoose');

const patientDataSchema = new mongoose.Schema({
  dataId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String
  },
  vitals: {
    heartRate: {
      type: Number,
      min: 0,
      max: 300
    },
    bloodPressure: {
      systolic: {
        type: Number,
        min: 0,
        max: 300
      },
      diastolic: {
        type: Number,
        min: 0,
        max: 200
      }
    },
    oxygenSaturation: {
      type: Number,
      min: 0,
      max: 100
    },
    temperature: {
      type: Number,
      min: 20,
      max: 50
    },
    respiratoryRate: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  rawData: {
    type: String
  },
  status: {
    type: String,
    enum: ['normal', 'warning', 'critical', 'error'],
    default: 'normal'
  },
  alerts: [{
    type: {
      type: String,
      enum: ['heartRate', 'bloodPressure', 'oxygenSaturation', 'temperature', 'respiratoryRate']
    },
    message: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  ocrConfidence: {
    type: Number,
    min: 0,
    max: 100
  },
  metadata: {
    deviceType: String,
    submissionType: String,
    wordsDetected: Number,
    linesDetected: Number
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
patientDataSchema.index({ userId: 1, createdAt: -1 });
patientDataSchema.index({ status: 1 });

module.exports = mongoose.model('PatientData', patientDataSchema);
