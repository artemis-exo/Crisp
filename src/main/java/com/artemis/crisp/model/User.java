package com.artemis.crisp.model;

import com.artemis.crisp.model.enums.UserStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String username;

    @JsonIgnore
    private String password;

    private String fullName;
    private UserStatus status;
    private Date lastSeen;
    private String profilePictureId;

    // ── Profile features ─────────────────────────────────────────────────────
    private String bio = "";                              // "About" / bio text

    // Privacy: if true, lastSeen is hidden from other users
    private boolean hideLastSeen = false;

    // List of usernames this user has blocked
    @JsonIgnore                                           // Never expose to frontend directly
    private List<String> blockedUsers = new ArrayList<>();
}
