package com.artemis.crisp.service;
import com.artemis.crisp.model.User;
import com.artemis.crisp.model.enums.UserStatus;
import com.artemis.crisp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.*;
@Service @RequiredArgsConstructor @Slf4j
public class UserService {
    private final UserRepository userRepository;
    private final MediaService mediaService;
    public void connectUser(String username) {
        userRepository.findByUsername(username).ifPresent(u -> {
            u.setStatus(UserStatus.ONLINE); userRepository.save(u);
        });
    }
    public void disconnectUser(String username) {
        userRepository.findByUsername(username).ifPresent(u -> {
            u.setStatus(UserStatus.OFFLINE); u.setLastSeen(new Date()); userRepository.save(u);
        });
    }
    public Optional<User> getUserByUsername(String username) { return userRepository.findByUsername(username); }
    public List<User> getOnlineUsers() { return userRepository.findAllByStatus(UserStatus.ONLINE); }
    public List<User> getAllUsers() { return userRepository.findAll(); }
    public User updateProfilePicture(String username, String newFileId) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getProfilePictureId() != null) {
            try { mediaService.deleteFile(user.getProfilePictureId()); } catch (Exception ignored) {}
        }
        user.setProfilePictureId(newFileId);
        return userRepository.save(user);
    }
}
