package com.sgp.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Smart Gateway Platform - Gateway Service
 * 
 * Traffic entry layer that performs:
 * - Authentication (API key validation)
 * - Rate limiting (Redis-based token bucket)
 * - Request routing (dynamic route configuration)
 * - Telemetry emission (compact request logs)
 * - Circuit breaking (Resilience4j)
 */
@SpringBootApplication
@EnableScheduling
public class GatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}

