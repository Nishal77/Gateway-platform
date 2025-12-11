#!/usr/bin/env bun

/**
 * Extreme High-Load Traffic Generator - 100,000 RPS
 * 
 * Optimized for generating 100,000+ requests per second with:
 * - Maximum worker threads
 * - Aggressive connection pooling
 * - Zero-copy optimizations
 * - Batch processing with minimal overhead
 * - Native HTTP module for maximum performance
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:20007',
  apiKey: process.env.API_KEY || 'test-api-key-12345',
  rps: parseInt(process.env.RPS || '100000'),
  duration: parseInt(process.env.DURATION || '300'),
  workers: parseInt(process.env.WORKERS || '100'),
  connectionsPerWorker: parseInt(process.env.CONNECTIONS_PER_WORKER || '50'),
};

const endpoints = [
  '/api/users',
  '/api/users/1',
  '/api/users/2',
  '/api/users/3',
  '/api/orders',
  '/api/orders/1',
  '/api/payments',
  '/api/payments/1',
];

// Create HTTP agent with maximum connection pooling
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 1000,
  maxFreeSockets: 200,
  timeout: 10000,
  scheduling: 'fifo',
});

class ExtremeLoadGenerator {
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
    this.url = new URL(config.gatewayUrl);
  }

  makeRequest(endpoint) {
    return new Promise((resolve) => {
      const path = endpoint;
      const options = {
        hostname: this.url.hostname,
        port: this.url.port || (this.url.protocol === 'https:' ? 443 : 80),
        path: path,
        method: 'GET',
        agent: httpAgent,
        headers: {
          'X-API-Key': this.config.apiKey,
          'Connection': 'keep-alive',
        },
        timeout: 5000,
      };

      const startTime = Date.now();
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', () => {}); // Consume data but don't store
        res.on('end', () => {
          this.stats.total++;
          if (res.statusCode >= 200 && res.statusCode < 400) {
            this.stats.success++;
            this.stats.byEndpoint[endpoint] = (this.stats.byEndpoint[endpoint] || 0) + 1;
          } else {
            this.stats.errors++;
          }
          resolve();
        });
      });

      req.on('error', (error) => {
        this.stats.total++;
        this.stats.errors++;
        if (this.stats.errors <= 3) {
          console.error(`Request error: ${error.code || error.message}`);
        }
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        this.stats.total++;
        this.stats.errors++;
        resolve();
      });

      req.end();
    });
  }

  async generateTraffic() {
    this.running = true;
    const endTime = Date.now() + (this.config.duration * 1000);
    const requestsPerWorker = Math.ceil(this.config.rps / this.config.workers);
    const batchSize = 20;
    
    console.log(`Starting Extreme High-Load Traffic Generator (100,000 RPS)`);
    console.log(`Gateway: ${this.config.gatewayUrl}`);
    console.log(`Target RPS: ${this.config.rps}`);
    console.log(`Workers: ${this.config.workers}`);
    console.log(`Connections per worker: ${this.config.connectionsPerWorker}`);
    console.log(`Duration: ${this.config.duration}s`);
    console.log(`Requests per worker: ${requestsPerWorker}\n`);

    const workerPromises = [];
    for (let i = 0; i < this.config.workers; i++) {
      workerPromises.push(this.runWorker(endTime, requestsPerWorker, batchSize, i));
    }

    // Print stats every 2 seconds
    const statsInterval = setInterval(() => {
      if (!this.running) {
        clearInterval(statsInterval);
        return;
      }
      this.printStats();
    }, 2000);

    await Promise.all(workerPromises);
    clearInterval(statsInterval);
  }

  async runWorker(endTime, requestsPerWorker, batchSize, workerId) {
    const interval = 1000 / requestsPerWorker;
    
    while (Date.now() < endTime && this.running) {
      // Fire batches of requests in parallel
      const batches = [];
      for (let b = 0; b < 5; b++) {
        const batch = [];
        for (let i = 0; i < batchSize; i++) {
          if (Date.now() >= endTime) break;
          const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
          batch.push(this.makeRequest(endpoint));
        }
        batches.push(Promise.all(batch));
      }
      
      await Promise.all(batches);
      
      // Minimal delay to maintain RPS
      if (interval > 0) {
        await this.sleep(Math.max(0, interval));
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
    return new Promise(resolve => {
      if (ms <= 0) {
        setImmediate(resolve);
      } else {
        setTimeout(resolve, Math.max(0, ms));
      }
    });
  }

  stop() {
    this.running = false;
    console.log('\nTraffic generation stopped');
    this.printStats();
    httpAgent.destroy();
  }
}

const generator = new ExtremeLoadGenerator(config);

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

