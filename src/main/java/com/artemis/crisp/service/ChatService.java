package com.artemis.crisp.service;

import com.artemis.crisp.model.ChatMessage;
import com.artemis.crisp.model.enums.MessageType;
import com.artemis.crisp.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatMessageRepository repo;

    // ── Save new message ──────────────────────────────────────────────────────
    public ChatMessage saveMessage(ChatMessage message) {
        message.setTimestamp(new Date());
        return repo.save(message);
    }

    // ── Toggle reaction ───────────────────────────────────────────────────────
    public ChatMessage toggleReaction(String messageId, String emoji, String username) {
        ChatMessage msg = getOrThrow(messageId);
        if (msg.getReactions() == null) msg.setReactions(new HashMap<>());
        List<String> users = msg.getReactions().computeIfAbsent(emoji, k -> new ArrayList<>());
        if (users.contains(username)) {
            users.remove(username);
            if (users.isEmpty()) msg.getReactions().remove(emoji);
        } else {
            users.add(username);
        }
        return repo.save(msg);
    }

    // ── Edit message ──────────────────────────────────────────────────────────
    // Only the sender can edit, only within 15 minutes of sending
    public ChatMessage editMessage(String messageId, String newContent, String username) {
        ChatMessage msg = getOrThrow(messageId);

        if (!msg.getSenderId().equals(username))
            throw new IllegalArgumentException("You can only edit your own messages");

        long ageMs = System.currentTimeMillis() - msg.getTimestamp().getTime();
        if (ageMs > 15 * 60 * 1000L)
            throw new IllegalArgumentException("Messages can only be edited within 15 minutes");

        if (msg.isDeletedForEveryone())
            throw new IllegalArgumentException("Cannot edit a deleted message");

        msg.setContent(newContent);
        msg.setEdited(true);
        msg.setEditedAt(new Date());
        return repo.save(msg);
    }

    // ── Delete for everyone ───────────────────────────────────────────────────
    // Only sender can delete for everyone
    public ChatMessage deleteForEveryone(String messageId, String username) {
        ChatMessage msg = getOrThrow(messageId);

        if (!msg.getSenderId().equals(username))
            throw new IllegalArgumentException("You can only delete your own messages for everyone");

        msg.setContent("This message was deleted");
        msg.setDeletedForEveryone(true);
        msg.setMediaFileId(null);     // remove media reference
        msg.setMediaType(null);
        msg.setMediaName(null);
        return repo.save(msg);
    }

    // ── Delete for me ─────────────────────────────────────────────────────────
    // Soft-delete: adds username to deletedFor list
    // The message stays in DB and is visible to others
    public ChatMessage deleteForMe(String messageId, String username) {
        ChatMessage msg = getOrThrow(messageId);
        if (!msg.getDeletedFor().contains(username)) {
            msg.getDeletedFor().add(username);
            repo.save(msg);
        }
        return msg;
    }

    // ── Forward message ───────────────────────────────────────────────────────
    // Creates a new message in the target room with forwarded=true
    public ChatMessage forwardMessage(String messageId, String targetRoomId, String senderUsername, String senderName) {
        ChatMessage original = getOrThrow(messageId);

        if (original.isDeletedForEveryone())
            throw new IllegalArgumentException("Cannot forward a deleted message");

        ChatMessage forwarded = ChatMessage.builder()
                .roomId(targetRoomId)
                .senderId(senderUsername)
                .senderName(senderName)
                .content(original.getContent())
                .type(MessageType.CHAT)
                .forwarded(true)
                .mediaFileId(original.getMediaFileId())
                .mediaType(original.getMediaType())
                .mediaName(original.getMediaName())
                .reactions(new HashMap<>())
                .deletedFor(new ArrayList<>())
                .build();

        return saveMessage(forwarded);
    }

    // ── Search messages in a room ─────────────────────────────────────────────
    public List<ChatMessage> searchInRoom(String roomId, String query) {
        return repo.findByRoomId(roomId).stream()
                .filter(m -> !m.isDeletedForEveryone())
                .filter(m -> m.getContent() != null &&
                        m.getContent().toLowerCase().contains(query.toLowerCase()))
                .collect(Collectors.toList());
    }

    // ── Get messages for user (filters deletedFor) ────────────────────────────
    public List<ChatMessage> getHistoryForUser(String roomId, String username) {
        return repo.findByRoomId(roomId).stream()
                .filter(m -> !m.getDeletedFor().contains(username))
                .collect(Collectors.toList());
    }

    private ChatMessage getOrThrow(String id) {
        return repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Message not found: " + id));
    }
}
