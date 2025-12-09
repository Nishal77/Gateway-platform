package com.sgp.analytics.models;

import java.time.Instant;

/**
 * Aggregated metrics for a time window.
 * Computed from telemetry events and cached in Redis.
 */
public class MetricAggregation {
    private String endpoint;
    private String method;
    private Instant windowStart;
    private Instant windowEnd;
    private long requestCount;
    private double rps; // Requests per second
    private long p50LatencyMs;
    private long p90LatencyMs;
    private long p99LatencyMs;
    private long minLatencyMs;
    private long maxLatencyMs;
    private double errorRate; // Percentage
    private long errorCount;
    private long successCount;
    private String upstreamService;

    public MetricAggregation() {
    }

    // Builder pattern methods
    public static MetricAggregationBuilder builder() {
        return new MetricAggregationBuilder();
    }

    public static class MetricAggregationBuilder {
        private MetricAggregation aggregation = new MetricAggregation();

        public MetricAggregationBuilder endpoint(String endpoint) {
            aggregation.endpoint = endpoint;
            return this;
        }

        public MetricAggregationBuilder method(String method) {
            aggregation.method = method;
            return this;
        }

        public MetricAggregationBuilder windowStart(Instant windowStart) {
            aggregation.windowStart = windowStart;
            return this;
        }

        public MetricAggregationBuilder windowEnd(Instant windowEnd) {
            aggregation.windowEnd = windowEnd;
            return this;
        }

        public MetricAggregationBuilder requestCount(long requestCount) {
            aggregation.requestCount = requestCount;
            return this;
        }

        public MetricAggregationBuilder rps(double rps) {
            aggregation.rps = rps;
            return this;
        }

        public MetricAggregationBuilder p50LatencyMs(long p50LatencyMs) {
            aggregation.p50LatencyMs = p50LatencyMs;
            return this;
        }

        public MetricAggregationBuilder p90LatencyMs(long p90LatencyMs) {
            aggregation.p90LatencyMs = p90LatencyMs;
            return this;
        }

        public MetricAggregationBuilder p99LatencyMs(long p99LatencyMs) {
            aggregation.p99LatencyMs = p99LatencyMs;
            return this;
        }

        public MetricAggregationBuilder minLatencyMs(long minLatencyMs) {
            aggregation.minLatencyMs = minLatencyMs;
            return this;
        }

        public MetricAggregationBuilder maxLatencyMs(long maxLatencyMs) {
            aggregation.maxLatencyMs = maxLatencyMs;
            return this;
        }

        public MetricAggregationBuilder errorRate(double errorRate) {
            aggregation.errorRate = errorRate;
            return this;
        }

        public MetricAggregationBuilder errorCount(long errorCount) {
            aggregation.errorCount = errorCount;
            return this;
        }

        public MetricAggregationBuilder successCount(long successCount) {
            aggregation.successCount = successCount;
            return this;
        }

        public MetricAggregationBuilder upstreamService(String upstreamService) {
            aggregation.upstreamService = upstreamService;
            return this;
        }

        public MetricAggregation build() {
            return aggregation;
        }
    }

    // Getters
    public String getEndpoint() { return endpoint; }
    public String getMethod() { return method; }
    public Instant getWindowStart() { return windowStart; }
    public Instant getWindowEnd() { return windowEnd; }
    public long getRequestCount() { return requestCount; }
    public double getRps() { return rps; }
    public long getP50LatencyMs() { return p50LatencyMs; }
    public long getP90LatencyMs() { return p90LatencyMs; }
    public long getP99LatencyMs() { return p99LatencyMs; }
    public long getMinLatencyMs() { return minLatencyMs; }
    public long getMaxLatencyMs() { return maxLatencyMs; }
    public double getErrorRate() { return errorRate; }
    public long getErrorCount() { return errorCount; }
    public long getSuccessCount() { return successCount; }
    public String getUpstreamService() { return upstreamService; }
}

