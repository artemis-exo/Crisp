package com.artemis.crisp.controller;
import com.artemis.crisp.model.User;
import com.artemis.crisp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@CrossOrigin(origins="*") @RestController @RequestMapping("/api/users") @RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    @GetMapping public ResponseEntity<List<User>> getAllUsers() { return ResponseEntity.ok(userService.getAllUsers()); }
    @GetMapping("/online") public ResponseEntity<List<User>> getOnline() { return ResponseEntity.ok(userService.getOnlineUsers()); }
    @GetMapping("/{username}") public ResponseEntity<User> getUser(@PathVariable String username) {
        return userService.getUserByUsername(username).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
}
