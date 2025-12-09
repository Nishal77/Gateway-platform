package com.sgp.gateway.filters;

import com.sgp.gateway.models.TelemetryEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.UUID;

/**
 * Telemetry filter that captures request/response metadata and emits
 * compact telemetry events to the analytics service.
 * 
 * Captures:
 * - Request path, method, status
 * - Latency (p50/p90/p99 ready)
 * - Client identity
 * - Error types
 * - Upstream service info
 */
@Component
public class TelemetryFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(TelemetryFilter.class);
    private final TelemetryEmitter telemetryEmitter;

    public TelemetryFilter(TelemetryEmitter telemetryEmitter) {
        this.telemetryEmitter = telemetryEmitter;
    }

    @Value("${gateway.telemetry.enabled:true}")
    private boolean telemetryEnabled;

    private static final String START_TIME_ATTRIBUTE = "startTime";
    private static final String REQUEST_ID_ATTRIBUTE = "requestId";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (!telemetryEnabled) {
            return chain.filter(exchange);
        }

        String requestId = UUID.randomUUID().toString();
        long startTime = System.currentTimeMillis();

        exchange.getAttributes().put(START_TIME_ATTRIBUTE, startTime);
        exchange.getAttributes().put(REQUEST_ID_ATTRIBUTE, requestId);
        
        return chain.filter(exchange)
            .doOnSuccess(v -> {
                // Emit telemetry on successful completion (only once)
                if (exchange.getAttribute("telemetryEmitted") == null) {
                    emitTelemetry(exchange, requestId, startTime, null);
                }
            })
            .doOnError(error -> {
                // Emit telemetry on error (only once)
                if (exchange.getAttribute("telemetryEmitted") == null) {
                    emitTelemetry(exchange, requestId, startTime, error);
                }
            })
            .doFinally(signalType -> {
                // Always emit telemetry as fallback (catches rate-limited requests that complete early)
                // Only emit if not already emitted in doOnSuccess/doOnError
                if (exchange.getAttribute("telemetryEmitted") == null) {
                    emitTelemetry(exchange, requestId, startTime, null);
                }
            });
    }

    private void emitTelemetry(ServerWebExchange exchange, String requestId, 
                               long startTime, Throwable error) {
        try {
            ServerHttpRequest request = exchange.getRequest();
            ServerHttpResponse response = exchange.getResponse();

            long latencyMs = System.currentTimeMillis() - startTime;
            String clientId = (String) exchange.getAttributes().getOrDefault("clientId", "unknown");
            String apiKey = (String) exchange.getAttributes().getOrDefault("apiKey", "");
            
            // Extract route information from Spring Cloud Gateway attributes
            Route route = exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
            String routeId = route != null ? route.getId() : "";
            
            // Ensure all required fields are set (analytics service expects non-null values)
            String path = request.getURI().getPath();
            if (path == null || path.isEmpty()) {
                path = "/";
            }
            
            String method = request.getMethod() != null ? request.getMethod().name() : "UNKNOWN";
            int statusCode = response.getStatusCode() != null ? response.getStatusCode().value() : 500;
            String finalClientId = clientId != null && !clientId.isEmpty() ? clientId : "unknown";
            
            // Determine upstream service from route ID or path
            String upstreamService = "unknown";
            if (routeId != null && !routeId.isEmpty()) {
                if (routeId.contains("user")) {
                    upstreamService = "user-service";
                } else if (routeId.contains("order")) {
                    upstreamService = "order-service";
                } else if (routeId.contains("payment")) {
                    upstreamService = "payment-service";
                } else {
                    upstreamService = routeId;
                }
            } else {
                // Fallback: determine from path
                if (path.contains("/users")) {
                    upstreamService = "user-service";
                } else if (path.contains("/orders")) {
                    upstreamService = "order-service";
                } else if (path.contains("/payments")) {
                    upstreamService = "payment-service";
                }
            }

            TelemetryEvent event = new TelemetryEvent();
            event.setRequestId(requestId);
            event.setPath(path);
            event.setMethod(method);
            event.setStatusCode(statusCode);
            event.setLatencyMs(latencyMs);
            event.setClientId(finalClientId);
            event.setApiKey(apiKey != null ? apiKey : "");
            event.setUpstreamService(upstreamService);
            event.setRouteId(routeId != null ? routeId : "");
            event.setTimestamp(Instant.now());
            event.setErrorType(error != null ? error.getClass().getSimpleName() : null);
            event.setUserAgent(request.getHeaders().getFirst("User-Agent"));
            String ipAddress = "unknown";
            if (request.getRemoteAddress() != null && request.getRemoteAddress().getAddress() != null) {
                ipAddress = request.getRemoteAddress().getAddress().getHostAddress();
            }
            event.setIpAddress(ipAddress);

            // Mark as emitted BEFORE emitting to prevent race conditions
            if (exchange.getAttribute("telemetryEmitted") == null) {
                exchange.getAttributes().put("telemetryEmitted", true);
                telemetryEmitter.emit(event);
            }

        } catch (Exception e) {
            log.error("Failed to emit telemetry for request: {}", requestId, e);
        }
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE; // Run last to capture all data
    }
}

