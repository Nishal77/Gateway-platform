package com.sgp.analytics.service;

import com.sgp.analytics.models.TelemetryEvent;
import com.sgp.analytics.repository.TelemetryEventRepository;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

/**
 * Async telemetry service for high-throughput event ingestion.
 * 
 * Features:
 * - Bounded queue with backpressure handling
 * - Batch processing for database efficiency
 * - Async workers for parallel processing
 * - Handles millions of events per second
 */
@Slf4j
@Service
public class AsyncTelemetryService {
    private static final Logger log = LoggerFactory.getLogger(AsyncTelemetryService.class);

    private final TelemetryEventRepository repository;
    
    @Value("${analytics.batch.size:5000}")
    private int batchSize;
    
    @Value("${analytics.batch.flush-interval-ms:500}")
    private long flushIntervalMs;
    
    @Value("${analytics.queue.capacity:1000000}")
    private int queueCapacity;
    
    @Value("${analytics.workers:8}")
    private int workerCount;
    
    // Bounded queue for backpressure - initialized in @PostConstruct after @Value injection
    private BlockingQueue<TelemetryEvent> eventQueue;
    private final List<Thread> workers = new ArrayList<>();
    private volatile boolean running = true;
    private final AtomicLong totalProcessed = new AtomicLong(0);
    private final AtomicLong totalDropped = new AtomicLong(0);

    public AsyncTelemetryService(TelemetryEventRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void init() {
        // Initialize queue after @Value fields are injected
        // Use default capacity if not configured
        int capacity = queueCapacity > 0 ? queueCapacity : 100000;
        this.eventQueue = new LinkedBlockingQueue<>(capacity);
        
        log.info("Initialized AsyncTelemetryService with queue capacity: {}, batch size: {}, workers: {}", 
                 capacity, batchSize, workerCount);
        
        // Start worker threads
        startWorkers();
    }

    private void startWorkers() {
        log.info("Starting {} async telemetry workers with batch size: {}", workerCount, batchSize);
        for (int i = 0; i < workerCount; i++) {
            Thread worker = new Thread(this::processEvents, "telemetry-worker-" + i);
            worker.setDaemon(true);
            worker.start();
            workers.add(worker);
        }
    }

    @PreDestroy
    public void stopWorkers() {
        log.info("Stopping async telemetry workers...");
        running = false;
        workers.forEach(Thread::interrupt);
        workers.forEach(thread -> {
            try {
                thread.join(5000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        log.info("Processed {} events, dropped {} events", totalProcessed.get(), totalDropped.get());
    }

    /**
     * Queue a single event for async processing.
     * Non-blocking - returns immediately.
     */
    public void queueEvent(TelemetryEvent event) {
        if (eventQueue == null) {
            // Queue not initialized yet - drop event
            totalDropped.incrementAndGet();
            return;
        }
        
        if (!eventQueue.offer(event)) {
            // Queue full - drop event (backpressure)
            totalDropped.incrementAndGet();
            if (totalDropped.get() % 1000 == 0) {
                log.warn("Event queue full, dropped {} events so far", totalDropped.get());
            }
        }
    }

    /**
     * Queue a batch of events.
     */
    public void queueBatch(List<TelemetryEvent> events) {
        for (TelemetryEvent event : events) {
            queueEvent(event);
        }
    }

    /**
     * Worker thread that processes events in batches.
     */
    private void processEvents() {
        if (eventQueue == null) {
            log.error("Event queue not initialized, worker thread exiting");
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
                log.error("Error processing telemetry events", e);
            }
        }

        // Flush remaining events
        if (!batch.isEmpty()) {
            flushBatch(batch);
        }
    }

    /**
     * Flush batch to database.
     * Uses optimized batch insert with proper JPA batch configuration.
     * Splits large batches to avoid memory issues.
     */
    private void flushBatch(List<TelemetryEvent> batch) {
        try {
            if (batch.isEmpty()) {
                return;
            }

            // Split into smaller chunks if batch is too large (JPA batch size is typically 1000)
            int chunkSize = 1000;
            if (batch.size() <= chunkSize) {
                try {
                    repository.saveAll(batch);
                    totalProcessed.addAndGet(batch.size());
                } catch (org.springframework.dao.DataIntegrityViolationException e) {
                    // Handle constraint violations gracefully - save events individually, skipping duplicates
                    log.debug("Batch save failed due to constraint violation, saving individually: {}", e.getMessage());
                    saveBatchIndividually(batch);
                }
            } else {
                // Process in chunks to optimize database performance
                for (int i = 0; i < batch.size(); i += chunkSize) {
                    int end = Math.min(i + chunkSize, batch.size());
                    List<TelemetryEvent> chunk = batch.subList(i, end);
                    try {
                        repository.saveAll(chunk);
                        totalProcessed.addAndGet(chunk.size());
                    } catch (org.springframework.dao.DataIntegrityViolationException e) {
                        // Handle constraint violations gracefully
                        log.debug("Chunk save failed due to constraint violation, saving individually: {}", e.getMessage());
                        saveBatchIndividually(chunk);
                    }
                }
            }
            
            if (totalProcessed.get() % 50000 == 0) {
                log.info("Processed {} events total, queue size: {}", 
                        totalProcessed.get(), eventQueue != null ? eventQueue.size() : 0);
            }
        } catch (Exception e) {
            log.error("Failed to save batch of {} events", batch.size(), e);
            // Don't re-queue - would cause infinite loop if DB is down
            totalDropped.addAndGet(batch.size());
        }
    }
    
    /**
     * Save events individually, skipping any that fail due to constraint violations.
     * This ensures we don't lose all events if one has a duplicate key.
     */
    private void saveBatchIndividually(List<TelemetryEvent> events) {
        int saved = 0;
        int skipped = 0;
        for (TelemetryEvent event : events) {
            try {
                repository.save(event);
                saved++;
                totalProcessed.incrementAndGet();
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                // Skip duplicates - this is expected in high-throughput scenarios
                skipped++;
                if (skipped % 1000 == 0) {
                    log.debug("Skipped {} duplicate events so far", skipped);
                }
            } catch (Exception e) {
                log.warn("Failed to save individual event: {}", event.getRequestId(), e);
                skipped++;
            }
        }
        if (skipped > 0 && log.isDebugEnabled()) {
            log.debug("Saved {} events individually, skipped {} duplicates/errors", saved, skipped);
        }
    }

    public long getTotalProcessed() {
        return totalProcessed.get();
    }

    public long getTotalDropped() {
        return totalDropped.get();
    }

    public int getQueueSize() {
        return eventQueue != null ? eventQueue.size() : 0;
    }
}

