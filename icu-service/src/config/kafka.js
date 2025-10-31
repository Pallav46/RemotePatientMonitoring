const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'icu-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'icu-service-group' });

const connectKafka = async () => {
  try {
    await producer.connect();
    console.log('Kafka producer connected');
  } catch (error) {
    console.error('Error connecting to Kafka:', error);
    throw error;
  }
};

const publishMessage = async (topic, message) => {
  try {
    await producer.send({
      topic,
      messages: [
        {
          key: message.userId || message.correlationId,
          value: JSON.stringify(message),
          headers: {
            'correlation-id': message.correlationId || '',
            'timestamp': new Date().toISOString()
          }
        }
      ]
    });
    console.log(`Message published to topic: ${topic}`);
  } catch (error) {
    console.error('Error publishing message:', error);
    throw error;
  }
};

const disconnect = async () => {
  await producer.disconnect();
  await consumer.disconnect();
};

module.exports = { kafka, connectKafka, publishMessage, consumer, disconnect };
