const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Preprocess image for better OCR accuracy
 */
const preprocessImage = async (imagePath) => {
  try {
    const outputPath = imagePath.replace(path.extname(imagePath), '_processed.png');
    
    await sharp(imagePath)
      .resize(2000, null, { withoutEnlargement: true }) // Resize for better OCR
      .greyscale() // Convert to grayscale
      .normalize() // Normalize contrast
      .sharpen() // Enhance sharpness
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    console.error('Image preprocessing error:', error);
    return imagePath; // Return original if preprocessing fails
  }
};

/**
 * Extract text from image using Tesseract OCR
 */
const extractTextFromImage = async (imagePath) => {
  try {
    const processedImagePath = await preprocessImage(imagePath);
    
    const { data } = await Tesseract.recognize(
      processedImagePath,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    // Clean up processed image if it was created
    if (processedImagePath !== imagePath) {
      try {
        await fs.unlink(processedImagePath);
      } catch (err) {
        console.error('Error deleting processed image:', err);
      }
    }

    return {
      text: data.text,
      confidence: data.confidence,
      words: data.words.length,
      lines: data.lines.length
    };
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw error;
  }
};

/**
 * Parse patient monitoring data from extracted text
 */
const parsePatientData = (extractedText) => {
  const data = {
    heartRate: null,
    bloodPressure: null,
    oxygenSaturation: null,
    temperature: null,
    respiratoryRate: null,
    rawText: extractedText
  };

  // Extract heart rate (e.g., "HR: 72", "Heart Rate: 72 bpm")
  const hrMatch = extractedText.match(/(?:HR|Heart\s*Rate)[:\s]*(\d+)/i);
  if (hrMatch) {
    data.heartRate = parseInt(hrMatch[1]);
  }

  // Extract blood pressure (e.g., "BP: 120/80", "Blood Pressure: 120/80")
  const bpMatch = extractedText.match(/(?:BP|Blood\s*Pressure)[:\s]*(\d+)\/(\d+)/i);
  if (bpMatch) {
    data.bloodPressure = {
      systolic: parseInt(bpMatch[1]),
      diastolic: parseInt(bpMatch[2])
    };
  }

  // Extract oxygen saturation (e.g., "SpO2: 98%", "O2: 98")
  const o2Match = extractedText.match(/(?:SpO2|O2|Oxygen)[:\s]*(\d+)/i);
  if (o2Match) {
    data.oxygenSaturation = parseInt(o2Match[1]);
  }

  // Extract temperature (e.g., "Temp: 98.6", "Temperature: 37.2")
  const tempMatch = extractedText.match(/(?:Temp|Temperature)[:\s]*([\d.]+)/i);
  if (tempMatch) {
    data.temperature = parseFloat(tempMatch[1]);
  }

  // Extract respiratory rate (e.g., "RR: 16", "Resp: 16")
  const rrMatch = extractedText.match(/(?:RR|Resp|Respiratory\s*Rate)[:\s]*(\d+)/i);
  if (rrMatch) {
    data.respiratoryRate = parseInt(rrMatch[1]);
  }

  return data;
};

/**
 * Process image and extract patient monitoring data
 */
const processImage = async (imageData) => {
  try {
    console.log(`Processing image: ${imageData.imageId}`);

    // Check if image file exists
    const fileExists = await fs.access(imageData.imagePath)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      return {
        success: false,
        error: 'Image file not found',
        imageId: imageData.imageId
      };
    }

    // Extract text using OCR
    const ocrResult = await extractTextFromImage(imageData.imagePath);

    // Parse patient data from extracted text
    const patientData = parsePatientData(ocrResult.text);

    console.log(`OCR completed for image: ${imageData.imageId}`);
    console.log(`Confidence: ${ocrResult.confidence}%, Words: ${ocrResult.words}`);

    return {
      success: true,
      data: patientData,
      confidence: ocrResult.confidence,
      metadata: {
        wordsDetected: ocrResult.words,
        linesDetected: ocrResult.lines
      }
    };

  } catch (error) {
    console.error('Error processing image:', error);
    return {
      success: false,
      error: error.message,
      imageId: imageData.imageId
    };
  }
};

module.exports = { processImage, extractTextFromImage, parsePatientData };
