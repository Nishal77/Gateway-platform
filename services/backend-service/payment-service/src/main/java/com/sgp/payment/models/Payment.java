package com.sgp.payment.models;

public class Payment {
    private Long id;
    private String paymentId;
    private String status;
    private Double amount;

    public Payment() {
    }

    public Payment(Long id, String paymentId, String status, Double amount) {
        this.id = id;
        this.paymentId = paymentId;
        this.status = status;
        this.amount = amount;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }
}

