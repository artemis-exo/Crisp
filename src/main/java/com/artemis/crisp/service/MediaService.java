package com.artemis.crisp.service;
import com.mongodb.client.gridfs.model.GridFSFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.data.mongodb.gridfs.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
@Service @RequiredArgsConstructor @Slf4j
public class MediaService {
    private final GridFsTemplate gridFsTemplate;
    public String uploadFile(MultipartFile file) throws IOException {
        String ct = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        ObjectId id = gridFsTemplate.store(file.getInputStream(), file.getOriginalFilename(), ct);
        log.info("Uploaded: {} ({}) -> {}", file.getOriginalFilename(), ct, id);
        return id.toString();
    }
    public GridFsResource downloadFile(String fileId) {
        GridFSFile file = gridFsTemplate.findOne(new Query(Criteria.where("_id").is(new ObjectId(fileId))));
        if (file == null) throw new IllegalArgumentException("File not found: " + fileId);
        return gridFsTemplate.getResource(file);
    }
    public void deleteFile(String fileId) {
        gridFsTemplate.delete(new Query(Criteria.where("_id").is(new ObjectId(fileId))));
    }
}
