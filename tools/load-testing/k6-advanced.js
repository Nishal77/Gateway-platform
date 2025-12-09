/**
 * K6 Advanced Load Testing Script
 * 
 * FAANG-level load testing with realistic scenarios
 * 
 * Usage:
 *   k6 run k6-advanced.js
 *   k6 run --vus 50 --duration 5m k6-advanced.js
 *   k6 run --stage 30s:20,2m:50,5m:100 k6-advanced.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const userJourneySuccess = new Counter('user_journeys_completed');
const userJourneyDuration = new Trend('user_journey_duration');

// Configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp-up
    { duration: '2m', target: 50 },   // Sustained load
    { duration: '1m', target: 100 },  // Spike
    { duration: '3m', target: 50 },   // Sustained high load
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.05'],                  // Error rate < 5%
    errors: ['rate<0.05'],
    user_journeys_completed: ['count>100'],
  },
};

const BASE_URL = __ENV.GATEWAY_URL || 'http://localhost:18080';
const API_KEY = __ENV.API_KEY || 'test-api-key-12345';

// Test data generators
const names = [
  'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Eve Wilson',
  'Frank Miller', 'Grace Lee', 'Henry Davis', 'Ivy Chen', 'Jack Taylor',
  'Kate Williams', 'Liam O\'Brien', 'Mia Rodriguez', 'Noah Anderson', 'Olivia Martinez',
];

const products = [
  'Laptop Pro', 'Wireless Mouse', 'Mechanical Keyboard', 'Monitor 27"', 'USB-C Hub',
  'Webcam HD', 'Microphone', 'Headphones', 'Tablet', 'Smartphone',
];

function randomName() {
  return names[Math.floor(Math.random() * names.length)];
}

function randomEmail() {
  return `user${Math.floor(Math.random() * 10000)}@example.com`;
}

function randomProduct() {
  return products[Math.floor(Math.random() * products.length)];
}

function randomAmount() {
  return (Math.random() * 500 + 10).toFixed(2);
}

// Helper function to make authenticated requests
function makeRequest(method, path, body = null) {
  const params = {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    tags: { name: path },
  };

  let response;
  if (method === 'GET') {
    response = http.get(`${BASE_URL}${path}`, params);
  } else if (method === 'POST') {
    response = http.post(`${BASE_URL}${path}`, JSON.stringify(body), params);
  } else if (method === 'PUT') {
    response = http.put(`${BASE_URL}${path}`, JSON.stringify(body), params);
  } else if (method === 'DELETE') {
    response = http.del(`${BASE_URL}${path}`, null, params);
  }

  const success = response.status >= 200 && response.status < 400;
  errorRate.add(!success);

  return { response, success };
}

// Complete user journey: Create User -> Create Order -> Process Payment
function simulateUserJourney() {
  const journeyStart = Date.now();
  let user, order, payment;

  // Step 1: Create User
  const userData = {
    name: randomName(),
    email: randomEmail(),
  };
  const userResult = makeRequest('POST', '/api/users', userData);
  
  if (!userResult.success || !userResult.response.json) {
    return false;
  }
  user = userResult.response.json();

  sleep(0.5 + Math.random() * 1); // Simulate user thinking time

  // Step 2: Create Order
  const orderData = {
    userId: user.id,
    product: randomProduct(),
    amount: parseFloat(randomAmount()),
    status: 'PENDING',
  };
  const orderResult = makeRequest('POST', '/api/orders', orderData);
  
  if (!orderResult.success || !orderResult.response.json()) {
    return false;
  }
  order = orderResult.response.json();

  sleep(0.5 + Math.random() * 1); // Simulate user thinking time

  // Step 3: Process Payment
  const paymentData = {
    orderId: order.id,
    amount: order.amount,
    status: 'PENDING',
  };
  const paymentResult = makeRequest('POST', '/api/payments', paymentData);
  
  if (!paymentResult.success) {
    return false;
  }
  payment = paymentResult.response.json();

  const journeyDuration = Date.now() - journeyStart;
  userJourneyDuration.add(journeyDuration);
  userJourneySuccess.add(1);

  return true;
}

// Main test function
export default function () {
  // 70% user journeys, 30% random requests
  if (Math.random() < 0.7) {
    simulateUserJourney();
  } else {
    // Random endpoint requests
    const endpoints = [
      { method: 'GET', path: '/api/users' },
      { method: 'GET', path: `/api/users/${Math.floor(Math.random() * 20) + 1}` },
      { method: 'GET', path: '/api/orders' },
      { method: 'GET', path: '/api/orders/1' },
      { method: 'GET', path: '/api/payments' },
      { method: 'GET', path: '/api/payments/1' },
    ];

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    makeRequest(endpoint.method, endpoint.path);
  }

  sleep(0.1 + Math.random() * 0.4); // Random think time between requests
}

// Setup function - runs once before all VUs
export function setup() {
  console.log(`🚀 Starting K6 Load Test`);
  console.log(`   Gateway URL: ${BASE_URL}`);
  console.log(`   API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`   Stages: ${JSON.stringify(options.stages)}\n`);
}

// Teardown function - runs once after all VUs finish
export function teardown(data) {
  console.log('\n✅ Load test completed');
}

