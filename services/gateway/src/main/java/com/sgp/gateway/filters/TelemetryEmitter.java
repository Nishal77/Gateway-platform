package com.sgp.gateway.filters;

import com.sgp.gateway.models.TelemetryEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Emits telemetry events to the analytics service with batching.
 * 
 * FAANG-Level Optimizations:
 * - Batched emission for high throughput
 * - Non-blocking queue-based buffering
 * - Automatic batching and flushing
 * - Handles millions of events per second
 */
@Component
public class TelemetryEmitter {
    private static final Logger log = LoggerFactory.getLogger(TelemetryEmitter.class);
    private final WebClient.Builder webClientBuilder;

    @Value("${gateway.telemetry.analytics-url:http://analytics-service:9000/api/v1/telemetry}")
    private String analyticsUrl;

    @Value("${gateway.telemetry.batch-size:1000}")
    private int batchSize;

    @Value("${gateway.telemetry.batch-flush-interval-ms:500}")
    private long flushIntervalMs;

    @Value("${gateway.telemetry.queue-capacity:1000000}")
    private int queueCapacity;

    private WebClient webClient;
    private BlockingQueue<TelemetryEvent> eventQueue;
    private Thread batchWorker;
    private volatile boolean running = true;
    private final AtomicLong totalEmitted = new AtomicLong(0);
    private final AtomicLong totalDropped = new AtomicLong(0);

    public TelemetryEmitter(WebClient.Builder webClientBuilder) {
        this.webClientBuilder = webClientBuilder;
        // Queue will be initialized in @PostConstruct after @Value injection
    }

    @PostConstruct
    public void init() {
        // Initialize queue after @Value fields are injected
        // Use default capacity if not configured
        int capacity = queueCapacity > 0 ? queueCapacity : 100000;
        this.eventQueue = new LinkedBlockingQueue<>(capacity);
        
        webClient = webClientBuilder
            .baseUrl(analyticsUrl)
            .build();
        
        // Start batch worker thread
        batchWorker = new Thread(this::processBatches, "telemetry-batch-worker");
        batchWorker.setDaemon(true);
        batchWorker.start();
        log.info("TelemetryEmitter initialized - URL: {}, queue capacity: {}, batch size: {}, flush interval: {}ms", 
                 analyticsUrl, capacity, batchSize, flushIntervalMs);
    }

    @PreDestroy
    public void shutdown() {
        running = false;
        if (batchWorker != null) {
            batchWorker.interrupt();
            try {
                batchWorker.join(5000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        log.info("TelemetryEmitter shutdown. Emitted: {}, Dropped: {}", 
                 totalEmitted.get(), totalDropped.get());
    }

    /**
     * Emit telemetry event asynchronously.
     * Non-blocking - queues event for batch processing.
     */
    public void emit(TelemetryEvent event) {
        if (eventQueue == null) {
            // Queue not initialized yet - drop event
            totalDropped.incrementAndGet();
            return;
        }
        
        if (!eventQueue.offer(event)) {
            // Queue full - drop event (backpressure)
            long dropped = totalDropped.incrementAndGet();
            if (dropped % 1000 == 0) {
                log.warn("Telemetry queue full, dropped {} events so far", dropped);
            }
        }
    }

    /**
     * Batch worker that processes events in batches.
     */
    private void processBatches() {
        if (eventQueue == null) {
            log.error("Event queue not initialized, batch worker cannot start");
            return;
        }
        
        List<TelemetryEvent> batch = new ArrayList<>(batchSize);
        long lastFlush = System.currentTimeMillis();

        while (running || !eventQueue.isEmpty()) {
            try {
                // Try to get an event with timeout
                TelemetryEvent event = eventQueue.poll(100, TimeUnit.MILLISECONDS);
                
                if (event != null) {
                    batch.add(event);
                }

                long now = System.currentTimeMillis();
                boolean shouldFlush = batch.size() >= batchSize || 
                                     (now - lastFlush >= flushIntervalMs && !batch.isEmpty());

                if (shouldFlush && !batch.isEmpty()) {
                    flushBatch(batch);
                    batch.clear();
                    lastFlush = now;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("Error processing telemetry batch", e);
            }
        }

        // Flush remaining events
        if (!batch.isEmpty()) {
            flushBatch(batch);
        }
    }

    /**
     * Flush batch to analytics service.
     * Non-blocking, fire-and-forget.
     */
    private void flushBatch(List<TelemetryEvent> batch) {
        if (batch.isEmpty()) {
            return;
        }

        webClient.post()
            .uri("/ingest/batch")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(batch)
            .retrieve()
            .bodyToMono(Void.class)
            .retryWhen(Retry.backoff(3, Duration.ofMillis(200))
                .filter(throwable -> !(throwable instanceof org.springframework.web.client.HttpClientErrorException))
                .doBeforeRetry(retrySignal -> {
                    log.debug("Retrying telemetry batch emission (attempt {})", retrySignal.totalRetries() + 1);
                }))
            .doOnSuccess(v -> {
                long emitted = totalEmitted.addAndGet(batch.size());
                if (emitted % 10000 == 0) {
                    log.info("Emitted {} total telemetry events", emitted);
                }
            })
            .doOnError(error -> {
                long dropped = totalDropped.addAndGet(batch.size());
                log.error("Failed to emit telemetry batch of {} events to {}: {}. Total dropped: {}", 
                         batch.size(), analyticsUrl, error.getMessage(), dropped);
                // Log connection errors more prominently
                if (error instanceof java.net.ConnectException || 
                    error.getMessage() != null && error.getMessage().contains("Connection refused")) {
                    log.error("Cannot connect to analytics service at {}. Check if analytics service is running.", analyticsUrl);
                }
            })
            .subscribe(); // Fire and forget
    }

    public long getTotalEmitted() {
        return totalEmitted.get();
    }

    public long getTotalDropped() {
        return totalDropped.get();
    }

    public int getQueueSize() {
        return eventQueue != null ? eventQueue.size() : 0;
    }
}
