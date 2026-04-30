package com.artemis.crisp.controller;
import com.artemis.crisp.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.mongodb.gridfs.GridFsResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.security.Principal;
import java.util.Map;
@CrossOrigin(origins="*") @RestController @RequestMapping("/api/media") @RequiredArgsConstructor
public class MediaController {
    private final MediaService mediaService;
    private final UserService userService;
    @PostMapping("/profile-picture")
    public ResponseEntity<Map<String,String>> uploadPfp(@RequestParam("file") MultipartFile file, Principal principal) throws IOException {
        String fileId = mediaService.uploadFile(file);
        userService.updateProfilePicture(principal.getName(), fileId);
        return ResponseEntity.ok(Map.of("fileId", fileId, "username", principal.getName()));
    }
    @PostMapping("/upload")
    public ResponseEntity<Map<String,String>> upload(@RequestParam("file") MultipartFile file, Principal principal) throws IOException {
        String fileId = mediaService.uploadFile(file);
        return ResponseEntity.ok(Map.of(
            "fileId", fileId,
            "mediaType", file.getContentType() != null ? file.getContentType() : "application/octet-stream",
            "mediaName", file.getOriginalFilename() != null ? file.getOriginalFilename() : "file"));
    }
    @PostMapping("/story")
    public ResponseEntity<Map<String,String>> uploadStory(@RequestParam("file") MultipartFile file, Principal principal) throws IOException {
        String fileId = mediaService.uploadFile(file);
        return ResponseEntity.ok(Map.of("fileId", fileId, "mediaType", file.getContentType() != null ? file.getContentType() : "application/octet-stream"));
    }
    @GetMapping("/{fileId}")
    public ResponseEntity<Resource> serve(@PathVariable String fileId) throws IOException {
        GridFsResource resource = mediaService.downloadFile(fileId);
        String ct = resource.getContentType() != null ? resource.getContentType() : "application/octet-stream";
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_TYPE, ct).header(HttpHeaders.CACHE_CONTROL,"max-age=3600").body(resource);
    }
}
