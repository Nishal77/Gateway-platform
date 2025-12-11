# Multi-stage build for Gateway Service
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml first for better layer caching
COPY pom.xml .

# Copy source code
COPY src ./src

# Build application (will download dependencies automatically)
# Maven will handle dependency resolution during package phase
# Using increased timeouts via environment variables
ENV MAVEN_OPTS="-Dmaven.wagon.http.connectionTimeout=60000 -Dmaven.wagon.http.readTimeout=120000"
RUN mvn clean package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Install curl and wget for healthchecks
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl wget && \
    rm -rf /var/lib/apt/lists/*

# Copy built JAR
COPY --from=build /app/target/*.jar app.jar

# Non-root user for security
RUN groupadd -r spring && useradd -r -g spring spring
USER spring:spring

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# JVM optimizations for high throughput (1k-10k RPS)
# -XX:+UseG1GC: Use G1 garbage collector for better latency
# -XX:MaxGCPauseMillis: Target GC pause time
# -Xmx: Maximum heap size (adjust based on available memory)
# -Xms: Initial heap size (set to max for consistent performance)
# -XX:+UseStringDeduplication: Reduce memory usage
# -XX:+OptimizeStringConcat: Optimize string operations
ENTRYPOINT ["java", \
  "-XX:+UseG1GC", \
  "-XX:MaxGCPauseMillis=200", \
  "-Xmx512m", \
  "-Xms512m", \
  "-XX:+UseStringDeduplication", \
  "-XX:+OptimizeStringConcat", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]

