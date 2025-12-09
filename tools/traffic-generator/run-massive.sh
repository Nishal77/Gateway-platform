#!/bin/bash

# Massive Scale Load Testing Script
# Generates millions/billions of requests per second

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default configuration
GATEWAY_URL="${GATEWAY_URL:-http://localhost:20007}"
API_KEY="${API_KEY:-test-api-key-12345}"
MODE="${1:-million}" # million, billion, custom

echo -e "${BLUE}🚀 MASSIVE SCALE LOAD TESTING${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js${NC}"
    exit 1
fi

# Check gateway
echo -e "${BLUE}🔍 Checking gateway...${NC}"
if curl -s -f "${GATEWAY_URL}/actuator/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Gateway is reachable${NC}\n"
else
    echo -e "${YELLOW}⚠️  Warning: Gateway may not be reachable${NC}\n"
fi

# Set mode-specific configurations
case "$MODE" in
    "million")
        RPS="${RPS:-1000000}"  # 1 million RPS
        DURATION="${DURATION:-60}"  # 60 seconds
        WORKERS="${WORKERS:-$(($(nproc) * 4))}"  # 4x CPU cores
        CONNECTIONS="${CONNECTIONS:-100}"
        echo -e "${GREEN}📊 Mode: MILLION REQUESTS PER SECOND${NC}"
        echo -e "   Target: ${RPS} RPS | Duration: ${DURATION}s | Workers: ${WORKERS}\n"
        ;;
    "billion")
        RPS="${RPS:-1000000000}"  # 1 billion RPS
        DURATION="${DURATION:-60}"
        WORKERS="${WORKERS:-$(($(nproc) * 8))}"  # 8x CPU cores
        CONNECTIONS="${CONNECTIONS:-500}"
        echo -e "${GREEN}🔥 Mode: BILLION REQUESTS PER SECOND${NC}"
        echo -e "   Target: ${RPS} RPS | Duration: ${DURATION}s | Workers: ${WORKERS}\n"
        echo -e "${YELLOW}⚠️  This is EXTREME load. Ensure your system can handle it!${NC}\n"
        ;;
    "custom")
        RPS="${RPS:-100000}"
        DURATION="${DURATION:-60}"
        WORKERS="${WORKERS:-$(($(nproc) * 2))}"
        CONNECTIONS="${CONNECTIONS:-50}"
        echo -e "${GREEN}⚙️  Mode: CUSTOM${NC}"
        echo -e "   Target: ${RPS} RPS | Duration: ${DURATION}s | Workers: ${WORKERS}\n"
        ;;
    *)
        echo -e "${YELLOW}⚠️  Unknown mode: ${MODE}${NC}"
        echo -e "   Available: million, billion, custom"
        echo -e "   Using million mode...\n"
        MODE="million"
        RPS="${RPS:-1000000}"
        DURATION="${DURATION:-60}"
        WORKERS="${WORKERS:-$(($(nproc) * 4))}"
        CONNECTIONS="${CONNECTIONS:-100}"
        ;;
esac

# Export environment variables
export GATEWAY_URL
export API_KEY
export MODE
export RPS
export DURATION
export WORKERS
export CONNECTIONS_PER_WORKER=$CONNECTIONS

echo -e "${BLUE}Starting massive load generation...${NC}\n"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"

# Run the generator
node massive-load-generator.js \
  --rps=${RPS} \
  --duration=${DURATION} \
  --workers=${WORKERS} \
  --connections=${CONNECTIONS}

echo -e "\n${GREEN}✅ Load test completed!${NC}"

