package com.artemis.crisp.controller;

import com.artemis.crisp.model.*;
import com.artemis.crisp.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final ChatService chatService;

    @PostMapping("/create")
    public ResponseEntity<ChatRoom> create(@RequestBody ChatRoom room) {
        return ResponseEntity.ok(roomService.createRoom(room));
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<List<ChatRoom>> getUserRooms(@PathVariable String username) {
        return ResponseEntity.ok(roomService.getUserRooms(username));
    }

    // Uses getHistoryForUser so "delete for me" messages are filtered out
    @GetMapping("/{roomId}/history")
    public ResponseEntity<List<ChatMessage>> history(
            @PathVariable String roomId, Principal principal) {
        return ResponseEntity.ok(
                chatService.getHistoryForUser(roomId, principal.getName()));
    }

    // Search messages within a room
    @GetMapping("/{roomId}/search")
    public ResponseEntity<List<ChatMessage>> search(
            @PathVariable String roomId,
            @RequestParam String q,
            Principal principal) {
        return ResponseEntity.ok(chatService.searchInRoom(roomId, q));
    }
}
