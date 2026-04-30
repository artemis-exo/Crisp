package com.artemis.crisp.event;
import com.artemis.crisp.service.UserService;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.*;
@Component @RequiredArgsConstructor @Slf4j
public class WebSocketEventListener {
    private final UserService userService;
    private final SimpMessageSendingOperations messagingTemplate;
    @EventListener
    public void handleConnect(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = (String) accessor.getSessionAttributes().get("username");
        if (username != null) { userService.connectUser(username); log.info("ONLINE: {}", username); }
    }
    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = (String) accessor.getSessionAttributes().get("username");
        if (username != null) { userService.disconnectUser(username); log.info("OFFLINE: {}", username); }
    }
}
