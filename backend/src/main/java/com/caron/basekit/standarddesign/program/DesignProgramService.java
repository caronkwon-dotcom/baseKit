package com.caron.basekit.standarddesign.program;

import com.caron.basekit.standarddesign.requirementgroup.RequirementGroupAnalysisService;
import com.fasterxml.jackson.databind.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
public class DesignProgramService {
 private final JdbcTemplate jdbc; private final ObjectMapper json; private final RequirementGroupAnalysisService analyses;
 public DesignProgramService(JdbcTemplate jdbc,ObjectMapper json,RequirementGroupAnalysisService analyses) {this.jdbc=jdbc;this.json=json;this.analyses=analyses;}
 public record Edit(String PROGRAM_NAME,String DESCRIPTION,Long VERSION) {}
 public record Adopt(String GROUP_ID,String ANALYSIS_ID,List<Integer> CANDIDATE_INDEXES) {}
 static ResponseStatusException bad(String message) {return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,message);}
 private void project(String project) {if(project==null || project.isBlank() || project.length()>50) throw bad("프로젝트 ID가 필요합니다.");}
 private void validate(Edit input) {if(input==null || input.PROGRAM_NAME()==null || input.PROGRAM_NAME().isBlank() || input.PROGRAM_NAME().strip().length()>300 || input.DESCRIPTION()==null || input.DESCRIPTION().length()>20000) throw bad("명칭(1~300자)과 설명(최대 20000자)을 확인하세요.");}
 private Map<String,Object> upper(Map<String,Object> row) {var result=new LinkedHashMap<String,Object>();row.forEach((k,v)->result.put(k.toUpperCase(Locale.ROOT),v));return result;}
 private Map<String,Object> program(Map<String,Object> row) {
  var result=upper(row);result.put("DESCRIPTION",result.remove("PURPOSE"));
  result.put("EVIDENCE",jdbc.queryForList("SELECT REQUIREMENT_ID,REQUIREMENT_REVISION,SNAPSHOT_JSON FROM BSDGPREQ WHERE PROGRAM_ID=? ORDER BY REQUIREMENT_ID",result.get("PROGRAM_ID")).stream().map(this::upper).toList());return result;
 }
 @Transactional(readOnly=true) public List<Map<String,Object>> list(String project) {project(project);return jdbc.queryForList("SELECT * FROM BSDGPROG WHERE PROJECT_ID=? ORDER BY CREATED_AT,PROGRAM_ID",project).stream().map(this::program).toList();}
 private Map<String,Object> get(String project,String id) {var rows=jdbc.queryForList("SELECT * FROM BSDGPROG WHERE PROJECT_ID=? AND PROGRAM_ID=?",project,id);if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"프로그램을 찾을 수 없습니다.");return program(rows.getFirst());}
 @Transactional public Map<String,Object> create(String project,Edit input) {
  project(project);validate(input);String id="SDPG-"+UUID.randomUUID();
  jdbc.update("INSERT INTO BSDGPROG(PROGRAM_ID,PROJECT_ID,PROGRAM_NAME,PURPOSE,STATUS) VALUES(?,?,?,?,'DRAFT')",id,project,input.PROGRAM_NAME().strip(),input.DESCRIPTION());return get(project,id);
 }
 @Transactional public Map<String,Object> edit(String project,String id,Edit input) {
  project(project);validate(input);get(project,id);
  if(input.VERSION()==null || jdbc.update("UPDATE BSDGPROG SET PROGRAM_NAME=?,PURPOSE=?,VERSION=VERSION+1,UPDATED_AT=CURRENT_TIMESTAMP WHERE PROJECT_ID=? AND PROGRAM_ID=? AND VERSION=?",input.PROGRAM_NAME().strip(),input.DESCRIPTION(),project,id,input.VERSION())!=1) throw new ResponseStatusException(HttpStatus.CONFLICT,"다른 창에서 변경했습니다. 다시 조회한 뒤 저장하세요.");
  return get(project,id);
 }
 private JsonNode read(String raw) {try{return json.readTree(raw);}catch(Exception e){throw bad("분석 입력 스냅샷을 읽을 수 없습니다.");}}
 private record Source(Map<String,Object> run,JsonNode input,JsonNode candidates) {}
 private Source source(String project,String group,String analysis) {
  project(project);if(group==null || analysis==null)throw bad("그룹과 분석 이력을 지정하세요.");
  var run=analyses.get(group,analysis);
  var input=read(Objects.toString(run.get("REQUEST_JSON"),"{}"));
  if(!project.equals(input.path("project").path("projectId").asText()) || !group.equals(input.path("group").path("groupId").asText())) throw bad("분석 입력의 프로젝트/그룹이 일치하지 않습니다.");
  if(!"GROUP_DESIGN".equals(run.get("ANALYSIS_TYPE")) || !Set.of("SUCCESS","SUCCEEDED").contains(run.get("STATUS")))throw bad("성공한 GROUP_DESIGN 이력을 선택하세요.");
  var response=run.get("RESPONSE");if(!(response instanceof JsonNode node) || !node.path("programCandidates").isArray())throw bad("프로그램 후보가 없는 분석입니다.");
  return new Source(run,input,((JsonNode)response).path("programCandidates"));
 }
 private List<JsonNode> evidence(Source source,JsonNode candidate) {
  var rows=new ArrayList<JsonNode>();var ids=new HashSet<String>();
  if(!candidate.path("evidenceRequirementIds").isArray())throw bad("후보의 요구사항 근거 형식이 올바르지 않습니다.");
  for(var id:candidate.path("evidenceRequirementIds")) {
   if(!id.isTextual())throw bad("후보의 근거 ID 형식이 올바르지 않습니다.");
   JsonNode found=null;for(var req:source.input().path("requirements"))if(id.asText().equals(req.path("requirementId").asText()))found=req;
   if(found==null)throw bad("분석 입력에 없는 요구사항 근거입니다: "+id.asText());
   if(ids.add(id.asText())) rows.add(found);
  }return rows;
 }
 private String name(JsonNode candidate) {return candidate.path("name").asText(candidate.path("title").asText());}
 private String description(JsonNode candidate) {return candidate.path("purpose").asText(candidate.path("description").asText());}
 @Transactional(readOnly=true) public List<Map<String,Object>> candidates(String project,String group,String analysis) {
  var source=source(project,group,analysis);var result=new ArrayList<Map<String,Object>>();int index=0;
  for(var candidate:source.candidates()) {
   var row=new LinkedHashMap<String,Object>();row.put("CANDIDATE_INDEX",index);row.put("PROGRAM_NAME",name(candidate));row.put("DESCRIPTION",description(candidate));row.put("GROUP_VERSION",source.run().get("GROUP_VERSION"));
   try {validate(new Edit(name(candidate),description(candidate),null));row.put("EVIDENCE",evidence(source,candidate));row.put("ERROR",null);}catch(ResponseStatusException e){row.put("EVIDENCE",List.of());row.put("ERROR",e.getReason());}
   var ids=jdbc.queryForList("SELECT PROGRAM_ID FROM BSDGPROG WHERE PROJECT_ID=? AND SOURCE_GROUP_ID=? AND SOURCE_ANALYSIS_ID=? AND SOURCE_CANDIDATE_INDEX=?",String.class,project,group,analysis,index);
   row.put("PROGRAM_ID",ids.isEmpty()?null:ids.getFirst());result.add(row);index++;
  }return result;
 }
 @Transactional public List<Map<String,Object>> adopt(String project,Adopt request) {
  if(request==null || request.CANDIDATE_INDEXES()==null || request.CANDIDATE_INDEXES().isEmpty() || request.CANDIDATE_INDEXES().size()>100)throw bad("채택할 후보를 선택하세요.");
  var source=source(project,request.GROUP_ID(),request.ANALYSIS_ID());var result=new ArrayList<Map<String,Object>>();
  for(Integer index:new LinkedHashSet<>(request.CANDIDATE_INDEXES())) {
   if(index==null || index<0 || index>=source.candidates().size())throw bad("후보 번호가 올바르지 않습니다.");
   var candidate=source.candidates().get(index);validate(new Edit(name(candidate),description(candidate),null));var evidence=evidence(source,candidate);
   var prior=jdbc.queryForList("SELECT PROGRAM_ID FROM BSDGPROG WHERE PROJECT_ID=? AND SOURCE_GROUP_ID=? AND SOURCE_ANALYSIS_ID=? AND SOURCE_CANDIDATE_INDEX=?",String.class,project,request.GROUP_ID(),request.ANALYSIS_ID(),index);
   if(!prior.isEmpty())throw new ResponseStatusException(HttpStatus.CONFLICT,"이미 등록한 분석 후보입니다. 목록을 다시 조회하세요.");
   String id="SDPG-"+UUID.randomUUID();
   try {jdbc.update("INSERT INTO BSDGPROG(PROGRAM_ID,PROJECT_ID,PROGRAM_NAME,PURPOSE,SOURCE_GROUP_ID,SOURCE_ANALYSIS_ID,SOURCE_RESULT_VERSION,SOURCE_CANDIDATE_INDEX,SOURCE_CANDIDATE_ID,STATUS) VALUES(?,?,?,?,?,?,?,?,?,'DRAFT')",id,project,name(candidate).strip(),description(candidate),request.GROUP_ID(),request.ANALYSIS_ID(),source.run().get("GROUP_VERSION"),index,"GC-"+UUID.nameUUIDFromBytes((request.ANALYSIS_ID()+":"+index).getBytes(java.nio.charset.StandardCharsets.UTF_8)));}
   catch(DuplicateKeyException e){throw new ResponseStatusException(HttpStatus.CONFLICT,"이미 등록한 분석 후보입니다.");}
   for(var req:evidence)jdbc.update("INSERT INTO BSDGPREQ(PROGRAM_ID,REQUIREMENT_ID,REQUIREMENT_REVISION,SNAPSHOT_JSON) VALUES(?,?,?,?)",id,req.path("requirementId").asText(),req.path("revision").isIntegralNumber()?req.path("revision").asLong():null,req.toString());
   result.add(get(project,id));
  }return result;
 }
}
