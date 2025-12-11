import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },    // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    errors: ['rate<0.1'],              // Error rate should be less than 10%
  },
};

const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:20007';
const API_KEY = __ENV.API_KEY || 'test-api-key-12345';

const endpoints = [
  { path: '/api/users', method: 'GET' },
  { path: '/api/users/1', method: 'GET' },
  { path: '/api/orders', method: 'GET' },
  { path: '/api/orders/1', method: 'GET' },
  { path: '/api/payments', method: 'GET' },
];

export default function () {
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const url = `${GATEWAY_URL}${endpoint.path}`;
  
  const params = {
    headers: {
      'X-API-Key': API_KEY,
    },
  };
  
  const response = http.get(url, params);
  
  const success = check(response, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  
  sleep(1); // 1 request per second per VU
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  // Simple text summary
  return `
    ====================
    Load Test Summary
    ====================
    Total Requests: ${data.metrics.http_reqs.values.count}
    Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%
    Avg Response Time: ${data.metrics.http_req_duration.values.avg}ms
    P95 Response Time: ${data.metrics.http_req_duration.values['p(95)']}ms
    P99 Response Time: ${data.metrics.http_req_duration.values['p(99)']}ms
  `;
}

