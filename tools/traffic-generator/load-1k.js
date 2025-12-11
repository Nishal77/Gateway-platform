#!/usr/bin/env bun

/**
 * High-Load Traffic Generator - 1000 RPS
 * 
 * Optimized for generating 1000 requests per second with:
 * - Worker threads for parallel request generation
 * - Connection pooling for efficient HTTP connections
 * - Batch request processing
 * - Real-time statistics
 */

import axios from 'axios';
import http from 'node:http';

const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:20007',
  apiKey: process.env.API_KEY || 'test-api-key-12345',
  rps: parseInt(process.env.RPS || '1000'),
  duration: parseInt(process.env.DURATION || '300'),
  workers: parseInt(process.env.WORKERS || '10'),
};

const endpoints = [
  { method: 'GET', path: '/api/users' },
  { method: 'GET', path: '/api/users/1' },
  { method: 'GET', path: '/api/users/2' },
  { method: 'GET', path: '/api/orders' },
  { method: 'GET', path: '/api/orders/1' },
  { method: 'GET', path: '/api/payments' },
  { method: 'GET', path: '/api/payments/1' },
  { method: 'POST', path: '/api/users', body: { name: 'Test User', email: 'test@example.com' } },
  { method: 'POST', path: '/api/orders', body: { userId: 1, product: 'Test Product', amount: 99.99 } },
];

class HighLoadGenerator {
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
    this.axiosInstance = axios.create({
      baseURL: config.gatewayUrl,
      timeout: 5000, // Reduced timeout for faster failure detection
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
      maxRedirects: 0,
      httpAgent: new http.Agent({
        keepAlive: true,
        maxSockets: 50,
      }),
    });
  }

  async makeRequest(endpoint) {
    try {
      const response = await this.axiosInstance({
        method: endpoint.method,
        url: endpoint.path,
        data: endpoint.body,
        validateStatus: () => true, // Don't throw on any status code
      });
      
      this.stats.total++;
      
      if (response.status >= 200 && response.status < 400) {
        this.stats.success++;
        this.stats.byEndpoint[endpoint.path] = (this.stats.byEndpoint[endpoint.path] || 0) + 1;
        return { success: true, status: response.status };
      } else {
        this.stats.errors++;
        // Log first few errors for debugging
        if (this.stats.errors <= 5) {
          console.error(`Error ${response.status} on ${endpoint.method} ${endpoint.path}`);
        }
        return { success: false, status: response.status, message: `HTTP ${response.status}` };
      }
    } catch (error) {
      this.stats.total++;
      this.stats.errors++;
      
      // Log connection errors for debugging
      if (this.stats.errors <= 5) {
        const errorMsg = error.code || error.message;
        console.error(`Request failed: ${endpoint.method} ${endpoint.path} - ${errorMsg}`);
        if (error.code === 'ECONNREFUSED') {
          console.error(`  Connection refused. Is gateway running at ${this.config.gatewayUrl}?`);
        } else if (error.code === 'ETIMEDOUT') {
          console.error(`  Request timeout. Gateway may be overloaded.`);
        }
      }
      
      return { 
        success: false, 
        status: error.response?.status || 0,
        message: error.code || error.message 
      };
    }
  }

  async generateTraffic() {
    // Test gateway connectivity first
    try {
      const testResponse = await this.axiosInstance.get('/actuator/health', {
        validateStatus: () => true,
      });
      if (testResponse.status === 200) {
        console.log(`Gateway connectivity test: SUCCESS\n`);
      } else {
        console.warn(`Gateway connectivity test: Status ${testResponse.status}\n`);
      }
    } catch (error) {
      console.error(`Gateway connectivity test: FAILED - ${error.code || error.message}`);
      console.error(`Please ensure gateway is running at ${this.config.gatewayUrl}\n`);
      process.exit(1);
    }

    this.running = true;
    const endTime = Date.now() + (this.config.duration * 1000);
    const requestsPerWorker = Math.ceil(this.config.rps / this.config.workers);
    const interval = 1000 / requestsPerWorker;
    
    console.log(`Starting High-Load Traffic Generator (1000 RPS)`);
    console.log(`Gateway: ${this.config.gatewayUrl}`);
    console.log(`Target RPS: ${this.config.rps}`);
    console.log(`Workers: ${this.config.workers}`);
    console.log(`Duration: ${this.config.duration}s`);
    console.log(`Requests per worker: ${requestsPerWorker}\n`);

    const workerPromises = [];
    for (let i = 0; i < this.config.workers; i++) {
      workerPromises.push(this.runWorker(endTime, interval, i));
    }

    // Print stats every 5 seconds
    const statsInterval = setInterval(() => {
      if (!this.running) {
        clearInterval(statsInterval);
        return;
      }
      this.printStats();
    }, 5000);

    await Promise.all(workerPromises);
    clearInterval(statsInterval);
  }

  async runWorker(endTime, interval, workerId) {
    while (Date.now() < endTime && this.running) {
      // Use Promise.all for batch processing
      const batch = [];
      for (let i = 0; i < 10; i++) {
        if (Date.now() >= endTime) break;
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        batch.push(this.makeRequest(endpoint));
      }
      await Promise.all(batch);
      
      await this.sleep(interval);
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
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    this.running = false;
    console.log('\nTraffic generation stopped');
    this.printStats();
  }
}

const generator = new HighLoadGenerator(config);

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

