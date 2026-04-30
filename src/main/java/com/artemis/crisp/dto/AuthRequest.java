package com.artemis.crisp.dto;

import lombok.Data;

@Data
public class AuthRequest {
    private String username;
    private String password;
    private String fullName; // Used only during registration
}
