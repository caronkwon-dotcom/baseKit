package com.caron.basekit.standarddesign.requirement;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@Service
public class RequirementService {
    private final RequirementMapper mapper;
    private final AttachmentUploadPolicy uploadPolicy;
    private final Path storageRoot;
    RequirementService(RequirementMapper mapper, AttachmentUploadPolicy uploadPolicy, @Value("${standard-design.requirements.storage-path:./data/requirement-attachments}") String storagePath) {
        this.mapper = mapper;
        this.uploadPolicy = uploadPolicy;
        this.storageRoot = Path.of(storagePath).toAbsolutePath().normalize();
    }
    AttachmentPolicyData uploadPolicy() { return uploadPolicy.describe(); }
    @Transactional(readOnly=true)
    public List<RequirementData> list(String projectId) {
        if (projectId == null || projectId.isBlank()) throw new IllegalArgumentException("프로젝트 ID가 필요합니다.");
        return mapper.findAll(projectId).stream().map(this::expand).toList();
    }
    @Transactional(readOnly=true)
    public RequirementData one(String id) {
        RequirementRow row = mapper.findOne(id);
        if (row == null) throw new NoSuchElementException("요구사항을 찾을 수 없습니다.");
        return expand(row);
    }
    private RequirementData expand(RequirementRow row) {
        return new RequirementData(row.REQUIREMENT_ID(),row.PROJECT_ID(),row.REQUIREMENT_NAME(),row.REQUIREMENT_TYPE_CODE(),
                row.DESCRIPTION(),row.PROCESS_DESCRIPTION(),row.STATUS(),row.LEGACY_WBS_IDS(),row.LEGACY_SCREEN_IDS(),
                row.LEGACY_TABLE_IDS(),row.LEGACY_SOURCE_ID(),row.REG_DT(),mapper.menuKeys(row.REQUIREMENT_ID()),mapper.attachments(row.REQUIREMENT_ID()));
    }
    @Transactional
    public RequirementData create(RequirementSaveRequest request) {
        validate(request);
        if (request.LEGACY_SOURCE_ID() != null && !request.LEGACY_SOURCE_ID().isBlank()) {
            RequirementRow existing = mapper.findLegacy(request.PROJECT_ID(), request.LEGACY_SOURCE_ID());
            if (existing != null) return expand(existing);
        }
        String id = "REQ-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase(Locale.ROOT);
        RequirementRow row = new RequirementRow(id,request.PROJECT_ID(),request.REQUIREMENT_NAME().trim(),request.REQUIREMENT_TYPE_CODE(),
                nonnull(request.DESCRIPTION()),nonnull(request.PROCESS_DESCRIPTION()),request.STATUS(),request.LEGACY_WBS_IDS(),
                request.LEGACY_SCREEN_IDS(),request.LEGACY_TABLE_IDS(),request.LEGACY_SOURCE_ID(),null);
        mapper.insert(row);
        replaceMenus(id, request.MENU_KEYS());
        return one(id);
    }
    @Transactional
    public RequirementData update(String id, RequirementSaveRequest request) {
        validate(request);
        RequirementData current = one(id);
        if (!current.PROJECT_ID().equals(request.PROJECT_ID())) throw new IllegalArgumentException("프로젝트 ID는 변경할 수 없습니다.");
        RequirementRow row = new RequirementRow(id,current.PROJECT_ID(),request.REQUIREMENT_NAME().trim(),request.REQUIREMENT_TYPE_CODE(),
                nonnull(request.DESCRIPTION()),nonnull(request.PROCESS_DESCRIPTION()),request.STATUS(),current.LEGACY_WBS_IDS(),
                current.LEGACY_SCREEN_IDS(),current.LEGACY_TABLE_IDS(),current.LEGACY_SOURCE_ID(),current.REG_DT());
        mapper.update(row);
        replaceMenus(id, request.MENU_KEYS());
        return one(id);
    }
    private void validate(RequirementSaveRequest request) {
        if (!Set.of("DRAFT","IN_PROGRESS","REVIEW","APPROVED").contains(request.STATUS())) throw new IllegalArgumentException("유효하지 않은 상태입니다.");
        if (mapper.countActiveRequirementType(request.REQUIREMENT_TYPE_CODE()) == 0) throw new IllegalArgumentException("유효하지 않은 요구 유형입니다.");
        if (request.MENU_KEYS() != null && (request.MENU_KEYS().size() > 100 || request.MENU_KEYS().stream().anyMatch(key -> key.length() > 150))) throw new IllegalArgumentException("메뉴 선택을 확인해 주세요.");
    }
    private void replaceMenus(String id, List<String> keys) {
        mapper.deleteMenus(id);
        if (keys != null) for (String key : new LinkedHashSet<>(keys)) mapper.insertMenu(id,key);
    }
    @Transactional
    public void delete(String id) {
        RequirementData current = one(id);
        for (AttachmentData attachment : current.ATTACHMENTS()) deleteAttachment(id,attachment.ATTACHMENT_ID());
        mapper.deleteMenus(id);
        mapper.delete(id);
    }
    @Transactional
    public AttachmentData upload(String requirementId, MultipartFile file) throws IOException {
        one(requirementId);
        String suppliedName = Optional.ofNullable(file.getOriginalFilename()).orElse("file").replace('\\','/');
        String original = suppliedName.substring(suppliedName.lastIndexOf('/')+1);
        if (original.isBlank() || original.length() > 255) throw new IllegalArgumentException("파일 이름을 확인해 주세요.");
        String key = UUID.randomUUID().toString();
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')+1).toLowerCase(Locale.ROOT) : "";
        List<AttachmentData> existing = mapper.attachments(requirementId);
        String mime = uploadPolicy.validateMetadata(file, ext, existing.size());
        if (existing.stream().anyMatch(row -> row.ORIGINAL_FILE_NAME().equalsIgnoreCase(original) && row.FILE_SIZE() == file.getSize()))
            throw new IllegalArgumentException("같은 이름과 크기의 파일이 이미 첨부되어 있습니다.");
        Files.createDirectories(storageRoot);
        Path target = storageRoot.resolve(key);
        try {
            file.transferTo(target);
            uploadPolicy.validateContent(target, ext);
            AttachmentData row = new AttachmentData("ATT-"+UUID.randomUUID().toString(),requirementId,original,key,ext,mime,file.getSize(),null,"NOT_ANALYZED");
            mapper.insertAttachment(row);
            return mapper.attachment(row.ATTACHMENT_ID());
        } catch (IOException | RuntimeException e) { Files.deleteIfExists(target); throw e; }
    }
    @Transactional(readOnly=true)
    public AttachmentData attachment(String requirementId,String id) {
        AttachmentData row = mapper.attachment(id);
        if (row == null || !row.REQUIREMENT_ID().equals(requirementId)) throw new NoSuchElementException("첨부파일을 찾을 수 없습니다.");
        return row;
    }
    public byte[] download(String requirementId,String id) throws IOException {
        AttachmentData row = attachment(requirementId,id);
        return Files.readAllBytes(storageRoot.resolve(row.STORAGE_KEY()));
    }
    @Transactional
    public void deleteAttachment(String requirementId,String id) {
        AttachmentData row = attachment(requirementId,id);
        mapper.deleteAttachment(id);
        try { Files.deleteIfExists(storageRoot.resolve(row.STORAGE_KEY())); } catch (IOException e) { throw new IllegalStateException("첨부파일 삭제에 실패했습니다.",e); }
    }
    private static String nonnull(String value) { return value == null ? "" : value; }
}
