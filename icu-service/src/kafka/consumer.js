const { consumer, publishMessage } = require('../config/kafka');
const { processPatientData } = require('../services/icuService');

const startConsumer = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'ocr-complete-topic', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          console.log(`Received data from ${topic}:`, data);

          // Process patient data
          const result = await processPatientData(data);

          if (result.success) {
            console.log(`Data processed successfully for userId: ${result.data.userId}, dataId: ${result.data.dataId}`);
            
            // If there are critical alerts, send notification
            if (result.data.status === 'critical' || result.data.status === 'warning') {
              await publishMessage('alert-topic', {
                dataId: result.data.dataId,
                userId: result.data.userId,
                userEmail: result.data.userEmail,
                userName: result.data.userName,
                status: result.data.status,
                alerts: result.data.alerts,
                vitals: result.data.vitals,
                message: `Patient monitoring alert: ${result.data.status}`,
                timestamp: new Date().toISOString(),
                correlationId: data.correlationId
              });
            }
          } else {
            // Send error to notification service
            await publishMessage('error-topic', {
              service: 'icu-service',
              dataId: data.dataId,
              userId: data.userId,
              userEmail: data.userEmail,
              error: result.error,
              message: 'ICU data processing failed',
              timestamp: new Date().toISOString(),
              correlationId: data.correlationId
            });
          }

        } catch (error) {
          console.error('Error processing message:', error);
          
          // Send error notification
          try {
            const messageData = JSON.parse(message.value.toString());
            await publishMessage('error-topic', {
              service: 'icu-service',
              dataId: messageData.dataId,
              userId: messageData.userId,
              userEmail: messageData.userEmail,
              error: error.message,
              message: 'Unexpected error in ICU processing',
              timestamp: new Date().toISOString(),
              correlationId: messageData.correlationId
            });
          } catch (err) {
            console.error('Failed to send error notification:', err);
          }
        }
      }
    });

    console.log('ICU consumer is running...');
  } catch (error) {
    console.error('Error starting consumer:', error);
    throw error;
  }
};

module.exports = { startConsumer };
