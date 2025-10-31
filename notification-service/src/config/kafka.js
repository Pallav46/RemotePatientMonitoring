const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const errorConsumer = kafka.consumer({ groupId: 'notification-error-group' });
const alertConsumer = kafka.consumer({ groupId: 'notification-alert-group' });

const connectKafka = async () => {
  try {
    console.log('Connecting to Kafka...');
  } catch (error) {
    console.error('Error connecting to Kafka:', error);
    throw error;
  }
};

const disconnect = async () => {
  await errorConsumer.disconnect();
  await alertConsumer.disconnect();
};

module.exports = { kafka, connectKafka, errorConsumer, alertConsumer, disconnect };
