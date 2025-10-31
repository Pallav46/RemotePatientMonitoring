const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { startConsumer } = require('./kafka/consumer');
const { connectKafka } = require('./config/kafka');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'ocr-service' });
});

// Kafka connection and consumer start
const initializeService = async () => {
  try {
    await connectKafka();
    console.log('Kafka connected');
    
    await startConsumer();
    console.log('Kafka consumer started');
  } catch (error) {
    console.error('Service initialization error:', error);
    process.exit(1);
  }
};

app.listen(PORT, () => {
  console.log(`OCR service running on port ${PORT}`);
  initializeService();
});

module.exports = app;
