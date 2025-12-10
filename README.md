# Smart Gateway Platform

A production-ready API gateway platform with real-time analytics and observability capabilities. The platform provides comprehensive request routing, authentication, rate limiting, and telemetry collection with an intuitive dashboard for monitoring API performance.

## Overview

Smart Gateway Platform is a microservices-based API gateway solution designed for high-throughput environments. It provides centralized request routing, authentication, rate limiting, and real-time analytics for backend services. The platform processes millions of requests per second while maintaining low latency and providing detailed insights into API usage patterns.

## Features

### Core Capabilities

- **Request Routing**: Intelligent routing of API requests to appropriate backend services based on path patterns
- **Authentication**: API key-based authentication with configurable validation rules
- **Rate Limiting**: Per-client rate limiting using Redis with configurable thresholds
- **Telemetry Collection**: Automatic capture of request metadata including latency, status codes, and error types
- **Real-Time Analytics**: Live metrics computation with sub-second latency percentiles (P50, P90, P99)
- **Observability Dashboard**: React-based dashboard displaying real-time metrics, endpoint performance, and system health
- **High Throughput**: Optimized for handling millions of requests per second with non-blocking reactive architecture

### Technical Features

- Reactive architecture using Spring WebFlux for non-blocking I/O
- Lock-free algorithms for metric computation
- Time-windowed aggregation with configurable sliding windows
- Batch telemetry processing with automatic backpressure handling
- Redis-based caching for fast metric retrieval
- PostgreSQL for persistent storage of telemetry data

## Installation

### Prerequisites

- Docker and Docker Compose (version 3.9 or higher)
- Java 17 or higher (for local development)
- Node.js 18+ or Bun (for dashboard development)
- Maven 3.8+ (for building Java services)

### Quick Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gateway-platform
```

2. Start all services using Docker Compose:
```bash
docker-compose up --build
```

This command will:
- Build all service images
- Start PostgreSQL and Redis databases
- Start all backend services (User, Order, Payment)
- Start the Analytics service
- Start the Gateway service
- Start the Dashboard service
- Optionally start the traffic generator for testing

3. Verify services are running:
```bash
docker-compose ps
```

All services should show as "healthy" or "running" status.

### Service Access

Once started, services are accessible at the following URLs:

| Service | Host Port | Internal Port | URL |
|---------|-----------|---------------|-----|
| Dashboard | 20008 | 80 | http://localhost:20008 |
| Gateway | 20007 | 8080 | http://localhost:20007 |
| Analytics Service | 20006 | 9000 | http://localhost:20006 |
| User Service | 20003 | 8081 | http://localhost:20003 |
| Order Service | 20004 | 8082 | http://localhost:20004 |
| Payment Service | 20005 | 8083 | http://localhost:20005 |
| PostgreSQL | 20001 | 5432 | localhost:20001 |
| Redis | 20002 | 6379 | localhost:20002 |

All services use ports in the 20000 range to avoid conflicts with common development ports. Services communicate internally within Docker using service names and internal ports.

## How It Works

### Architecture Overview

The platform consists of several interconnected services working together to provide gateway functionality with analytics:

1. **Gateway Service**: Entry point for all API requests, handles routing, authentication, and rate limiting
2. **Analytics Service**: Processes telemetry events and computes real-time metrics
3. **Backend Services**: User, Order, and Payment services that handle business logic
4. **Dashboard Service**: React-based frontend for visualizing metrics
5. **Infrastructure**: PostgreSQL for data persistence and Redis for caching and rate limiting

### Request Flow

When a client makes an API request, the following sequence occurs:

1. **Request Reception**: The Gateway service receives the HTTP request
2. **Authentication**: The AuthenticationFilter validates the API key from the `X-API-Key` header
3. **Rate Limiting**: The RateLimitFilter checks if the client has exceeded their rate limit using Redis
4. **Request Routing**: Spring Cloud Gateway routes the request to the appropriate backend service based on path patterns
5. **Telemetry Capture**: The TelemetryFilter captures request metadata including:
   - Request path, method, and status code
   - Response latency in milliseconds
   - Client identification
   - Upstream service information
   - Error types if applicable
6. **Telemetry Emission**: Captured telemetry is batched and asynchronously sent to the Analytics service
7. **Response Return**: The response from the backend service is returned to the client

### Analytics Processing

The Analytics service processes telemetry events through the following pipeline:

1. **Event Ingestion**: Telemetry events are received via HTTP POST to the `/api/v1/telemetry` endpoint
2. **Async Processing**: Events are queued and processed asynchronously to avoid blocking the ingestion endpoint
3. **Event Buffering**: Events are stored in thread-safe in-memory buffers keyed by endpoint and HTTP method
4. **Metric Computation**: The MetricProcessor computes metrics in real-time:
   - Requests per second (RPS) calculated from actual event timestamps
   - Latency percentiles (P50, P90, P99) using T-Digest algorithm
   - Error rates based on HTTP status codes
   - Request counts per endpoint
5. **Caching**: Computed metrics are cached in Redis for fast retrieval by the dashboard
6. **Window Management**: Old events are automatically cleaned from buffers based on the configured time window

### Metric Aggregation

Metrics are computed using a sliding time window approach:

- **Window Size**: Configurable (default: 60 seconds)
- **Aggregation Interval**: Metrics are recomputed every 2 seconds by default
- **Real-Time Updates**: Metrics are computed immediately when events arrive for instant dashboard updates
- **Debouncing**: Smart debouncing prevents excessive computation while maintaining real-time responsiveness

The system uses lock-free data structures where possible and parallel processing for high throughput scenarios.

## Configuration

### Environment Variables

Create a `.env` file in the root directory to customize configuration:

```env
# Database Configuration
POSTGRES_USER=sgp
POSTGRES_PASSWORD=sgp
POSTGRES_DB=sgp

# Redis Configuration
REDIS_PASSWORD=

# Environment
ENV=local
```

### Gateway Configuration

Gateway settings can be configured via environment variables or `application.yml`:

- `GATEWAY_AUTH_ENABLED`: Enable or disable authentication (default: true)
- `GATEWAY_RATE_LIMIT_RPM`: Default requests per minute per client (default: 1000000)
- `GATEWAY_TELEMETRY_ENABLED`: Enable or disable telemetry collection (default: true)
- `ANALYTICS_SERVICE_URL`: URL of the analytics service telemetry endpoint

### Analytics Configuration

Analytics service configuration:

- `analytics.metrics.window-seconds`: Time window for metric aggregation (default: 60)
- `analytics.metrics.aggregation-interval-ms`: Interval for scheduled metric computation (default: 2000)

## Usage

### Making API Requests

All API requests must include an API key in the header:

```bash
curl -H "X-API-Key: test-api-key-12345" http://localhost:20007/api/users
```

### Testing the Platform

1. **Check Gateway Health**:
```bash
curl http://localhost:20007/actuator/health
```

2. **Test API Endpoint**:
```bash
curl -H "X-API-Key: test-api-key-12345" http://localhost:20007/api/users
```

3. **Check Analytics Health**:
```bash
curl http://localhost:20006/health
```

4. **Retrieve Aggregated Metrics**:
```bash
curl http://localhost:20006/api/v1/metrics/aggregated
```

5. **View Dashboard**:
Open http://localhost:20008 in your browser to view real-time metrics

### Generating Traffic

The platform includes a traffic generator for load testing. To use it:

1. **Using Docker Compose** (automatic):
The traffic generator starts automatically with `docker-compose up` and runs in demo mode.

2. **Manual Execution**:
```bash
cd tools/traffic-generator
MODE=demo bun run advanced-generator.js
```

Available modes:
- `demo`: Optimized for demonstrations (200 seconds, 25 RPS)
- `realistic`: Realistic load with user journeys (default)
- `steady`: Constant load throughout the test
- `ramp-up`: Gradually increasing load
- `spike`: Normal load with periodic spikes

Configuration via environment variables:
- `GATEWAY_URL`: Gateway endpoint URL (default: http://localhost:20007)
- `API_KEY`: API key for authentication (default: test-api-key-12345)
- `MODE`: Load pattern mode
- `RPS`: Requests per second
- `DURATION`: Test duration in seconds
- `CONCURRENT_USERS`: Number of concurrent user journeys

### Load Testing with K6

For professional load testing, K6 scripts are available in `tools/load-testing/`:

```bash
# Install K6
brew install k6  # macOS
# or follow K6 installation guide for your OS

# Run load test
cd tools/load-testing
k6 run k6-advanced.js
```

## API Documentation

### Gateway Endpoints

- `GET /actuator/health`: Health check endpoint
- `GET /api/users`: List all users (routes to User Service)
- `GET /api/users/{id}`: Get user by ID
- `POST /api/users`: Create new user
- `PUT /api/users/{id}`: Update user
- `DELETE /api/users/{id}`: Delete user
- `GET /api/orders`: List all orders (routes to Order Service)
- `GET /api/orders/{id}`: Get order by ID
- `POST /api/orders`: Create new order
- `GET /api/payments`: List all payments (routes to Payment Service)
- `GET /api/payments/{id}`: Get payment by ID
- `POST /api/payments`: Process payment

### Analytics API Endpoints

- `GET /health`: Analytics service health check
- `POST /api/v1/telemetry`: Ingest telemetry events (used by Gateway)
- `GET /api/v1/metrics/aggregated`: Retrieve aggregated metrics for dashboard

## Service Management

### Starting Services

```bash
# Start all services
docker-compose up --build

# Start in background (detached mode)
docker-compose up --build -d

# Start without rebuilding
docker-compose up
```

### Viewing Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f gateway
docker-compose logs -f analytics
docker-compose logs -f dashboard
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Restarting Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart gateway
docker-compose restart analytics
```

### Checking Service Status

```bash
# List all containers and their status
docker-compose ps

# Check service health
curl http://localhost:20007/actuator/health
curl http://localhost:20006/health
```

## Troubleshooting

### Services Not Starting

1. Check Docker is running: `docker ps`
2. Check port availability: Ensure ports 20001-20008 are not in use
3. Review logs: `docker-compose logs <service-name>`
4. Verify environment variables in `.env` file

### Gateway Not Routing Requests

1. Verify backend services are healthy: `docker-compose ps`
2. Check gateway logs: `docker-compose logs gateway`
3. Verify route configuration in `services/gateway/src/main/resources/routes.yml`
4. Test backend services directly: `curl http://localhost:20003/actuator/health`

### Dashboard Showing No Data

1. Verify analytics service is running: `docker-compose ps analytics`
2. Check analytics logs: `docker-compose logs analytics`
3. Verify gateway is sending telemetry: `docker-compose logs gateway | grep telemetry`
4. Check Redis connectivity: `docker-compose exec redis redis-cli ping`
5. Restart analytics service: `docker-compose restart analytics`

### High Error Rates

1. Check backend service health: `docker-compose ps`
2. Review service logs for errors: `docker-compose logs user-service order-service payment-service`
3. Verify database connectivity: `docker-compose exec postgres pg_isready`
4. Check Redis connectivity: `docker-compose exec redis redis-cli ping`
5. Reduce traffic load if services are overwhelmed

### Rate Limiting Issues

1. Check Redis is running: `docker-compose ps redis`
2. Verify rate limit configuration in gateway settings
3. Review rate limit logs: `docker-compose logs gateway | grep rate`
4. Test with different API keys to verify per-client limits

## Technology Stack

### Backend Services

- **Java 17**: Programming language for all backend services
- **Spring Boot 3.2**: Application framework
- **Spring Cloud Gateway**: API gateway implementation
- **Spring WebFlux**: Reactive web framework for non-blocking I/O
- **Spring Data Redis**: Redis integration for caching and rate limiting
- **Spring Data JPA**: Database persistence layer
- **PostgreSQL 15**: Relational database for data persistence
- **Redis 7**: In-memory data store for caching and rate limiting

### Frontend

- **React 18**: User interface framework
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Charting library for data visualization
- **Vite**: Build tool and development server

### Infrastructure

- **Docker**: Containerization platform
- **Docker Compose**: Multi-container orchestration
- **Nginx**: Web server for serving the dashboard

### Development Tools

- **Maven**: Java build and dependency management
- **Bun**: JavaScript runtime and package manager
- **K6**: Load testing tool (optional)

## Performance Characteristics

The platform is designed for high-throughput scenarios:

- **Request Processing**: Non-blocking reactive architecture handles millions of requests per second
- **Telemetry Processing**: Asynchronous batch processing with configurable queue capacity (default: 1M events)
- **Metric Computation**: Lock-free algorithms with parallel processing for sub-second metric updates
- **Latency**: Sub-10ms overhead for telemetry collection and processing
- **Scalability**: Horizontal scaling supported through stateless service design

## Security Considerations

- API key authentication required for all requests (configurable)
- Rate limiting per client to prevent abuse
- Health check endpoints excluded from authentication requirements
- Configurable CORS policies for cross-origin requests
- Input validation and error handling throughout the stack

## License

[Specify your license here]

## Contributing

[Add contribution guidelines if applicable]

## Support

For issues, questions, or contributions, please refer to the project repository.
