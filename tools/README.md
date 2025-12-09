# Traffic Generator & Load Testing Tools

Enterprise FAANG-level traffic generation and load testing tools for the Smart Gateway Platform.

## 🚀 Quick Start

### Standalone Traffic Generator (Recommended for Demos)

```bash
cd tools/traffic-generator

# Quick demo (3.3 minutes, perfect for interviews)
./run.sh demo

# Enterprise load (5 minutes, high throughput)
./run.sh enterprise

# Massive load (millions of requests)
./run.sh massive 1000000
```

**No Docker required!** Runs directly with Node.js.

## 📁 Directory Structure

```
tools/
├── traffic-generator/          # Standalone traffic generator
│   ├── enterprise-generator.js # Main generator (Node.js)
│   ├── run.sh                  # Easy runner script
│   ├── README-STANDALONE.md    # Standalone documentation
│   └── README.md               # Full documentation
│
└── load-testing/               # K6 load testing scripts
    ├── k6-advanced.js         # Advanced K6 script
    ├── k6-script.js           # Basic K6 script
    └── README.md              # K6 documentation
```

## 🎯 Which Tool to Use?

### For Demos & Interviews
**Use: Standalone Traffic Generator** (`tools/traffic-generator/run.sh`)
- ✅ No Docker required
- ✅ Easy to run
- ✅ Perfect for presentations
- ✅ Can generate millions of requests
- ✅ Real-time statistics

### For MASSIVE Scale Testing (Millions/Billions RPS)
**Use: Massive Load Generator** (`tools/traffic-generator/run-massive.sh`)
- ✅ Multi-process architecture (cluster mode)
- ✅ Connection pooling for maximum throughput
- ✅ Can generate 1M+ RPS per machine
- ✅ Distributed ready (run on multiple machines)
- ✅ Real-time aggregated stats
- ✅ Perfect for load balancing tests

### For Professional Load Testing
**Use: K6** (`tools/load-testing/k6-advanced.js`)
- ✅ Industry-standard tool
- ✅ Detailed metrics
- ✅ Export to Grafana/InfluxDB
- ✅ Highly configurable
- ✅ Production-grade

## 📊 Traffic Generator Modes

### 1. Demo Mode
Perfect for interviews and presentations.

```bash
./run.sh demo
```

- Duration: 200 seconds (~3.3 minutes)
- RPS: 25
- Concurrent users: 15
- Perfect for showing dashboard metrics

### 2. Enterprise Mode
High-throughput realistic load.

```bash
./run.sh enterprise
```

- Duration: 300 seconds (5 minutes)
- RPS: 100 (configurable)
- Concurrent users: 50
- 10 worker threads

### 3. Massive Mode (Standard)
Generate millions of requests.

```bash
# 1 million requests
./run.sh massive 1000000

# 10 million requests
./run.sh massive 10000000
```

- Configurable total requests
- 20 worker threads
- Optimized for maximum throughput

### 4. MASSIVE SCALE Mode (NEW!)
Generate MILLIONS or BILLIONS of requests per second.

```bash
# 1 Million RPS
./run-massive.sh million

# 1 Billion RPS (extreme!)
./run-massive.sh billion

# Custom: 10 Million RPS
RPS=10000000 ./run-massive.sh custom
```

- Multi-process architecture (cluster mode)
- Connection pooling
- Can generate 1M+ RPS per machine
- Distributed ready
- Perfect for load balancing tests

## 🔧 Configuration

### Environment Variables

```bash
# Gateway URL
export GATEWAY_URL=http://localhost:18080

# API Key
export API_KEY=test-api-key-12345

# Mode
export MODE=enterprise  # enterprise, demo, massive

# Performance
export RPS=200                    # Requests per second
export DURATION=600              # Duration in seconds
export CONCURRENT_USERS=100      # Concurrent user journeys
export WORKERS=20                # Worker threads
export TOTAL_REQUESTS=1000000    # Total requests (massive mode)
```

### Examples

```bash
# High-load test
GATEWAY_URL=http://localhost:18080 \
RPS=500 \
DURATION=600 \
CONCURRENT_USERS=100 \
WORKERS=20 \
./run.sh enterprise

# Quick demo
./run.sh demo

# Million requests
./run.sh massive 1000000
```

## 📈 What Gets Generated

### User Journeys (70% of traffic)
1. Create/Get User
2. Create Order
3. Process Payment

### Random Requests (30% of traffic)
- GET /api/users
- GET /api/users/{id}
- GET /api/orders
- GET /api/orders/{id}
- GET /api/payments
- GET /api/payments/{id}
- POST /api/users
- POST /api/orders
- POST /api/payments

## 🎬 Demo Checklist

1. ✅ Start services: `docker-compose up -d`
2. ✅ Open dashboard: http://localhost:13000
3. ✅ Run generator: `cd tools/traffic-generator && ./run.sh demo`
4. ✅ Show metrics updating in real-time
5. ✅ Explain architecture and features

## 📚 Documentation

- **Quick Start**: `tools/traffic-generator/README-STANDALONE.md`
- **Full Guide**: `tools/traffic-generator/README.md`
- **Demo Guide**: `tools/DEMO-GUIDE.md`
- **K6 Guide**: `tools/load-testing/README.md`

## 🐛 Troubleshooting

### Dashboard Shows Zero
- Check analytics: `docker-compose ps analytics`
- Check gateway logs: `docker-compose logs gateway`
- Restart analytics: `docker-compose restart analytics`

### Generator Not Working
- Check Node.js: `node --version` (need v14+)
- Check gateway: `curl http://localhost:18080/actuator/health`
- Verify API key matches

### Low Throughput
- Increase workers: `WORKERS=20 ./run.sh enterprise`
- Check network latency
- Verify services can handle load

## 💡 Pro Tips

1. **For Interviews**: Use `demo` mode - perfect duration and load
2. **For Load Testing**: Use `enterprise` mode with high RPS
3. **For Stress Testing**: Use `massive` mode with millions of requests
4. **For Presentations**: Keep dashboard open while generator runs

## 🎯 Success Metrics

After running traffic generator, you should see:
- ✅ Dashboard showing real-time metrics
- ✅ RPS > 0 and increasing
- ✅ Latency percentiles displayed
- ✅ Error rate < 1%
- ✅ Top endpoints populated
- ✅ User journeys completing

---

**Ready to demo?** Start with `./run.sh demo` and watch your dashboard come alive! 🚀

