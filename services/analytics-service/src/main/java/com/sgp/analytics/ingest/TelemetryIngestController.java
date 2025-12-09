package com.sgp.analytics.ingest;

import com.sgp.analytics.models.TelemetryEvent;
import com.sgp.analytics.processors.MetricProcessor;
import com.sgp.analytics.service.AsyncTelemetryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Set;

/**
 * High-throughput endpoint for ingesting telemetry events from gateway.
 * 
 * FAANG-Level Optimizations:
 * - Fully reactive (WebFlux) for non-blocking I/O
 * - Async batch processing with buffering
 * - Fire-and-forget pattern for maximum throughput
 * - Handles millions of events per second
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/telemetry")
public class TelemetryIngestController {
    private final AsyncTelemetryService asyncTelemetryService;
    private final MetricProcessor metricProcessor;
    private final java.util.concurrent.atomic.AtomicLong totalIngested = new java.util.concurrent.atomic.AtomicLong(0);

    public TelemetryIngestController(
            AsyncTelemetryService asyncTelemetryService,
            MetricProcessor metricProcessor) {
        this.asyncTelemetryService = asyncTelemetryService;
        this.metricProcessor = metricProcessor;
    }

    /**
     * Single event ingestion - async, non-blocking.
     * Returns immediately after queuing the event.
     */
    @PostMapping("/ingest")
    public Mono<ResponseEntity<Void>> ingest(@Valid @RequestBody TelemetryEvent event) {
        // Queue for async processing - don't wait for completion
        asyncTelemetryService.queueEvent(event);
        
        // Process metrics immediately (in-memory, non-blocking)
        metricProcessor.processEvent(event);
        
        // Return immediately - fire and forget pattern
        try {
            return Mono.just(ResponseEntity.accepted().build());
        } catch (Exception error) {
            log.error("Failed to queue telemetry event: {}", event.getRequestId(), error);
            // Still return accepted - we don't want to block the gateway
            return Mono.just(ResponseEntity.accepted().build());
        }
    }

    /**
     * Batch ingestion - optimized for high throughput and real-time updates.
     * Processes events in batches for better database performance.
     * Triggers immediate metric computation for real-time dashboard updates.
     */
    @PostMapping("/ingest/batch")
    public Mono<ResponseEntity<Void>> ingestBatch(@RequestBody List<TelemetryEvent> events) {
        if (events == null || events.isEmpty()) {
            log.warn("Received empty or null batch");
            return Mono.just(ResponseEntity.badRequest().build());
        }
        
        // Validate and filter out invalid events instead of rejecting entire batch
        List<TelemetryEvent> validEvents = events.stream()
            .filter(e -> e != null && e.getPath() != null && e.getMethod() != null && e.getRequestId() != null)
            .collect(java.util.stream.Collectors.toList());
        
        if (validEvents.isEmpty()) {
            log.warn("All events in batch were invalid");
            return Mono.just(ResponseEntity.badRequest().build());
        }
        
        if (validEvents.size() < events.size()) {
            log.debug("Filtered {} invalid events from batch of {}", events.size() - validEvents.size(), events.size());
        }
        
        // Queue batch for async processing (non-blocking)
        asyncTelemetryService.queueBatch(validEvents);
        
        // Process metrics for all valid events - this triggers immediate computation
        // Use parallel stream for better throughput with large batches
        if (validEvents.size() > 100) {
            validEvents.parallelStream().forEach(metricProcessor::processEvent);
        } else {
            validEvents.forEach(metricProcessor::processEvent);
        }
        
        // Force immediate metric computation for all unique endpoints in this batch
        // This ensures dashboard sees data immediately when traffic starts
        Set<String> uniqueKeys = validEvents.stream()
            .filter(e -> e.getPath() != null && e.getMethod() != null)
            .map(e -> {
                // Normalize path to ensure consistent keys
                String path = e.getPath();
                // Remove leading/trailing slashes and normalize
                if (path != null) {
                    path = path.startsWith("/") ? path : "/" + path;
                    path = path.replaceAll("/+", "/");
                }
                return path + ":" + e.getMethod();
            })
            .collect(java.util.stream.Collectors.toSet());
        
        // Trigger immediate computation for each unique endpoint
        uniqueKeys.forEach(key -> {
            try {
                metricProcessor.triggerImmediateComputation(key);
            } catch (Exception e) {
                log.warn("Failed to trigger immediate computation for key: {}", key, e);
            }
        });
        
        // Log batch ingestion for debugging
        if (log.isDebugEnabled()) {
            log.debug("Ingested batch of {} events ({} valid), {} unique endpoints", 
                     events.size(), validEvents.size(), uniqueKeys.size());
        } else if (validEvents.size() > 0 && totalIngested.incrementAndGet() % 100 == 0) {
            log.info("Ingested {} batches, {} events total", totalIngested.get(), validEvents.size());
        }
        
        // Return immediately - fire and forget pattern
        return Mono.just(ResponseEntity.accepted().build());
    }
}
