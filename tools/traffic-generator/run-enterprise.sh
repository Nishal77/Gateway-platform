#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

GATEWAY_URL="${GATEWAY_URL:-http://localhost:20007}"
API_KEY="${API_KEY:-test-api-key-12345}"
MODE="${1:-continuous}"
BASE_RPS="${BASE_RPS:-100000}"
MAX_RPS="${MAX_RPS:-10000000}"

echo -e "${BLUE}Enterprise Production-Grade Traffic Generator${NC}"
echo -e "${BLUE}==============================================${NC}\n"

if ! command -v bun &> /dev/null; then
    echo -e "${RED}Bun not found. Please install Bun:${NC}"
    echo -e "${YELLOW}   curl -fsSL https://bun.sh/install | bash${NC}"
    exit 1
fi

echo -e "${BLUE}Checking gateway...${NC}"
if curl -s -f "${GATEWAY_URL}/actuator/health" > /dev/null 2>&1; then
    echo -e "${GREEN}Gateway is reachable${NC}\n"
else
    echo -e "${YELLOW}Warning: Gateway may not be reachable${NC}\n"
fi

case "$MODE" in
    "continuous")
        echo -e "${GREEN}Mode: CONTINUOUS (unlimited requests until stopped)${NC}"
        echo -e "   Base RPS: ${BASE_RPS} | Max RPS: ${MAX_RPS}\n"
        ;;
    "load-test")
        DURATION="${DURATION:-300}"
        echo -e "${GREEN}Mode: LOAD TEST${NC}"
        echo -e "   Base RPS: ${BASE_RPS} | Duration: ${DURATION}s\n"
        export DURATION
        ;;
    *)
        echo -e "${YELLOW}Unknown mode: ${MODE}${NC}"
        echo -e "   Available: continuous, load-test"
        echo -e "   Using continuous mode...\n"
        MODE="continuous"
        ;;
esac

export GATEWAY_URL
export API_KEY
export MODE
export BASE_RPS
export MAX_RPS

echo -e "${BLUE}Starting traffic generation...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"

bun enterprise-load-generator.js \
  --rps=${BASE_RPS} \
  --max-rps=${MAX_RPS} \
  --mode=${MODE}

echo -e "\n${GREEN}Traffic generation stopped${NC}"

