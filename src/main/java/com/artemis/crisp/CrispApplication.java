package com.artemis.crisp; // ✅ FIX 1: Was com.artemis.crisp.util — Spring Boot couldn't scan any beans

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CrispApplication {

    public static void main(String[] args) {
        SpringApplication.run(CrispApplication.class, args);
    }
}
