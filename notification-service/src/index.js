const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { startErrorConsumer, startAlertConsumer } = require('./kafka/consumer');
const { connectKafka } = require('./config/kafka');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'notification-service' });
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
    
    // Start both error and alert consumers
    await Promise.all([
      startErrorConsumer(),
      startAlertConsumer()
    ]);
    console.log('Kafka consumers started');
  } catch (error) {
    console.error('Service initialization error:', error);
    process.exit(1);
  }
};

app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
  initializeService();
});

module.exports = app;
