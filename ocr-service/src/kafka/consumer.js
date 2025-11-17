const { consumer, publishMessage } = require('../config/kafka');
const { processImage } = require('../services/ocrService');

const startConsumer = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'image-upload-topic', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const startTime = Date.now();
        try {
          const data = JSON.parse(message.value.toString());
          const workerId = process.pid;
          
          console.log(`\n[Worker PID: ${workerId}] 📥 Received OCR task from ${topic}`);
          console.log(`[Worker PID: ${workerId}] Data ID: ${data.dataId}`);
          console.log(`[Worker PID: ${workerId}] User: ${data.userEmail}`);
          console.log(`[Worker PID: ${workerId}] Image: ${data.imagePath}`);

          // Process the image with OCR
          console.log(`[Worker PID: ${workerId}] 🔄 Starting OCR processing...`);
          const result = await processImage(data);
          const processingTime = Date.now() - startTime;

          if (result.success) {
            console.log(`[Worker PID: ${workerId}] ✓ OCR completed in ${processingTime}ms`);
            console.log(`[Worker PID: ${workerId}] Confidence: ${result.confidence.toFixed(2)}%`);
            
            // Send extracted data to ICU service
            await publishMessage('ocr-complete-topic', {
              ...data,
              extractedData: result.data,
              ocrConfidence: result.confidence,
              processedAt: new Date().toISOString(),
              processingTime: processingTime,
              workerPid: workerId
            });
            
            console.log(`[Worker PID: ${workerId}] 📤 Results sent to ICU service\n`);
          } else {
            console.log(`[Worker PID: ${workerId}] ✗ OCR failed: ${result.error}`);
            
            // Send error to notification service
            await publishMessage('error-topic', {
              service: 'ocr-service',
              dataId: data.dataId,
              userId: data.userId,
              userEmail: data.userEmail,
              error: result.error,
              message: 'OCR processing failed',
              timestamp: new Date().toISOString(),
              correlationId: data.correlationId,
              workerPid: workerId
            });
          }

        } catch (error) {
          const processingTime = Date.now() - startTime;
          const workerId = process.pid;
          console.error(`[Worker PID: ${workerId}] ✗ Error processing message (${processingTime}ms):`, error);
          
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
