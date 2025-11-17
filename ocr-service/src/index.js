const cluster = require('cluster');
const os = require('os');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { startConsumer } = require('./kafka/consumer');
const { connectKafka } = require('./config/kafka');

const PORT = process.env.PORT || 3002;
const NUM_WORKERS = parseInt(process.env.OCR_WORKERS) || 3; // Default: 3 worker processes

// Master process
if (cluster.isMaster || cluster.isPrimary) {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          OCR SERVICE - MASTER-SLAVE ARCHITECTURE              ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
  console.log(`Master process [PID: ${process.pid}] is running`);
  console.log(`CPU Cores available: ${os.cpus().length}`);
  console.log(`Spawning ${NUM_WORKERS} worker processes for parallel OCR processing...`);
  console.log(`Load Balancing: Round-robin scheduling\n`);

  // Fork workers
  for (let i = 0; i < NUM_WORKERS; i++) {
    const worker = cluster.fork();
    console.log(`✓ Worker ${i + 1} spawned [PID: ${worker.process.pid}]`);
  }

  // Worker died - respawn
  cluster.on('exit', (worker, code, signal) => {
    console.log(`\n⚠ Worker [PID: ${worker.process.pid}] died (${signal || code})`);
    console.log(`Spawning new worker to maintain ${NUM_WORKERS} workers...`);
    const newWorker = cluster.fork();
    console.log(`✓ New worker spawned [PID: ${newWorker.process.pid}]\n`);
  });

  // Worker online
  cluster.on('online', (worker) => {
    console.log(`Worker [PID: ${worker.process.pid}] is online and ready`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\nSIGTERM received. Shutting down gracefully...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });

  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`Master process initialized. Workers ready for OCR tasks.`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

} else {
  // Worker process
  const app = express();

  app.use(helmet());
  app.use(morgan('combined'));
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'OK', 
      service: 'ocr-service',
      worker: process.pid,
      role: 'worker'
    });
  });

  // Worker status endpoint
  app.get('/worker-status', (req, res) => {
    res.status(200).json({
      workerId: cluster.worker.id,
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      role: 'OCR Worker'
    });
  });

  // Kafka connection and consumer start
  const initializeWorker = async () => {
    try {
      await connectKafka();
      console.log(`[Worker ${cluster.worker.id} - PID: ${process.pid}] Kafka connected`);
      
      await startConsumer();
      console.log(`[Worker ${cluster.worker.id} - PID: ${process.pid}] Kafka consumer started - Ready for OCR tasks`);
    } catch (error) {
      console.error(`[Worker ${cluster.worker.id} - PID: ${process.pid}] Initialization error:`, error);
      process.exit(1);
    }
  };

  app.listen(PORT, () => {
    console.log(`[Worker ${cluster.worker.id} - PID: ${process.pid}] OCR service listening on port ${PORT}`);
    initializeWorker();
  });

  // Graceful shutdown for worker
  process.on('SIGTERM', () => {
    console.log(`[Worker ${cluster.worker.id} - PID: ${process.pid}] SIGTERM received. Shutting down...`);
    process.exit(0);
  });
}

module.exports = cluster;
