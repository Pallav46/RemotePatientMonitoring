const PatientData = require('../models/PatientData');
const redis = require('../config/redis');

/**
 * Validate vital signs and generate alerts
 */
const validateVitals = (vitals) => {
  const alerts = [];
  let status = 'normal';

  // Heart Rate validation (Normal: 60-100 bpm)
  if (vitals.heartRate) {
    if (vitals.heartRate < 40) {
      alerts.push({
        type: 'heartRate',
        message: `Critical: Heart rate too low (${vitals.heartRate} bpm)`,
        severity: 'critical'
      });
      status = 'critical';
    } else if (vitals.heartRate < 60) {
      alerts.push({
        type: 'heartRate',
        message: `Warning: Heart rate below normal (${vitals.heartRate} bpm)`,
        severity: 'medium'
      });
      if (status !== 'critical') status = 'warning';
    } else if (vitals.heartRate > 120) {
      alerts.push({
        type: 'heartRate',
        message: `Critical: Heart rate too high (${vitals.heartRate} bpm)`,
        severity: 'critical'
      });
      status = 'critical';
    } else if (vitals.heartRate > 100) {
      alerts.push({
        type: 'heartRate',
        message: `Warning: Heart rate above normal (${vitals.heartRate} bpm)`,
        severity: 'medium'
      });
      if (status !== 'critical') status = 'warning';
    }
  }

  // Blood Pressure validation (Normal: 90-120 / 60-80)
  if (vitals.bloodPressure) {
    const { systolic, diastolic } = vitals.bloodPressure;
    
    if (systolic && diastolic) {
      if (systolic > 180 || diastolic > 120) {
        alerts.push({
          type: 'bloodPressure',
          message: `Critical: Blood pressure dangerously high (${systolic}/${diastolic})`,
          severity: 'critical'
        });
        status = 'critical';
      } else if (systolic > 140 || diastolic > 90) {
        alerts.push({
          type: 'bloodPressure',
          message: `Warning: Blood pressure elevated (${systolic}/${diastolic})`,
          severity: 'high'
        });
        if (status !== 'critical') status = 'warning';
      } else if (systolic < 90 || diastolic < 60) {
        alerts.push({
          type: 'bloodPressure',
          message: `Warning: Blood pressure low (${systolic}/${diastolic})`,
          severity: 'high'
        });
        if (status !== 'critical') status = 'warning';
      }
    }
  }

  // Oxygen Saturation validation (Normal: 95-100%)
  if (vitals.oxygenSaturation) {
    if (vitals.oxygenSaturation < 90) {
      alerts.push({
        type: 'oxygenSaturation',
        message: `Critical: Oxygen saturation critically low (${vitals.oxygenSaturation}%)`,
        severity: 'critical'
      });
      status = 'critical';
    } else if (vitals.oxygenSaturation < 95) {
      alerts.push({
        type: 'oxygenSaturation',
        message: `Warning: Oxygen saturation below normal (${vitals.oxygenSaturation}%)`,
        severity: 'high'
      });
      if (status !== 'critical') status = 'warning';
    }
  }

  // Temperature validation (Normal: 36.5-37.5°C or 97.7-99.5°F)
  if (vitals.temperature) {
    // Assume Celsius if < 50, otherwise Fahrenheit
    const tempC = vitals.temperature < 50 ? vitals.temperature : (vitals.temperature - 32) * 5/9;
    
    if (tempC > 39) {
      alerts.push({
        type: 'temperature',
        message: `Critical: High fever (${vitals.temperature}°)`,
        severity: 'critical'
      });
      status = 'critical';
    } else if (tempC > 38) {
      alerts.push({
        type: 'temperature',
        message: `Warning: Elevated temperature (${vitals.temperature}°)`,
        severity: 'medium'
      });
      if (status !== 'critical') status = 'warning';
    } else if (tempC < 35) {
      alerts.push({
        type: 'temperature',
        message: `Critical: Hypothermia (${vitals.temperature}°)`,
        severity: 'critical'
      });
      status = 'critical';
    }
  }

  // Respiratory Rate validation (Normal: 12-20 breaths/min)
  if (vitals.respiratoryRate) {
    if (vitals.respiratoryRate < 8) {
      alerts.push({
        type: 'respiratoryRate',
        message: `Critical: Respiratory rate too low (${vitals.respiratoryRate})`,
        severity: 'critical'
      });
      status = 'critical';
    } else if (vitals.respiratoryRate < 12) {
      alerts.push({
        type: 'respiratoryRate',
        message: `Warning: Respiratory rate below normal (${vitals.respiratoryRate})`,
        severity: 'medium'
      });
      if (status !== 'critical') status = 'warning';
    } else if (vitals.respiratoryRate > 25) {
      alerts.push({
        type: 'respiratoryRate',
        message: `Critical: Respiratory rate too high (${vitals.respiratoryRate})`,
        severity: 'critical'
      });
      status = 'critical';
    } else if (vitals.respiratoryRate > 20) {
      alerts.push({
        type: 'respiratoryRate',
        message: `Warning: Respiratory rate elevated (${vitals.respiratoryRate})`,
        severity: 'medium'
      });
      if (status !== 'critical') status = 'warning';
    }
  }

  return { alerts, status };
};

/**
 * Process patient monitoring data
 */
const processPatientData = async (data) => {
  try {
    console.log(`Processing data from userId: ${data.userId}, dataId: ${data.dataId}`);

    const { extractedData, ocrConfidence, metadata } = data;

    // Validate vitals and generate alerts
    const { alerts, status } = validateVitals(extractedData);

    // Create patient data record
    const patientData = new PatientData({
      dataId: data.dataId,
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      vitals: {
        heartRate: extractedData.heartRate,
        bloodPressure: extractedData.bloodPressure,
        oxygenSaturation: extractedData.oxygenSaturation,
        temperature: extractedData.temperature,
        respiratoryRate: extractedData.respiratoryRate
      },
      rawData: extractedData.rawText,
      status,
      alerts,
      ocrConfidence,
      metadata: {
        deviceType: metadata?.deviceType,
        submissionType: metadata?.submissionType,
        wordsDetected: data.metadata?.wordsDetected,
        linesDetected: data.metadata?.linesDetected
      }
    });

    await patientData.save();

    // Cache latest patient data in Redis
    const cacheKey = `user:${patientData.userId}:latest`;
    await redis.setex(cacheKey, 3600, JSON.stringify(patientData)); // Cache for 1 hour

    // Update patient statistics
    await updatePatientStatistics(patientData.userId, status);

    console.log(`Data saved for userId: ${patientData.userId}, dataId: ${patientData.dataId}, Status: ${status}`);

    return {
      success: true,
      data: patientData
    };

  } catch (error) {
    console.error('Error processing patient data:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update patient statistics in Redis
 */
const updatePatientStatistics = async (userId, status) => {
  try {
    const statsKey = `user:${userId}:stats`;
    const stats = await redis.get(statsKey);
    
    let patientStats = stats ? JSON.parse(stats) : {
      totalReadings: 0,
      normal: 0,
      warning: 0,
      critical: 0,
      error: 0
    };

    patientStats.totalReadings += 1;
    patientStats[status] = (patientStats[status] || 0) + 1;
    patientStats.lastUpdated = new Date().toISOString();

    await redis.setex(statsKey, 86400, JSON.stringify(patientStats)); // Cache for 24 hours
  } catch (error) {
    console.error('Error updating patient statistics:', error);
  }
};

/**
 * Get patient history
 */
const getPatientHistory = async (userId, limit = 50) => {
  try {
    const history = await PatientData.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-__v');

    return history;
  } catch (error) {
    console.error('Error fetching patient history:', error);
    throw error;
  }
};

/**
 * Get patient statistics
 */
const getPatientStatistics = async (userId) => {
  try {
    const statsKey = `user:${userId}:stats`;
    const stats = await redis.get(statsKey);

    if (stats) {
      return JSON.parse(stats);
    }

    // If not cached, calculate from database
    const data = await PatientData.find({ userId });
    
    const statistics = {
      totalReadings: data.length,
      normal: data.filter(d => d.status === 'normal').length,
      warning: data.filter(d => d.status === 'warning').length,
      critical: data.filter(d => d.status === 'critical').length,
      error: data.filter(d => d.status === 'error').length,
      lastUpdated: new Date().toISOString()
    };

    await redis.setex(statsKey, 86400, JSON.stringify(statistics));
    return statistics;
  } catch (error) {
    console.error('Error fetching patient statistics:', error);
    throw error;
  }
};

module.exports = {
  processPatientData,
  validateVitals,
  getPatientHistory,
  getPatientStatistics
};
