package com.artemis.crisp.model;

import com.artemis.crisp.model.enums.MessageType;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "messages")
public class ChatMessage {

    @Id
    private String id;

    private String roomId;
    private String senderId;      // Always set server-side from JWT
    private String senderName;
    private String content;
    private Date   timestamp;
    private MessageType type;

    // ── Reactions ─────────────────────────────────────────────────────────────
    @Builder.Default
    private Map<String, List<String>> reactions = new HashMap<>();

    // ── Media ────────────────────────────────────────────────────────────────
    private String mediaFileId;
    private String mediaType;
    private String mediaName;

    // ── Reply / Quote ─────────────────────────────────────────────────────────
    // Stores a snapshot of the replied-to message so it shows even if deleted
    private String replyToMessageId;
    private String replyToContent;      // snapshot of original text
    private String replyToSenderName;   // snapshot of original sender

    // ── Edit ──────────────────────────────────────────────────────────────────
    private boolean edited = false;
    private Date    editedAt;

    // ── Delete ────────────────────────────────────────────────────────────────
    // "deleted for everyone" — content replaced with placeholder, media removed
    private boolean deletedForEveryone = false;
    // "deleted for me" — list of usernames who soft-deleted this message
    @Builder.Default
    private List<String> deletedFor = new ArrayList<>();

    // ── Forward ───────────────────────────────────────────────────────────────
    private boolean forwarded = false;  // shows "Forwarded" label in bubble
}
