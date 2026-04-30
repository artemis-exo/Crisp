package com.artemis.crisp.model;
import com.artemis.crisp.model.enums.MessageType;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Document(collection = "messages")
public class ChatMessage {
    @Id private String id;
    private String roomId;
    private String senderId;
    private String senderName;
    private String content;
    private Date timestamp;
    private MessageType type;
    @Builder.Default private Map<String,List<String>> reactions = new HashMap<>();
    private String mediaFileId;
    private String mediaType;
    private String mediaName;
}
