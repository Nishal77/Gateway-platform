package com.sgp.gateway.models;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/**
 * Compact telemetry event emitted for each request.
 * Designed to be lightweight and efficient for high-throughput scenarios.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TelemetryEvent {
    private String requestId;
    private String path;
    private String method;
    private int statusCode;
    private long latencyMs;
    private String clientId;
    private String apiKey;
    private String upstreamService;
    private String routeId;
    private Instant timestamp;
    private String errorType; // null if successful
    private String userAgent;
    private String ipAddress;

    public TelemetryEvent() {
    }

    // Getters and Setters
    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public int getStatusCode() { return statusCode; }
    public void setStatusCode(int statusCode) { this.statusCode = statusCode; }

    public long getLatencyMs() { return latencyMs; }
    public void setLatencyMs(long latencyMs) { this.latencyMs = latencyMs; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public String getUpstreamService() { return upstreamService; }
    public void setUpstreamService(String upstreamService) { this.upstreamService = upstreamService; }

    public String getRouteId() { return routeId; }
    public void setRouteId(String routeId) { this.routeId = routeId; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public String getErrorType() { return errorType; }
    public void setErrorType(String errorType) { this.errorType = errorType; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
}

