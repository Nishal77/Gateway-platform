package com.sgp.order.controllers;

import com.sgp.order.models.Order;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Order Service API endpoints - FAANG-Level Reactive Implementation.
 */
@Slf4j
@RestController
@RequestMapping("/orders")
public class OrderController {
    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    @Value("${service.latency.min-ms:20}")
    private int minLatencyMs;

    @Value("${service.latency.max-ms:200}")
    private int maxLatencyMs;

    @Value("${service.error-rate:0.0}")
    private double errorRate;

    private final Map<Long, Order> orders = new ConcurrentHashMap<>();

    public OrderController() {
        // Initialize seed data
        Order order1 = new Order();
        order1.setId(1L);
        order1.setOrderNumber("ORDER-001");
        order1.setStatus("PENDING");
        order1.setAmount(99.99);
        orders.put(1L, order1);
        
        Order order2 = new Order();
        order2.setId(2L);
        order2.setOrderNumber("ORDER-002");
        order2.setStatus("COMPLETED");
        order2.setAmount(149.99);
        orders.put(2L, order2);
    }

    @GetMapping
    public Mono<ResponseEntity<List<Order>>> getAllOrders() {
        return simulateLatency()
            .then(simulateError())
            .then(Mono.fromCallable(() -> {
                List<Order> orderList = new ArrayList<>(orders.values());
                return ResponseEntity.<List<Order>>ok(orderList);
            }))
            .onErrorResume(error -> {
                log.error("Error getting all orders", error);
                return Mono.just(ResponseEntity.<List<Order>>status(HttpStatus.INTERNAL_SERVER_ERROR).build());
            });
    }

    @GetMapping("/{id}")
    public Mono<ResponseEntity<Order>> getOrderById(@PathVariable Long id) {
        return simulateLatency()
            .then(simulateError())
            .then(Mono.fromCallable(() -> {
                Order order = orders.get(id);
                ResponseEntity<Order> response;
                if (order == null) {
                    response = ResponseEntity.<Order>notFound().build();
                } else {
                    response = ResponseEntity.<Order>ok(order);
                }
                return response;
            }))
            .onErrorResume(error -> {
                log.error("Error getting order by id: {}", id, error);
                return Mono.just(ResponseEntity.<Order>status(HttpStatus.INTERNAL_SERVER_ERROR).build());
            });
    }

    @PostMapping
    public Mono<ResponseEntity<Order>> createOrder(@RequestBody Order order) {
        return simulateLatency()
            .then(simulateError())
            .then(Mono.fromCallable(() -> {
                Long id = orders.keySet().stream()
                    .max(Long::compareTo)
                    .orElse(0L) + 1;
                order.setId(id);
                order.setOrderNumber("ORDER-" + String.format("%03d", id));
                orders.put(id, order);
                return ResponseEntity.<Order>ok(order);
            }))
            .onErrorResume(error -> {
                log.error("Error creating order", error);
                return Mono.just(ResponseEntity.<Order>status(HttpStatus.INTERNAL_SERVER_ERROR).build());
            });
    }

    private Mono<Void> simulateLatency() {
        int latency = ThreadLocalRandom.current().nextInt(minLatencyMs, maxLatencyMs + 1);
        return Mono.delay(Duration.ofMillis(latency)).then();
    }

    private Mono<Void> simulateError() {
        if (errorRate > 0 && ThreadLocalRandom.current().nextDouble() < errorRate) {
            return Mono.error(new RuntimeException("Simulated order service error"));
        }
        return Mono.empty();
    }
}
