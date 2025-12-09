#!/bin/bash

# Enterprise Traffic Generator - Standalone Runner
# Usage: ./run.sh [mode] [options]
# Examples:
#   ./run.sh                    # Default enterprise mode
#   ./run.sh demo              # Demo mode
#   ./run.sh massive 1000000   # Generate 1 million requests
#   ./run.sh enterprise 500    # Enterprise mode with 500 RPS

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default configuration
GATEWAY_URL="${GATEWAY_URL:-http://localhost:20007}"
API_KEY="${API_KEY:-test-api-key-12345}"
MODE="${1:-enterprise}"
TOTAL_REQUESTS="${2:-0}"

echo -e "${BLUE}🚀 Enterprise FAANG-Level Traffic Generator${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Installing...${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check gateway connectivity
echo -e "${BLUE}🔍 Checking gateway connectivity...${NC}"
if curl -s -f "${GATEWAY_URL}/actuator/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Gateway is reachable${NC}\n"
else
    echo -e "${YELLOW}⚠️  Warning: Gateway may not be reachable at ${GATEWAY_URL}${NC}"
    echo -e "${YELLOW}   Continuing anyway...${NC}\n"
fi

# Set mode-specific defaults
case "$MODE" in
    "demo")
        RPS="${RPS:-25}"
        DURATION="${DURATION:-200}"
        CONCURRENT_USERS="${CONCURRENT_USERS:-15}"
        WORKERS="${WORKERS:-5}"
        echo -e "${GREEN}📊 Mode: DEMO${NC}"
        echo -e "   RPS: ${RPS} | Duration: ${DURATION}s | Users: ${CONCURRENT_USERS}\n"
        ;;
    "massive")
        if [ "$TOTAL_REQUESTS" -eq 0 ]; then
            TOTAL_REQUESTS=1000000
        fi
        WORKERS="${WORKERS:-20}"
        echo -e "${GREEN}🔥 Mode: MASSIVE${NC}"
        echo -e "   Target: ${TOTAL_REQUESTS} requests | Workers: ${WORKERS}\n"
        export TOTAL_REQUESTS
        ;;
    "enterprise")
        RPS="${RPS:-100}"
        DURATION="${DURATION:-300}"
        CONCURRENT_USERS="${CONCURRENT_USERS:-50}"
        WORKERS="${WORKERS:-10}"
        echo -e "${GREEN}🏢 Mode: ENTERPRISE${NC}"
        echo -e "   RPS: ${RPS} | Duration: ${DURATION}s | Users: ${CONCURRENT_USERS} | Workers: ${WORKERS}\n"
        ;;
    *)
        echo -e "${YELLOW}⚠️  Unknown mode: ${MODE}${NC}"
        echo -e "   Available modes: demo, enterprise, massive"
        echo -e "   Using enterprise mode...\n"
        MODE="enterprise"
        RPS="${RPS:-100}"
        DURATION="${DURATION:-300}"
        CONCURRENT_USERS="${CONCURRENT_USERS:-50}"
        WORKERS="${WORKERS:-10}"
        ;;
esac

# Export environment variables
export GATEWAY_URL
export API_KEY
export MODE
export RPS
export DURATION
export CONCURRENT_USERS
export WORKERS

# Run the generator
echo -e "${BLUE}Starting traffic generation...${NC}\n"
node enterprise-generator.js

echo -e "\n${GREEN}✅ Traffic generation completed!${NC}"

