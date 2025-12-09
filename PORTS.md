# Smart Gateway Platform - Port Configuration

All services use unique ports in the **20000** range to avoid conflicts.

## Port Mappings

| Service | Host Port | Internal Port | Access URL |
|---------|-----------|---------------|------------|
| **PostgreSQL** | **20001** | 5432 | `localhost:20001` |
| **Redis** | **20002** | 6379 | `localhost:20002` |
| **User Service** | **20003** | 8081 | `http://localhost:20003` |
| **Order Service** | **20004** | 8082 | `http://localhost:20004` |
| **Payment Service** | **20005** | 8083 | `http://localhost:20005` |
| **Analytics Service** | **20006** | 9000 | `http://localhost:20006` |
| **Gateway** | **20007** | 8080 | `http://localhost:20007` |
| **Dashboard** | **20008** | 80 | `http://localhost:20008` |

## Quick Access URLs

### Main Services
- **Dashboard**: http://localhost:20008
- **Gateway**: http://localhost:20007
- **Analytics API**: http://localhost:20006/api/v1/metrics/aggregated

### Backend Services
- **User Service**: http://localhost:20003
- **Order Service**: http://localhost:20004
- **Payment Service**: http://localhost:20005

### Databases
- **PostgreSQL**: `localhost:20001`
- **Redis**: `localhost:20002`

## Internal Docker Communication

Services communicate internally using service names and internal ports (not affected by host port changes):

- `postgres:5432` - PostgreSQL
- `redis:6379` - Redis
- `analytics:9000` - Analytics Service
- `gateway:8080` - Gateway
- `user-service:8081` - User Service
- `order-service:8082` - Order Service
- `payment-service:8083` - Payment Service

## Configuration

### Environment Variables

When running services locally (outside Docker):

```bash
# Gateway connects to Analytics
ANALYTICS_SERVICE_URL=http://localhost:20006/api/v1/telemetry

# Traffic Generator connects to Gateway
GATEWAY_URL=http://localhost:20007

# Dashboard API (local development)
VITE_API_URL=http://localhost:20006/api/v1
```

### Docker Compose

All port mappings are configured in `docker-compose.yml`. Internal communication uses Docker service names.

## Testing Connectivity

```bash
# Test Gateway
curl http://localhost:20007/actuator/health

# Test Analytics
curl http://localhost:20006/api/v1/metrics/aggregated

# Test Dashboard
curl http://localhost:20008

# Test Backend Services
curl http://localhost:20003/actuator/health
curl http://localhost:20004/actuator/health
curl http://localhost:20005/actuator/health
```

## Port Range

All services use ports in the **20000-20009** range:
- 20001-20005: Infrastructure & Backend Services
- 20006-20008: Platform Services (Analytics, Gateway, Dashboard)

This ensures no conflicts with common development ports (3000, 5432, 6379, 8080, 9000, etc.)

