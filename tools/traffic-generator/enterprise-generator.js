#!/usr/bin/env node

/**
 * Enterprise FAANG-Level Traffic Generator
 * 
 * Standalone script - NOT Docker-bound
 * Can generate millions of requests with high throughput
 * 
 * Usage:
 *   node enterprise-generator.js
 *   GATEWAY_URL=http://localhost:18080 RPS=1000 DURATION=3600 node enterprise-generator.js
 *   node enterprise-generator.js --mode=massive --requests=1000000
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

// Configuration from environment or defaults
const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:20007',
  apiKey: process.env.API_KEY || 'test-api-key-12345',
  mode: process.env.MODE || 'enterprise', // enterprise, massive, demo
  rps: parseInt(process.env.RPS || '100'),
  duration: parseInt(process.env.DURATION || '300'),
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS || '50'),
  totalRequests: parseInt(process.env.TOTAL_REQUESTS || '0'), // 0 = unlimited
  workers: parseInt(process.env.WORKERS || '10'), // Number of worker threads
};

// Parse command line arguments
process.argv.forEach(arg => {
  if (arg.startsWith('--mode=')) config.mode = arg.split('=')[1];
  if (arg.startsWith('--requests=')) config.totalRequests = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--rps=')) config.rps = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--duration=')) config.duration = parseInt(arg.split('=')[1]);
});

// Test data generators
const faker = {
  names: Array.from({ length: 100 }, (_, i) => `User${i + 1}`),
  emails: Array.from({ length: 100 }, (_, i) => `user${i + 1}@example.com`),
  products: [
    'Laptop Pro', 'Wireless Mouse', 'Mechanical Keyboard', 'Monitor 27"', 'USB-C Hub',
    'Webcam HD', 'Microphone', 'Headphones', 'Tablet', 'Smartphone',
    'Smart Watch', 'Fitness Tracker', 'Bluetooth Speaker', 'Power Bank', 'Cable Set',
    'SSD 1TB', 'RAM 16GB', 'Graphics Card', 'Motherboard', 'CPU Cooler'
  ],
  
  randomName() {
    return this.names[Math.floor(Math.random() * this.names.length)];
  },
  
  randomEmail() {
    return this.emails[Math.floor(Math.random() * this.emails.length)];
  },
  
  randomProduct() {
    return this.products[Math.floor(Math.random() * this.products.length)];
  },
  
  randomAmount() {
    return (Math.random() * 500 + 10).toFixed(2);
  },
  
  randomUserId() {
    return Math.floor(Math.random() * 1000) + 1;
  }
};

// Statistics tracking
const stats = {
  total: 0,
  success: 0,
  errors: 0,
  byEndpoint: {},
  byMethod: {},
  startTime: Date.now(),
  userJourneys: 0,
  completedJourneys: 0,
  latency: {
    sum: 0,
    min: Infinity,
    max: 0,
    p50: [],
    p90: [],
    p99: []
  }
};

// HTTP request helper
function makeRequest(method, path, data = null) {
  return new Promise((resolve) => {
    const url = new URL(path, config.gatewayUrl);
    const startTime = Date.now();
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'EnterpriseTrafficGenerator/1.0',
      },
      timeout: 10000,
    };

    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        const latency = Date.now() - startTime;
        // Accept 200-499 as success (404 is valid for non-existent resources)
        const success = res.statusCode >= 200 && res.statusCode < 500;
        
        updateStats(path, method, success, latency, res.statusCode);
        
        let parsedData = null;
        try {
          if (responseData) {
            parsedData = JSON.parse(responseData);
          }
        } catch (e) {
          // Not JSON, ignore
        }
        
        resolve({ success, status: res.statusCode, data: parsedData, latency });
      });
    });

    req.on('error', (error) => {
      const latency = Date.now() - startTime;
      updateStats(path, method, false, latency, 0);
      resolve({ success: false, status: 0, error: error.message, latency });
    });

    req.on('timeout', () => {
      req.destroy();
      const latency = Date.now() - startTime;
      updateStats(path, method, false, latency, 0);
      resolve({ success: false, status: 0, error: 'Timeout', latency });
    });

    if (data) {
      const body = JSON.stringify(data);
      req.write(body);
    }
    
    req.end();
  });
}

function updateStats(path, method, success, latency, statusCode) {
  stats.total++;
  
  if (success) {
    stats.success++;
  } else {
    stats.errors++;
  }

  // Track by endpoint
  if (!stats.byEndpoint[path]) {
    stats.byEndpoint[path] = { total: 0, success: 0, errors: 0, latencies: [] };
  }
  stats.byEndpoint[path].total++;
  if (success) {
    stats.byEndpoint[path].success++;
  } else {
    stats.byEndpoint[path].errors++;
  }
  stats.byEndpoint[path].latencies.push(latency);

  // Track by method
  if (!stats.byMethod[method]) {
    stats.byMethod[method] = { total: 0, success: 0, errors: 0 };
  }
  stats.byMethod[method].total++;
  if (success) {
    stats.byMethod[method].success++;
  } else {
    stats.byMethod[method].errors++;
  }

  // Track latency
  stats.latency.sum += latency;
  stats.latency.min = Math.min(stats.latency.min, latency);
  stats.latency.max = Math.max(stats.latency.max, latency);
  
  // Keep samples for percentile calculation
  if (stats.latency.p50.length < 1000) {
    stats.latency.p50.push(latency);
  } else if (Math.random() < 0.1) {
    stats.latency.p50[Math.floor(Math.random() * 1000)] = latency;
  }
}

// User journey simulation
async function simulateUserJourney(userId) {
  stats.userJourneys++;
  const journeyStart = Date.now();
  
  try {
    // Step 1: Create or get user
    let user;
    if (Math.random() < 0.3) {
      // Create new user
      const userData = {
        name: faker.randomName(),
        email: faker.randomEmail(),
      };
      const result = await makeRequest('POST', '/api/users', userData);
      if (result.success && result.data) {
        user = result.data;
      } else {
        return false;
      }
    } else {
      // Get existing user
      const result = await makeRequest('GET', `/api/users/${faker.randomUserId()}`);
      if (result.success && result.data) {
        user = result.data;
      } else {
        return false;
      }
    }

    // Step 2: Create order
    const orderData = {
      userId: user.id || faker.randomUserId(),
      product: faker.randomProduct(),
      amount: parseFloat(faker.randomAmount()),
      status: 'PENDING',
    };
    const orderResult = await makeRequest('POST', '/api/orders', orderData);
    if (!orderResult.success || !orderResult.data) {
      return false;
    }
    const order = orderResult.data;

    // Step 3: Process payment
    const paymentData = {
      orderId: order.id,
      amount: order.amount,
      status: 'PENDING',
    };
    await makeRequest('POST', '/api/payments', paymentData);
    
    stats.completedJourneys++;
    return true;
  } catch (error) {
    return false;
  }
}

// Random endpoint request
async function executeRandomRequest() {
  const endpoints = [
    { method: 'GET', path: '/api/users' },
    { method: 'GET', path: `/api/users/${faker.randomUserId()}` },
    { method: 'GET', path: '/api/orders' },
    { method: 'GET', path: '/api/orders/1' },
    { method: 'GET', path: '/api/payments' },
    { method: 'GET', path: '/api/payments/1' },
    { method: 'POST', path: '/api/users', data: { name: faker.randomName(), email: faker.randomEmail() } },
    { method: 'POST', path: '/api/orders', data: { userId: faker.randomUserId(), product: faker.randomProduct(), amount: parseFloat(faker.randomAmount()), status: 'PENDING' } },
    { method: 'POST', path: '/api/payments', data: { orderId: 1, amount: parseFloat(faker.randomAmount()), status: 'PENDING' } },
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  return await makeRequest(endpoint.method, endpoint.path, endpoint.data);
}

// Enterprise mode - high throughput with user journeys
async function generateEnterprise() {
  console.log(`🚀 ENTERPRISE MODE`);
  console.log(`   Gateway: ${config.gatewayUrl}`);
  console.log(`   Target RPS: ${config.rps}`);
  console.log(`   Duration: ${config.duration}s`);
  console.log(`   Concurrent Users: ${config.concurrentUsers}`);
  console.log(`   Workers: ${config.workers}\n`);

  const endTime = Date.now() + (config.duration * 1000);
  const interval = 1000 / config.rps;
  
  // Start concurrent user journey workers
  const userJourneyPromises = [];
  for (let i = 0; i < config.concurrentUsers; i++) {
    userJourneyPromises.push(runUserJourneyLoop(endTime, i + 1));
  }

  // Start request workers
  const requestPromises = [];
  for (let w = 0; w < config.workers; w++) {
    requestPromises.push(runRequestWorker(endTime, interval, w));
  }

  // Print stats periodically
  const statsInterval = setInterval(() => {
    printStats();
  }, 5000);

  await Promise.all([...userJourneyPromises, ...requestPromises]);
  clearInterval(statsInterval);
}

// Massive mode - millions of requests
async function generateMassive() {
  console.log(`🔥 MASSIVE MODE - Generating ${config.totalRequests.toLocaleString()} requests`);
  console.log(`   Gateway: ${config.gatewayUrl}`);
  console.log(`   Workers: ${config.workers}\n`);

  const requestsPerWorker = Math.ceil(config.totalRequests / config.workers);
  const promises = [];

  for (let w = 0; w < config.workers; w++) {
    promises.push(runMassiveWorker(requestsPerWorker, w));
  }

  // Print stats every second for massive mode
  const statsInterval = setInterval(() => {
    printStats();
    if (stats.total >= config.totalRequests) {
      clearInterval(statsInterval);
    }
  }, 1000);

  await Promise.all(promises);
  clearInterval(statsInterval);
}

async function runUserJourneyLoop(endTime, userId) {
  while (Date.now() < endTime) {
    await simulateUserJourney(userId);
    // Random delay between journeys
    await sleep(1000 + Math.random() * 2000);
  }
}

async function runRequestWorker(endTime, interval, workerId) {
  while (Date.now() < endTime) {
    // 70% user journeys, 30% random requests
    if (Math.random() < 0.7) {
      // User journey handled by separate loops
    } else {
      await executeRandomRequest();
    }
    await sleep(interval);
  }
}

async function runMassiveWorker(requests, workerId) {
  for (let i = 0; i < requests && stats.total < config.totalRequests; i++) {
    if (Math.random() < 0.3) {
      await simulateUserJourney(workerId * 1000 + i);
    } else {
      await executeRandomRequest();
    }
    
    // Small delay to prevent overwhelming
    if (i % 100 === 0) {
      await sleep(1);
    }
  }
}

function printStats() {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const currentRps = (stats.total / elapsed).toFixed(2);
  const successRate = stats.total > 0 
    ? ((stats.success / stats.total) * 100).toFixed(2) 
    : '0.00';
  const avgLatency = stats.total > 0 
    ? (stats.latency.sum / stats.total).toFixed(0) 
    : '0';

  // Calculate percentiles
  const latencies = Object.values(stats.byEndpoint)
    .flatMap(e => e.latencies)
    .sort((a, b) => a - b);
  
  const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p90 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.9)] : 0;
  const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;

  console.log(`\n📊 [${elapsed}s] Total: ${stats.total.toLocaleString()} | ` +
              `Success: ${stats.success.toLocaleString()} (${successRate}%) | ` +
              `Errors: ${stats.errors.toLocaleString()} | ` +
              `RPS: ${currentRps} | ` +
              `Avg Latency: ${avgLatency}ms | ` +
              `P50: ${p50}ms | P90: ${p90}ms | P99: ${p99}ms`);
  console.log(`   User Journeys: ${stats.userJourneys.toLocaleString()} | ` +
              `Completed: ${stats.completedJourneys.toLocaleString()}`);

  // Top 3 endpoints
  const topEndpoints = Object.entries(stats.byEndpoint)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3);
  
  if (topEndpoints.length > 0) {
    console.log(`   Top Endpoints:`);
    topEndpoints.forEach(([path, data]) => {
      const rate = data.total > 0 ? ((data.success / data.total) * 100).toFixed(1) : '0.0';
      const avgLat = data.latencies.length > 0 
        ? (data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length).toFixed(0)
        : '0';
      console.log(`     ${path}: ${data.total.toLocaleString()} req (${rate}% success, ${avgLat}ms avg)`);
    });
  }
}

function printFinalStats() {
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('🛑 FINAL STATISTICS');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const avgRps = (stats.total / elapsed).toFixed(2);
  const successRate = stats.total > 0 
    ? ((stats.success / stats.total) * 100).toFixed(2) 
    : '0.00';
  const avgLatency = stats.total > 0 
    ? (stats.latency.sum / stats.total).toFixed(0) 
    : '0';

  const latencies = Object.values(stats.byEndpoint)
    .flatMap(e => e.latencies)
    .sort((a, b) => a - b);
  
  const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p90 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.9)] : 0;
  const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;

  console.log(`Total Requests: ${stats.total.toLocaleString()}`);
  console.log(`Successful: ${stats.success.toLocaleString()} (${successRate}%)`);
  console.log(`Errors: ${stats.errors.toLocaleString()}`);
  console.log(`Average RPS: ${avgRps}`);
  console.log(`Duration: ${elapsed}s`);
  console.log(`\nLatency:`);
  console.log(`  Average: ${avgLatency}ms`);
  console.log(`  Min: ${stats.latency.min === Infinity ? 0 : stats.latency.min}ms`);
  console.log(`  Max: ${stats.latency.max}ms`);
  console.log(`  P50: ${p50}ms`);
  console.log(`  P90: ${p90}ms`);
  console.log(`  P99: ${p99}ms`);
  console.log(`\nUser Journeys:`);
  console.log(`  Started: ${stats.userJourneys.toLocaleString()}`);
  console.log(`  Completed: ${stats.completedJourneys.toLocaleString()}`);
  console.log(`  Success Rate: ${stats.userJourneys > 0 ? ((stats.completedJourneys / stats.userJourneys) * 100).toFixed(2) : 0}%`);
  
  console.log(`\nBy Method:`);
  Object.entries(stats.byMethod).forEach(([method, data]) => {
    const rate = data.total > 0 ? ((data.success / data.total) * 100).toFixed(1) : '0.0';
    console.log(`  ${method}: ${data.total.toLocaleString()} (${rate}% success)`);
  });
  
  console.log(`\nBy Endpoint:`);
  Object.entries(stats.byEndpoint)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([path, data]) => {
      const rate = data.total > 0 ? ((data.success / data.total) * 100).toFixed(1) : '0.0';
      const avgLat = data.latencies.length > 0 
        ? (data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length).toFixed(0)
        : '0';
      console.log(`  ${path}: ${data.total.toLocaleString()} req | ${rate}% success | ${avgLat}ms avg`);
    });
  
  console.log('\n═══════════════════════════════════════════════════════\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
async function main() {
  console.log('🚀 Enterprise FAANG-Level Traffic Generator');
  console.log('═══════════════════════════════════════════════════════\n');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Received SIGINT, stopping gracefully...');
    printFinalStats();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n⚠️  Received SIGTERM, stopping gracefully...');
    printFinalStats();
    process.exit(0);
  });

  try {
    if (config.mode === 'massive' && config.totalRequests > 0) {
      await generateMassive();
    } else if (config.mode === 'demo') {
      // Demo mode - optimized for presentations
      config.rps = config.rps || 25;
      config.duration = config.duration || 200;
      config.concurrentUsers = config.concurrentUsers || 15;
      config.workers = config.workers || 5;
      await generateEnterprise();
    } else {
      await generateEnterprise();
    }
  } catch (error) {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
  } finally {
    printFinalStats();
  }
}

// Run
main();

