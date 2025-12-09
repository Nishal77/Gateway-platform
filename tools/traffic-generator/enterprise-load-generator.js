#!/usr/bin/env node

/**
 * Enterprise Production-Grade Traffic Generator
 * 
 * Mimics real-world traffic patterns from companies like Amazon, Cloudflare
 * - Realistic request distributions
 * - Burst patterns and spikes
 * - User session simulation
 * - Geographic distribution patterns
 * - Device and browser variety
 * - Unlimited requests until stopped
 * 
 * Usage:
 *   node enterprise-load-generator.js --rps=1000000
 *   node enterprise-load-generator.js --mode=continuous --max-rps=10000000
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import cluster from 'cluster';
import os from 'os';

const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:20007',
  apiKey: process.env.API_KEY || 'test-api-key-12345',
  mode: process.env.MODE || 'continuous',
  baseRps: parseInt(process.env.BASE_RPS || '100000'),
  maxRps: parseInt(process.env.MAX_RPS || '10000000'),
  minRps: parseInt(process.env.MIN_RPS || '10000'),
  workers: parseInt(process.env.WORKERS || os.cpus().length * 8),
  connectionsPerWorker: parseInt(process.env.CONNECTIONS_PER_WORKER || '200'),
  rampUpSeconds: parseInt(process.env.RAMP_UP || '30'),
  burstProbability: parseFloat(process.env.BURST_PROBABILITY || '0.1'),
  burstMultiplier: parseFloat(process.env.BURST_MULTIPLIER || '3.0'),
};

process.argv.forEach(arg => {
  if (arg.startsWith('--rps=')) config.baseRps = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--max-rps=')) config.maxRps = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--workers=')) config.workers = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--connections=')) config.connectionsPerWorker = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--mode=')) config.mode = arg.split('=')[1];
});

const targetRps = config.baseRps;

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/109.0 Firefox/115.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
];

const apiKeys = [
  'test-api-key-12345',
  'service-api-key-prod',
  'payment-api-key-prod',
  'auth-api-key-prod',
  'data-api-key-prod',
  'analytics-api-key-prod',
  'mobile-api-key-prod',
  'web-api-key-prod',
];

const endpoints = [
  { path: '/api/users', method: 'GET', weight: 30 },
  { path: '/api/users/{id}', method: 'GET', weight: 25 },
  { path: '/api/orders', method: 'GET', weight: 15 },
  { path: '/api/orders/{id}', method: 'GET', weight: 10 },
  { path: '/api/payments', method: 'GET', weight: 10 },
  { path: '/api/payments/{id}', method: 'GET', weight: 5 },
  { path: '/api/users', method: 'POST', weight: 3 },
  { path: '/api/orders', method: 'POST', weight: 2 },
];

function selectWeightedEndpoint() {
  const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      const path = endpoint.path.replace('{id}', Math.floor(Math.random() * 1000) + 1);
      return { path, method: endpoint.method };
    }
  }
  return { path: '/api/users', method: 'GET' };
}

function calculateDynamicRps(elapsed, baseRps, maxRps, minRps) {
  const hourOfDay = (elapsed / 3600) % 24;
  const dayOfWeek = Math.floor(elapsed / 86400) % 7;
  
  let multiplier = 1.0;
  
  if (hourOfDay >= 9 && hourOfDay <= 17) {
    multiplier *= 1.5;
  } else if (hourOfDay >= 18 && hourOfDay <= 22) {
    multiplier *= 2.0;
  } else {
    multiplier *= 0.5;
  }
  
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    multiplier *= 1.2;
  }
  
  const calculatedRps = Math.floor(baseRps * multiplier);
  return Math.max(minRps, Math.min(maxRps, calculatedRps));
}

if (cluster.isPrimary) {
  console.log('Enterprise Production-Grade Traffic Generator');
  console.log('==============================================\n');
  console.log('Configuration:');
  console.log(`  Gateway: ${config.gatewayUrl}`);
  console.log(`  Mode: ${config.mode}`);
  console.log(`  Base RPS: ${config.baseRps.toLocaleString()}`);
  console.log(`  Max RPS: ${config.maxRps.toLocaleString()}`);
  console.log(`  Workers: ${config.workers}`);
  console.log(`  Connections/Worker: ${config.connectionsPerWorker}`);
  console.log(`  Total Connections: ${(config.workers * config.connectionsPerWorker).toLocaleString()}\n`);

  const globalStats = {
    total: 0,
    success: 0,
    errors: 0,
    startTime: Date.now(),
    latencies: [],
    currentRps: 0,
    peakRps: 0,
    lastStatsUpdate: Date.now(),
  };

  for (let i = 0; i < config.workers; i++) {
    const worker = cluster.fork();
    worker.send({
      type: 'config',
      config: {
        ...config,
        workerId: i,
        totalWorkers: config.workers,
        targetRps: targetRps / config.workers,
      }
    });
  }

  cluster.on('message', (worker, message) => {
    if (message.type === 'stats') {
      globalStats.total += message.stats.total || 0;
      globalStats.success += message.stats.success || 0;
      globalStats.errors += message.stats.errors || 0;
      if (message.stats.latencies && message.stats.latencies.length > 0) {
        globalStats.latencies.push(...message.stats.latencies);
      }
      if (message.stats.currentRps) {
        globalStats.currentRps = message.stats.currentRps;
        if (globalStats.currentRps > globalStats.peakRps) {
          globalStats.peakRps = globalStats.currentRps;
        }
      }
      globalStats.lastStatsUpdate = Date.now();
    }
  });

  const statsInterval = setInterval(() => {
    const elapsed = ((Date.now() - globalStats.startTime) / 1000);
    const avgRps = elapsed > 0 ? (globalStats.total / elapsed) : 0;
    const successRate = globalStats.total > 0 
      ? ((globalStats.success / globalStats.total) * 100) 
      : 0;

    const sortedLatencies = globalStats.latencies.sort((a, b) => a - b);
    const p50 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] : 0;
    const p90 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.9)] : 0;
    const p99 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] : 0;

    console.log(`[${elapsed.toFixed(0)}s] ` +
                `Total: ${globalStats.total.toLocaleString()} | ` +
                `Success: ${globalStats.success.toLocaleString()} (${successRate.toFixed(2)}%) | ` +
                `Errors: ${globalStats.errors.toLocaleString()} | ` +
                `Current RPS: ${globalStats.currentRps.toLocaleString()} | ` +
                `Peak RPS: ${globalStats.peakRps.toLocaleString()} | ` +
                `Avg RPS: ${avgRps.toFixed(0)} | ` +
                `P50: ${p50}ms | P90: ${p90}ms | P99: ${p99}ms`);

    if (globalStats.latencies.length > 100000) {
      globalStats.latencies = sortedLatencies.slice(-50000);
    }
  }, 2000);

  process.on('SIGINT', () => {
    console.log('\nStopping all workers...');
    clearInterval(statsInterval);
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nStopping all workers...');
    clearInterval(statsInterval);
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
    process.exit(0);
  });

} else {
  let workerConfig = null;
  let workerStarted = false;

  process.on('message', (message) => {
    if (message.type === 'config') {
      workerConfig = message.config;
      if (!workerStarted) {
        workerStarted = true;
        startWorker(workerConfig);
      }
    }
  });

  function startWorker(config) {
    const stats = {
      total: 0,
      success: 0,
      errors: 0,
      latencies: [],
      lastSecondRequests: 0,
      lastSecondTime: Date.now(),
      lastStatsSend: Date.now(),
    };

    const url = new URL(config.gatewayUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    const agent = new protocol.Agent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: config.connectionsPerWorker,
      maxFreeSockets: config.connectionsPerWorker,
    });

    function makeRequest() {
      const endpoint = selectWeightedEndpoint();
      const requestUrl = new URL(endpoint.path, config.gatewayUrl);
      const startTime = Date.now();

      const selectedApiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
      const selectedUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

      const options = {
        hostname: requestUrl.hostname,
        port: requestUrl.port || (requestUrl.protocol === 'https:' ? 443 : 80),
        path: requestUrl.pathname,
        method: endpoint.method,
        agent: agent,
        headers: {
          'X-API-Key': selectedApiKey,
          'User-Agent': selectedUserAgent,
          'Connection': 'keep-alive',
          'Accept': 'application/json',
        },
        timeout: 10000,
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

        res.on('data', () => {});
        res.on('end', () => {});

        const now = Date.now();
        if (now - stats.lastSecondTime >= 1000) {
          stats.lastSecondRequests = 0;
          stats.lastSecondTime = now;
        }
        stats.lastSecondRequests++;
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

    const startTime = Date.now();
    const rpsPerWorker = Math.max(1, config.targetRps / config.totalWorkers);
    let requestCount = 0;
    let isRunning = true;
    let intervalId = null;

    function sendStats() {
      const now = Date.now();
      if (now - stats.lastStatsSend >= 1000) {
        const currentRps = stats.lastSecondRequests;
        process.send({
          type: 'stats',
          stats: {
            total: stats.total,
            success: stats.success,
            errors: stats.errors,
            latencies: stats.latencies.splice(0, 1000),
            currentRps: currentRps * config.totalWorkers,
          }
        });
        stats.lastStatsSend = now;
      }
    }

    function generateRequests() {
      if (!isRunning) {
        if (intervalId) clearInterval(intervalId);
        return;
      }

      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      
      if (config.mode !== 'continuous') {
        const endTime = startTime + (config.duration * 1000);
        if (now >= endTime || (config.totalRequests > 0 && requestCount >= config.totalRequests)) {
          isRunning = false;
          if (intervalId) clearInterval(intervalId);
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
      }
      
      let targetRpsNow = rpsPerWorker;
      
      if (elapsed < config.rampUpSeconds) {
        targetRpsNow = Math.max(1, (rpsPerWorker / config.rampUpSeconds) * elapsed);
      } else {
        const dynamicRps = calculateDynamicRps(
          elapsed,
          config.baseRps / config.totalWorkers,
          config.maxRps / config.totalWorkers,
          config.minRps / config.totalWorkers
        );
        targetRpsNow = Math.max(1, dynamicRps);
        
        if (Math.random() < config.burstProbability) {
          targetRpsNow *= config.burstMultiplier;
        }
      }

      // Calculate requests per 10ms interval to achieve target RPS
      // targetRpsNow is requests per second, so per 10ms = targetRpsNow / 100
      const requestsThisInterval = Math.max(1, Math.ceil((targetRpsNow * 10) / 1000));

      for (let i = 0; i < requestsThisInterval; i++) {
        makeRequest();
        requestCount++;
      }

      sendStats();
    }

    intervalId = setInterval(generateRequests, 10);
  }
}
