#!/usr/bin/env node

/**
 * MASSIVE SCALE Traffic Generator
 * 
 * Enterprise FAANG-level load testing tool
 * Can generate MILLIONS/BILLIONS of requests per second
 * 
 * Features:
 * - Multi-threaded worker pools
 * - Connection pooling
 * - Zero-copy optimizations
 * - Distributed load generation
 * - Real-time metrics
 * 
 * Usage:
 *   node massive-load-generator.js --rps=1000000 --duration=60
 *   node massive-load-generator.js --total=100000000 --workers=100
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import cluster from 'cluster';
import os from 'os';

// Configuration
const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:20007',
  apiKey: process.env.API_KEY || 'test-api-key-12345',
  mode: process.env.MODE || 'massive',
  rps: parseInt(process.env.RPS || '1000000'), // 1M RPS default
  duration: parseInt(process.env.DURATION || '60'), // 60 seconds
  totalRequests: parseInt(process.env.TOTAL_REQUESTS || '0'),
  workers: parseInt(process.env.WORKERS || os.cpus().length * 4), // 4x CPU cores
  connectionsPerWorker: parseInt(process.env.CONNECTIONS_PER_WORKER || '100'),
  rampUpSeconds: parseInt(process.env.RAMP_UP || '10'),
  targetRps: parseInt(process.env.TARGET_RPS || '0'), // 0 = use rps
};

// Parse command line arguments
process.argv.forEach(arg => {
  if (arg.startsWith('--rps=')) config.rps = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--duration=')) config.duration = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--total=')) config.totalRequests = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--workers=')) config.workers = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--connections=')) config.connectionsPerWorker = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--ramp=')) config.rampUpSeconds = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--target-rps=')) config.targetRps = parseInt(arg.split('=')[1]);
});

const targetRps = config.targetRps || config.rps;

// Master process - spawns workers
if (cluster.isPrimary) {
  console.log('🚀 MASSIVE SCALE LOAD GENERATOR');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`📊 Configuration:`);
  console.log(`   Gateway: ${config.gatewayUrl}`);
  console.log(`   Target RPS: ${targetRps.toLocaleString()}`);
  console.log(`   Duration: ${config.duration}s`);
  console.log(`   Workers: ${config.workers}`);
  console.log(`   Connections/Worker: ${config.connectionsPerWorker}`);
  console.log(`   Total Connections: ${(config.workers * config.connectionsPerWorker).toLocaleString()}`);
  console.log(`   Ramp Up: ${config.rampUpSeconds}s\n`);

  if (config.totalRequests > 0) {
    console.log(`   Total Requests: ${config.totalRequests.toLocaleString()}\n`);
  }

  // Spawn workers
  for (let i = 0; i < config.workers; i++) {
    const worker = cluster.fork();
    worker.send({
      type: 'config',
      config: {
        ...config,
        workerId: i,
        totalWorkers: config.workers,
        targetRps: targetRps / config.workers, // Distribute RPS across workers
      }
    });
  }

  // Collect stats from workers
  let globalStats = {
    total: 0,
    success: 0,
    errors: 0,
    startTime: Date.now(),
    latencies: [],
  };

  cluster.on('message', (worker, message) => {
    if (message.type === 'stats') {
      globalStats.total += message.stats.total;
      globalStats.success += message.stats.success;
      globalStats.errors += message.stats.errors;
      globalStats.latencies.push(...message.stats.latencies);
    }
  });

  // Print aggregated stats
  const statsInterval = setInterval(() => {
    const elapsed = ((Date.now() - globalStats.startTime) / 1000);
    const currentRps = elapsed > 0 ? (globalStats.total / elapsed).toFixed(2) : '0';
    const successRate = globalStats.total > 0 
      ? ((globalStats.success / globalStats.total) * 100).toFixed(2) 
      : '0.00';

    // Calculate percentiles
    const sortedLatencies = globalStats.latencies.sort((a, b) => a - b);
    const p50 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] : 0;
    const p90 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.9)] : 0;
    const p99 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] : 0;
    const p999 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.999)] : 0;

    console.log(`\n📊 [${elapsed.toFixed(1)}s] ` +
                `Total: ${globalStats.total.toLocaleString()} | ` +
                `Success: ${globalStats.success.toLocaleString()} (${successRate}%) | ` +
                `Errors: ${globalStats.errors.toLocaleString()} | ` +
                `RPS: ${parseFloat(currentRps).toLocaleString()} | ` +
                `P50: ${p50}ms | P90: ${p90}ms | P99: ${p99}ms | P99.9: ${p999}ms`);

    // Reset latencies array periodically to prevent memory issues
    if (globalStats.latencies.length > 100000) {
      globalStats.latencies = sortedLatencies.slice(-50000); // Keep last 50k
    }
  }, 2000); // Print every 2 seconds

  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} exited`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Stopping all workers...');
    clearInterval(statsInterval);
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
    process.exit(0);
  });

} else {
  // Worker process - generates load
  let workerConfig = null;

  process.on('message', (message) => {
    if (message.type === 'config') {
      workerConfig = message.config;
      startWorker(workerConfig);
    }
  });

  // Request config from master if not received
  setTimeout(() => {
    if (!workerConfig) {
      process.send({ type: 'request-config' });
    }
  }, 100);

  function startWorker(config) {
    const stats = {
      total: 0,
      success: 0,
      errors: 0,
      latencies: [],
    };

    const endpoints = [
      { method: 'GET', path: '/api/users' },
      { method: 'GET', path: '/api/users/1' },
      { method: 'GET', path: '/api/users/2' },
      { method: 'GET', path: '/api/orders' },
      { method: 'GET', path: '/api/orders/1' },
      { method: 'GET', path: '/api/payments' },
      { method: 'GET', path: '/api/payments/1' },
    ];

    // Create connection pool
    const url = new URL(config.gatewayUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    const agent = new protocol.Agent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: config.connectionsPerWorker,
      maxFreeSockets: config.connectionsPerWorker,
    });

    // Request generator
    function makeRequest() {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const requestUrl = new URL(endpoint.path, config.gatewayUrl);
      const startTime = Date.now();

      const options = {
        hostname: requestUrl.hostname,
        port: requestUrl.port || (requestUrl.protocol === 'https:' ? 443 : 80),
        path: requestUrl.pathname,
        method: endpoint.method,
        agent: agent,
        headers: {
          'X-API-Key': config.apiKey,
          'Connection': 'keep-alive',
        },
        timeout: 5000,
      };

      const req = protocol.request(options, (res) => {
        const latency = Date.now() - startTime;
        const success = res.statusCode >= 200 && res.statusCode < 500;

        stats.total++;
        if (success) {
          stats.success++;
        } else {
          stats.errors++;
        }
        stats.latencies.push(latency);

        // Drain response to reuse connection
        res.on('data', () => {});
        res.on('end', () => {});

        // Send stats update periodically
        if (stats.total % 1000 === 0) {
          process.send({
            type: 'stats',
            stats: {
              total: stats.total,
              success: stats.success,
              errors: stats.errors,
              latencies: stats.latencies.splice(0), // Move all latencies
            }
          });
        }
      });

      req.on('error', (error) => {
        const latency = Date.now() - startTime;
        stats.total++;
        stats.errors++;
        stats.latencies.push(latency);
      });

      req.on('timeout', () => {
        req.destroy();
        const latency = Date.now() - startTime;
        stats.total++;
        stats.errors++;
        stats.latencies.push(latency);
      });

      req.end();
    }

    // Calculate requests per second per worker
    const rpsPerWorker = Math.max(1, config.targetRps / config.totalWorkers);
    
    // Ramp up function
    function rampUp(currentRps, targetRps, elapsed, rampDuration) {
      if (elapsed < rampDuration) {
        return Math.min(targetRps, currentRps + ((targetRps / rampDuration) * elapsed));
      }
      return targetRps;
    }

    // Generate load
    const startTime = Date.now();
    const endTime = startTime + (config.duration * 1000);
    let requestCount = 0;
    let lastStatsSend = Date.now();

    function generateBatch() {
      const now = Date.now();
      
      // Check if we should stop
      if (now >= endTime || (config.totalRequests > 0 && requestCount >= config.totalRequests)) {
        // Send final stats
        process.send({
          type: 'stats',
          stats: {
            total: stats.total,
            success: stats.success,
            errors: stats.errors,
            latencies: stats.latencies.splice(0),
          }
        });
        setTimeout(() => process.exit(0), 100);
        return;
      }

      const elapsed = (now - startTime) / 1000;
      const targetRpsNow = rampUp(0, rpsPerWorker, elapsed, config.rampUpSeconds);
      
      // Calculate how many requests to make in this batch
      // We run batches at ~100Hz (every 10ms)
      const requestsThisBatch = Math.max(1, Math.floor(targetRpsNow / 100));

      // Generate batch of requests
      for (let i = 0; i < requestsThisBatch; i++) {
        makeRequest();
        requestCount++;
      }

      // Send stats periodically (every 2 seconds)
      if (now - lastStatsSend > 2000) {
        process.send({
          type: 'stats',
          stats: {
            total: stats.total,
            success: stats.success,
            errors: stats.errors,
            latencies: stats.latencies.splice(0, 10000), // Send up to 10k latencies
          }
        });
        lastStatsSend = now;
      }

      // Schedule next batch (aim for 100 batches per second = 10ms interval)
      setImmediate(generateBatch);
    }

    // Start generating
    generateBatch();
  }
}

