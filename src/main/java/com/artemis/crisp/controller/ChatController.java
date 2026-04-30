package com.artemis.crisp.controller;
import com.artemis.crisp.dto.*;
import com.artemis.crisp.model.ChatMessage;
import com.artemis.crisp.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.security.Principal;
@Controller @RequiredArgsConstructor
public class ChatController {
    private final SimpMessagingTemplate msg;
    private final ChatService chatService;
    @MessageMapping("/chat.sendMessage")
    public void send(@Payload ChatMessage chatMessage, Principal principal) {
        chatMessage.setSenderId(principal.getName());
        ChatMessage saved = chatService.saveMessage(chatMessage);
        msg.convertAndSend("/topic/room/" + chatMessage.getRoomId(), saved);
    }
    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingEvent event, Principal principal) {
        event.setUsername(principal.getName());
        msg.convertAndSend("/topic/room/" + event.getRoomId() + "/typing", event);
    }
    @MessageMapping("/chat.react")
    public void react(@Payload ReactionRequest req, Principal principal) {
        ChatMessage updated = chatService.toggleReaction(req.getMessageId(), req.getEmoji(), principal.getName());
        msg.convertAndSend("/topic/room/" + req.getRoomId(), updated);
    }
}
