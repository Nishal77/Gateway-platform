package com.sgp.analytics;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Smart Gateway Platform - Analytics Service
 * 
 * Responsibilities:
 * - Ingest telemetry events from gateway
 * - Compute metrics (RPS, latency percentiles, error rates)
 * - Store raw events and aggregated metrics
 * - Expose REST APIs for dashboard consumption
 * - Real-time metric streaming via WebSocket/SSE
 */
@SpringBootApplication
@EnableScheduling
public class AnalyticsApplication {
    public static void main(String[] args) {
        SpringApplication.run(AnalyticsApplication.class, args);
    }
}

