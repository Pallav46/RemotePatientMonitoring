const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Preprocess image for better OCR accuracy
 * Returns a buffer instead of saving to disk (avoids read-only filesystem issues)
 */
const preprocessImage = async (imagePath) => {
  try {
    const buffer = await sharp(imagePath)
      .resize(2000, null, { withoutEnlargement: true }) // Resize for better OCR
      .greyscale() // Convert to grayscale
      .normalize() // Normalize contrast
      .sharpen() // Enhance sharpness
      .png() // Convert to PNG format
      .toBuffer(); // Return buffer instead of saving to file
    
    return buffer;
  } catch (error) {
    console.error('Image preprocessing error:', error);
    return null; // Return null if preprocessing fails
  }
};

/**
 * Extract text from image using Tesseract OCR
 */
const extractTextFromImage = async (imagePath) => {
  try {
    // Try to preprocess image in memory
    const processedBuffer = await preprocessImage(imagePath);
    
    // Use processed buffer if available, otherwise use original image path
    const imageInput = processedBuffer || imagePath;
    
    const { data } = await Tesseract.recognize(
      imageInput,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

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
 * Enhanced with flexible pattern matching for various OCR outputs
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

  // Clean the text: remove special characters but keep numbers, slashes, dots, colons, and spaces
  const cleanText = extractedText.replace(/[£€$@#&*()[\]{}|\\<>]/g, ' ');

  // Extract heart rate with multiple patterns
  // Patterns: "HR: 72", "Heart Rate: 72", "72 bpm", standalone numbers in range 40-220
  let hrMatch = cleanText.match(/(?:HR|Heart\s*Rate)[:\s]*(\d{2,3})/i);
  if (!hrMatch) {
    // Look for numbers followed by "bpm"
    hrMatch = cleanText.match(/(\d{2,3})\s*bpm/i);
  }
  if (!hrMatch) {
    // Look for standalone numbers in heart rate range (40-220)
    const numbers = cleanText.match(/\b(\d{2,3})\b/g);
    if (numbers) {
      for (const num of numbers) {
        const val = parseInt(num);
        if (val >= 40 && val <= 220 && !data.heartRate) {
          data.heartRate = val;
          break;
        }
      }
    }
  } else {
    data.heartRate = parseInt(hrMatch[1]);
  }

  // Extract blood pressure with flexible pattern matching
  // Patterns: "BP: 120/80", "120/80", with or without special chars
  let bpMatch = cleanText.match(/(?:BP|Blood\s*Pressure)?[:\s]*(\d{2,3})\s*[\/\\|]\s*(\d{2,3})/i);
  if (bpMatch) {
    const systolic = parseInt(bpMatch[1]);
    const diastolic = parseInt(bpMatch[2]);
    // Validate blood pressure ranges
    if (systolic >= 60 && systolic <= 250 && diastolic >= 40 && diastolic <= 150) {
      data.bloodPressure = {
        systolic: systolic,
        diastolic: diastolic
      };
    }
  }

  // Extract oxygen saturation with multiple patterns
  // Patterns: "SpO2: 98%", "O2: 98", "98%", numbers in range 70-100
  let o2Match = cleanText.match(/(?:SpO2|O2|Oxygen|Sat)[:\s]*(\d{2,3})%?/i);
  if (!o2Match) {
    // Look for percentage signs
    o2Match = cleanText.match(/(\d{2,3})%/);
  }
  if (!o2Match) {
    // Look for numbers in oxygen saturation range (70-100)
    const numbers = cleanText.match(/\b(\d{2,3})\b/g);
    if (numbers) {
      for (const num of numbers) {
        const val = parseInt(num);
        if (val >= 70 && val <= 100 && !data.oxygenSaturation && val !== data.heartRate) {
          data.oxygenSaturation = val;
          break;
        }
      }
    }
  } else {
    const val = parseInt(o2Match[1]);
    if (val >= 70 && val <= 100) {
      data.oxygenSaturation = val;
    }
  }

  // Extract temperature with multiple patterns
  // Patterns: "Temp: 98.6", "36.5°C", "98.6°F", decimal numbers in range 32-45
  let tempMatch = cleanText.match(/(?:Temp|Temperature)[:\s]*([\d.]+)[\s°]?[CF]?/i);
  if (!tempMatch) {
    // Look for decimal numbers with degree symbol
    tempMatch = cleanText.match(/([\d.]+)\s*[°º][CF]?/);
  }
  if (!tempMatch) {
    // Look for decimal numbers in temperature range
    const decimals = cleanText.match(/\b(\d{2,3}\.\d{1,2})\b/g);
    if (decimals) {
      for (const num of decimals) {
        const val = parseFloat(num);
        // Check for both Celsius (32-45) and Fahrenheit (90-110) ranges
        if ((val >= 32 && val <= 45) || (val >= 90 && val <= 110)) {
          data.temperature = val;
          break;
        }
      }
    }
  } else {
    data.temperature = parseFloat(tempMatch[1]);
  }

  // Extract respiratory rate with multiple patterns
  // Patterns: "RR: 16", "Resp: 16", numbers in range 8-60
  let rrMatch = cleanText.match(/(?:RR|Resp|Respiratory\s*Rate)[:\s]*(\d{1,2})/i);
  if (!rrMatch) {
    // Look for small numbers in respiratory rate range (8-60)
    const numbers = cleanText.match(/\b(\d{1,2})\b/g);
    if (numbers) {
      for (const num of numbers) {
        const val = parseInt(num);
        if (val >= 8 && val <= 60 && 
            val !== data.heartRate && 
            val !== data.oxygenSaturation && 
            !data.respiratoryRate) {
          data.respiratoryRate = val;
          break;
        }
      }
    }
  } else {
    data.respiratoryRate = parseInt(rrMatch[1]);
  }

  return data;
};

/**
 * Process image and extract patient monitoring data
 */
const processImage = async (imageData) => {
  try {
    console.log(`Processing image: ${imageData.imagePath}`);

    // Check if image file exists
    const fileExists = await fs.access(imageData.imagePath)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      return {
        success: false,
        error: 'Image file not found',
        imagePath: imageData.imagePath
      };
    }

    // Extract text using OCR
    const ocrResult = await extractTextFromImage(imageData.imagePath);

    // Parse patient data from extracted text
    const patientData = parsePatientData(ocrResult.text);

    console.log(`OCR completed for image: ${imageData.imagePath}`);
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
      imagePath: imageData.imagePath
    };
  }
};

module.exports = { processImage, extractTextFromImage, parsePatientData };
