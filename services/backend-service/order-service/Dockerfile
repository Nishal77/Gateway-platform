# Multi-stage build for Order Service
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy parent POM first
COPY pom.xml ./pom.xml

# Copy service POM and source
COPY order-service/pom.xml ./order-service/pom.xml
COPY order-service/src ./order-service/src

# Build application
RUN mvn -f order-service/pom.xml clean package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Install curl and wget for healthchecks
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl wget && \
    rm -rf /var/lib/apt/lists/*

# Copy built JAR
COPY --from=build /app/order-service/target/*.jar app.jar

# Non-root user for security
RUN groupadd -r spring && useradd -r -g spring spring
USER spring:spring

EXPOSE 8082

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8082/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]

