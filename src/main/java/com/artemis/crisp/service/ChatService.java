package com.artemis.crisp.service;
import com.artemis.crisp.model.ChatMessage;
import com.artemis.crisp.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.*;
@Service @RequiredArgsConstructor
public class ChatService {
    private final ChatMessageRepository repo;
    public ChatMessage saveMessage(ChatMessage msg) {
        msg.setTimestamp(new Date());
        return repo.save(msg);
    }
    public ChatMessage toggleReaction(String messageId, String emoji, String username) {
        ChatMessage msg = repo.findById(messageId)
            .orElseThrow(() -> new IllegalArgumentException("Message not found: " + messageId));
        if (msg.getReactions() == null) msg.setReactions(new HashMap<>());
        List<String> users = msg.getReactions().computeIfAbsent(emoji, k -> new ArrayList<>());
        if (users.contains(username)) { users.remove(username); if (users.isEmpty()) msg.getReactions().remove(emoji); }
        else users.add(username);
        return repo.save(msg);
    }
}
