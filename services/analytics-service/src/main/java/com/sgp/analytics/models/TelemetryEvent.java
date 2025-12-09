package com.sgp.analytics.models;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;

import java.time.Instant;

/**
 * Telemetry event model matching gateway emission format.
 */
@Entity
@Table(name = "telemetry_events", indexes = {
    @Index(name = "idx_timestamp", columnList = "timestamp"),
    @Index(name = "idx_path", columnList = "path"),
    @Index(name = "idx_client_id", columnList = "clientId"),
    @Index(name = "idx_status_code", columnList = "statusCode")
})
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TelemetryEvent {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String requestId;
    
    @Column(nullable = false)
    private String path;
    
    @Column(nullable = false)
    private String method;
    
    @Column(nullable = false)
    private Integer statusCode;
    
    @Column(nullable = false)
    private Long latencyMs;
    
    @Column(nullable = false)
    private String clientId;
    
    private String apiKey;
    
    private String upstreamService;
    
    private String routeId;
    
    @Column(nullable = false)
    private Instant timestamp;
    
    private String errorType;
    
    private String userAgent;
    
    private String ipAddress;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    public TelemetryEvent() {
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public Integer getStatusCode() { return statusCode; }
    public void setStatusCode(Integer statusCode) { this.statusCode = statusCode; }

    public Long getLatencyMs() { return latencyMs; }
    public void setLatencyMs(Long latencyMs) { this.latencyMs = latencyMs; }

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

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}

