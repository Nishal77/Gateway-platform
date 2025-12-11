# Smart Gateway Platform

A production-ready API gateway with real-time analytics and observability. Built to handle high-traffic workloads while providing comprehensive insights into your API performance.

## What is This?

Smart Gateway Platform is a complete API gateway solution that sits between your clients and backend services. It handles authentication, rate limiting, request routing, and provides real-time analytics through an intuitive dashboard. Think of it as a smart traffic controller for your microservices architecture.

The platform is designed to handle 1,000 to 10,000 requests per second smoothly, with real-time capacity monitoring so you always know when you're approaching system limits.

## Key Features

**Request Management**
- Intelligent routing to backend services based on URL patterns
- API key authentication with flexible validation
- Per-client rate limiting to prevent abuse
- Automatic request/response logging

**Analytics & Observability**
- Real-time metrics dashboard with capacity indicators
- Request per second (RPS) tracking
- Latency percentiles (P50, P90, P99)
- Error rate monitoring
- Endpoint performance analysis

**Performance**
- Optimized for 1k-10k requests per second
- Non-blocking reactive architecture
- Real-time capacity visualization
- Automatic scaling indicators

**Developer Experience**
- Simple Docker Compose setup
- Comprehensive dashboard UI
- Built-in traffic generators for testing
- Clear documentation and examples

## Getting Started

### Prerequisites

You'll need Docker and Docker Compose installed on your machine. That's it - everything else runs in containers.

```bash
# Verify Docker is installed
docker --version
docker-compose --version
```

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd gateway-platform
```

2. **Start all services**
```bash
docker-compose up --build
```

This single command will:
- Build all service images
- Start PostgreSQL and Redis
- Launch all backend services
- Start the gateway and analytics services
- Deploy the dashboard

The first run may take a few minutes as it builds images and downloads dependencies. Subsequent starts are much faster.

3. **Verify everything is running**
```bash
docker-compose ps
```

You should see all services with "healthy" or "running" status.

### Accessing Services

Once started, you can access:

- **Dashboard**: http://localhost:20008 - Real-time metrics and system health
- **Gateway**: http://localhost:20007 - Your API entry point
- **Analytics API**: http://localhost:20006 - Direct access to metrics

All services use ports in the 20000 range to avoid conflicts with other development tools.

## Quick Start Guide

### 1. Make Your First API Call

All requests need an API key in the header:

```bash
curl -H "X-API-Key: test-api-key-12345" http://localhost:20007/api/users
```

You should receive a JSON response with user data.

### 2. Check System Health

Open the dashboard at http://localhost:20008. You'll see:
- System capacity indicators
- Current request rate
- Error rates and latency metrics
- Endpoint performance breakdown

### 3. Generate Test Traffic

To see the platform in action, generate some traffic:

```bash
cd tools/traffic-generator
bun run load-1k.js
```

This will generate 1,000 requests per second. Watch the dashboard update in real-time as traffic flows through the system.

### 4. Monitor Capacity

The dashboard shows real-time capacity indicators:
- **Green (0-40%)**: System operating normally
- **Yellow (40-70%)**: Moderate load
- **Orange (70-90%)**: High load - monitor closely
- **Red (90-100%)**: Critical - consider scaling

The platform is optimized to handle up to 10,000 requests per second. The capacity indicator shows how close you are to this limit.

## How It Works

### The Big Picture

When a request comes in, here's what happens:

1. **Gateway receives the request** - This is your single entry point
2. **Authentication check** - Validates the API key
3. **Rate limit check** - Ensures the client hasn't exceeded limits
4. **Route to backend** - Forwards to the appropriate service
5. **Capture telemetry** - Records metrics about the request
6. **Return response** - Sends the backend response to the client

All of this happens asynchronously, so the gateway can handle thousands of requests per second without blocking.

### Analytics Pipeline

The analytics service processes telemetry data in real-time:

1. **Events arrive** - Gateway sends batched telemetry events
2. **Queue processing** - Events are queued for async processing
3. **Metric computation** - Calculates RPS, latency, error rates
4. **Caching** - Stores results in Redis for fast dashboard access
5. **Dashboard updates** - Dashboard polls for latest metrics every 2 seconds

Metrics are computed using a 60-second sliding window, giving you both real-time and historical views of your API performance.

### Capacity Monitoring

The platform tracks your current load against a 10,000 RPS target capacity:

- **Current RPS** / **10,000 RPS** = **Capacity Percentage**
- Progress bars show visual indicators
- Color coding helps you quickly assess system health
- Warnings appear when capacity exceeds 80%

This gives you immediate visibility into whether you need to scale your infrastructure.

## Configuration

### Environment Variables

Create a `.env` file in the project root to customize settings:

```env
# Database
POSTGRES_USER=sgp
POSTGRES_PASSWORD=sgp
POSTGRES_DB=sgp

# Redis (optional password)
REDIS_PASSWORD=

# Environment
ENV=local
```

### Gateway Settings

The gateway can be configured via environment variables:

- `GATEWAY_AUTH_ENABLED`: Enable/disable authentication (default: true)
- `GATEWAY_RATE_LIMIT_RPM`: Requests per minute per client (default: 1,000,000)
- `GATEWAY_TELEMETRY_ENABLED`: Enable/disable telemetry (default: true)

### Analytics Settings

Analytics service configuration:

- `analytics.metrics.window-seconds`: Time window for metrics (default: 60)
- `analytics.metrics.aggregation-interval-ms`: Update frequency (default: 2000)

## Usage Examples

### Basic API Calls

**List all users:**
```bash
curl -H "X-API-Key: test-api-key-12345" http://localhost:20007/api/users
```

**Get specific user:**
```bash
curl -H "X-API-Key: test-api-key-12345" http://localhost:20007/api/users/1
```

**Create a new user:**
```bash
curl -X POST \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}' \
  http://localhost:20007/api/users
```

### Load Testing

The platform includes several traffic generators for different scenarios:

**1,000 RPS Test:**
```bash
cd tools/traffic-generator
bun run load-1k.js
```

**10,000 RPS Test:**
```bash
bun run load-10k.js
```

**100,000 RPS Test (extreme load):**
```bash
bun run load-100k.js
```

**Custom Load:**
```bash
RPS=5000 DURATION=300 bun run advanced-generator.js
```

### Monitoring Dashboard

The dashboard provides several views:

- **System Status**: Overall health and capacity indicators
- **Capacity Overview**: Visual progress bars showing current load
- **Endpoint Metrics**: Performance breakdown by API endpoint
- **Traffic Distribution**: Request patterns across services
- **Alerts**: Automatic notifications for issues

All metrics update every 2 seconds, giving you near real-time visibility.

## API Reference

### Gateway Endpoints

All API requests go through the gateway at `http://localhost:20007`:

**User Service Routes:**
- `GET /api/users` - List all users
- `GET /api/users/{id}` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

**Order Service Routes:**
- `GET /api/orders` - List all orders
- `GET /api/orders/{id}` - Get order by ID
- `POST /api/orders` - Create order

**Payment Service Routes:**
- `GET /api/payments` - List all payments
- `GET /api/payments/{id}` - Get payment by ID
- `POST /api/payments` - Process payment

### Analytics API

Direct access to metrics (useful for integrations):

- `GET /health` - Service health check
- `GET /api/v1/metrics/aggregated` - All aggregated metrics
- `POST /api/v1/telemetry` - Ingest telemetry (used internally)

## Managing Services

### Start Services

```bash
# Start everything
docker-compose up --build

# Start in background
docker-compose up --build -d

# Start without rebuilding
docker-compose up
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f gateway
docker-compose logs -f analytics
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove data (fresh start)
docker-compose down -v
```

### Restart Services

```bash
# Restart everything
docker-compose restart

# Restart specific service
docker-compose restart gateway
```

## Troubleshooting

### Services Won't Start

**Check Docker:**
```bash
docker ps
```

**Check Ports:**
Make sure ports 20001-20008 aren't already in use:
```bash
lsof -i :20007
```

**View Logs:**
```bash
docker-compose logs <service-name>
```

### Gateway Not Responding

1. Check if gateway is healthy:
```bash
curl http://localhost:20007/actuator/health
```

2. Verify backend services are running:
```bash
docker-compose ps
```

3. Check gateway logs:
```bash
docker-compose logs gateway
```

### Dashboard Shows No Data

1. Ensure analytics service is running:
```bash
docker-compose ps analytics
```

2. Check if gateway is sending telemetry:
```bash
docker-compose logs gateway | grep telemetry
```

3. Verify Redis connection:
```bash
docker-compose exec redis redis-cli ping
```

4. Restart analytics service:
```bash
docker-compose restart analytics
```

### High Error Rates

If you're seeing many errors:

1. Check backend service health
2. Review service logs for specific errors
3. Verify database connectivity
4. Check if services are overwhelmed - reduce traffic load
5. Review capacity indicators - system may be at limit

### Capacity Warnings

When the dashboard shows capacity warnings:

- **80-90% capacity**: Monitor closely, prepare to scale
- **90-100% capacity**: Consider immediate scaling or load reduction
- Check individual service health - one service may be the bottleneck
- Review error rates - high errors may indicate overload

## Performance Tuning

The platform is optimized out of the box for 1k-10k RPS. For higher loads:

**Gateway Optimizations:**
- Increase Redis connection pool size
- Adjust telemetry batch sizes
- Tune JVM heap settings in Dockerfile

**Analytics Optimizations:**
- Increase worker thread count
- Adjust batch processing intervals
- Scale database connection pool

**Scaling:**
- Run multiple gateway instances behind a load balancer
- Scale analytics service horizontally
- Use Redis cluster for distributed rate limiting

## Technology Stack

**Backend:**
- Java 17 with Spring Boot 3.2
- Spring Cloud Gateway for routing
- Spring WebFlux for reactive processing
- PostgreSQL 15 for data storage
- Redis 7 for caching and rate limiting

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS for styling
- Recharts for data visualization
- Vite for fast development

**Infrastructure:**
- Docker and Docker Compose
- Nginx for serving the dashboard

## Architecture Decisions

**Why Reactive?**
The platform uses Spring WebFlux for non-blocking I/O. This allows handling thousands of concurrent connections with minimal thread overhead, essential for high-throughput scenarios.

**Why Redis?**
Redis provides fast in-memory storage for rate limiting and metric caching. It's fast enough to handle millions of operations per second, making it perfect for real-time analytics.

**Why Batch Processing?**
Telemetry events are batched before sending to analytics. This reduces network overhead and allows the analytics service to process events more efficiently.

**Why 60-Second Windows?**
Metrics are computed over 60-second sliding windows. This provides a good balance between real-time responsiveness and statistical accuracy.

## Performance Benchmarks

The platform has been tested and optimized for:

- **1,000 RPS**: Runs smoothly with minimal resource usage
- **5,000 RPS**: Comfortable operating range
- **10,000 RPS**: Maximum recommended capacity
- **Beyond 10k**: Requires horizontal scaling

Latency characteristics:
- **P50**: Typically under 50ms
- **P90**: Typically under 200ms
- **P99**: Typically under 500ms (may increase under high load)

These numbers assume healthy backend services and proper infrastructure sizing.

## Best Practices

**For Production:**
- Use strong API keys (minimum 16 characters)
- Configure appropriate rate limits per client
- Monitor capacity indicators regularly
- Set up alerts for high error rates
- Scale proactively when capacity exceeds 70%

**For Development:**
- Use the built-in traffic generators for testing
- Monitor the dashboard during load tests
- Check logs when investigating issues
- Start with low RPS and gradually increase

**For Monitoring:**
- Watch capacity indicators daily
- Review error rates weekly
- Analyze latency trends monthly
- Scale infrastructure before hitting 90% capacity

## Common Use Cases

**API Gateway:**
Use as a single entry point for multiple microservices, handling authentication and routing automatically.

**Rate Limiting:**
Protect your backend services from abuse with per-client rate limits.

**Analytics:**
Understand your API usage patterns, identify slow endpoints, and track error rates.

**Load Testing:**
Use the traffic generators to test your backend services under various load conditions.

**Capacity Planning:**
Monitor capacity indicators to know when you need to scale your infrastructure.

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review service logs: `docker-compose logs <service>`
3. Verify all services are healthy: `docker-compose ps`
4. Check the dashboard for error indicators
5. Review this README for configuration options

## What's Next?

After getting the platform running:

1. **Explore the Dashboard**: Familiarize yourself with the metrics and visualizations
2. **Generate Traffic**: Use the traffic generators to see the system in action
3. **Monitor Capacity**: Watch how the system handles different load levels
4. **Customize Configuration**: Adjust settings based on your needs
5. **Integrate with Your Services**: Connect your own backend services

## Contributing

Contributions are welcome! Please ensure your code follows the existing patterns and includes appropriate tests.

## License

[Specify your license here]

---

**Ready to get started?** Run `docker-compose up --build` and open http://localhost:20008 to see your gateway in action.
