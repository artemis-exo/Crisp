package com.artemis.crisp.controller;
import com.artemis.crisp.model.*;
import com.artemis.crisp.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@CrossOrigin(origins="*") @RestController @RequestMapping("/api/rooms") @RequiredArgsConstructor
public class RoomController {
    private final RoomService roomService;
    @PostMapping("/create") public ResponseEntity<ChatRoom> create(@RequestBody ChatRoom room) { return ResponseEntity.ok(roomService.createRoom(room)); }
    @GetMapping("/user/{username}") public ResponseEntity<List<ChatRoom>> getUserRooms(@PathVariable String username) { return ResponseEntity.ok(roomService.getUserRooms(username)); }
    @GetMapping("/{roomId}/history") public ResponseEntity<List<ChatMessage>> history(@PathVariable String roomId) { return ResponseEntity.ok(roomService.getChatHistory(roomId)); }
}
