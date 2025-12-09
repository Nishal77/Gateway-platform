package com.sgp.gateway.controllers;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.util.HashMap;
import java.util.Map;

/**
 * Admin API for gateway management.
 * Provides endpoints for:
 * - Route inspection
 * - Configuration refresh
 * - Metrics access
 */
@Slf4j
@RestController
@RequestMapping("/admin")
public class AdminController {

    private final RouteLocator routeLocator;

    public AdminController(RouteLocator routeLocator) {
        this.routeLocator = routeLocator;
    }

    @GetMapping("/routes")
    public ResponseEntity<Flux<Route>> getRoutes() {
        return ResponseEntity.ok(routeLocator.getRoutes());
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        Map<String, Object> info = new HashMap<>();
        info.put("service", "gateway");
        info.put("version", "1.0.0");
        info.put("features", new String[]{
            "authentication",
            "rate-limiting",
            "circuit-breaking",
            "telemetry",
            "dynamic-routing"
        });
        return ResponseEntity.ok(info);
    }
}

