const { consumer, publishMessage } = require('../config/kafka');
const { processImage } = require('../services/ocrService');

const startConsumer = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'image-upload-topic', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          console.log(`Received data from ${topic}:`, data);

          // Process the image with OCR
          const result = await processImage(data);

          if (result.success) {
            // Send extracted data to ICU service
            await publishMessage('ocr-complete-topic', {
              ...data,
              extractedData: result.data,
              ocrConfidence: result.confidence,
              processedAt: new Date().toISOString()
            });
          } else {
            // Send error to notification service
            await publishMessage('error-topic', {
              service: 'ocr-service',
              dataId: data.dataId,
              userId: data.userId,
              userEmail: data.userEmail,
              error: result.error,
              message: 'OCR processing failed',
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
              service: 'ocr-service',
              dataId: messageData.dataId,
              userId: messageData.userId,
              userEmail: messageData.userEmail,
              error: error.message,
              message: 'Unexpected error in OCR processing',
              timestamp: new Date().toISOString(),
              correlationId: messageData.correlationId
            });
          } catch (err) {
            console.error('Failed to send error notification:', err);
          }
        }
      }
    });

    console.log('OCR consumer is running...');
  } catch (error) {
    console.error('Error starting consumer:', error);
    throw error;
  }
};

module.exports = { startConsumer };
