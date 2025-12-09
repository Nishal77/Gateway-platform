#!/usr/bin/env bun

import axios from 'axios';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration
const configPath = join(__dirname, 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

const {
  gatewayUrl = 'http://localhost:20007',
  rps = 10,
  duration = 60,
  endpoints = [],
  apiKey = 'test-api-key-12345',
  burstMode = false,
  burstSize = 50,
} = config;

class TrafficGenerator {
  constructor(options) {
    this.gatewayUrl = options.gatewayUrl;
    this.rps = options.rps;
    this.duration = options.duration;
    this.endpoints = options.endpoints;
    this.apiKey = options.apiKey;
    this.burstMode = options.burstMode;
    this.burstSize = options.burstSize;
    
    this.stats = {
      total: 0,
      success: 0,
      errors: 0,
      startTime: Date.now(),
    };
    
    this.running = false;
  }

  async makeRequest(endpoint) {
    const url = `${this.gatewayUrl}${endpoint.path}`;
    const method = endpoint.method || 'GET';
    
    try {
      const response = await axios({
        method,
        url,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        data: endpoint.body || {},
        timeout: 5000,
      });
      
      this.stats.success++;
      return { success: true, status: response.status };
    } catch (error) {
      this.stats.errors++;
      return { 
        success: false, 
        status: error.response?.status || 0,
        message: error.message 
      };
    } finally {
      this.stats.total++;
    }
  }

  async generateTraffic() {
    this.running = true;
    const interval = 1000 / this.rps; // milliseconds between requests
    const endTime = Date.now() + (this.duration * 1000);
    
    console.log(`🚀 Starting traffic generation:`);
    console.log(`   Gateway: ${this.gatewayUrl}`);
    console.log(`   RPS: ${this.rps}`);
    console.log(`   Duration: ${this.duration}s`);
    console.log(`   Endpoints: ${this.endpoints.length}`);
    console.log(`   Burst Mode: ${this.burstMode ? `Yes (${this.burstSize} requests)` : 'No'}\n`);

    if (this.burstMode) {
      await this.generateBursts(endTime);
    } else {
      await this.generateSteady(endTime, interval);
    }
  }

  async generateSteady(endTime, interval) {
    while (Date.now() < endTime && this.running) {
      const endpoint = this.getRandomEndpoint();
      await this.makeRequest(endpoint);
      
      // Print stats every 10 seconds
      if (this.stats.total % (this.rps * 10) === 0) {
        this.printStats();
      }
      
      await this.sleep(interval);
    }
  }

  async generateBursts(endTime) {
    const burstInterval = 5000; // 5 seconds between bursts
    
    while (Date.now() < endTime && this.running) {
      console.log(`💥 Generating burst of ${this.burstSize} requests...`);
      
      const promises = [];
      for (let i = 0; i < this.burstSize; i++) {
        const endpoint = this.getRandomEndpoint();
        promises.push(this.makeRequest(endpoint));
      }
      
      await Promise.all(promises);
      this.printStats();
      
      await this.sleep(burstInterval);
    }
  }

  getRandomEndpoint() {
    const index = Math.floor(Math.random() * this.endpoints.length);
    return this.endpoints[index];
  }

  printStats() {
    const elapsed = ((Date.now() - this.stats.startTime) / 1000).toFixed(1);
    const currentRps = (this.stats.total / elapsed).toFixed(2);
    const successRate = ((this.stats.success / this.stats.total) * 100).toFixed(1);
    
    console.log(`📊 Stats [${elapsed}s]: Total=${this.stats.total}, ` +
                `Success=${this.stats.success}, Errors=${this.stats.errors}, ` +
                `RPS=${currentRps}, Success Rate=${successRate}%`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    this.running = false;
    console.log('\n🛑 Traffic generation stopped');
    this.printStats();
  }
}

// Handle graceful shutdown
const generator = new TrafficGenerator({
  gatewayUrl,
  rps,
  duration,
  endpoints,
  apiKey,
  burstMode,
  burstSize,
});

process.on('SIGINT', () => {
  generator.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  generator.stop();
  process.exit(0);
});

// Start generation
generator.generateTraffic().then(() => {
  generator.stop();
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

