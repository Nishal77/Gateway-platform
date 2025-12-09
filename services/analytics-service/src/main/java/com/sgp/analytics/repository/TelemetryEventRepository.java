package com.sgp.analytics.repository;

import com.sgp.analytics.models.TelemetryEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

/**
 * Repository for telemetry event persistence.
 */
@Repository
public interface TelemetryEventRepository extends JpaRepository<TelemetryEvent, Long> {
    
    List<TelemetryEvent> findByTimestampBetween(Instant start, Instant end);
    
    List<TelemetryEvent> findByPathAndTimestampBetween(String path, Instant start, Instant end);
    
    @Query("SELECT e FROM TelemetryEvent e WHERE e.timestamp >= :since ORDER BY e.timestamp DESC")
    List<TelemetryEvent> findRecentEvents(@Param("since") Instant since);
    
    @Query("SELECT COUNT(e) FROM TelemetryEvent e WHERE e.timestamp >= :since")
    long countSince(@Param("since") Instant since);
    
    @Query("SELECT e.path, COUNT(e) as count FROM TelemetryEvent e " +
           "WHERE e.timestamp >= :since GROUP BY e.path ORDER BY count DESC")
    List<Object[]> findTopEndpoints(@Param("since") Instant since, org.springframework.data.domain.Pageable pageable);
}

