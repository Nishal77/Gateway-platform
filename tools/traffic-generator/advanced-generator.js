#!/usr/bin/env bun

/**
 * FAANG-Level Advanced Traffic Generator
 * 
 * Features:
 * - Realistic user journey simulation (user -> order -> payment)
 * - Multiple load patterns (steady, ramp-up, spike, realistic)
 * - Comprehensive endpoint coverage
 * - Real data generation with faker-like data
 * - Statistics and reporting
 * - Interview-ready demo scenarios
 */

import axios from 'axios';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:20007',
  apiKey: process.env.API_KEY || 'test-api-key-12345',
  mode: process.env.MODE || 'realistic', // steady, ramp-up, spike, realistic, demo
  rps: parseInt(process.env.RPS || '20'),
  duration: parseInt(process.env.DURATION || '300'), // 5 minutes default
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS || '10'),
};

// Realistic data generators
const faker = {
  names: [
    'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Eve Wilson',
    'Frank Miller', 'Grace Lee', 'Henry Davis', 'Ivy Chen', 'Jack Taylor',
    'Kate Williams', 'Liam O\'Brien', 'Mia Rodriguez', 'Noah Anderson', 'Olivia Martinez',
    'Paul Thompson', 'Quinn Parker', 'Rachel Green', 'Sam Wilson', 'Tina Turner'
  ],
  emails: [
    'alice.j@example.com', 'bob.smith@example.com', 'charlie.b@example.com',
    'diana.p@example.com', 'eve.w@example.com', 'frank.m@example.com',
    'grace.l@example.com', 'henry.d@example.com', 'ivy.c@example.com', 'jack.t@example.com'
  ],
  products: [
    'Laptop Pro', 'Wireless Mouse', 'Mechanical Keyboard', 'Monitor 27"', 'USB-C Hub',
    'Webcam HD', 'Microphone', 'Headphones', 'Tablet', 'Smartphone',
    'Smart Watch', 'Fitness Tracker', 'Bluetooth Speaker', 'Power Bank', 'Cable Set'
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
    return Math.floor(Math.random() * 20) + 1;
  }
};

class AdvancedTrafficGenerator {
  constructor(config) {
    this.config = config;
    this.stats = {
      total: 0,
      success: 0,
      errors: 0,
      byEndpoint: {},
      byMethod: {},
      startTime: Date.now(),
      userJourneys: 0,
      completedJourneys: 0,
    };
    this.running = false;
    this.createdUsers = new Set();
    this.createdOrders = new Set();
    this.activeUsers = [];
  }

  // Realistic user journey: Create User -> Create Order -> Process Payment
  async simulateUserJourney(userId) {
    try {
      // Step 1: Get or create user
      let user;
      if (this.createdUsers.has(userId)) {
        const response = await this.makeRequest('GET', `/api/users/${userId}`);
        if (response.success && response.data) {
          user = response.data;
        }
      }
      
      if (!user) {
        const userData = {
          name: faker.randomName(),
          email: `user${userId}@example.com`,
        };
        const response = await this.makeRequest('POST', '/api/users', userData);
        if (response.success && response.data) {
          user = response.data;
          this.createdUsers.add(user.id);
        } else {
          return; // Skip if user creation failed
        }
      }

      // Step 2: Create order
      const orderData = {
        userId: user.id,
        product: faker.randomProduct(),
        amount: parseFloat(faker.randomAmount()),
        status: 'PENDING',
      };
      const orderResponse = await this.makeRequest('POST', '/api/orders', orderData);
      if (!orderResponse.success || !orderResponse.data) {
        return; // Skip if order creation failed
      }
      const order = orderResponse.data;
      this.createdOrders.add(order.id);

      // Step 3: Process payment
      const paymentData = {
        orderId: order.id,
        amount: order.amount,
        status: 'PENDING',
      };
      await this.makeRequest('POST', '/api/payments', paymentData);
      
      this.stats.completedJourneys++;
    } catch (error) {
      console.error(`Error in user journey ${userId}:`, error.message);
    }
  }

  // Make HTTP request with proper error handling
  async makeRequest(method, path, data = null) {
    const url = `${this.config.gatewayUrl}${path}`;
    const startTime = Date.now();
    
    // Track endpoint stats
    if (!this.stats.byEndpoint[path]) {
      this.stats.byEndpoint[path] = { total: 0, success: 0, errors: 0, avgLatency: 0 };
    }
    if (!this.stats.byMethod[method]) {
      this.stats.byMethod[method] = { total: 0, success: 0, errors: 0 };
    }

    try {
      const response = await axios({
        method,
        url,
        headers: {
          'X-API-Key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        data,
        timeout: 10000,
        validateStatus: () => true, // Don't throw on any status
      });

      const latency = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 400;

      this.stats.total++;
      if (success) {
        this.stats.success++;
        this.stats.byEndpoint[path].success++;
        this.stats.byMethod[method].success++;
      } else {
        this.stats.errors++;
        this.stats.byEndpoint[path].errors++;
        this.stats.byMethod[method].errors++;
      }
      
      this.stats.byEndpoint[path].total++;
      this.stats.byMethod[method].total++;
      
      // Update average latency
      const ep = this.stats.byEndpoint[path];
      ep.avgLatency = ((ep.avgLatency * (ep.total - 1)) + latency) / ep.total;

      return { success, status: response.status, data: response.data, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.stats.total++;
      this.stats.errors++;
      this.stats.byEndpoint[path].errors++;
      this.stats.byMethod[method].errors++;
      this.stats.byEndpoint[path].total++;
      this.stats.byMethod[method].total++;

      return {
        success: false,
        status: error.response?.status || 0,
        error: error.message,
        latency,
      };
    }
  }

  // Load pattern: Steady - constant RPS
  async generateSteady() {
    const interval = 1000 / this.config.rps;
    const endTime = Date.now() + (this.config.duration * 1000);
    
    console.log(`📊 Mode: STEADY | RPS: ${this.config.rps} | Duration: ${this.config.duration}s\n`);

    while (Date.now() < endTime && this.running) {
      await this.executeRandomRequest();
      await this.sleep(interval);
      
      if (this.stats.total % (this.config.rps * 5) === 0) {
        this.printStats();
      }
    }
  }

  // Load pattern: Ramp-up - gradually increase RPS
  async generateRampUp() {
    const endTime = Date.now() + (this.config.duration * 1000);
    const rampSteps = 10;
    const stepDuration = (this.config.duration * 1000) / rampSteps;
    const rpsIncrement = this.config.rps / rampSteps;
    
    console.log(`📈 Mode: RAMP-UP | Max RPS: ${this.config.rps} | Duration: ${this.config.duration}s\n`);

    let currentRps = 1;
    let stepStart = Date.now();

    while (Date.now() < endTime && this.running) {
      if (Date.now() - stepStart >= stepDuration && currentRps < this.config.rps) {
        currentRps = Math.min(currentRps + rpsIncrement, this.config.rps);
        stepStart = Date.now();
        console.log(`⬆️  Ramping up to ${currentRps.toFixed(1)} RPS`);
      }

      const interval = 1000 / currentRps;
      await this.executeRandomRequest();
      await this.sleep(interval);
      
      if (this.stats.total % 50 === 0) {
        this.printStats();
      }
    }
  }

  // Load pattern: Spike - sudden bursts
  async generateSpike() {
    const endTime = Date.now() + (this.config.duration * 1000);
    const spikeInterval = 15000; // Spike every 15 seconds
    const spikeDuration = 3000; // Spike lasts 3 seconds
    const spikeRps = this.config.rps * 5; // 5x normal RPS
    
    console.log(`⚡ Mode: SPIKE | Base RPS: ${this.config.rps} | Spike RPS: ${spikeRps} | Duration: ${this.config.duration}s\n`);

    let nextSpike = Date.now() + spikeInterval;
    let inSpike = false;

    while (Date.now() < endTime && this.running) {
      if (Date.now() >= nextSpike && !inSpike) {
        inSpike = true;
        const spikeEnd = Date.now() + spikeDuration;
        console.log(`💥 SPIKE STARTED - ${spikeRps} RPS for ${spikeDuration}ms`);
        
        while (Date.now() < spikeEnd && this.running) {
          const promises = [];
          for (let i = 0; i < spikeRps / 10; i++) {
            promises.push(this.executeRandomRequest());
          }
          await Promise.all(promises);
          await this.sleep(100);
        }
        
        inSpike = false;
        nextSpike = Date.now() + spikeInterval;
        console.log(`✅ SPIKE ENDED`);
      }

      if (!inSpike) {
        const interval = 1000 / this.config.rps;
        await this.executeRandomRequest();
        await this.sleep(interval);
      }
      
      if (this.stats.total % 50 === 0) {
        this.printStats();
      }
    }
  }

  // Load pattern: Realistic - mix of user journeys and random requests
  async generateRealistic() {
    const endTime = Date.now() + (this.config.duration * 1000);
    const baseInterval = 1000 / this.config.rps;
    
    console.log(`🎯 Mode: REALISTIC | RPS: ${this.config.rps} | Concurrent Users: ${this.config.concurrentUsers} | Duration: ${this.config.duration}s\n`);

    // Start concurrent user journey simulators
    const userJourneyPromises = [];
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      userJourneyPromises.push(this.runUserJourneyLoop(endTime, i + 1));
    }

    // Run random requests in parallel
    while (Date.now() < endTime && this.running) {
      // 70% user journeys, 30% random requests
      if (Math.random() < 0.7) {
        // User journey handled by concurrent loops
      } else {
        await this.executeRandomRequest();
      }
      
      await this.sleep(baseInterval);
      
      if (this.stats.total % (this.config.rps * 5) === 0) {
        this.printStats();
      }
    }

    await Promise.all(userJourneyPromises);
  }

  // Demo mode - optimized for interview presentation
  async generateDemo() {
    console.log(`🎬 Mode: DEMO | Generating interview-ready traffic...\n`);
    
    // Phase 1: Initial ramp-up (30s)
    console.log('📈 Phase 1: Ramp-up (30s)');
    await this.runPhase(30, async (elapsed) => {
      const rps = Math.min(5 + (elapsed / 30) * 15, 20);
      await this.executeRandomRequest();
      return 1000 / rps;
    });

    // Phase 2: Steady load with user journeys (60s)
    console.log('\n🎯 Phase 2: Steady load with user journeys (60s)');
    const journeyPromises = [];
    for (let i = 0; i < 15; i++) {
      journeyPromises.push(this.runUserJourneyLoop(Date.now() + 60000, i + 1));
    }
    
    await this.runPhase(60, async () => {
      await this.executeRandomRequest();
      return 1000 / 20; // 20 RPS
    });
    
    await Promise.all(journeyPromises);

    // Phase 3: Spike test (20s)
    console.log('\n⚡ Phase 3: Spike test (20s)');
    await this.runPhase(20, async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(this.executeRandomRequest());
      }
      await Promise.all(promises);
      return 100; // 100ms between spikes
    });

    // Phase 4: Sustained high load (90s)
    console.log('\n🔥 Phase 4: Sustained high load (90s)');
    const highLoadPromises = [];
    for (let i = 0; i < 20; i++) {
      highLoadPromises.push(this.runUserJourneyLoop(Date.now() + 90000, i + 1));
    }
    
    await this.runPhase(90, async () => {
      await this.executeRandomRequest();
      return 1000 / 30; // 30 RPS
    });
    
    await Promise.all(highLoadPromises);
  }

  async runPhase(duration, requestFn) {
    const endTime = Date.now() + (duration * 1000);
    while (Date.now() < endTime && this.running) {
      const elapsed = (duration * 1000 - (endTime - Date.now())) / 1000;
      const delay = await requestFn(elapsed);
      await this.sleep(delay);
      
      if (this.stats.total % 50 === 0) {
        this.printStats();
      }
    }
  }

  async runUserJourneyLoop(endTime, userId) {
    while (Date.now() < endTime && this.running) {
      this.stats.userJourneys++;
      await this.simulateUserJourney(userId);
      // Wait 2-5 seconds before next journey
      await this.sleep(2000 + Math.random() * 3000);
    }
  }

  async executeRandomRequest() {
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
    return await this.makeRequest(endpoint.method, endpoint.path, endpoint.data);
  }

  printStats() {
    const elapsed = ((Date.now() - this.stats.startTime) / 1000).toFixed(1);
    const currentRps = (this.stats.total / elapsed).toFixed(2);
    const successRate = this.stats.total > 0 
      ? ((this.stats.success / this.stats.total) * 100).toFixed(1) 
      : '0.0';
    
    console.log(`\n📊 Stats [${elapsed}s]`);
    console.log(`   Total Requests: ${this.stats.total} | Success: ${this.stats.success} | Errors: ${this.stats.errors}`);
    console.log(`   Current RPS: ${currentRps} | Success Rate: ${successRate}%`);
    console.log(`   User Journeys: ${this.stats.userJourneys} | Completed: ${this.stats.completedJourneys}`);
    
    // Top endpoints
    const topEndpoints = Object.entries(this.stats.byEndpoint)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);
    
    if (topEndpoints.length > 0) {
      console.log(`   Top Endpoints:`);
      topEndpoints.forEach(([path, stats]) => {
        const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0.0';
        console.log(`     ${path}: ${stats.total} req (${successRate}% success, ${stats.avgLatency.toFixed(0)}ms avg)`);
      });
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async start() {
    this.running = true;
    console.log('🚀 Advanced Traffic Generator Starting...');
    console.log(`   Gateway: ${this.config.gatewayUrl}`);
    console.log(`   Mode: ${this.config.mode.toUpperCase()}`);
    console.log(`   Duration: ${this.config.duration}s\n`);

    try {
      switch (this.config.mode) {
        case 'steady':
          await this.generateSteady();
          break;
        case 'ramp-up':
          await this.generateRampUp();
          break;
        case 'spike':
          await this.generateSpike();
          break;
        case 'realistic':
          await this.generateRealistic();
          break;
        case 'demo':
          await this.generateDemo();
          break;
        default:
          await this.generateRealistic();
      }
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      this.stop();
    }
  }

  stop() {
    this.running = false;
    console.log('\n\n🛑 Traffic Generation Complete');
    console.log('═══════════════════════════════════════════════════════');
    this.printFinalStats();
    console.log('═══════════════════════════════════════════════════════\n');
  }

  printFinalStats() {
    const elapsed = ((Date.now() - this.stats.startTime) / 1000).toFixed(1);
    const avgRps = (this.stats.total / elapsed).toFixed(2);
    const successRate = this.stats.total > 0 
      ? ((this.stats.success / this.stats.total) * 100).toFixed(2) 
      : '0.00';
    
    console.log(`\n📈 Final Statistics:`);
    console.log(`   Total Requests: ${this.stats.total}`);
    console.log(`   Successful: ${this.stats.success} (${successRate}%)`);
    console.log(`   Errors: ${this.stats.errors}`);
    console.log(`   Average RPS: ${avgRps}`);
    console.log(`   User Journeys Started: ${this.stats.userJourneys}`);
    console.log(`   User Journeys Completed: ${this.stats.completedJourneys}`);
    
    console.log(`\n📊 By Method:`);
    Object.entries(this.stats.byMethod).forEach(([method, stats]) => {
      const rate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0.0';
      console.log(`   ${method}: ${stats.total} (${rate}% success)`);
    });
    
    console.log(`\n📊 By Endpoint:`);
    Object.entries(this.stats.byEndpoint)
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([path, stats]) => {
        const rate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0.0';
        console.log(`   ${path}: ${stats.total} req | ${rate}% success | ${stats.avgLatency.toFixed(0)}ms avg`);
      });
  }
}

// Handle graceful shutdown
const generator = new AdvancedTrafficGenerator(config);

process.on('SIGINT', () => {
  console.log('\n\n⚠️  Received SIGINT, stopping gracefully...');
  generator.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Received SIGTERM, stopping gracefully...');
  generator.stop();
  process.exit(0);
});

// Start generation
generator.start().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});

