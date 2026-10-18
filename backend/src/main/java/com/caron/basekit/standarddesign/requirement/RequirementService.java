package com.caron.basekit.standarddesign.requirement;

import com.caron.basekit.standarddesign.projectmenu.ProjectMenuService;
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
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    private final ProjectMenuService projectMenuService;
    private final AttachmentUploadPolicy uploadPolicy;
    private final Path storageRoot;
    RequirementService(RequirementMapper mapper, org.springframework.jdbc.core.JdbcTemplate jdbc, ProjectMenuService projectMenuService, AttachmentUploadPolicy uploadPolicy, @Value("${standard-design.requirements.storage-path:./data/requirement-attachments}") String storagePath) {
        this.mapper = mapper; this.jdbc = jdbc; this.projectMenuService = projectMenuService;
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
                row.DESCRIPTION(),row.PROCESS_DESCRIPTION(),row.DESIGN_OPINION(),row.STATUS(),row.LEGACY_WBS_IDS(),row.LEGACY_SCREEN_IDS(),
                row.LEGACY_TABLE_IDS(),row.LEGACY_SOURCE_ID(),row.REG_DT(),row.MOD_DT(),mapper.menuKeys(row.REQUIREMENT_ID()),mapper.projectMenuIds(row.REQUIREMENT_ID()),mapper.attachments(row.REQUIREMENT_ID()),row.DISCARDED_YN(),row.REQUIREMENT_REVISION());
    }
    @Transactional
    public RequirementData create(RequirementSaveRequest request) {
        validate(request);
        projectMenuService.validateForProject(request.PROJECT_ID(), request.PROJECT_MENU_IDS());
        if (request.LEGACY_SOURCE_ID() != null && !request.LEGACY_SOURCE_ID().isBlank()) {
            RequirementRow existing = mapper.findLegacy(request.PROJECT_ID(), request.LEGACY_SOURCE_ID());
            if (existing != null) return expand(existing);
        }
        String id = "REQ-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase(Locale.ROOT);
        RequirementRow row = new RequirementRow(id,request.PROJECT_ID(),request.REQUIREMENT_NAME().trim(),request.REQUIREMENT_TYPE_CODE(),
                nonnull(request.DESCRIPTION()),nonnull(request.PROCESS_DESCRIPTION()),nonnull(request.DESIGN_OPINION()),request.STATUS(),request.LEGACY_WBS_IDS(),
                request.LEGACY_SCREEN_IDS(),request.LEGACY_TABLE_IDS(),request.LEGACY_SOURCE_ID(),null,null,"N",1);
        mapper.insert(row);
        replaceMenus(id, request.MENU_KEYS());
        if (request.PROJECT_MENU_IDS() != null) projectMenuService.replaceRequirementRelations(id, request.PROJECT_MENU_IDS());
        return one(id);
    }
    @Transactional
    public RequirementData update(String id, RequirementSaveRequest request) {
        validate(request);
        projectMenuService.validateForProject(request.PROJECT_ID(), request.PROJECT_MENU_IDS());
        jdbc.queryForList("SELECT REQUIREMENT_ID FROM BSDRREQ WHERE REQUIREMENT_ID=? FOR UPDATE", id);
        RequirementData current = one(id);
        assertEditable(current);
        recordRevision(current,"BASELINE");
        if (!current.PROJECT_ID().equals(request.PROJECT_ID())) throw new IllegalArgumentException("프로젝트 ID는 변경할 수 없습니다.");
        RequirementRow row = new RequirementRow(id,current.PROJECT_ID(),request.REQUIREMENT_NAME().trim(),request.REQUIREMENT_TYPE_CODE(),
                nonnull(request.DESCRIPTION()),nonnull(request.PROCESS_DESCRIPTION()),request.DESIGN_OPINION() == null ? current.DESIGN_OPINION() : request.DESIGN_OPINION(),request.STATUS(),current.LEGACY_WBS_IDS(),
                current.LEGACY_SCREEN_IDS(),current.LEGACY_TABLE_IDS(),current.LEGACY_SOURCE_ID(),current.REG_DT(),current.MOD_DT(),current.DISCARDED_YN(),nextRevision(id));
        mapper.update(row);
        copyLinks(id,current.REQUIREMENT_REVISION(),row.REQUIREMENT_REVISION());
        replaceMenus(id, request.MENU_KEYS());
        if (request.PROJECT_MENU_IDS() != null) projectMenuService.replaceRequirementRelations(id, request.PROJECT_MENU_IDS());
        recordRevision(one(id),"UPDATED");
        return one(id);
    }
    private void validate(RequirementSaveRequest request) {
        if(request==null || request.PROJECT_ID()==null || request.REQUIREMENT_NAME()==null || request.REQUIREMENT_NAME().isBlank() || request.REQUIREMENT_NAME().length()>200) throw new IllegalArgumentException("요구사항명을 확인하세요.");
        if (!Set.of("DRAFT","IN_PROGRESS","REVIEW","APPROVED").contains(request.STATUS())) throw new IllegalArgumentException("유효하지 않은 상태입니다.");
        if (mapper.countActiveRequirementType(request.REQUIREMENT_TYPE_CODE()) == 0) throw new IllegalArgumentException("유효하지 않은 요구 유형입니다.");
        if (request.MENU_KEYS() != null && (request.MENU_KEYS().size() > 100 || request.MENU_KEYS().stream().anyMatch(key -> key.length() > 150))) throw new IllegalArgumentException("메뉴 선택을 확인해 주세요.");
    }
    private void replaceMenus(String id, List<String> keys) {
        mapper.deleteMenus(id);
        if (keys != null) for (String key : new LinkedHashSet<>(keys)) mapper.insertMenu(id,key);
    }
    @Transactional
    public void delete(String id) { throw new IllegalArgumentException("폐기 사유가 필요합니다."); }
    @Transactional
    public void discard(String id,String reason,String actor) {
        lock(id); var current=one(id);
        if("Y".equals(current.DISCARDED_YN())) return;
        requireReason(reason); recordRevision(current,"BASELINE");
        // The lifecycle event does not manufacture a new content revision.
        jdbc.update("UPDATE BSDRREQ SET DISCARDED_YN='Y',MOD_DT=CURRENT_TIMESTAMP WHERE REQUIREMENT_ID=?",id);
        jdbc.update("INSERT INTO BSDRDEVT(REQUIREMENT_ID,DISCARD_REASON,DISCARDED_BY) VALUES(?,?,?)",id,reason.trim(),actor);
        jdbc.update("UPDATE BSDRCHG SET CHANGE_STATE='CANCELLED',OPEN_REQUIREMENT_ID=NULL,VERSION=VERSION+1,UPDATED_AT=CURRENT_TIMESTAMP WHERE REQUIREMENT_ID=? AND CHANGE_STATE='DRAFT'",id);
        invalidateGroups(id);
    }
    private void invalidateGroups(String id) {
        jdbc.update("UPDATE BSDRGRP SET GROUP_STATUS='REVIEW_REQUIRED',VERSION=VERSION+1,MOD_DT=CURRENT_TIMESTAMP WHERE REQUIREMENT_GROUP_ID IN (SELECT REQUIREMENT_GROUP_ID FROM BSDRGRQ WHERE REQUIREMENT_ID=?)",id);
    }
    private void recordRevision(RequirementData value,String event) {
        if(jdbc.queryForObject("SELECT COUNT(*) FROM BSDRRHIS WHERE REQUIREMENT_ID=? AND REQUIREMENT_REVISION=?",Integer.class,value.REQUIREMENT_ID(),value.REQUIREMENT_REVISION())>0) return;
        try {
            String snapshot=new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules().writeValueAsString(value);
            jdbc.update("INSERT INTO BSDRRHIS(REQUIREMENT_ID,REQUIREMENT_REVISION,EVENT_TYPE,SNAPSHOT) VALUES(?,?,?,?)",value.REQUIREMENT_ID(),value.REQUIREMENT_REVISION(),event,snapshot);
        } catch(com.fasterxml.jackson.core.JsonProcessingException e) { throw new IllegalStateException(e); }
    }
    @Transactional
    public AttachmentData upload(String requirementId, MultipartFile file) throws IOException {
        jdbc.queryForList("SELECT REQUIREMENT_ID FROM BSDRREQ WHERE REQUIREMENT_ID=? FOR UPDATE",requirementId);
        assertEditable(one(requirementId));
        recordRevision(one(requirementId),"BASELINE");
        return storeUpload(requirementId,file,null);
    }
    private AttachmentData storeUpload(String requirementId,MultipartFile file,Long revision) throws IOException {
        String suppliedName = Optional.ofNullable(file.getOriginalFilename()).orElse("file").replace('\\','/');
        String original = suppliedName.substring(suppliedName.lastIndexOf('/')+1);
        if (original.isBlank() || original.length() > 255) throw new IllegalArgumentException("파일 이름을 확인해 주세요.");
        String key = UUID.randomUUID().toString();
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')+1).toLowerCase(Locale.ROOT) : "";
        List<AttachmentData> existing = revision==null ? mapper.attachments(requirementId) : revisionAttachments(requirementId,revision);
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
            if(revision==null) {
                long previous=one(requirementId).REQUIREMENT_REVISION(); long next=nextRevision(requirementId);
                jdbc.update("UPDATE BSDRREQ SET REQUIREMENT_REVISION=?,MOD_DT=CURRENT_TIMESTAMP WHERE REQUIREMENT_ID=?",next,requirementId); copyLinks(requirementId,previous,next);
                jdbc.update("INSERT INTO BSDRRATT VALUES(?,?,?)",requirementId,next,row.ATTACHMENT_ID());
                recordRevision(one(requirementId),"ATTACHMENT_ADDED");
            } else jdbc.update("INSERT INTO BSDRRATT VALUES(?,?,?)",requirementId,revision,row.ATTACHMENT_ID());
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
        jdbc.queryForList("SELECT REQUIREMENT_ID FROM BSDRREQ WHERE REQUIREMENT_ID=? FOR UPDATE",requirementId);
        assertEditable(one(requirementId));
        recordRevision(one(requirementId),"BASELINE");
        attachment(requirementId,id);
        long rev=one(requirementId).REQUIREMENT_REVISION();
        long next=nextRevision(requirementId);
        jdbc.update("UPDATE BSDRREQ SET REQUIREMENT_REVISION=?,MOD_DT=CURRENT_TIMESTAMP WHERE REQUIREMENT_ID=?",next,requirementId); copyLinks(requirementId,rev,next);
        jdbc.update("DELETE FROM BSDRRATT WHERE REQUIREMENT_ID=? AND REQUIREMENT_REVISION=? AND ATTACHMENT_ID=?",requirementId,next,id);
        recordRevision(one(requirementId),"ATTACHMENT_REMOVED");
    }
    private final com.fasterxml.jackson.databind.ObjectMapper json = new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules();
    private org.springframework.web.server.ResponseStatusException conflict(String message) {
        return new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,message);
    }
    private void lock(String id) { jdbc.queryForList("SELECT REQUIREMENT_ID FROM BSDRREQ WHERE REQUIREMENT_ID=? FOR UPDATE",id); one(id); }
    private void requireReason(String reason) {
        if(reason==null || reason.isBlank() || reason.length()>2000) throw new IllegalArgumentException("사유를 1~2000자로 입력하세요.");
    }
    private String encode(Object value) { try { return json.writeValueAsString(value); } catch(Exception e) { throw new IllegalStateException(e); } }
    private RequirementData decode(String value) { try { return json.readValue(value,RequirementData.class); } catch(Exception e) { throw new IllegalStateException("Revision snapshot을 읽지 못했습니다.",e); } }
    private boolean snapshotReferences(String text,String id,long rev) {
        try { return snapshotReferences(json.readTree(text),id,rev); } catch(Exception e) { throw new IllegalStateException("분석 근거를 확인하지 못했습니다.",e); }
    }
    private boolean snapshotReferences(com.fasterxml.jackson.databind.JsonNode node,String id,long rev) {
        if(node.isObject() && ((id.equals(node.path("REQUIREMENT_ID").asText()) && rev==node.path("REQUIREMENT_REVISION").asLong(-1)) ||
            (id.equals(node.path("requirementId").asText()) && rev==node.path("revision").asLong(-1)))) return true;
        if(node.isContainerNode()) for(var child:node) if(snapshotReferences(child,id,rev)) return true;
        return false;
    }
    public boolean referenced(RequirementData value) {
        String id=value.REQUIREMENT_ID(); long rev=value.REQUIREMENT_REVISION();
        if(jdbc.queryForObject("SELECT COUNT(*) FROM BSDRGRQ WHERE REQUIREMENT_ID=? AND REVIEWED_REVISION=?",Integer.class,id,rev)>0) return true;
        if(jdbc.queryForObject("SELECT COUNT(*) FROM BSDAAREQ WHERE REQUIREMENT_ID=? AND REQUIREMENT_MOD_DT=?",Integer.class,id,value.MOD_DT())>0) return true;
        if(jdbc.queryForObject("SELECT COUNT(*) FROM BSDRARIT WHERE REQUIREMENT_ID=? AND REQUIREMENT_MOD_DT=?",Integer.class,id,value.MOD_DT())>0) return true;
        for(String snapshot:jdbc.queryForList("SELECT REQUEST_JSON FROM BSDPGANL WHERE PROJECT_ID=?",String.class,value.PROJECT_ID())) if(snapshotReferences(snapshot,id,rev)) return true;
        for(String snapshot:jdbc.queryForList("SELECT C.REQUEST_JSON FROM BSDRGCTX C JOIN BSDRGRP G ON G.REQUIREMENT_GROUP_ID=C.REQUIREMENT_GROUP_ID WHERE G.PROJECT_ID=?",String.class,value.PROJECT_ID())) if(snapshotReferences(snapshot,id,rev)) return true;
        return false;
    }
    private void assertActive(RequirementData value) { if("Y".equals(value.DISCARDED_YN())) throw conflict("폐기된 요구사항은 조회만 가능합니다."); }
    private void assertEditable(RequirementData value) {
        assertActive(value);
        if(!"DRAFT".equals(value.STATUS()) || referenced(value) || jdbc.queryForObject("SELECT COUNT(*) FROM BSDRCHG WHERE REQUIREMENT_ID=? AND (CHANGE_STATE='DRAFT' OR (CHANGE_STATE='CONFIRMED' AND REQUIREMENT_REVISION=?))",Integer.class,value.REQUIREMENT_ID(),value.REQUIREMENT_REVISION())>0)
            throw conflict("참조 또는 확정된 Revision입니다. 변경 기능을 사용하세요.");
    }
    private long nextRevision(String id) {
        long maximum=jdbc.queryForObject("SELECT COALESCE(MAX(REQUIREMENT_REVISION),0) FROM BSDRCHG WHERE REQUIREMENT_ID=?",Long.class,id);
        return Math.max(maximum,one(id).REQUIREMENT_REVISION())+1;
    }
    private void copyLinks(String id,long from,long to) {
        jdbc.update("INSERT INTO BSDRRATT(REQUIREMENT_ID,REQUIREMENT_REVISION,ATTACHMENT_ID) SELECT REQUIREMENT_ID,?,ATTACHMENT_ID FROM BSDRRATT WHERE REQUIREMENT_ID=? AND REQUIREMENT_REVISION=?",to,id,from);
    }
    private List<AttachmentData> revisionAttachments(String id,long rev) {
        return jdbc.queryForList("SELECT ATTACHMENT_ID FROM BSDRRATT WHERE REQUIREMENT_ID=? AND REQUIREMENT_REVISION=? ORDER BY ATTACHMENT_ID",String.class,id,rev).stream().map(mapper::attachment).toList();
    }
    private RequirementData content(RequirementData base,RequirementSaveRequest input,long revision,List<AttachmentData> attachments) {
        return new RequirementData(base.REQUIREMENT_ID(),base.PROJECT_ID(),input.REQUIREMENT_NAME().trim(),input.REQUIREMENT_TYPE_CODE(),nonnull(input.DESCRIPTION()),nonnull(input.PROCESS_DESCRIPTION()),input.DESIGN_OPINION()==null?base.DESIGN_OPINION():input.DESIGN_OPINION(),input.STATUS(),base.LEGACY_WBS_IDS(),base.LEGACY_SCREEN_IDS(),base.LEGACY_TABLE_IDS(),base.LEGACY_SOURCE_ID(),base.REG_DT(),base.MOD_DT(),input.MENU_KEYS()==null?base.MENU_KEYS():input.MENU_KEYS(),input.PROJECT_MENU_IDS()==null?base.PROJECT_MENU_IDS():input.PROJECT_MENU_IDS(),attachments,base.DISCARDED_YN(),revision);
    }
    private RequirementSaveRequest input(RequirementData base) {
        return new RequirementSaveRequest(base.PROJECT_ID(),base.REQUIREMENT_NAME(),base.REQUIREMENT_TYPE_CODE(),base.DESCRIPTION(),base.PROCESS_DESCRIPTION(),base.DESIGN_OPINION(),base.STATUS(),base.MENU_KEYS(),base.PROJECT_MENU_IDS(),base.LEGACY_WBS_IDS(),base.LEGACY_SCREEN_IDS(),base.LEGACY_TABLE_IDS(),base.LEGACY_SOURCE_ID());
    }
    private Map<String,Object> upper(Map<String,Object> row) { var out=new LinkedHashMap<String,Object>();row.forEach((k,v)->out.put(k.toUpperCase(Locale.ROOT),v));return out; }
    private Map<String,Object> change(String id,long rev) {
        var rows=jdbc.queryForList("SELECT * FROM BSDRCHG WHERE REQUIREMENT_ID=? AND REQUIREMENT_REVISION=?",id,rev);
        if(rows.isEmpty()) throw new NoSuchElementException("변경 Revision을 찾을 수 없습니다.");
        var result=upper(rows.getFirst()); var saved=decode((String)result.remove("SNAPSHOT"));
        result.put("CONTENT",content(saved,input(saved),rev,revisionAttachments(id,rev))); return result;
    }
    private Map<String,Object> writableChange(String id,long rev,long version) {
        lock(id); assertActive(one(id)); var row=change(id,rev);
        if(!"DRAFT".equals(row.get("CHANGE_STATE")) || ((Number)row.get("VERSION")).longValue()!=version) throw conflict("변경 초안 버전이 다릅니다. 다시 조회하세요.");
        if(((Number)row.get("BASE_REVISION")).longValue()!=one(id).REQUIREMENT_REVISION()) throw conflict("현행 버전이 변경되었습니다. 초안을 확인하세요.");
        return row;
    }
    @Transactional(readOnly=true)
    public Map<String,Object> revisionState(String id) {
        var current=one(id); var result=new LinkedHashMap<String,Object>();
        result.put("CURRENT",current); result.put("READ_ONLY",!"N".equals(current.DISCARDED_YN()) || !"DRAFT".equals(current.STATUS()) || referenced(current) || jdbc.queryForObject("SELECT COUNT(*) FROM BSDRCHG WHERE REQUIREMENT_ID=? AND CHANGE_STATE='CONFIRMED' AND REQUIREMENT_REVISION=?",Integer.class,id,current.REQUIREMENT_REVISION())>0);
        var drafts=jdbc.queryForList("SELECT REQUIREMENT_REVISION FROM BSDRCHG WHERE REQUIREMENT_ID=? AND CHANGE_STATE='DRAFT'",Long.class,id);
        result.put("DRAFT",drafts.isEmpty()?null:change(id,drafts.getFirst()));
        result.put("DISCARD",jdbc.queryForList("SELECT DISCARD_REASON,DISCARDED_BY,DISCARDED_AT FROM BSDRDEVT WHERE REQUIREMENT_ID=?",id).stream().map(this::upper).findFirst().orElse(null));
        var history=new ArrayList<Map<String,Object>>();
        for(var row:jdbc.queryForList("SELECT REQUIREMENT_REVISION,EVENT_TYPE,SNAPSHOT,REG_DT FROM BSDRRHIS WHERE REQUIREMENT_ID=? ORDER BY REQUIREMENT_REVISION",id)) {
            var h=upper(row); h.put("CONTENT",decode((String)h.remove("SNAPSHOT"))); history.add(h);
        }
        result.put("HISTORY",history);
        result.put("CHANGES",jdbc.queryForList("SELECT REQUIREMENT_REVISION FROM BSDRCHG WHERE REQUIREMENT_ID=? ORDER BY REQUIREMENT_REVISION",Long.class,id).stream().map(rev->change(id,rev)).toList());
        return result;
    }
    @Transactional
    public Map<String,Object> beginChange(String id,String reason,String actor) {
        requireReason(reason); lock(id); var base=one(id); assertActive(base);
        if(jdbc.queryForObject("SELECT COUNT(*) FROM BSDRCHG WHERE REQUIREMENT_ID=? AND CHANGE_STATE='DRAFT'",Integer.class,id)>0) throw conflict("작성 중인 변경 Revision이 있습니다.");
        recordRevision(base,"BASELINE");
        long max=jdbc.queryForObject("SELECT COALESCE(MAX(REQUIREMENT_REVISION),0) FROM BSDRCHG WHERE REQUIREMENT_ID=?",Long.class,id);
        long rev=Math.max(max,base.REQUIREMENT_REVISION())+1;
        var request=input(base); var draft=new RequirementSaveRequest(request.PROJECT_ID(),request.REQUIREMENT_NAME(),request.REQUIREMENT_TYPE_CODE(),request.DESCRIPTION(),request.PROCESS_DESCRIPTION(),request.DESIGN_OPINION(),"DRAFT",request.MENU_KEYS(),request.PROJECT_MENU_IDS(),request.LEGACY_WBS_IDS(),request.LEGACY_SCREEN_IDS(),request.LEGACY_TABLE_IDS(),request.LEGACY_SOURCE_ID());
        jdbc.update("INSERT INTO BSDRCHG(REQUIREMENT_ID,REQUIREMENT_REVISION,BASE_REVISION,CHANGE_STATE,CHANGE_REASON,SNAPSHOT,CREATED_BY,OPEN_REQUIREMENT_ID) VALUES(?,?,?,'DRAFT',?,?,?,?)",id,rev,base.REQUIREMENT_REVISION(),reason.trim(),encode(content(base,draft,rev,base.ATTACHMENTS())),actor,id);
        copyLinks(id,base.REQUIREMENT_REVISION(),rev); return change(id,rev);
    }
    @Transactional
    public Map<String,Object> saveChange(String id,RequirementChangeRequest request) {
        var row=writableChange(id,request.REVISION(),request.VERSION()); var base=(RequirementData)row.get("CONTENT");
        validate(request.CONTENT());
        if(!base.PROJECT_ID().equals(request.CONTENT().PROJECT_ID())) throw new IllegalArgumentException("프로젝트를 변경할 수 없습니다.");
        projectMenuService.validateForProject(base.PROJECT_ID(),request.CONTENT().PROJECT_MENU_IDS());
        jdbc.update("UPDATE BSDRCHG SET SNAPSHOT=?,VERSION=VERSION+1,UPDATED_AT=CURRENT_TIMESTAMP WHERE REQUIREMENT_ID=? AND REQUIREMENT_REVISION=?",encode(content(base,request.CONTENT(),request.REVISION(),base.ATTACHMENTS())),id,request.REVISION());
        return change(id,request.REVISION());
    }
    @Transactional
    public RequirementData confirmChange(String id,RequirementChangeRequest request) {
        var row=writableChange(id,request.REVISION(),request.VERSION()); var draft=(RequirementData)row.get("CONTENT");
        validate(input(draft)); projectMenuService.validateForProject(draft.PROJECT_ID(),draft.PROJECT_MENU_IDS());
        var base=one(id); recordRevision(base,"BASELINE");
        jdbc.update("UPDATE BSDRREQ SET REQUIREMENT_NAME=?,REQUIREMENT_TYPE_CODE=?,DESCRIPTION=?,PROCESS_DESCRIPTION=?,DESIGN_OPINION=?,STATUS=?,REQUIREMENT_REVISION=?,MOD_DT=CURRENT_TIMESTAMP WHERE REQUIREMENT_ID=?",draft.REQUIREMENT_NAME(),draft.REQUIREMENT_TYPE_CODE(),draft.DESCRIPTION(),draft.PROCESS_DESCRIPTION(),draft.DESIGN_OPINION(),draft.STATUS(),request.REVISION(),id);
        replaceMenus(id,draft.MENU_KEYS()); projectMenuService.replaceRequirementRelations(id,draft.PROJECT_MENU_IDS());
        jdbc.update("UPDATE BSDRCHG SET CHANGE_STATE='CONFIRMED',OPEN_REQUIREMENT_ID=NULL,SNAPSHOT=?,VERSION=VERSION+1,UPDATED_AT=CURRENT_TIMESTAMP WHERE REQUIREMENT_ID=? AND REQUIREMENT_REVISION=?",encode(one(id)),id,request.REVISION());
        recordRevision(one(id),"CHANGE_CONFIRMED"); invalidateGroups(id); return one(id);
    }
    @Transactional
    public void cancelChange(String id,RequirementChangeRequest request) {
        writableChange(id,request.REVISION(),request.VERSION());
        jdbc.update("UPDATE BSDRCHG SET CHANGE_STATE='CANCELLED',OPEN_REQUIREMENT_ID=NULL,VERSION=VERSION+1,UPDATED_AT=CURRENT_TIMESTAMP WHERE REQUIREMENT_ID=? AND REQUIREMENT_REVISION=?",id,request.REVISION());
    }
    @Transactional
    public AttachmentData uploadChange(String id,long revision,long version,MultipartFile file) throws IOException {
        writableChange(id,revision,version); var result=storeUpload(id,file,revision);
        jdbc.update("UPDATE BSDRCHG SET VERSION=VERSION+1,UPDATED_AT=CURRENT_TIMESTAMP WHERE REQUIREMENT_ID=? AND REQUIREMENT_REVISION=?",id,revision); return result;
    }
    @Transactional
    public void removeChangeAttachment(String id,long revision,long version,String attachmentId) {
        writableChange(id,revision,version); attachment(id,attachmentId);
        if(jdbc.update("DELETE FROM BSDRRATT WHERE REQUIREMENT_ID=? AND REQUIREMENT_REVISION=? AND ATTACHMENT_ID=?",id,revision,attachmentId)!=1) throw new NoSuchElementException("초안 첨부 연결이 없습니다.");
        jdbc.update("UPDATE BSDRCHG SET VERSION=VERSION+1,UPDATED_AT=CURRENT_TIMESTAMP WHERE REQUIREMENT_ID=? AND REQUIREMENT_REVISION=?",id,revision);
    }
    private static String nonnull(String value) { return value == null ? "" : value; }
}
