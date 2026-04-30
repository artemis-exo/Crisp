package com.artemis.crisp.controller;
import com.artemis.crisp.model.Story;
import com.artemis.crisp.service.StoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;
@CrossOrigin(origins="*") @RestController @RequestMapping("/api/stories") @RequiredArgsConstructor
public class StoryController {
    private final StoryService storyService;
    @GetMapping public ResponseEntity<List<Story>> getActive() { return ResponseEntity.ok(storyService.getActiveStories()); }
    @GetMapping("/user/{username}") public ResponseEntity<List<Story>> getUserStories(@PathVariable String username) { return ResponseEntity.ok(storyService.getUserStories(username)); }
    @PostMapping
    public ResponseEntity<Story> create(@RequestBody Story story, Principal principal) {
        story.setUsername(principal.getName());
        return ResponseEntity.ok(storyService.createStory(story));
    }
    @PostMapping("/{storyId}/view")
    public ResponseEntity<Story> view(@PathVariable String storyId, Principal principal) {
        return ResponseEntity.ok(storyService.markViewed(storyId, principal.getName()));
    }
    @DeleteMapping("/{storyId}")
    public ResponseEntity<Void> delete(@PathVariable String storyId, Principal principal) {
        List<Story> mine = storyService.getUserStories(principal.getName());
        if (mine.stream().noneMatch(s -> s.getId().equals(storyId))) return ResponseEntity.status(403).build();
        storyService.deleteStory(storyId);
        return ResponseEntity.ok().build();
    }
}
