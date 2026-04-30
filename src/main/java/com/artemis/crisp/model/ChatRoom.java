package com.artemis.crisp.model;

import com.fasterxml.jackson.annotation.JsonProperty; // ✅ FIX 7: Import for correct JSON field naming
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Document(collection = "rooms")
public class ChatRoom {

    @Id
    private String id;

    private String name; // e.g., "Weekend Plan Group" (null if it's a 1-1 chat)

    @JsonProperty("isGroup") // ✅ FIX 7: Without this, Lombok serializes boolean as "group" not "isGroup"
    private boolean isGroup;

    private List<String> participantIds; // List of usernames
}
