package com.artemis.crisp.model;
import com.artemis.crisp.model.enums.UserStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;
@Data
@Document(collection = "users")
public class User {
    @Id private String id;
    private String username;
    @JsonIgnore private String password;
    private String fullName;
    private UserStatus status;
    private Date lastSeen;
    private String profilePictureId; // GridFS file ID
}
