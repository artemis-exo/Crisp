package com.artemis.crisp.repository;
import com.artemis.crisp.model.Story;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.*;
@Repository
public interface StoryRepository extends MongoRepository<Story,String> {
    List<Story> findByExpiresAtAfter(Date date);
    List<Story> findByUsernameAndExpiresAtAfter(String username, Date date);
}
