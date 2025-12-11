#!/usr/bin/env bun

/**
 * High-Load Traffic Generator - 10,000 RPS
 * 
 * Optimized for generating 10,000 requests per second with:
 * - Multiple worker threads for parallel processing
 * - Connection pooling and keep-alive
 * - Batch request processing
 * - Optimized HTTP client configuration
 */

import axios from 'axios';
import http from 'http';
import https from 'https';

const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:20007',
  apiKey: process.env.API_KEY || 'test-api-key-12345',
  rps: parseInt(process.env.RPS || '10000'),
  duration: parseInt(process.env.DURATION || '300'),
  workers: parseInt(process.env.WORKERS || '50'),
  connectionsPerWorker: parseInt(process.env.CONNECTIONS_PER_WORKER || '20'),
};

const endpoints = [
  { method: 'GET', path: '/api/users' },
  { method: 'GET', path: '/api/users/1' },
  { method: 'GET', path: '/api/users/2' },
  { method: 'GET', path: '/api/users/3' },
  { method: 'GET', path: '/api/orders' },
  { method: 'GET', path: '/api/orders/1' },
  { method: 'GET', path: '/api/payments' },
  { method: 'GET', path: '/api/payments/1' },
  { method: 'POST', path: '/api/users', body: { name: 'Test User', email: 'test@example.com' } },
  { method: 'POST', path: '/api/orders', body: { userId: 1, product: 'Test Product', amount: 99.99 } },
];

// Create HTTP agent with connection pooling
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 200,
  maxFreeSockets: 50,
  timeout: 10000,
});

class HighLoadGenerator10K {
  constructor(config) {
    this.config = config;
    this.stats = {
      total: 0,
      success: 0,
      errors: 0,
      startTime: Date.now(),
      byEndpoint: {},
    };
    this.running = false;
    
    // Create axios instance with connection pooling
    this.axiosInstance = axios.create({
      baseURL: config.gatewayUrl,
      timeout: 10000,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
      },
      httpAgent: httpAgent,
      maxRedirects: 0,
      validateStatus: () => true, // Don't throw on any status
    });
  }

  async makeRequest(endpoint) {
    try {
      const response = await this.axiosInstance({
        method: endpoint.method,
        url: endpoint.path,
        data: endpoint.body,
        validateStatus: () => true,
      });
      
      this.stats.total++;
      
      if (response.status >= 200 && response.status < 400) {
        this.stats.success++;
        this.stats.byEndpoint[endpoint.path] = (this.stats.byEndpoint[endpoint.path] || 0) + 1;
      } else {
        this.stats.errors++;
      }
    } catch (error) {
      this.stats.total++;
      this.stats.errors++;
      
      if (this.stats.errors <= 3 && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
        console.error(`Connection error: ${error.code} - ${error.message}`);
      }
    }
  }

  async generateTraffic() {
    this.running = true;
    const endTime = Date.now() + (this.config.duration * 1000);
    const requestsPerWorker = Math.ceil(this.config.rps / this.config.workers);
    const batchSize = 10;
    
    console.log(`Starting High-Load Traffic Generator (10,000 RPS)`);
    console.log(`Gateway: ${this.config.gatewayUrl}`);
    console.log(`Target RPS: ${this.config.rps}`);
    console.log(`Workers: ${this.config.workers}`);
    console.log(`Connections per worker: ${this.config.connectionsPerWorker}`);
    console.log(`Duration: ${this.config.duration}s\n`);

    const workerPromises = [];
    for (let i = 0; i < this.config.workers; i++) {
      workerPromises.push(this.runWorker(endTime, requestsPerWorker, batchSize, i));
    }

    // Print stats every 3 seconds
    const statsInterval = setInterval(() => {
      if (!this.running) {
        clearInterval(statsInterval);
        return;
      }
      this.printStats();
    }, 3000);

    await Promise.all(workerPromises);
    clearInterval(statsInterval);
  }

  async runWorker(endTime, requestsPerWorker, batchSize, workerId) {
    const interval = 1000 / requestsPerWorker;
    
    while (Date.now() < endTime && this.running) {
      const batch = [];
      for (let i = 0; i < batchSize; i++) {
        if (Date.now() >= endTime) break;
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        batch.push(this.makeRequest(endpoint));
      }
      
      // Fire all requests in parallel
      await Promise.all(batch);
      
      // Small delay to maintain RPS
      if (interval > 0) {
        await this.sleep(interval);
      }
    }
  }

  printStats() {
    const elapsed = ((Date.now() - this.stats.startTime) / 1000).toFixed(1);
    const currentRps = (this.stats.total / elapsed).toFixed(2);
    const successRate = this.stats.total > 0 
      ? ((this.stats.success / this.stats.total) * 100).toFixed(1) 
      : '0.0';
    
    console.log(`Stats [${elapsed}s]: Total=${this.stats.total}, ` +
                `Success=${this.stats.success}, Errors=${this.stats.errors}, ` +
                `RPS=${currentRps}, Success Rate=${successRate}%`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
  }

  stop() {
    this.running = false;
    console.log('\nTraffic generation stopped');
    this.printStats();
    httpAgent.destroy();
  }
}

const generator = new HighLoadGenerator10K(config);

process.on('SIGINT', () => {
  generator.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  generator.stop();
  process.exit(0);
});

generator.generateTraffic().then(() => {
  generator.stop();
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

