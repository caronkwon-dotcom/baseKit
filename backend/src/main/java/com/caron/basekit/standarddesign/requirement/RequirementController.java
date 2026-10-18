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
    @GetMapping ApiResponse<List<RequirementData>> list(@RequestParam(value="PROJECT_ID", required=false) String projectId) { return ApiResponse.success(service.list(projectId)); }
    @GetMapping("/{id}") ApiResponse<RequirementData> one(@PathVariable String id) { return ApiResponse.success(service.one(id)); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) ApiResponse<RequirementData> create(@Valid @RequestBody RequirementSaveRequest request) { return ApiResponse.success(service.create(request)); }
    @PutMapping("/{id}") ApiResponse<RequirementData> update(@PathVariable String id,@Valid @RequestBody RequirementSaveRequest request) { return ApiResponse.success(service.update(id,request)); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(@PathVariable String id,@Valid @RequestBody RequirementReasonRequest request,java.security.Principal principal) { service.discard(id,request.REASON(),actor(principal)); }
    @PostMapping(path="/{id}/attachments",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<AttachmentData> upload(@PathVariable String id,@RequestPart("file") MultipartFile file,@RequestParam(required=false) Long REVISION,@RequestParam(required=false) Long VERSION) throws IOException { if(REVISION!=null && VERSION==null) throw new IllegalArgumentException("VERSION이 필요합니다."); return ApiResponse.success(REVISION==null?service.upload(id,file):service.uploadChange(id,REVISION,VERSION,file)); }
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
    void deleteFile(@PathVariable String id,@PathVariable String attachmentId,@RequestParam(required=false) Long REVISION,@RequestParam(required=false) Long VERSION) { if(REVISION!=null) { if(VERSION==null) throw new IllegalArgumentException("VERSION이 필요합니다."); service.removeChangeAttachment(id,REVISION,VERSION,attachmentId); } else service.deleteAttachment(id,attachmentId); }
    private String actor(java.security.Principal principal) { return principal==null?"system":principal.getName(); }
    @GetMapping("/{id}/revisions") ApiResponse<java.util.Map<String,Object>> revisions(@PathVariable String id) { return ApiResponse.success(service.revisionState(id)); }
    @PostMapping("/{id}/changes") ApiResponse<java.util.Map<String,Object>> begin(@PathVariable String id,@Valid @RequestBody RequirementReasonRequest request,java.security.Principal principal) { return ApiResponse.success(service.beginChange(id,request.REASON(),actor(principal))); }
    @PutMapping("/{id}/changes") ApiResponse<java.util.Map<String,Object>> saveChange(@PathVariable String id,@Valid @RequestBody RequirementChangeRequest request) { return ApiResponse.success(service.saveChange(id,request)); }
    @PostMapping("/{id}/changes/confirm") ApiResponse<RequirementData> confirm(@PathVariable String id,@Valid @RequestBody RequirementChangeRequest request) { return ApiResponse.success(service.confirmChange(id,request)); }
    @PostMapping("/{id}/changes/cancel") @ResponseStatus(HttpStatus.NO_CONTENT) void cancel(@PathVariable String id,@Valid @RequestBody RequirementChangeRequest request) { service.cancelChange(id,request); }
}
