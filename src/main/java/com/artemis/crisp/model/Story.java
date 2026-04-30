package com.artemis.crisp.model;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.*;
@Data @Document(collection = "stories")
public class Story {
    @Id private String id;
    private String username;
    private String fullName;
    private String profilePictureId;
    private String mediaFileId;
    private String mediaType;
    private String caption;
    private Date createdAt;
    private Date expiresAt;
    private List<String> viewedBy = new ArrayList<>();
}
