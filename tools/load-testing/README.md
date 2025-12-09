# Load Testing with K6

Professional load testing using K6 for the Smart Gateway Platform.

## Installation

### macOS
```bash
brew install k6
```

### Linux
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Docker
```bash
docker run --rm -i grafana/k6 run - <k6-advanced.js
```

## Quick Start

### Basic Test
```bash
k6 run k6-advanced.js
```

### Custom Load Profile
```bash
k6 run --vus 50 --duration 5m k6-advanced.js
```

### Staged Load Test
```bash
k6 run --stage 30s:20,2m:50,1m:100,3m:50 k6-advanced.js
```

### With Custom Gateway URL
```bash
GATEWAY_URL=http://localhost:18080 k6 run k6-advanced.js
```

## Test Scenarios

### 1. Smoke Test (Quick Validation)
```bash
k6 run --vus 1 --duration 30s k6-advanced.js
```

### 2. Load Test (Normal Load)
```bash
k6 run --vus 50 --duration 5m k6-advanced.js
```

### 3. Stress Test (Find Breaking Point)
```bash
k6 run --vus 100 --duration 10m k6-advanced.js
```

### 4. Spike Test (Sudden Burst)
```bash
k6 run --stage 10s:10,10s:200,10s:10 k6-advanced.js
```

### 5. Soak Test (Long Duration)
```bash
k6 run --vus 30 --duration 30m k6-advanced.js
```

## Output Formats

### JSON Output
```bash
k6 run --out json=results.json k6-advanced.js
```

### InfluxDB (for Grafana)
```bash
k6 run --out influxdb=http://localhost:8086/k6 k6-advanced.js
```

### Cloud (K6 Cloud)
```bash
k6 cloud k6-advanced.js
```

## Metrics

The script tracks:
- **HTTP Request Duration**: P50, P95, P99 latencies
- **Error Rate**: Percentage of failed requests
- **User Journey Completion**: Success rate of complete user flows
- **User Journey Duration**: Time to complete full journey

## Thresholds

Default thresholds (can be customized):
- 95% of requests < 500ms
- 99% of requests < 1s
- Error rate < 5%
- At least 100 user journeys completed

## Customization

Edit `k6-advanced.js` to customize:
- Load stages
- Thresholds
- Test scenarios
- User journey logic
- Endpoints tested

## Comparison with Traffic Generator

| Feature | K6 | Traffic Generator |
|---------|----|-------------------|
| **Best For** | Load testing, performance | Demo, realistic simulation |
| **Metrics** | Detailed, exportable | Real-time console |
| **Scenarios** | Highly configurable | Pre-built patterns |
| **Integration** | Grafana, InfluxDB | Direct to dashboard |
| **Learning Curve** | Medium | Low |

## Tips

1. **Start Small**: Begin with low VUs and short duration
2. **Monitor Services**: Watch service logs during tests
3. **Check Dashboard**: View real-time metrics in dashboard
4. **Gradual Increase**: Ramp up load gradually to find limits
5. **Document Results**: Save JSON outputs for comparison

## Troubleshooting

### Connection Refused
- Ensure gateway is running: `docker-compose ps gateway`
- Check gateway URL matches your setup

### High Error Rate
- Reduce VUs or increase duration
- Check service health: `docker-compose ps`
- Review service logs

### Timeouts
- Increase timeout in script if needed
- Check network latency
- Verify services can handle load

