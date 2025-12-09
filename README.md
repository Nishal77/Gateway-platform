# Smart Gateway Platform

Developer-first API analytics platform with real-time observability.

## Quick Start

```bash
# 1. Copy environment file (optional - defaults work)
cp .env.example .env

# 2. Start all services
docker-compose up --build

# 3. Access services:
# - Dashboard: http://localhost:20008
# - Gateway: http://localhost:20007
# - Analytics: http://localhost:20006
```

## Commands

### Start Services

```bash
# Start all services (builds images if needed)
docker-compose up --build

# Start in background (detached mode)
docker-compose up --build -d

# Start without rebuilding
docker-compose up
```

### View Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f gateway
docker-compose logs -f analytics
docker-compose logs -f dashboard
docker-compose logs -f traffic-generator
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Check Status

```bash
# List all containers and their status
docker-compose ps

# Check if services are healthy
docker-compose ps --format json
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart gateway
docker-compose restart analytics
```

## Services

| Service | Host Port | Internal Port | URL | Description |
|---------|-----------|---------------|-----|-------------|
| Gateway | 20007 | 8080 | http://localhost:20007 | API Gateway with auth, rate limiting, routing |
| Analytics | 20006 | 9000 | http://localhost:20006 | Metrics computation and APIs |
| Dashboard | 20008 | 80 | http://localhost:20008 | React dashboard for real-time metrics |
| User Service | 20003 | 8081 | http://localhost:20003 | Backend API |
| Order Service | 20004 | 8082 | http://localhost:20004 | Backend API |
| Payment Service | 20005 | 8083 | http://localhost:20005 | Backend API |
| PostgreSQL | 20001 | 5432 | localhost:20001 | Database |
| Redis | 20002 | 6379 | localhost:20002 | Cache & rate limiting |

> **Note**: All services use ports in the 20000 range. See [PORTS.md](./PORTS.md) for complete port mapping details.

## Test the Platform

```bash
# 1. Check Gateway health
curl http://localhost:20007/actuator/health

# 2. Test API with key
curl -H "X-API-Key: test-api-key-12345" http://localhost:20007/api/users

# 3. Check Analytics health
curl http://localhost:20006/health

# 4. View Dashboard
open http://localhost:20008

# 5. Check Analytics metrics
curl http://localhost:20006/api/v1/metrics/aggregated
```

## Environment Variables

Edit `.env` file to customize:

```env
# DATABASE (Postgres)
POSTGRES_USER=sgp
POSTGRES_PASSWORD=sgp
POSTGRES_DB=sgp

# REDIS
REDIS_PASSWORD=

# ENVIRONMENT
ENV=local
```

## Architecture

- **Gateway**: Spring Cloud Gateway (auth, rate limiting, routing)
- **Analytics**: Spring Boot (metrics computation, PostgreSQL, Redis)
- **Dashboard**: React + Bun build + Nginx serve
- **Traffic Generator**: Bun (load testing)

## Tech Stack

- Java 17 + Spring Boot 3.2
- React 18 + TypeScript
- Bun (build tool)
- PostgreSQL 15
- Redis 7
- Docker Compose
