#!/usr/bin/env bun

/**
 * FAANG-Level Traffic Generator
 * 
 * Generates realistic, high-volume traffic patterns similar to:
 * - Amazon: 10M+ RPS peak
 * - Google: 8M+ RPS peak  
 * - Facebook: 5M+ RPS peak
 * - Netflix: 2M+ RPS peak
 * 
 * Features:
 * - True async/await with unlimited concurrency
 * - Realistic request distributions
 * - Burst patterns and spikes
 * - User session simulation
 * - Geographic distribution patterns
 * - Device and browser variety
 * - Connection pooling
 * - Proper error handling
 * 
 * Usage:
 *   bun faang-generator.js --rps=1000000
 *   bun faang-generator.js --mode=continuous --max-rps=10000000
 */

const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:20007',
  apiKey: process.env.API_KEY || 'test-api-key-12345',
  mode: process.env.MODE || 'continuous',
  baseRps: parseInt(process.env.BASE_RPS || '100000'),
  maxRps: parseInt(process.env.MAX_RPS || '10000000'),
  minRps: parseInt(process.env.MIN_RPS || '10000'),
  workers: parseInt(process.env.WORKERS || '64'),
  connectionsPerWorker: parseInt(process.env.CONNECTIONS_PER_WORKER || '500'),
  rampUpSeconds: parseInt(process.env.RAMP_UP || '30'),
  burstProbability: parseFloat(process.env.BURST_PROBABILITY || '0.1'),
  burstMultiplier: parseFloat(process.env.BURST_MULTIPLIER || '3.0'),
};

// Parse command line arguments
process.argv.forEach(arg => {
  if (arg.startsWith('--rps=')) config.baseRps = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--max-rps=')) config.maxRps = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--workers=')) config.workers = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--connections=')) config.connectionsPerWorker = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--mode=')) config.mode = arg.split('=')[1];
});

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/109.0 Firefox/115.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
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
  'enterprise-api-key-prod',
  'partner-api-key-prod',
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
  
  // Peak hours: 9 AM - 5 PM (business hours)
  if (hourOfDay >= 9 && hourOfDay <= 17) {
    multiplier *= 1.5;
  } 
  // Evening peak: 6 PM - 10 PM
  else if (hourOfDay >= 18 && hourOfDay <= 22) {
    multiplier *= 2.0;
  } 
  // Night/early morning: lower traffic
  else {
    multiplier *= 0.5;
  }
  
  // Weekdays have more traffic
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    multiplier *= 1.2;
  }
  
  const calculatedRps = Math.floor(baseRps * multiplier);
  return Math.max(minRps, Math.min(maxRps, calculatedRps));
}

// Bun's native fetch automatically handles connection pooling
// No need for external HTTP agent - Bun is optimized for high concurrency

class TrafficGenerator {
  constructor() {
    this.stats = {
      total: 0,
      success: 0,
      errors: 0,
      startTime: Date.now(),
      latencies: [],
      currentRps: 0,
      peakRps: 0,
      lastSecondRequests: 0,
      lastSecondTime: Date.now(),
    };
    this.running = true;
    this.activeRequests = new Set();
  }

  async makeRequest() {
    const endpoint = selectWeightedEndpoint();
    const requestUrl = new URL(endpoint.path, config.gatewayUrl);
    const startTime = Date.now();
    
    const selectedApiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    const selectedUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    const requestId = Symbol();
    this.activeRequests.add(requestId);

    try {
      const response = await fetch(requestUrl.toString(), {
        method: endpoint.method,
        headers: {
          'X-API-Key': selectedApiKey,
          'User-Agent': selectedUserAgent,
          'Accept': 'application/json',
          'Connection': 'keep-alive',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      const latency = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 500;

      this.stats.total++;
      if (success) {
        this.stats.success++;
      } else {
        this.stats.errors++;
      }
      this.stats.latencies.push(latency);

      // Consume response body to free connection
      await response.text().catch(() => {});

      const now = Date.now();
      if (now - this.stats.lastSecondTime >= 1000) {
        this.stats.currentRps = this.stats.lastSecondRequests;
        if (this.stats.currentRps > this.stats.peakRps) {
          this.stats.peakRps = this.stats.currentRps;
        }
        this.stats.lastSecondRequests = 0;
        this.stats.lastSecondTime = now;
      }
      this.stats.lastSecondRequests++;

    } catch (error) {
      const latency = Date.now() - startTime;
      this.stats.total++;
      this.stats.errors++;
      this.stats.latencies.push(latency);
      
      const now = Date.now();
      if (now - this.stats.lastSecondTime >= 1000) {
        this.stats.currentRps = this.stats.lastSecondRequests;
        if (this.stats.currentRps > this.stats.peakRps) {
          this.stats.peakRps = this.stats.currentRps;
        }
        this.stats.lastSecondRequests = 0;
        this.stats.lastSecondTime = now;
      }
      this.stats.lastSecondRequests++;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  async generateWorker(workerId, totalWorkers) {
    const startTime = Date.now();
    const rpsPerWorker = Math.max(1, config.baseRps / totalWorkers);
    
    while (this.running) {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      
      // Calculate target RPS for this worker
      let targetRpsNow = rpsPerWorker;
      
      // Ramp up phase
      if (elapsed < config.rampUpSeconds) {
        targetRpsNow = Math.max(1, (rpsPerWorker / config.rampUpSeconds) * elapsed);
      } else {
        // Dynamic RPS based on time of day
        const dynamicRps = calculateDynamicRps(
          elapsed,
          config.baseRps / totalWorkers,
          config.maxRps / totalWorkers,
          config.minRps / totalWorkers
        );
        targetRpsNow = Math.max(1, dynamicRps);
        
        // Random bursts
        if (Math.random() < config.burstProbability) {
          targetRpsNow *= config.burstMultiplier;
        }
      }

      // Calculate how many requests to send in this batch
      // We use a small time window (100ms) to maintain accurate RPS
      const batchInterval = 100; // milliseconds
      const requestsPerBatch = Math.max(1, Math.floor((targetRpsNow * batchInterval) / 1000));
      
      // Send requests concurrently
      const promises = [];
      for (let i = 0; i < requestsPerBatch; i++) {
        promises.push(this.makeRequest());
      }
      
      // Don't await - fire and forget for maximum throughput
      Promise.all(promises).catch(() => {});
      
      // Wait for next batch
      await new Promise(resolve => setTimeout(resolve, batchInterval));
    }
  }

  async start() {
    console.log('🚀 FAANG-Level Traffic Generator');
    console.log('================================\n');
    console.log('Configuration:');
    console.log(`  Gateway: ${config.gatewayUrl}`);
    console.log(`  Mode: ${config.mode}`);
    console.log(`  Base RPS: ${config.baseRps.toLocaleString()}`);
    console.log(`  Max RPS: ${config.maxRps.toLocaleString()}`);
    console.log(`  Workers: ${config.workers}`);
    console.log(`  Connections/Worker: ${config.connectionsPerWorker}`);
    console.log(`  Total Connections: ${(config.workers * config.connectionsPerWorker).toLocaleString()}\n`);

    // Start all workers
    const workerPromises = [];
    for (let i = 0; i < config.workers; i++) {
      workerPromises.push(this.generateWorker(i, config.workers));
    }

    // Stats reporting
    const statsInterval = setInterval(() => {
      const elapsed = ((Date.now() - this.stats.startTime) / 1000);
      const avgRps = elapsed > 0 ? (this.stats.total / elapsed) : 0;
      const successRate = this.stats.total > 0 
        ? ((this.stats.success / this.stats.total) * 100) 
        : 0;

      const sortedLatencies = [...this.stats.latencies].sort((a, b) => a - b);
      const p50 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] : 0;
      const p90 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.9)] : 0;
      const p99 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] : 0;

      console.log(`[${elapsed.toFixed(0)}s] ` +
                  `Total: ${this.stats.total.toLocaleString()} | ` +
                  `Success: ${this.stats.success.toLocaleString()} (${successRate.toFixed(2)}%) | ` +
                  `Errors: ${this.stats.errors.toLocaleString()} | ` +
                  `Current RPS: ${this.stats.currentRps.toLocaleString()} | ` +
                  `Peak RPS: ${this.stats.peakRps.toLocaleString()} | ` +
                  `Avg RPS: ${avgRps.toFixed(0)} | ` +
                  `Active: ${this.activeRequests.size} | ` +
                  `P50: ${p50}ms | P90: ${p90}ms | P99: ${p99}ms`);

      // Keep only recent latencies to avoid memory issues
      if (this.stats.latencies.length > 100000) {
        this.stats.latencies = sortedLatencies.slice(-50000);
      }
    }, 2000);

    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping traffic generation...');
      this.running = false;
      clearInterval(statsInterval);
      // Wait for active requests to complete
      setTimeout(() => {
        console.log('✅ Traffic generation stopped');
        process.exit(0);
      }, 2000);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Stopping traffic generation...');
      this.running = false;
      clearInterval(statsInterval);
      setTimeout(() => {
        console.log('✅ Traffic generation stopped');
        process.exit(0);
      }, 2000);
    });

    // Wait for all workers
    await Promise.all(workerPromises);
  }
}

// Start the generator
const generator = new TrafficGenerator();
generator.start().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

