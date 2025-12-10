package com.sgp.user.controllers;

import com.sgp.user.models.User;
import lombok.extern.slf4j.Slf4j;
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
 * User Service API endpoints - FAANG-Level Reactive Implementation.
 * 
 * Features:
 * - Fully reactive (WebFlux) for non-blocking I/O
 * - Handles millions of concurrent requests
 * - Non-blocking latency simulation
 * - Thread-safe concurrent data structures
 * - Proper error handling with reactive streams
 */
@Slf4j
@RestController
@RequestMapping("/users")
public class UserController {

    @Value("${service.latency.min-ms:10}")
    private int minLatencyMs;

    @Value("${service.latency.max-ms:100}")
    private int maxLatencyMs;

    @Value("${service.error-rate:0.0}")
    private double errorRate;

    // Thread-safe concurrent map for high-throughput access
    private final Map<Long, User> users = new ConcurrentHashMap<>();

    public UserController() {
        // Seed some test data
        User user1 = new User();
        user1.setId(1L);
        user1.setEmail("john.doe@example.com");
        user1.setName("John Doe");
        users.put(1L, user1);
        
        User user2 = new User();
        user2.setId(2L);
        user2.setEmail("jane.smith@example.com");
        user2.setName("Jane Smith");
        users.put(2L, user2);
        
        User user3 = new User();
        user3.setId(3L);
        user3.setEmail("bob.wilson@example.com");
        user3.setName("Bob Wilson");
        users.put(3L, user3);
    }

    @GetMapping
    public Mono<ResponseEntity<List<User>>> getAllUsers() {
        return simulateLatency()
            .then(simulateError())
            .then(Mono.fromCallable(() -> {
                List<User> userList = new ArrayList<>(users.values());
                return ResponseEntity.<List<User>>ok(userList);
            }))
            .onErrorResume(error -> {
                log.error("Error getting all users", error);
                return Mono.just(ResponseEntity.<List<User>>status(HttpStatus.INTERNAL_SERVER_ERROR).build());
            });
    }

    @GetMapping("/{id}")
    public Mono<ResponseEntity<User>> getUserById(@PathVariable Long id) {
        return simulateLatency()
            .then(simulateError())
            .then(Mono.fromCallable(() -> {
                User user = users.get(id);
                ResponseEntity<User> response;
                if (user == null) {
                    response = ResponseEntity.<User>notFound().build();
                } else {
                    response = ResponseEntity.<User>ok(user);
                }
                return response;
            }))
            .onErrorResume(error -> {
                log.error("Error getting user by id: {}", id, error);
                return Mono.just(ResponseEntity.<User>status(HttpStatus.INTERNAL_SERVER_ERROR).build());
            });
    }

    @PostMapping
    public Mono<ResponseEntity<User>> createUser(@RequestBody User user) {
        return simulateLatency()
            .then(simulateError())
            .then(Mono.fromCallable(() -> {
                Long id = users.keySet().stream()
                    .max(Long::compareTo)
                    .orElse(0L) + 1;
                user.setId(id);
                users.put(id, user);
                return ResponseEntity.<User>ok(user);
            }))
            .onErrorResume(error -> {
                log.error("Error creating user", error);
                return Mono.just(ResponseEntity.<User>status(HttpStatus.INTERNAL_SERVER_ERROR).build());
            });
    }

    @PutMapping("/{id}")
    public Mono<ResponseEntity<User>> updateUser(@PathVariable Long id, @RequestBody User user) {
        return simulateLatency()
            .then(simulateError())
            .then(Mono.fromCallable(() -> {
                ResponseEntity<User> response;
                if (!users.containsKey(id)) {
                    response = ResponseEntity.<User>notFound().build();
                } else {
                    user.setId(id);
                    users.put(id, user);
                    response = ResponseEntity.<User>ok(user);
                }
                return response;
            }))
            .onErrorResume(error -> {
                log.error("Error updating user: {}", id, error);
                return Mono.just(ResponseEntity.<User>status(HttpStatus.INTERNAL_SERVER_ERROR).build());
            });
    }

    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<Void>> deleteUser(@PathVariable Long id) {
        return simulateLatency()
            .then(simulateError())
            .then(Mono.fromCallable(() -> {
                ResponseEntity<Void> response;
                if (!users.containsKey(id)) {
                    response = ResponseEntity.<Void>notFound().build();
                } else {
                    users.remove(id);
                    response = ResponseEntity.<Void>noContent().build();
                }
                return response;
            }))
            .onErrorResume(error -> {
                log.error("Error deleting user: {}", id, error);
                return Mono.just(ResponseEntity.<Void>status(HttpStatus.INTERNAL_SERVER_ERROR).build());
            });
    }

    /**
     * Non-blocking latency simulation using reactive delays.
     * Replaces Thread.sleep() which blocks threads.
     */
    private Mono<Void> simulateLatency() {
        int latency = ThreadLocalRandom.current().nextInt(minLatencyMs, maxLatencyMs + 1);
        return Mono.delay(Duration.ofMillis(latency))
            .then();
    }

    /**
     * Non-blocking error simulation.
     */
    private Mono<Void> simulateError() {
        if (errorRate > 0 && ThreadLocalRandom.current().nextDouble() < errorRate) {
            return Mono.error(new RuntimeException("Simulated service error"));
        }
        return Mono.empty();
    }
}
