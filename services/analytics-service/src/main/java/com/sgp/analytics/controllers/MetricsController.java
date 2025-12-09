package com.sgp.analytics.controllers;

import com.sgp.analytics.models.MetricAggregation;
import com.sgp.analytics.models.TelemetryEvent;
import com.sgp.analytics.repository.MetricCacheRepository;
import com.sgp.analytics.repository.TelemetryEventRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * REST API for dashboard to fetch metrics and analytics.
 */
@RestController
@RequestMapping("/api/v1/metrics")
public class MetricsController {

    private final MetricCacheRepository cacheRepository;
    private final TelemetryEventRepository eventRepository;

    public MetricsController(MetricCacheRepository cacheRepository, TelemetryEventRepository eventRepository) {
        this.cacheRepository = cacheRepository;
        this.eventRepository = eventRepository;
    }

    /**
     * Get aggregated metrics for all endpoints.
     * Returns real-time metrics computed from actual telemetry events.
     * Returns empty list if no traffic has been processed.
     */
    @GetMapping("/aggregated")
    public ResponseEntity<List<MetricAggregation>> getAggregatedMetrics() {
        List<MetricAggregation> metrics = cacheRepository.getAllMetrics();
        // Return empty list if no metrics (no traffic yet) - this is expected behavior
        // Dashboard will show appropriate empty state
        return ResponseEntity.ok(metrics != null ? metrics : List.of());
    }

    @GetMapping("/endpoint/{endpoint}")
    public ResponseEntity<MetricAggregation> getEndpointMetrics(@PathVariable String endpoint,
                                                                 @RequestParam(defaultValue = "GET") String method) {
        String key = endpoint + ":" + method;
        MetricAggregation metrics = cacheRepository.getMetrics(key);
        if (metrics == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/rps")
    public ResponseEntity<Map<String, Double>> getRPS() {
        Instant since = Instant.now().minus(60, ChronoUnit.SECONDS);
        long count = eventRepository.countSince(since);
        double rps = count / 60.0;
        
        return ResponseEntity.ok(Map.of("rps", rps, "window_seconds", 60.0));
    }

    @GetMapping("/top-endpoints")
    public ResponseEntity<List<Map<String, Object>>> getTopEndpoints(
            @RequestParam(defaultValue = "10") int limit) {
        Instant since = Instant.now().minus(60, ChronoUnit.SECONDS);
        List<Object[]> results = eventRepository.findTopEndpoints(
            since, 
            org.springframework.data.domain.PageRequest.of(0, limit)
        );
        
        List<Map<String, Object>> topEndpoints = results.stream()
            .map(row -> Map.of(
                "endpoint", row[0],
                "count", row[1]
            ))
            .toList();
        
        return ResponseEntity.ok(topEndpoints);
    }

    @GetMapping("/events/recent")
    public ResponseEntity<List<TelemetryEvent>> getRecentEvents(
            @RequestParam(defaultValue = "100") int limit) {
        Instant since = Instant.now().minus(5, ChronoUnit.MINUTES);
        List<TelemetryEvent> events = eventRepository.findRecentEvents(since);
        
        if (events.size() > limit) {
            events = events.subList(0, limit);
        }
        
        return ResponseEntity.ok(events);
    }
    
    /**
     * Debug endpoint to check system health and data flow.
     */
    @GetMapping("/debug")
    public ResponseEntity<Map<String, Object>> getDebugInfo() {
        Instant since = Instant.now().minus(60, ChronoUnit.SECONDS);
        long eventCount = eventRepository.countSince(since);
        List<MetricAggregation> cachedMetrics = cacheRepository.getAllMetrics();
        
        Map<String, Object> debug = Map.of(
            "events_in_last_60s", eventCount,
            "cached_metrics_count", cachedMetrics != null ? cachedMetrics.size() : 0,
            "timestamp", Instant.now().toString(),
            "cached_metrics", cachedMetrics != null ? cachedMetrics : List.of()
        );
        
        return ResponseEntity.ok(debug);
    }
}

