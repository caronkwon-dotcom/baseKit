package com.caron.basekit.standarddesign.requirement;

import com.caron.basekit.standarddesign.requirementgroup.RequirementGroupService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:revision-case;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "standard-design.requirements.storage-path=${java.io.tmpdir}/basekit-revision-test"})
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
@ActiveProfiles("test")
class RequirementRevisionIntegrationTest {
 @Autowired org.springframework.test.web.servlet.MockMvc mvc;
 @Autowired RequirementService requirements;
 @Autowired RequirementGroupService groups;
 @Autowired JdbcTemplate jdbc;
 @Autowired ObjectMapper json;
 RequirementSaveRequest input(String project,String name) { return new RequirementSaveRequest(project,name,"NEW","내용","프로세스","설계 의견","DRAFT",List.of(),List.of(),null,null,null,null); }
 RequirementData create() { return requirements.create(input("REV-"+UUID.randomUUID(),"기존 내용")); }
 long number(Map<String,Object> row,String key) { return ((Number)row.get(key)).longValue(); }
 RequirementChangeRequest command(Map<String,Object> row,RequirementSaveRequest content) { return new RequirementChangeRequest(number(row,"REQUIREMENT_REVISION"),number(row,"VERSION"),content); }
 Map<String,Object> group(RequirementData req) { return groups.create(new RequirementGroupService.Save(req.PROJECT_ID(),"그룹","",null,UUID.randomUUID().toString(),List.of(new RequirementGroupService.Member(req.REQUIREMENT_ID(),"Y","근거",req.REQUIREMENT_REVISION(),List.of())))); }
 byte[] png={ (byte)0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1,2,3 };
 MockMultipartFile file(String name) { return new MockMultipartFile("file",name,"image/png",png); }
 @Test void referencedDraftCannotBeEditedAndConfirmationPreservesGroupEvidence() throws Exception {
  var req=create();var group=group(req);String id=req.REQUIREMENT_ID(),gid=(String)group.get("REQUIREMENT_GROUP_ID");
  String before=json.writeValueAsString(requirements.one(id));
  String evidence=jdbc.queryForObject("SELECT REVIEWED_SNAPSHOT FROM BSDRGRQ WHERE REQUIREMENT_GROUP_ID=?",String.class,gid);
  assertThrows(ResponseStatusException.class,()->requirements.update(id,input(req.PROJECT_ID(),"직접 수정")));
  assertThrows(ResponseStatusException.class,()->requirements.upload(id,file("blocked.png")));
  assertThrows(IllegalArgumentException.class,()->requirements.beginChange(id," ","reviewer"));
  var draft=requirements.beginChange(id,"업무 변경","reviewer");
  assertThrows(ResponseStatusException.class,()->requirements.beginChange(id,"중복","reviewer"));
  var saved=requirements.saveChange(id,command(draft,input(req.PROJECT_ID(),"새 내용")));
  assertEquals(before,json.writeValueAsString(requirements.one(id)));
  assertEquals(group.get("VERSION"),groups.get(gid).get("VERSION"));
  assertThrows(ResponseStatusException.class,()->requirements.confirmChange(id,command(draft,null)));
  var confirmed=requirements.confirmChange(id,command(saved,null));
  assertEquals(id,confirmed.REQUIREMENT_ID()); assertEquals("새 내용",confirmed.REQUIREMENT_NAME());
  assertEquals(req.REQUIREMENT_REVISION()+1,confirmed.REQUIREMENT_REVISION());
  assertEquals("REVIEW_REQUIRED",groups.get(gid).get("GROUP_STATUS"));
  assertEquals(evidence,jdbc.queryForObject("SELECT REVIEWED_SNAPSHOT FROM BSDRGRQ WHERE REQUIREMENT_GROUP_ID=?",String.class,gid));
  assertEquals(req.REQUIREMENT_REVISION(),jdbc.queryForObject("SELECT REVIEWED_REVISION FROM BSDRGRQ WHERE REQUIREMENT_GROUP_ID=?",Long.class,gid));
  assertThrows(ResponseStatusException.class,()->requirements.update(id,input(req.PROJECT_ID(),"확정본 수정")));
 }
 @Test void attachmentEntitiesAreSharedAndExclusionAndReplacementKeepPriorBytes() throws Exception {
  var req=create();String id=req.REQUIREMENT_ID();var old=requirements.upload(id,file("evidence.png"));req=requirements.one(id);
  long oldRevision=req.REQUIREMENT_REVISION();long count=jdbc.queryForObject("SELECT COUNT(*) FROM BSDRATCH WHERE REQUIREMENT_ID=?",Long.class,id);
  var draft=requirements.beginChange(id,"첨부 교체","reviewer");long rev=number(draft,"REQUIREMENT_REVISION");
  assertEquals(count,jdbc.queryForObject("SELECT COUNT(*) FROM BSDRATCH WHERE REQUIREMENT_ID=?",Long.class,id));
  assertEquals(old.ATTACHMENT_ID(),((RequirementData)draft.get("CONTENT")).ATTACHMENTS().getFirst().ATTACHMENT_ID());
  requirements.removeChangeAttachment(id,rev,number(draft,"VERSION"),old.ATTACHMENT_ID());
  draft=(Map<String,Object>)requirements.revisionState(id).get("DRAFT");
  var replacement=requirements.uploadChange(id,rev,number(draft,"VERSION"),file("evidence.png"));
  assertNotEquals(old.ATTACHMENT_ID(),replacement.ATTACHMENT_ID());assertNotEquals(old.STORAGE_KEY(),replacement.STORAGE_KEY());
  assertArrayEquals(png,requirements.download(id,old.ATTACHMENT_ID()));
  assertEquals(old.ATTACHMENT_ID(),requirements.one(id).ATTACHMENTS().getFirst().ATTACHMENT_ID());
  draft=(Map<String,Object>)requirements.revisionState(id).get("DRAFT");requirements.confirmChange(id,command(draft,null));
  assertEquals(replacement.ATTACHMENT_ID(),requirements.one(id).ATTACHMENTS().getFirst().ATTACHMENT_ID());
  assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM BSDRRATT WHERE REQUIREMENT_ID=? AND REQUIREMENT_REVISION=? AND ATTACHMENT_ID=?",Integer.class,id,oldRevision,old.ATTACHMENT_ID()));
  assertArrayEquals(png,requirements.download(id,old.ATTACHMENT_ID()));
 }
 @Test void cancelledDraftKeepsCurrentAndRevisionNumbersAreNotReused() throws Exception {
  var req=create();String id=req.REQUIREMENT_ID(),before=json.writeValueAsString(req);
  var draft=requirements.beginChange(id,"취소할 변경","reviewer");requirements.cancelChange(id,command(draft,null));
  assertEquals(before,json.writeValueAsString(requirements.one(id)));
  var updated=requirements.update(id,input(req.PROJECT_ID(),"미참조 편집"));
  assertTrue(updated.REQUIREMENT_REVISION()>number(draft,"REQUIREMENT_REVISION"));
  var next=requirements.beginChange(id,"다음 변경","reviewer");assertTrue(number(next,"REQUIREMENT_REVISION")>updated.REQUIREMENT_REVISION());
  assertThrows(ResponseStatusException.class,()->requirements.saveChange(id,command(draft,input(req.PROJECT_ID(),"취소 초안"))));
 }
 @Test void discardIsLogicalAuditedIdempotentAndPreventsNewGrouping() throws Exception {
  var req=create();String id=req.REQUIREMENT_ID();var group=group(req);var draft=requirements.beginChange(id,"변경 중","author");
  String evidence=jdbc.queryForObject("SELECT REVIEWED_SNAPSHOT FROM BSDRGRQ WHERE REQUIREMENT_ID=?",String.class,id);
  requirements.discard(id,"사업 범위 제외","reviewer"); requirements.discard(id,"다른 사유","another");
  var discarded=requirements.one(id);assertEquals("Y",discarded.DISCARDED_YN());assertEquals(req.REQUIREMENT_REVISION(),discarded.REQUIREMENT_REVISION());
  assertEquals("reviewer",jdbc.queryForObject("SELECT DISCARDED_BY FROM BSDRDEVT WHERE REQUIREMENT_ID=?",String.class,id));
  assertEquals("사업 범위 제외",jdbc.queryForObject("SELECT DISCARD_REASON FROM BSDRDEVT WHERE REQUIREMENT_ID=?",String.class,id));
  assertEquals(evidence,jdbc.queryForObject("SELECT REVIEWED_SNAPSHOT FROM BSDRGRQ WHERE REQUIREMENT_ID=?",String.class,id));
  assertEquals("REVIEW_REQUIRED",groups.get((String)group.get("REQUIREMENT_GROUP_ID")).get("GROUP_STATUS"));
  assertNull(requirements.revisionState(id).get("DRAFT"));
  assertThrows(ResponseStatusException.class,()->requirements.beginChange(id,"불가","reviewer"));
  assertThrows(ResponseStatusException.class,()->requirements.confirmChange(id,command(draft,null)));
  assertThrows(ResponseStatusException.class,()->group(discarded));
 }
 @Test void projectAnalysisSnapshotLocksActualRevisionWithoutGroupOrManualStatus() throws Exception {
  var req=create();String id=req.REQUIREMENT_ID();
  jdbc.update("INSERT INTO BSDPGANL(ANALYSIS_ID,PROJECT_ID,REQUEST_ID,STATUS,REQUEST_JSON,DEADLINE_AT) VALUES(?,?,?,'SUCCESS',?,CURRENT_TIMESTAMP)","PG-"+UUID.randomUUID(),req.PROJECT_ID(),"test",json.writeValueAsString(List.of(req)));
  assertEquals(true,requirements.revisionState(id).get("READ_ONLY"));
  assertThrows(ResponseStatusException.class,()->requirements.update(id,input(req.PROJECT_ID(),"참조본")));
  var draft=requirements.beginChange(id,"분석 후 변경","reviewer");
  assertEquals(req.REQUIREMENT_REVISION(),requirements.one(id).REQUIREMENT_REVISION());
  requirements.cancelChange(id,command(draft,null));
 }
 @Test void simultaneousBeginAllowsOnlyOneOpenDraft() throws Exception {
  var req=create();var pool=java.util.concurrent.Executors.newFixedThreadPool(2);var gate=new java.util.concurrent.CountDownLatch(1);
  try { var tasks=new ArrayList<java.util.concurrent.Future<Boolean>>();for(int i=0;i<2;i++) tasks.add(pool.submit(()->{gate.await();try {requirements.beginChange(req.REQUIREMENT_ID(),"동시 변경","reviewer");return true;}catch(ResponseStatusException e){return false;}}));gate.countDown();int successes=0;for(var task:tasks)if(task.get())successes++;assertEquals(1,successes); }
  finally {pool.shutdownNow();}
 }
 @Test void httpApiRequiresReasonAndRecordsAuthenticatedActor() throws Exception {
  var req=create();String path="/api/standard-design/requirements/"+req.REQUIREMENT_ID();
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(path)).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path+"/changes").contentType(org.springframework.http.MediaType.APPLICATION_JSON).content("{\"REASON\":\" \"}")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(path).principal(()->"sd-reviewer").contentType(org.springframework.http.MediaType.APPLICATION_JSON).content("{\"REASON\":\"범위 조정\"}")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isNoContent());
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(path+"/revisions")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk()).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.DATA.DISCARD.DISCARDED_BY").value("sd-reviewer"));
 }
 @Test void upgradeAddsLinksWithoutChangingLegacyRowsOrSnapshots() throws Exception {
  var db=new org.springframework.jdbc.datasource.DriverManagerDataSource("jdbc:h2:mem:upgrade-"+UUID.randomUUID()+";MODE=PostgreSQL;DB_CLOSE_DELAY=-1","sa","");
  org.flywaydb.core.Flyway.configure().dataSource(db).locations("classpath:db/migration").target("20").load().migrate();
  var sql=new JdbcTemplate(db);
  sql.update("INSERT INTO BSDRREQ(REQUIREMENT_ID,PROJECT_ID,REQUIREMENT_NAME,REQUIREMENT_TYPE_CODE,DESCRIPTION,PROCESS_DESCRIPTION,STATUS,REQUIREMENT_REVISION) VALUES('REQ-LEGACY','LEGACY','보존','NEW','원문','원문','DRAFT',3)");
  sql.update("INSERT INTO BSDRATCH(ATTACHMENT_ID,REQUIREMENT_ID,ORIGINAL_FILE_NAME,STORAGE_KEY,FILE_TYPE,MIME_TYPE,FILE_SIZE,ANALYSIS_STATUS) VALUES('ATT-LEGACY','REQ-LEGACY','original.png','unchanged-key','png','image/png',12,'NOT_ANALYZED')");
  sql.update("INSERT INTO BSDRRHIS(REQUIREMENT_ID,REQUIREMENT_REVISION,EVENT_TYPE,SNAPSHOT) VALUES('REQ-LEGACY',2,'BASELINE','immutable legacy snapshot')");
  var before=sql.queryForMap("SELECT * FROM BSDRREQ WHERE REQUIREMENT_ID='REQ-LEGACY'");
  var file=sql.queryForMap("SELECT * FROM BSDRATCH WHERE ATTACHMENT_ID='ATT-LEGACY'");
  org.flywaydb.core.Flyway.configure().dataSource(db).locations("classpath:db/migration").load().migrate();
  assertEquals(before,sql.queryForMap("SELECT * FROM BSDRREQ WHERE REQUIREMENT_ID='REQ-LEGACY'"));
  assertEquals(file,sql.queryForMap("SELECT * FROM BSDRATCH WHERE ATTACHMENT_ID='ATT-LEGACY'"));
  assertEquals("immutable legacy snapshot",sql.queryForObject("SELECT SNAPSHOT FROM BSDRRHIS WHERE REQUIREMENT_ID='REQ-LEGACY'",String.class));
  assertEquals(1,sql.queryForObject("SELECT COUNT(*) FROM BSDRRATT WHERE REQUIREMENT_ID='REQ-LEGACY' AND REQUIREMENT_REVISION=3 AND ATTACHMENT_ID='ATT-LEGACY'",Integer.class));
 }

}
