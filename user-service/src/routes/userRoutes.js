const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');
const PatientImage = require('../models/PatientImage');
const { publishMessage } = require('../config/kafka');
const { validateUser, validateImageUpload, validatePatientData } = require('../validators/userValidator');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/bmp', 'image/tiff'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, BMP, and TIFF are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Create user
router.post('/register', async (req, res, next) => {
  try {
    const { error } = validateUser(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, email, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const user = new User({ name, email, phone });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
});

// Upload patient monitoring image
router.post('/upload-image', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { userId, deviceType } = req.body;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'User not found' });
    }

    const dataId = uuidv4();

    // Save image metadata to database
    const patientImage = new PatientImage({
      imageId: dataId,
      userId: user._id,
      imagePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'uploaded',
      metadata: {
        deviceType,
        submissionType: 'image-upload'
      }
    });

    await patientImage.save();

    // Publish message to Kafka for OCR processing
    const message = {
      dataId,
      userId: user._id.toString(),
      userEmail: user.email,
      userName: user.name,
      imagePath: req.file.path,
      fileName: req.file.filename,
      metadata: {
        deviceType
      },
      correlationId: uuidv4(),
      timestamp: new Date().toISOString()
    };

    await publishMessage('image-upload-topic', message);

    res.status(200).json({
      success: true,
      message: 'Data received from userId: ' + userId,
      data: {
        dataId,
        fileName: req.file.originalname,
        status: 'processing'
      }
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// Get data status
router.get('/data-status/:dataId', async (req, res, next) => {
  try {
    const { dataId } = req.params;

    const image = await PatientImage.findOne({ imageId: dataId }).populate('userId', 'name email');
    if (!image) {
      return res.status(404).json({ error: 'Data record not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        dataId: image.imageId,
        fileName: image.fileName,
        status: image.status,
        uploadedAt: image.uploadedAt,
        processedAt: image.processedAt,
        user: image.userId,
        metadata: image.metadata,
        error: image.error
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user data records
router.get('/:userId/data', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const images = await PatientImage.find({ userId }).sort({ uploadedAt: -1 });

    res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    next(error);
  }
});

// Submit patient data directly (skip OCR, send directly to ICU service)
router.post('/submit-patient-data', async (req, res, next) => {
  try {
    // Validate request data
    const { error } = validatePatientData(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { userId, deviceType, vitals } = req.body;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate vitals data
    if (!vitals || typeof vitals !== 'object') {
      return res.status(400).json({ error: 'Vitals data is required' });
    }

    const dataId = uuidv4();
    const correlationId = uuidv4();

    // Save data submission record to database
    const patientImage = new PatientImage({
      imageId: dataId,
      userId: user._id,
      imagePath: 'N/A - Direct data submission',
      fileName: 'direct-data-submission',
      fileSize: 0,
      mimeType: 'application/json',
      status: 'processing',
      metadata: {
        deviceType,
        submissionType: 'direct-data'
      }
    });

    await patientImage.save();

    // Prepare message to send DIRECTLY to ICU service (skip OCR)
    const message = {
      dataId,
      userId: user._id.toString(),
      userEmail: user.email,
      userName: user.name,
      extractedData: {
        heartRate: vitals.heartRate || null,
        bloodPressure: vitals.bloodPressure || null,
        oxygenSaturation: vitals.oxygenSaturation || null,
        temperature: vitals.temperature || null,
        respiratoryRate: vitals.respiratoryRate || null,
        rawText: 'Direct data submission - No OCR processing'
      },
      ocrConfidence: 100, // Direct data has 100% confidence
      metadata: {
        deviceType,
        submissionType: 'direct-data',
        wordsDetected: 0,
        linesDetected: 0
      },
      correlationId,
      timestamp: new Date().toISOString(),
      processedAt: new Date().toISOString()
    };

    // Publish directly to ocr-complete-topic (bypassing OCR service)
    await publishMessage('ocr-complete-topic', message);

    res.status(200).json({
      success: true,
      message: 'Data received from userId: ' + userId,
      data: {
        dataId,
        submissionType: 'direct-data',
        status: 'processing',
        vitals: message.extractedData
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
