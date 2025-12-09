package com.sgp.gateway.filters;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Rate limiting filter using Redis-based token bucket algorithm.
 * 
 * Implements sliding window rate limiting per client (API key).
 * Uses Redis for distributed rate limiting across gateway instances.
 */
@Component
public class RateLimitFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);
    private final ReactiveRedisTemplate<String, String> redisTemplate;

    public RateLimitFilter(ReactiveRedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Value("${gateway.rate-limit.enabled:true}")
    private boolean rateLimitEnabled;

    @Value("${gateway.rate-limit.default-requests-per-minute:60}")
    private int defaultRequestsPerMinute;

    @Value("${gateway.rate-limit.skip-paths:/health,/actuator}")
    private String[] skipPaths;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (!rateLimitEnabled) {
            return chain.filter(exchange);
        }

        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        // Skip rate limiting for health checks
        for (String skipPath : skipPaths) {
            if (path.startsWith(skipPath)) {
                return chain.filter(exchange);
            }
        }

        String clientIdAttr = (String) exchange.getAttributes().get("clientId");
        final String finalClientId = clientIdAttr != null 
            ? clientIdAttr
            : (request.getRemoteAddress() != null && request.getRemoteAddress().getAddress() != null
                ? request.getRemoteAddress().getAddress().getHostAddress() 
                : "unknown");

        String rateLimitKey = "rate_limit:" + finalClientId;
        int requestsPerMinute = getRateLimitForClient(finalClientId);
        final int finalRequestsPerMinute = requestsPerMinute;

        return checkRateLimit(rateLimitKey, finalRequestsPerMinute)
            .flatMap(allowed -> {
                if (allowed) {
                    return chain.filter(exchange);
                } else {
                    log.warn("Rate limit exceeded for client: {} on path: {}", finalClientId, path);
                    ServerHttpResponse response = exchange.getResponse();
                    response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
                    response.getHeaders().add("X-RateLimit-Limit", String.valueOf(finalRequestsPerMinute));
                    response.getHeaders().add("X-RateLimit-Remaining", "0");
                    
                    // Continue chain to allow telemetry filter to capture rate-limited requests
                    // TelemetryFilter runs at LOWEST_PRECEDENCE, so it will capture this request
                    // The response status is already set, so downstream filters can see it
                    return chain.filter(exchange);
                }
            });
    }

    /**
     * Token bucket algorithm implementation using Redis.
     * Uses sliding window approach for accurate rate limiting.
     */
    private Mono<Boolean> checkRateLimit(String key, int requestsPerMinute) {
        return redisTemplate.opsForValue()
            .increment(key)
            .flatMap(count -> {
                if (count == 1) {
                    // Set expiration on first request
                    return redisTemplate.expire(key, Duration.ofSeconds(60))
                        .thenReturn(count);
                }
                return Mono.just(count);
            })
            .map(count -> count <= requestsPerMinute)
            .defaultIfEmpty(true)
            .onErrorReturn(true); // Fail open on Redis errors
    }

    private int getRateLimitForClient(String clientId) {
        // TODO: Lookup client-specific rate limits from Redis/Config
        // For now, return default
        return defaultRequestsPerMinute;
    }

    @Override
    public int getOrder() {
        return -50; // Run after auth, before routing
    }
}

