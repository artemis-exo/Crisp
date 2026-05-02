package com.artemis.crisp.controller;

import com.artemis.crisp.dto.*;
import com.artemis.crisp.model.ChatMessage;
import com.artemis.crisp.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate msg;
    private final ChatService           chatService;

    // ── Send message ──────────────────────────────────────────────────────────
    @MessageMapping("/chat.sendMessage")
    public void send(@Payload ChatMessage chatMessage, Principal principal) {
        chatMessage.setSenderId(principal.getName());
        ChatMessage saved = chatService.saveMessage(chatMessage);
        msg.convertAndSend("/topic/room/" + chatMessage.getRoomId(), saved);
    }

    // ── Typing indicator ──────────────────────────────────────────────────────
    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingEvent event, Principal principal) {
        event.setUsername(principal.getName());
        msg.convertAndSend("/topic/room/" + event.getRoomId() + "/typing", event);
    }

    // ── Reaction toggle ───────────────────────────────────────────────────────
    @MessageMapping("/chat.react")
    public void react(@Payload ReactionRequest req, Principal principal) {
        ChatMessage updated = chatService.toggleReaction(
                req.getMessageId(), req.getEmoji(), principal.getName());
        msg.convertAndSend("/topic/room/" + req.getRoomId(), updated);
    }

    // ── Edit message ──────────────────────────────────────────────────────────
    // Frontend publishes to /app/chat.edit
    // Broadcast updated message to /topic/room/{roomId} — all clients update in-place
    @MessageMapping("/chat.edit")
    public void edit(@Payload EditMessageRequest req, Principal principal) {
        ChatMessage updated = chatService.editMessage(
                req.getMessageId(), req.getNewContent(), principal.getName());
        msg.convertAndSend("/topic/room/" + req.getRoomId(), updated);
    }

    // ── Delete message ────────────────────────────────────────────────────────
    // Frontend publishes to /app/chat.delete
    // forEveryone=true  → broadcast updated message (shows "deleted" placeholder)
    // forEveryone=false → only update sender's local state (no broadcast needed)
    @MessageMapping("/chat.delete")
    public void delete(@Payload DeleteMessageRequest req, Principal principal) {
        if (req.isForEveryone()) {
            ChatMessage updated = chatService.deleteForEveryone(
                    req.getMessageId(), principal.getName());
            msg.convertAndSend("/topic/room/" + req.getRoomId(), updated);
        } else {
            chatService.deleteForMe(req.getMessageId(), principal.getName());
            // No broadcast — only affects sender's view
        }
    }

    // ── Forward message ───────────────────────────────────────────────────────
    // Frontend publishes to /app/chat.forward
    // Creates a new message in target room and broadcasts it there
    @MessageMapping("/chat.forward")
    public void forward(@Payload ForwardRequest req, Principal principal) {
        ChatMessage forwarded = chatService.forwardMessage(
                req.getMessageId(),
                req.getTargetRoomId(),
                principal.getName(),
                req.getSenderName()
        );
        msg.convertAndSend("/topic/room/" + req.getTargetRoomId(), forwarded);
    }
}
