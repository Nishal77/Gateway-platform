package com.sgp.gateway.filters;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Global authentication filter that validates API keys.
 * 
 * In production, this would integrate with:
 * - Redis cache for API key lookup
 * - Database for key validation
 * - OAuth2/JWT for advanced auth
 */
@Component
public class AuthenticationFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(AuthenticationFilter.class);
    @Value("${gateway.auth.enabled:true}")
    private boolean authEnabled;

    @Value("${gateway.auth.skip-paths:/health,/actuator}")
    private List<String> skipPaths;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (!authEnabled) {
            return chain.filter(exchange);
        }

        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        // Skip auth for health checks and actuator endpoints
        if (skipPaths.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);
        }

        String apiKey = request.getHeaders().getFirst("X-API-Key");
        
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Request rejected: Missing API key. Path: {}", path);
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // TODO: Validate API key against Redis/Database
        // For now, accept any non-empty API key
        if (!isValidApiKey(apiKey)) {
            log.warn("Request rejected: Invalid API key. Path: {}", path);
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // Add client ID to request attributes for downstream use
        String clientId = extractClientId(apiKey);
        exchange.getAttributes().put("clientId", clientId);
        exchange.getAttributes().put("apiKey", apiKey);

        return chain.filter(exchange);
    }

    private boolean isValidApiKey(String apiKey) {
        // Simple validation - in production, check against Redis/DB
        return apiKey.length() >= 8;
    }

    private String extractClientId(String apiKey) {
        // Extract client ID from API key (simplified)
        // In production, lookup from cache/database
        return apiKey.substring(0, Math.min(8, apiKey.length()));
    }

    @Override
    public int getOrder() {
        return -100; // High priority - run before other filters
    }
}

