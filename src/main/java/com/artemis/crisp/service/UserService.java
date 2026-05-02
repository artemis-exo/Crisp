package com.artemis.crisp.service;

import com.artemis.crisp.dto.PublicUserDto;
import com.artemis.crisp.dto.UpdateProfileRequest;
import com.artemis.crisp.model.User;
import com.artemis.crisp.model.enums.UserStatus;
import com.artemis.crisp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final MediaService   mediaService;

    // ── WebSocket presence ────────────────────────────────────────────────────
    public void connectUser(String username) {
        userRepository.findByUsername(username).ifPresent(u -> {
            u.setStatus(UserStatus.ONLINE);
            userRepository.save(u);
        });
    }

    public void disconnectUser(String username) {
        userRepository.findByUsername(username).ifPresent(u -> {
            u.setStatus(UserStatus.OFFLINE);
            u.setLastSeen(new Date());
            userRepository.save(u);
        });
    }

    // ── Get user (raw, for internal use) ──────────────────────────────────────
    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    // ── Get public profile (respects privacy + block status) ─────────────────
    public PublicUserDto getPublicProfile(String targetUsername, String requestingUsername) {
        User target = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + targetUsername));
        User requester = userRepository.findByUsername(requestingUsername)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + requestingUsername));

        boolean isBlocked = requester.getBlockedUsers() != null
                && requester.getBlockedUsers().contains(targetUsername);

        return PublicUserDto.from(target, requestingUsername, isBlocked);
    }

    public List<User> getOnlineUsers() { return userRepository.findAllByStatus(UserStatus.ONLINE); }

    public List<User> getAllUsers() { return userRepository.findAll(); }

    // ── Update profile (name, bio, privacy) ───────────────────────────────────
    public User updateProfile(String username, UpdateProfileRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (req.getFullName() != null && !req.getFullName().isBlank())
            user.setFullName(req.getFullName().trim());
        if (req.getBio() != null)
            user.setBio(req.getBio().trim());
        user.setHideLastSeen(req.isHideLastSeen());
        return userRepository.save(user);
    }

    // ── Update profile picture ────────────────────────────────────────────────
    public User updateProfilePicture(String username, String newFileId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getProfilePictureId() != null) {
            try { mediaService.deleteFile(user.getProfilePictureId()); } catch (Exception ignored) {}
        }
        user.setProfilePictureId(newFileId);
        return userRepository.save(user);
    }

    // ── Block user ────────────────────────────────────────────────────────────
    public void blockUser(String username, String targetUsername) {
        if (username.equals(targetUsername))
            throw new IllegalArgumentException("Cannot block yourself");
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getBlockedUsers() == null) user.setBlockedUsers(new ArrayList<>());
        if (!user.getBlockedUsers().contains(targetUsername)) {
            user.getBlockedUsers().add(targetUsername);
            userRepository.save(user);
        }
    }

    // ── Unblock user ──────────────────────────────────────────────────────────
    public void unblockUser(String username, String targetUsername) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getBlockedUsers() != null) {
            user.getBlockedUsers().remove(targetUsername);
            userRepository.save(user);
        }
    }

    // ── Get blocked users list ────────────────────────────────────────────────
    public List<String> getBlockedUsers(String username) {
        return userRepository.findByUsername(username)
                .map(u -> u.getBlockedUsers() != null ? u.getBlockedUsers() : new ArrayList<String>())
                .orElse(new ArrayList<>());
    }
}
