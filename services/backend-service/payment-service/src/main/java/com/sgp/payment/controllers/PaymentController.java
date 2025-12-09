package com.sgp.payment.controllers;

import com.sgp.payment.models.Payment;
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
 * Payment Service API endpoints - FAANG-Level Reactive Implementation.
 */
@Slf4j
@RestController
@RequestMapping("/payments")
public class PaymentController {
    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    @Value("${service.latency.min-ms:50}")
    private int minLatencyMs;

    @Value("${service.latency.max-ms:500}")
    private int maxLatencyMs;

    @Value("${service.error-rate:0.05}")
    private double errorRate;

    private final Map<Long, Payment> payments = new ConcurrentHashMap<>();

    public PaymentController() {
        // Initialize seed data
        Payment payment1 = new Payment();
        payment1.setId(1L);
        payment1.setPaymentId("PAY-001");
        payment1.setStatus("SUCCESS");
        payment1.setAmount(99.99);
        payments.put(1L, payment1);
        
        Payment payment2 = new Payment();
        payment2.setId(2L);
        payment2.setPaymentId("PAY-002");
        payment2.setStatus("PENDING");
        payment2.setAmount(149.99);
        payments.put(2L, payment2);
    }

    @GetMapping
    public Mono<ResponseEntity<List<Payment>>> getAllPayments() {
        return simulateLatency()
            .then(simulateError())
            .then(Mono.fromCallable(() -> {
                List<Payment> paymentList = new ArrayList<>(payments.values());
                return ResponseEntity.<List<Payment>>ok(paymentList);
            }))
            .onErrorResume(error -> {
                log.error("Error getting all payments", error);
                return Mono.just(ResponseEntity.<List<Payment>>status(HttpStatus.INTERNAL_SERVER_ERROR).build());
            });
    }

    @GetMapping("/{id}")
    public Mono<ResponseEntity<Payment>> getPaymentById(@PathVariable Long id) {
        return simulateLatency()
            .then(simulateError())
            .then(Mono.fromCallable(() -> {
                Payment payment = payments.get(id);
                ResponseEntity<Payment> response;
                if (payment == null) {
                    response = ResponseEntity.<Payment>notFound().build();
                } else {
                    response = ResponseEntity.<Payment>ok(payment);
                }
                return response;
            }))
            .onErrorResume(error -> {
                log.error("Error getting payment by id: {}", id, error);
                return Mono.just(ResponseEntity.<Payment>status(HttpStatus.INTERNAL_SERVER_ERROR).build());
            });
    }

    @PostMapping
    public Mono<ResponseEntity<Payment>> processPayment(@RequestBody Payment payment) {
        return simulateLatency()
            .then(simulateError())
            .then(Mono.fromCallable(() -> {
                Long id = payments.keySet().stream()
                    .max(Long::compareTo)
                    .orElse(0L) + 1;
                payment.setId(id);
                payment.setPaymentId("PAY-" + String.format("%03d", id));
                
                // Simulate payment processing
                if (ThreadLocalRandom.current().nextDouble() < 0.1) {
                    payment.setStatus("FAILED");
                } else {
                    payment.setStatus("SUCCESS");
                }
                
                payments.put(id, payment);
                return ResponseEntity.<Payment>ok(payment);
            }))
            .onErrorResume(error -> {
                log.error("Error processing payment", error);
                return Mono.just(ResponseEntity.<Payment>status(HttpStatus.INTERNAL_SERVER_ERROR).build());
            });
    }

    private Mono<Void> simulateLatency() {
        int latency = ThreadLocalRandom.current().nextInt(minLatencyMs, maxLatencyMs + 1);
        return Mono.delay(Duration.ofMillis(latency)).then();
    }

    private Mono<Void> simulateError() {
        if (errorRate > 0 && ThreadLocalRandom.current().nextDouble() < errorRate) {
            return Mono.error(new RuntimeException("Simulated payment service error"));
        }
        return Mono.empty();
    }
}
