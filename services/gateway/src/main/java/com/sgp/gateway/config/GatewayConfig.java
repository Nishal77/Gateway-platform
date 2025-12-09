package com.sgp.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Gateway route configuration.
 * 
 * Routes can be:
 * - Defined statically here
 * - Loaded dynamically from routes.yml
 * - Refreshed at runtime via Config API
 */
@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
            // User Service Route
            .route("user-service", r -> r
                .path("/api/users/**")
                .filters(f -> f.stripPrefix(1))
                .uri("http://user-service:8081"))

            // Order Service Route
            .route("order-service", r -> r
                .path("/api/orders/**")
                .filters(f -> f.stripPrefix(1))
                .uri("http://order-service:8082"))

            // Payment Service Route
            .route("payment-service", r -> r
                .path("/api/payments/**")
                .filters(f -> f.stripPrefix(1))
                .uri("http://payment-service:8083"))

            // Canary routing example (v1/v2)
            .route("user-service-v2", r -> r
                .path("/api/v2/users/**")
                .filters(f -> f.stripPrefix(2))
                .uri("http://backend-service:8084")) // v2 instance

            .build();
    }
}

