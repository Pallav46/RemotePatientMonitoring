const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { startConsumer } = require('./kafka/consumer');
const { connectKafka } = require('./config/kafka');
const patientRoutes = require('./routes/patientRoutes');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.use('/api/patients', patientRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'icu-service' });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

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
  console.log(`ICU service running on port ${PORT}`);
  initializeService();
});

module.exports = app;
