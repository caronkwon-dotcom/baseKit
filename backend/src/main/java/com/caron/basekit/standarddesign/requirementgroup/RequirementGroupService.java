package com.caron.basekit.standarddesign.requirementgroup;

import com.caron.basekit.standarddesign.requirement.RequirementService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
public class RequirementGroupService {
 public record Member(String REQUIREMENT_ID, String HUMAN_YN, String INCLUSION_REASON, Long REVIEWED_REVISION, List<String> SOURCE_ANALYSIS_IDS) { }
 public record Save(String PROJECT_ID, String REQUIREMENT_GROUP_NAME, String DESCRIPTION, Long VERSION, String REQUEST_ID, List<Member> MEMBERS) { }
 public record Version(Long VERSION) { }
 private final JdbcTemplate jdbc;
 private final RequirementService requirements;
 private final ObjectMapper json;
 public RequirementGroupService(JdbcTemplate jdbc, RequirementService requirements, ObjectMapper json) { this.jdbc=jdbc; this.requirements=requirements; this.json=json; }
 @Transactional(readOnly=true)
 public List<Map<String,Object>> list(String project, String requirementId) {
  required(project, "PROJECT_ID");
  return jdbc.queryForList("SELECT G.REQUIREMENT_GROUP_ID,G.PROJECT_ID,G.REQUIREMENT_GROUP_NAME,G.DESCRIPTION,G.GROUP_STATUS,G.VERSION,G.REQUEST_ID,G.REG_DT,G.MOD_DT, (SELECT COUNT(*) FROM BSDRGRQ M WHERE M.REQUIREMENT_GROUP_ID=G.REQUIREMENT_GROUP_ID) AS MEMBER_COUNT FROM BSDRGRP G WHERE G.PROJECT_ID=?"+
    (requirementId==null ? "" : " AND EXISTS(SELECT 1 FROM BSDRGRQ M WHERE M.REQUIREMENT_GROUP_ID=G.REQUIREMENT_GROUP_ID AND M.REQUIREMENT_ID=?)")+" ORDER BY G.REG_DT DESC,G.REQUIREMENT_GROUP_ID", requirementId==null ? new Object[]{project} : new Object[]{project,requirementId}).stream().map(this::upperKeys).toList();
 }
 @Transactional(readOnly=true)
 public Map<String,Object> get(String id) {
  Map<String,Object> group=row(id,false);
  var members=jdbc.queryForList("SELECT M.* FROM BSDRGRQ M WHERE M.REQUIREMENT_GROUP_ID=? ORDER BY M.REQUIREMENT_ID",id).stream().map(this::upperKeys).toList();
  for(var member:members) {
   String req=(String)member.get("REQUIREMENT_ID");
   member.put("REQUIREMENT",requirements.one(req));
   member.put("SOURCE_ANALYSIS_IDS",jdbc.queryForList("SELECT ANALYSIS_ID FROM BSDRGEVD WHERE REQUIREMENT_GROUP_ID=? AND REQUIREMENT_ID=? ORDER BY ANALYSIS_ID",String.class,id,req));
  }
  group.put("MEMBERS",members); group.remove("REQUEST_PAYLOAD"); return group;
 }
 @Transactional
 public Map<String,Object> create(Save input) {
  validate(input); required(input.REQUEST_ID(),"REQUEST_ID");
  if(input.REQUEST_ID().length()>100) throw bad("REQUEST_ID가 너무 깁니다.");
  String payload=encode(input);
  var found=jdbc.queryForList("SELECT REQUIREMENT_GROUP_ID,REQUEST_PAYLOAD FROM BSDRGRP WHERE PROJECT_ID=? AND REQUEST_ID=?",input.PROJECT_ID(),input.REQUEST_ID());
  if(!found.isEmpty()) { if(!payload.equals(found.getFirst().get("REQUEST_PAYLOAD"))) throw conflict("같은 요청 ID에 다른 내용을 저장할 수 없습니다."); return get((String)found.getFirst().get("REQUIREMENT_GROUP_ID")); }
  lockRequirements(input.MEMBERS().stream().map(Member::REQUIREMENT_ID).toList());
  String id="RG-"+UUID.randomUUID().toString().replace("-","");
  jdbc.update("INSERT INTO BSDRGRP(REQUIREMENT_GROUP_ID,PROJECT_ID,REQUIREMENT_GROUP_NAME,DESCRIPTION,GROUP_STATUS,REQUEST_ID,REQUEST_PAYLOAD) VALUES(?,?,?,?,'DRAFT',?,?)",id,input.PROJECT_ID(),input.REQUIREMENT_GROUP_NAME().trim(),nonnull(input.DESCRIPTION()),input.REQUEST_ID(),payload);
  members(id,input,Map.of()); return get(id);
 }
 @Transactional
 public Map<String,Object> update(String id, Save input) {
  validate(input);
  var old=jdbc.queryForList("SELECT * FROM BSDRGRQ WHERE REQUIREMENT_GROUP_ID=?",id);
  var ids=new TreeSet<String>(); old.forEach(m->ids.add((String)m.get("REQUIREMENT_ID"))); input.MEMBERS().forEach(m->ids.add(m.REQUIREMENT_ID())); lockRequirements(ids);
  var group=row(id,true); version(group,input.VERSION());
  if(!input.PROJECT_ID().equals(group.get("PROJECT_ID"))) throw bad("그룹의 프로젝트는 변경할 수 없습니다.");
  if("CONFIRMED".equals(group.get("GROUP_STATUS"))) throw conflict("확정된 그룹은 구성 수정으로 전환한 후 저장하세요.");
  Map<String,Map<String,Object>> previous=new HashMap<>(); old.forEach(m->previous.put((String)m.get("REQUIREMENT_ID"),m));
  jdbc.update("DELETE FROM BSDRGEVD WHERE REQUIREMENT_GROUP_ID=?",id); jdbc.update("DELETE FROM BSDRGRQ WHERE REQUIREMENT_GROUP_ID=?",id);
  boolean stale=members(id,input,previous);
  String status=stale ? "REVIEW_REQUIRED" : (String)group.get("GROUP_STATUS");
  jdbc.update("UPDATE BSDRGRP SET REQUIREMENT_GROUP_NAME=?,DESCRIPTION=?,GROUP_STATUS=?,VERSION=VERSION+1,MOD_DT=CURRENT_TIMESTAMP WHERE REQUIREMENT_GROUP_ID=?",input.REQUIREMENT_GROUP_NAME().trim(),nonnull(input.DESCRIPTION()),status,id);
  return get(id);
 }
 private boolean members(String id, Save input, Map<String,Map<String,Object>> previous) {
  boolean stale=false;
  for(Member member:input.MEMBERS()) {
   var req=requirements.one(member.REQUIREMENT_ID());
   if(!req.PROJECT_ID().equals(input.PROJECT_ID())) throw bad("다른 프로젝트 Requirement는 포함할 수 없습니다.");
   long reviewed=member.REVIEWED_REVISION(); var prior=previous.get(member.REQUIREMENT_ID()); String snapshot;
   if(reviewed==req.REQUIREMENT_REVISION()) snapshot=encode(req);
   else if(prior!=null && reviewed==((Number)prior.get("REVIEWED_REVISION")).longValue()) { snapshot=(String)prior.get("REVIEWED_SNAPSHOT"); stale=true; }
   else throw conflict("Requirement가 변경되었습니다. 최신 내용을 확인한 후 다시 추가하거나 검토하세요.");
   jdbc.update("INSERT INTO BSDRGRQ(REQUIREMENT_GROUP_ID,PROJECT_ID,REQUIREMENT_ID,HUMAN_YN,INCLUSION_REASON,REVIEWED_REVISION,REVIEWED_SNAPSHOT) VALUES(?,?,?,?,?,?,?)",id,input.PROJECT_ID(),member.REQUIREMENT_ID(),member.HUMAN_YN(),nonnull(member.INCLUSION_REASON()),reviewed,snapshot);
   for(String analysis:member.SOURCE_ANALYSIS_IDS()) {
    if(jdbc.queryForObject("SELECT COUNT(*) FROM BSDRARIT WHERE ANALYSIS_ID=? AND REQUIREMENT_ID=? AND PROJECT_ID=?",Integer.class,analysis,member.REQUIREMENT_ID(),input.PROJECT_ID())==0) throw bad("유효한 동일 프로젝트 추천 근거가 필요합니다.");
    jdbc.update("INSERT INTO BSDRGEVD(REQUIREMENT_GROUP_ID,PROJECT_ID,REQUIREMENT_ID,ANALYSIS_ID) VALUES(?,?,?,?)",id,input.PROJECT_ID(),member.REQUIREMENT_ID(),analysis);
   }
  } return stale;
 }
 @Transactional
 public Map<String,Object> confirm(String id, Version input) {
  lockRequirements(jdbc.queryForList("SELECT REQUIREMENT_ID FROM BSDRGRQ WHERE REQUIREMENT_GROUP_ID=?",String.class,id));
  var group=row(id,true); version(group,input==null ? null : input.VERSION());
  int count=jdbc.queryForObject("SELECT COUNT(*) FROM BSDRGRQ WHERE REQUIREMENT_GROUP_ID=?",Integer.class,id);
  if(count==0) throw bad("확정할 Requirement를 포함하세요.");
  int stale=jdbc.queryForObject("SELECT COUNT(*) FROM BSDRGRQ M JOIN BSDRREQ R ON R.REQUIREMENT_ID=M.REQUIREMENT_ID WHERE M.REQUIREMENT_GROUP_ID=? AND M.REVIEWED_REVISION<>R.REQUIREMENT_REVISION",Integer.class,id);
  if(stale>0) throw conflict("검토 이후 Requirement 변경이 있습니다. 최신 내용을 검토하고 저장하세요.");
  if(!"CONFIRMED".equals(group.get("GROUP_STATUS"))) jdbc.update("UPDATE BSDRGRP SET GROUP_STATUS='CONFIRMED',VERSION=VERSION+1,MOD_DT=CURRENT_TIMESTAMP WHERE REQUIREMENT_GROUP_ID=?",id);
  return get(id);
 }
 @Transactional
 public Map<String,Object> edit(String id, Version input) {
  var group=row(id,true); version(group,input==null ? null : input.VERSION());
  if("CONFIRMED".equals(group.get("GROUP_STATUS"))) jdbc.update("UPDATE BSDRGRP SET GROUP_STATUS='DRAFT',VERSION=VERSION+1,MOD_DT=CURRENT_TIMESTAMP WHERE REQUIREMENT_GROUP_ID=?",id);
  return get(id);
 }
 @Transactional
 public void delete(String id, Version input) {
  var group=row(id,true); version(group,input==null ? null : input.VERSION());
  if("CONFIRMED".equals(group.get("GROUP_STATUS"))) throw conflict("확정 그룹은 구성 수정으로 전환한 후 삭제하세요.");
  jdbc.update("DELETE FROM BSDRGEVD WHERE REQUIREMENT_GROUP_ID=?",id); jdbc.update("DELETE FROM BSDRGRQ WHERE REQUIREMENT_GROUP_ID=?",id); jdbc.update("DELETE FROM BSDRGRP WHERE REQUIREMENT_GROUP_ID=?",id);
 }
 private Map<String,Object> row(String id, boolean lock) {
  var rows=jdbc.queryForList("SELECT * FROM BSDRGRP WHERE REQUIREMENT_GROUP_ID=?"+(lock ? " FOR UPDATE" : ""),id);
  if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"그룹을 찾을 수 없습니다."); return upperKeys(rows.getFirst());
 }
 // JDBC column labels differ between H2 and PostgreSQL; API field names stay stable.
 private Map<String,Object> upperKeys(Map<String,Object> source) {
  Map<String,Object> normalized=new LinkedHashMap<>();
  source.forEach((key,value)->normalized.put(key.toUpperCase(Locale.ROOT),value));
  return normalized;
 }
 private void lockRequirements(Collection<String> ids) {
  for(String id:new TreeSet<>(ids)) if(jdbc.queryForList("SELECT REQUIREMENT_ID FROM BSDRREQ WHERE REQUIREMENT_ID=? FOR UPDATE",id).isEmpty()) throw bad("존재하는 Requirement가 필요합니다.");
 }
 private void validate(Save input) {
  if(input==null) throw bad("요청이 필요합니다."); required(input.PROJECT_ID(),"PROJECT_ID"); required(input.REQUIREMENT_GROUP_NAME(),"그룹명");
  if(input.PROJECT_ID().length()>50 || input.REQUIREMENT_GROUP_NAME().trim().length()>200 || input.MEMBERS()==null) throw bad("그룹명/프로젝트/구성을 확인하세요.");
  var ids=new HashSet<String>();
  for(Member m:input.MEMBERS()) {
   if(m==null) throw bad("구성 항목이 필요합니다."); required(m.REQUIREMENT_ID(),"REQUIREMENT_ID");
   if(!ids.add(m.REQUIREMENT_ID()) || m.REVIEWED_REVISION()==null || m.REVIEWED_REVISION()<1 || !Set.of("Y","N").contains(nonnull(m.HUMAN_YN())) || m.SOURCE_ANALYSIS_IDS()==null || m.SOURCE_ANALYSIS_IDS().stream().anyMatch(a->a==null || a.isBlank()) || new HashSet<>(m.SOURCE_ANALYSIS_IDS()).size()!=m.SOURCE_ANALYSIS_IDS().size() || ("N".equals(m.HUMAN_YN()) && m.SOURCE_ANALYSIS_IDS().isEmpty())) throw bad("중복 구성/근거 또는 검토 기준을 확인하세요.");
  }
 }
 private void version(Map<String,Object> row,Long version) { if(version==null || ((Number)row.get("VERSION")).longValue()!=version) throw conflict("다른 변경이 있습니다. 초안을 보존하고 최신 그룹과 비교하세요."); }
 private String encode(Object value) { try { return json.writeValueAsString(value); } catch(Exception e) { throw new IllegalStateException(e); } }
 private static String nonnull(String s) { return s==null ? "" : s; }
 private static void required(String s,String field) { if(s==null || s.isBlank()) throw bad(field+" 값이 필요합니다."); }
 private static ResponseStatusException bad(String s) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,s); }
 private static ResponseStatusException conflict(String s) { return new ResponseStatusException(HttpStatus.CONFLICT,s); }
}
