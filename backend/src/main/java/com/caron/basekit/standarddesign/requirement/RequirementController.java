package com.caron.basekit.standarddesign.requirement;

import com.caron.basekit.common.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController @RequestMapping("/api/standard-design/requirements")
public class RequirementController {
    private final RequirementService service;
    RequirementController(RequirementService service) { this.service=service; }
    @GetMapping("/attachments/policy") ApiResponse<AttachmentPolicyData> uploadPolicy() { return ApiResponse.success(service.uploadPolicy()); }
    @GetMapping ApiResponse<List<RequirementData>> list(@RequestParam("PROJECT_ID") String projectId) { return ApiResponse.success(service.list(projectId)); }
    @GetMapping("/{id}") ApiResponse<RequirementData> one(@PathVariable String id) { return ApiResponse.success(service.one(id)); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) ApiResponse<RequirementData> create(@Valid @RequestBody RequirementSaveRequest request) { return ApiResponse.success(service.create(request)); }
    @PutMapping("/{id}") ApiResponse<RequirementData> update(@PathVariable String id,@Valid @RequestBody RequirementSaveRequest request) { return ApiResponse.success(service.update(id,request)); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(@PathVariable String id) { service.delete(id); }
    @PostMapping(path="/{id}/attachments",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<AttachmentData> upload(@PathVariable String id,@RequestPart("file") MultipartFile file) throws IOException { return ApiResponse.success(service.upload(id,file)); }
    @GetMapping("/{id}/attachments/{attachmentId}/file") ResponseEntity<byte[]> file(@PathVariable String id,@PathVariable String attachmentId) throws IOException {
        AttachmentData row=service.attachment(id,attachmentId);
        MediaType mime;
        try { mime=MediaType.parseMediaType(row.MIME_TYPE()); } catch(Exception e) { mime=MediaType.APPLICATION_OCTET_STREAM; }
        boolean image=List.of("image/png","image/jpeg","image/webp").contains(mime.toString());
        return ResponseEntity.ok().contentType(mime)
            .header(HttpHeaders.CONTENT_DISPOSITION,(image ? "inline" : "attachment")+"; filename*=UTF-8''"+java.net.URLEncoder.encode(row.ORIGINAL_FILE_NAME(),java.nio.charset.StandardCharsets.UTF_8))
            .header("X-Content-Type-Options","nosniff").body(service.download(id,attachmentId));
    }
    @DeleteMapping("/{id}/attachments/{attachmentId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteFile(@PathVariable String id,@PathVariable String attachmentId) { service.deleteAttachment(id,attachmentId); }
}
