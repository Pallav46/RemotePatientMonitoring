const { errorConsumer, alertConsumer } = require('../config/kafka');
const { sendErrorNotification, sendAlertNotification } = require('../services/emailService');

/**
 * Start error topic consumer
 */
const startErrorConsumer = async () => {
  try {
    await errorConsumer.connect();
    await errorConsumer.subscribe({ topic: 'error-topic', fromBeginning: false });

    await errorConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          console.log(`Received error notification from ${topic}:`, data);

          await sendErrorNotification(data);

        } catch (error) {
          console.error('Error processing error notification:', error);
        }
      }
    });

    console.log('Error consumer is running...');
  } catch (error) {
    console.error('Error starting error consumer:', error);
    throw error;
  }
};

/**
 * Start alert topic consumer
 */
const startAlertConsumer = async () => {
  try {
    await alertConsumer.connect();
    await alertConsumer.subscribe({ topic: 'alert-topic', fromBeginning: false });

    await alertConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          console.log(`Received alert notification from ${topic}:`, data);

          await sendAlertNotification(data);

        } catch (error) {
          console.error('Error processing alert notification:', error);
        }
      }
    });

    console.log('Alert consumer is running...');
  } catch (error) {
    console.error('Error starting alert consumer:', error);
    throw error;
  }
};

module.exports = { startErrorConsumer, startAlertConsumer };
