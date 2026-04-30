package com.artemis.crisp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TypingEvent {
    private String roomId;
    private String username;
    private boolean typing;   // true = started typing, false = stopped
}
