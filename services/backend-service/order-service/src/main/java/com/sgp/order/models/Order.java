package com.sgp.order.models;

public class Order {
    private Long id;
    private String orderNumber;
    private String status;
    private Double amount;

    public Order() {
    }

    public Order(Long id, String orderNumber, String status, Double amount) {
        this.id = id;
        this.orderNumber = orderNumber;
        this.status = status;
        this.amount = amount;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }
}

