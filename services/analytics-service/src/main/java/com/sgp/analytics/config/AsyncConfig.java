package com.sgp.analytics.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Configuration for async processing.
 * Enables async method execution for high-throughput event processing.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
    // Async processing enabled via @EnableAsync
    // Thread pool configuration is in application.yml
}

