package com.artemis.crisp.service;

import com.artemis.crisp.model.ChatMessage;
import com.artemis.crisp.model.ChatRoom;
import com.artemis.crisp.repository.ChatMessageRepository;
import com.artemis.crisp.repository.ChatRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final ChatRoomRepository roomRepository;
    private final ChatMessageRepository messageRepository;

    /**
     * ✅ FIX 5: Added duplicate room prevention for 1-1 chats.
     * Previously calling createRoom() twice for the same two users
     * would create two separate rooms, splitting chat history silently.
     */
    public ChatRoom createRoom(ChatRoom room) {
        if (!room.isGroup() && room.getParticipantIds() != null
                && room.getParticipantIds().size() == 2) {

            List<ChatRoom> existing = roomRepository
                    .findByParticipantIdsContaining(room.getParticipantIds().get(0));

            boolean duplicate = existing.stream().anyMatch(r ->
                    !r.isGroup()
                    && r.getParticipantIds().containsAll(room.getParticipantIds())
                    && room.getParticipantIds().containsAll(r.getParticipantIds())
            );

            if (duplicate) {
                throw new IllegalArgumentException(
                        "A 1-1 chat room already exists between these two users");
            }
        }
        return roomRepository.save(room);
    }

    public List<ChatRoom> getUserRooms(String username) {
        return roomRepository.findByParticipantIdsContaining(username);
    }

    public List<ChatMessage> getChatHistory(String roomId) {
        return messageRepository.findByRoomId(roomId);
    }
}
