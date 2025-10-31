const express = require('express');
const router = express.Router();
const PatientData = require('../models/PatientData');
const { getPatientHistory, getPatientStatistics } = require('../services/icuService');

// Get patient data by dataId
router.get('/data/:dataId', async (req, res) => {
  try {
    const { dataId } = req.params;

    const data = await PatientData.findOne({ dataId });
    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user history
router.get('/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    const history = await getPatientHistory(userId, parseInt(limit) || 50);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user statistics
router.get('/:userId/statistics', async (req, res) => {
  try {
    const { userId } = req.params;

    const statistics = await getPatientStatistics(userId);

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all critical patients
router.get('/critical/list', async (req, res) => {
  try {
    const criticalPatients = await PatientData.find({ status: 'critical' })
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: criticalPatients.length,
      data: criticalPatients
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
