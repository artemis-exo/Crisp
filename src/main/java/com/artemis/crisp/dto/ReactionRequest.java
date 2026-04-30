package com.artemis.crisp.dto;

import lombok.Data;

@Data
public class ReactionRequest {
    private String messageId;
    private String roomId;
    private String emoji;
    // username is taken from JWT Principal — never trust client
}
