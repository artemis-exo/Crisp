package com.artemis.crisp.config;
import com.artemis.crisp.util.JwtTokenUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.*;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.config.annotation.*;
import java.util.Collections;
@Configuration @EnableWebSocketMessageBroker @RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final JwtTokenUtil jwtTokenUtil;
    @Override public void registerStompEndpoints(StompEndpointRegistry r) {
        r.addEndpoint("/ws").setAllowedOriginPatterns("*").withSockJS();
    }
    @Override public void configureMessageBroker(MessageBrokerRegistry r) {
        r.setApplicationDestinationPrefixes("/app");
        r.enableSimpleBroker("/topic","/user");
        r.setUserDestinationPrefix("/user");
    }
    @Override public void configureClientInboundChannel(ChannelRegistration reg) {
        reg.interceptors(new ChannelInterceptor() {
            @Override public Message<?> preSend(Message<?> msg, MessageChannel ch) {
                StompHeaderAccessor a = MessageHeaderAccessor.getAccessor(msg, StompHeaderAccessor.class);
                if (a == null) return msg;
                if (StompCommand.CONNECT.equals(a.getCommand())) {
                    String h = a.getFirstNativeHeader("Authorization");
                    if (h != null && h.startsWith("Bearer ")) {
                        String token = h.substring(7);
                        if (jwtTokenUtil.validateToken(token)) {
                            String username = jwtTokenUtil.extractUsername(token);
                            a.setUser(new UsernamePasswordAuthenticationToken(username,null,Collections.emptyList()));
                            a.getSessionAttributes().put("username", username);
                        } else throw new IllegalArgumentException("Invalid JWT Token");
                    } else throw new IllegalArgumentException("Missing JWT Token");
                }
                return msg;
            }
        });
    }
}
