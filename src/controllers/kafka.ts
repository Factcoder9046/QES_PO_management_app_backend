// import { Kafka } from 'kafkajs';

// const kafka = new Kafka({
//   clientId: 'notification-app',
//   brokers: ['192.168.1.6:9092'], // Matches KAFKA_ADVERTISED_LISTENERS
//   connectionTimeout: 3000, // 3 seconds timeout for initial connection
//   requestTimeout: 25000, // Timeout for requests (default is 30s, adjusted to 25s)
//   retry: {
//     initialRetryTime: 1000, // Start retrying after 1 second
//     retries: 5, // Retry 5 times
//     factor: 2, // Exponential backoff factor
//     maxRetryTime: 30000, // Max wait time between retries (30 seconds)
//   },
//   // Optional: Explicitly set PLAINTEXT for clarity
//   ssl: false, // No SSL, matches PLAINTEXT protocol
//   sasl: null, // No SASL authentication
// });

// const producer = kafka.producer({
//   allowAutoTopicCreation: true, // Automatically create topics if they don't exist
//   transactionTimeout: 30000, // Timeout for transactions (if used)
// });

// export const connectProducer = async () => {
//   try {
//     await producer.connect();
//     console.log('Kafka producer connected successfully to 192.168.1.18:9092');
//   } catch (error) {
//     console.error('Failed to connect Kafka producer:', error);
//     throw error;
//   }
// };

// export const sendToKafka = async (topic, message) => {
//   try {
//     await producer.send({
//       topic,
//       messages: [{ value: JSON.stringify(message) }],
//     });
//     console.log(`Message sent to Kafka topic ${topic}`);
//   } catch (error) {
//     console.error(`Failed to send message to Kafka topic ${topic}:`, error);
//     throw error;
//   }
// };

// // Connect producer on app startup
// connectProducer().catch((error) => {
//   console.error('Producer connection failed on startup:', error);
//   process.exit(1); // Exit if producer can't connect
// });