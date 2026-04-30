package com.artemis.crisp.service;
import com.artemis.crisp.model.Story;
import com.artemis.crisp.repository.StoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.*;
@Service @RequiredArgsConstructor
public class StoryService {
    private final StoryRepository repo;
    public List<Story> getActiveStories() { return repo.findByExpiresAtAfter(new Date()); }
    public List<Story> getUserStories(String username) { return repo.findByUsernameAndExpiresAtAfter(username, new Date()); }
    public Story createStory(Story story) {
        Date now = new Date();
        story.setCreatedAt(now);
        story.setExpiresAt(new Date(now.getTime() + 86400000L));
        return repo.save(story);
    }
    public Story markViewed(String storyId, String username) {
        Story s = repo.findById(storyId).orElseThrow(() -> new IllegalArgumentException("Story not found"));
        if (!s.getViewedBy().contains(username)) { s.getViewedBy().add(username); repo.save(s); }
        return s;
    }
    public void deleteStory(String storyId) { repo.deleteById(storyId); }
}
