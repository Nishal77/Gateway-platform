# Advanced Traffic Generator

FAANG-level traffic generator for load testing and demo purposes. Generates realistic traffic patterns with user journey simulation.

## Features

- 🎯 **Realistic User Journeys**: Simulates complete user flows (Create User → Create Order → Process Payment)
- 📊 **Multiple Load Patterns**: Steady, Ramp-up, Spike, Realistic, and Demo modes
- 🔥 **Interview-Ready**: Demo mode optimized for presentations
- 📈 **Comprehensive Statistics**: Detailed metrics by endpoint, method, and latency
- 🚀 **High Performance**: Concurrent user simulation with configurable RPS

## Quick Start

### Using Docker (Recommended)

```bash
# Start all services including traffic generator
docker-compose up -d

# View traffic generator logs
docker-compose logs -f traffic-generator

# Stop traffic generator
docker-compose stop traffic-generator
```

### Using Bun Directly

```bash
cd tools/traffic-generator

# Run with default settings (realistic mode)
bun run advanced-generator.js

# Run with custom settings
GATEWAY_URL=http://localhost:18080 \
RPS=30 \
DURATION=300 \
MODE=demo \
bun run advanced-generator.js
```

## Load Patterns

### 1. Steady Mode
Constant requests per second (RPS) throughout the test.

```bash
MODE=steady RPS=20 DURATION=300 bun run advanced-generator.js
```

### 2. Ramp-Up Mode
Gradually increases RPS from 1 to target RPS over the duration.

```bash
MODE=ramp-up RPS=50 DURATION=300 bun run advanced-generator.js
```

### 3. Spike Mode
Normal load with periodic spikes (5x RPS for short bursts).

```bash
MODE=spike RPS=20 DURATION=300 bun run advanced-generator.js
```

### 4. Realistic Mode (Default)
Mix of user journeys and random requests with concurrent users.

```bash
MODE=realistic RPS=25 CONCURRENT_USERS=15 DURATION=300 bun run advanced-generator.js
```

### 5. Demo Mode (Interview-Ready)
Optimized 4-phase load pattern perfect for demonstrations:
- Phase 1: Ramp-up (30s)
- Phase 2: Steady load with user journeys (60s)
- Phase 3: Spike test (20s)
- Phase 4: Sustained high load (90s)

```bash
MODE=demo bun run advanced-generator.js
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GATEWAY_URL` | `http://localhost:18080` | Gateway endpoint URL |
| `API_KEY` | `test-api-key-12345` | API key for authentication |
| `MODE` | `realistic` | Load pattern mode |
| `RPS` | `20` | Requests per second |
| `DURATION` | `300` | Test duration in seconds |
| `CONCURRENT_USERS` | `10` | Number of concurrent user journeys |

### Docker Compose Configuration

Edit `docker-compose.yml`:

```yaml
traffic-generator:
  environment:
    GATEWAY_URL: http://gateway:8080
    API_KEY: test-api-key-12345
    MODE: demo
    RPS: 25
    DURATION: 200
    CONCURRENT_USERS: 15
```

## Endpoints Covered

### User Service
- `GET /api/users` - List all users
- `GET /api/users/{id}` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Order Service
- `GET /api/orders` - List all orders
- `GET /api/orders/{id}` - Get order by ID
- `POST /api/orders` - Create new order

### Payment Service
- `GET /api/payments` - List all payments
- `GET /api/payments/{id}` - Get payment by ID
- `POST /api/payments` - Process payment

## User Journey Flow

The generator simulates realistic user journeys:

1. **User Creation/Retrieval**: Creates or retrieves a user
2. **Order Creation**: Creates an order for the user
3. **Payment Processing**: Processes payment for the order

This creates realistic data flows that populate the analytics dashboard with meaningful metrics.

## Statistics Output

The generator provides real-time and final statistics:

```
📊 Stats [45.2s]
   Total Requests: 904 | Success: 892 | Errors: 12
   Current RPS: 20.0 | Success Rate: 98.7%
   User Journeys: 15 | Completed: 12
   Top Endpoints:
     /api/users: 302 req (99.0% success, 45ms avg)
     /api/orders: 298 req (98.7% success, 120ms avg)
     /api/payments: 304 req (98.4% success, 250ms avg)
```

## Interview Demo Tips

1. **Start with Demo Mode**: Use `MODE=demo` for the best presentation
2. **Run for 3-5 minutes**: Enough time to show all phases
3. **Open Dashboard**: Show real-time metrics during generation
4. **Highlight Features**:
   - User journey completion rates
   - Latency percentiles (P50, P90, P99)
   - Error rates and recovery
   - RPS trends over time
   - Top endpoints by traffic

## Troubleshooting

### Connection Refused
- Ensure gateway is running: `docker-compose ps gateway`
- Check gateway URL: Use `http://gateway:8080` in Docker, `http://localhost:18080` locally

### Low Success Rate
- Check service health: `docker-compose ps`
- Review service logs: `docker-compose logs user-service order-service payment-service`
- Reduce RPS if services are overloaded

### No Data in Dashboard
- Ensure analytics service is healthy
- Check analytics logs: `docker-compose logs analytics`
- Verify gateway is routing requests correctly

## Performance Tips

- **For Load Testing**: Use `steady` or `ramp-up` mode with high RPS
- **For Realistic Simulation**: Use `realistic` mode with 10-20 concurrent users
- **For Demos**: Use `demo` mode - it's optimized for presentations
- **For Spike Testing**: Use `spike` mode to test circuit breakers

## Examples

### Quick 1-minute test
```bash
DURATION=60 RPS=15 MODE=realistic bun run advanced-generator.js
```

### High-load test
```bash
RPS=100 DURATION=600 MODE=steady bun run advanced-generator.js
```

### Interview demo
```bash
MODE=demo bun run advanced-generator.js
```

