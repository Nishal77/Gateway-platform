# Bun-based Traffic Generator
FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY package.json ./
COPY bun.lockb* ./

# Install dependencies with Bun
RUN bun install --frozen-lockfile

# Copy source code
COPY advanced-generator.js ./
COPY generator-bun.js ./
COPY config-docker.json ./
COPY config-demo.json ./

# Make scripts executable
RUN chmod +x advanced-generator.js generator-bun.js

# Set default environment variables
ENV GATEWAY_URL=http://gateway:8080
ENV API_KEY=test-api-key-12345
ENV MODE=demo
ENV RPS=25
ENV DURATION=200
ENV CONCURRENT_USERS=15

# Use advanced generator by default (can be overridden)
CMD ["bun", "run", "advanced-generator.js"]

