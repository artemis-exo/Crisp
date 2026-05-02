package com.artemis.crisp.controller;

import com.artemis.crisp.dto.PublicUserDto;
import com.artemis.crisp.dto.UpdateProfileRequest;
import com.artemis.crisp.model.User;
import com.artemis.crisp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // ── List all users ────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/online")
    public ResponseEntity<List<User>> getOnline() {
        return ResponseEntity.ok(userService.getOnlineUsers());
    }

    // ── Get single user's status/lastSeen (used by chat header) ──────────────
    @GetMapping("/{username}")
    public ResponseEntity<User> getUser(@PathVariable String username) {
        return userService.getUserByUsername(username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Get public profile (respects hideLastSeen + block status) ─────────────
    @GetMapping("/{username}/profile")
    public ResponseEntity<PublicUserDto> getPublicProfile(
            @PathVariable String username, Principal principal) {
        return ResponseEntity.ok(
                userService.getPublicProfile(username, principal.getName()));
    }

    // ── Update own profile (name, bio, privacy) ───────────────────────────────
    @PutMapping("/me")
    public ResponseEntity<User> updateProfile(
            @RequestBody UpdateProfileRequest req, Principal principal) {
        return ResponseEntity.ok(userService.updateProfile(principal.getName(), req));
    }

    // ── Block a user ──────────────────────────────────────────────────────────
    @PostMapping("/{username}/block")
    public ResponseEntity<Map<String, String>> blockUser(
            @PathVariable String username, Principal principal) {
        userService.blockUser(principal.getName(), username);
        return ResponseEntity.ok(Map.of("message", username + " blocked"));
    }

    // ── Unblock a user ────────────────────────────────────────────────────────
    @DeleteMapping("/{username}/block")
    public ResponseEntity<Map<String, String>> unblockUser(
            @PathVariable String username, Principal principal) {
        userService.unblockUser(principal.getName(), username);
        return ResponseEntity.ok(Map.of("message", username + " unblocked"));
    }

    // ── Get my blocked users list ─────────────────────────────────────────────
    @GetMapping("/me/blocked")
    public ResponseEntity<List<String>> getBlocked(Principal principal) {
        return ResponseEntity.ok(userService.getBlockedUsers(principal.getName()));
    }
}
