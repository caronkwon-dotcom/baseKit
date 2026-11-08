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
import java.util.stream.Collectors;

@Service
public class DesignProgramService {
 private final JdbcTemplate jdbc; private final ObjectMapper json; private final RequirementGroupAnalysisService analyses; private final ProgramReviewStatus review;
 public DesignProgramService(JdbcTemplate jdbc,ObjectMapper json,RequirementGroupAnalysisService analyses,ProgramReviewStatus review) {this.jdbc=jdbc;this.json=json;this.analyses=analyses;this.review=review;}
 private static final Map<String,String> ISSUES=Map.ofEntries(
  Map.entry("DECISION_MISSING","AI 응답에 재사용·변경·신규 판단이 없습니다."),
  Map.entry("DECISION_INVALID","AI가 알 수 없는 판단 값을 반환했습니다."),
  Map.entry("EXISTING_ID_MISSING","재사용·변경으로 판단했지만 기존 프로그램 ID가 없습니다."),
  Map.entry("EXISTING_ID_UNKNOWN","AI가 반환한 기존 프로그램 ID가 대장에 존재하지 않습니다."),
  Map.entry("EXISTING_ID_OTHER_PROJECT","AI가 반환한 기존 프로그램 ID가 다른 프로젝트의 프로그램입니다."),
  Map.entry("EXISTING_ID_NOT_PROVIDED","AI가 반환한 기존 프로그램 ID가 분석 입력으로 전달되지 않았습니다."),
  Map.entry("NEW_WITH_EXISTING_ID","신규로 판단했지만 기존 프로그램 ID가 함께 반환되었습니다."),
  Map.entry("NO_VALID_EVIDENCE","입력 요구사항 중 유효한 근거 요구사항이 없습니다."));
 private static final Map<String,String> WARNINGS=Map.ofEntries(
  Map.entry("KIND_MISMATCH","기존 프로그램과 제안 유형이 다릅니다."),
  Map.entry("CHANGE_SUMMARY_MISSING","변경으로 판단했지만 변경 내용이 없습니다."),
  Map.entry("DUPLICATE_EXISTING_TARGET","같은 기존 프로그램을 가리키는 후보가 여러 건입니다."),
  Map.entry("LEDGER_CHANGED","분석 이후 대장의 해당 프로그램이 바뀌었거나 없어졌습니다. 다시 확인하세요."));
 public record Edit(String PROGRAM_NAME,String DESCRIPTION,Long VERSION) {}
 public record Adopt(String GROUP_ID,String ANALYSIS_ID,List<Integer> CANDIDATE_INDEXES,Boolean ACKNOWLEDGE_LEDGER_CHANGES) {}
 static ResponseStatusException bad(String message) {return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,message);}
 private void project(String project) {if(project==null || project.isBlank() || project.length()>50) throw bad("프로젝트 ID가 필요합니다.");}
 private void validate(Edit input) {if(input==null || input.PROGRAM_NAME()==null || input.PROGRAM_NAME().isBlank() || input.PROGRAM_NAME().strip().length()>300 || input.DESCRIPTION()==null || input.DESCRIPTION().length()>20000) throw bad("명칭(1~300자)과 설명(최대 20000자)을 확인하세요.");}
 private Map<String,Object> upper(Map<String,Object> row) {var result=new LinkedHashMap<String,Object>();row.forEach((k,v)->result.put(k.toUpperCase(Locale.ROOT),v));return result;}
 private Map<String,Object> program(Map<String,Object> row) {return program(row,new HashMap<>());}
 /** The program type lives in the immutable source analysis candidate; manual programs and older analyses have none. */
 private String kind(Map<String,Object> result,Map<String,JsonNode> cache) {
  Object group=result.get("SOURCE_GROUP_ID"),analysis=result.get("SOURCE_ANALYSIS_ID"),index=result.get("SOURCE_CANDIDATE_INDEX");
  if(group==null || analysis==null || !(index instanceof Number number))return null;
  try {
   var response=cache.computeIfAbsent(group+":"+analysis,key->{var run=analyses.get((String)group,(String)analysis);return run.get("RESPONSE") instanceof JsonNode node ? node:json.nullNode();});
   String kind=response.path("programCandidates").path(number.intValue()).path("type").asText("");
   return RequirementGroupAnalysisService.PROGRAM_KINDS.contains(kind) ? kind:null;
  } catch(RuntimeException e) {return null;}
 }
 private Map<String,Object> program(Map<String,Object> row,Map<String,JsonNode> cache) {
  var result=upper(row);result.put("DESCRIPTION",result.remove("PURPOSE"));result.put("PROGRAM_KIND",kind(result,cache));
  result.put("EVIDENCE",jdbc.queryForList("SELECT REQUIREMENT_ID,REQUIREMENT_REVISION,SNAPSHOT_JSON FROM BSDGPREQ WHERE PROGRAM_ID=? ORDER BY REQUIREMENT_ID",result.get("PROGRAM_ID")).stream().map(this::upper).toList());return result;
 }
 @Transactional(readOnly=true) public List<Map<String,Object>> list(String project) {project(project);var cache=new HashMap<String,JsonNode>();var stale=review.staleByProgram(project);return jdbc.queryForList("SELECT * FROM BSDGPROG WHERE PROJECT_ID=? ORDER BY CREATED_AT,PROGRAM_ID",project).stream().map(row->{var item=program(row,cache);return ProgramReviewStatus.mark(item,stale.getOrDefault((String)item.get("PROGRAM_ID"),List.of()));}).toList();}
 private Map<String,Object> get(String project,String id) {var rows=jdbc.queryForList("SELECT * FROM BSDGPROG WHERE PROJECT_ID=? AND PROGRAM_ID=?",project,id);if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"프로그램을 찾을 수 없습니다.");var item=program(rows.getFirst());return ProgramReviewStatus.mark(item,review.staleOf((String)item.get("PROGRAM_ID")));}
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
 private record Source(Map<String,Object> run,JsonNode input,JsonNode candidates,JsonNode response) {}
 private Source source(String project,String group,String analysis) {
  project(project);if(group==null || analysis==null)throw bad("그룹과 분석 이력을 지정하세요.");
  var run=analyses.get(group,analysis);
  var input=read(Objects.toString(run.get("REQUEST_JSON"),"{}"));
  if(!project.equals(input.path("project").path("projectId").asText()) || !group.equals(input.path("group").path("groupId").asText())) throw bad("분석 입력의 프로젝트/그룹이 일치하지 않습니다.");
  if(!Set.of("GROUP_DESIGN","GROUP_PROGRAMS").contains(run.get("ANALYSIS_TYPE")) || !Set.of("SUCCESS","SUCCEEDED").contains(run.get("STATUS")))throw bad("성공한 GROUP_DESIGN 또는 GROUP_PROGRAMS 이력을 선택하세요.");
  var response=run.get("RESPONSE");if(!(response instanceof JsonNode node) || !node.path("programCandidates").isArray())throw bad("프로그램 후보가 없는 분석입니다.");
  return new Source(run,input,((JsonNode)response).path("programCandidates"),(JsonNode)response);
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
 /** NOT_PERFORMED: older analyses never compared the register. PARTIAL: only part of the register was sent. */
 private String compareState(JsonNode response) {
  var compare=response.path("ledgerCompare");
  return !compare.path("performed").asBoolean(false) ? "NOT_PERFORMED" : compare.path("partial").asBoolean(false) ? "PARTIAL" : "DONE";
 }
 /** Reasons this candidate must not be registered; a candidate without them can be adopted as a new program. */
 private List<String> blockers(JsonNode candidate,String compare) {
  var reasons=new ArrayList<String>();
  if("NOT_PERFORMED".equals(compare))return reasons;
  if("REVIEW_REQUIRED".equals(candidate.path("reviewStatus").asText("REVIEW_REQUIRED"))) {
   for(var code:candidate.path("issues"))reasons.add(ISSUES.getOrDefault(code.asText(),code.asText()));
   if(reasons.isEmpty())reasons.add("검토가 필요한 후보입니다.");
   return reasons;
  }
  String decision=candidate.path("decision").asText("");
  if("REUSE".equals(decision))reasons.add("재사용 후보는 이번 단계에서 등록할 수 없습니다. 기존 프로그램과 연결하지 않습니다.");
  else if("CHANGE".equals(decision))reasons.add("변경 후보는 이번 단계에서 등록할 수 없습니다. 기존 프로그램을 수정하지 않습니다.");
  else if("PARTIAL".equals(compare))reasons.add("기존 프로그램 일부만 비교한 분석이어서 신규 등록을 차단했습니다. 재분석이 필요합니다.");
  return reasons;
 }
 private List<Map<String,String>> described(JsonNode codes,Map<String,String> messages) {
  var list=new ArrayList<Map<String,String>>();
  for(var code:codes)list.add(Map.of("CODE",code.asText(),"MESSAGE",messages.getOrDefault(code.asText(),code.asText())));
  return list;
 }
 /** Current state of the existing program an AI judgment points to, compared with what was sent. */
 private Map<String,Object> existing(String project,JsonNode candidate,List<JsonNode> evidence,List<String> warnings) {
  var snapshot=candidate.path("existing");
  if(!snapshot.isObject())return null;
  String id=snapshot.path("programId").asText();
  var rows=jdbc.queryForList("SELECT PROGRAM_NAME,VERSION FROM BSDGPROG WHERE PROJECT_ID=? AND PROGRAM_ID=?",project,id);
  var row=new LinkedHashMap<String,Object>();
  row.put("PROGRAM_ID",id);row.put("PROGRAM_KIND",snapshot.path("kind").isTextual()?snapshot.path("kind").asText():null);
  if(rows.isEmpty()) {row.put("PROGRAM_NAME",snapshot.path("name").asText());row.put("VERSION",null);row.put("SHARED_REQUIREMENT_IDS",List.of());warnings.add("LEDGER_CHANGED");return row;}
  var fields=upper(rows.getFirst());
  row.put("PROGRAM_NAME",fields.get("PROGRAM_NAME"));row.put("VERSION",fields.get("VERSION"));
  if(!Objects.equals(fields.get("PROGRAM_NAME"),snapshot.path("name").asText()))warnings.add("LEDGER_CHANGED");
  var linked=new HashSet<>(jdbc.queryForList("SELECT REQUIREMENT_ID FROM BSDGPREQ WHERE PROGRAM_ID=?",String.class,id));
  row.put("SHARED_REQUIREMENT_IDS",evidence.stream().map(item->item.path("requirementId").asText()).filter(linked::contains).toList());
  return row;
 }
 @Transactional(readOnly=true) public List<Map<String,Object>> candidates(String project,String group,String analysis) {
  var source=source(project,group,analysis);var result=new ArrayList<Map<String,Object>>();int index=0;
  String compare=compareState(source.response());
  for(var candidate:source.candidates()) {
   var row=new LinkedHashMap<String,Object>();row.put("CANDIDATE_INDEX",index);row.put("PROGRAM_NAME",name(candidate));row.put("DESCRIPTION",description(candidate));row.put("PROGRAM_KIND",candidate.path("type").asText(null));row.put("GROUP_VERSION",source.run().get("GROUP_VERSION"));
   List<JsonNode> evidence=List.of();
   try {validate(new Edit(name(candidate),description(candidate),null));evidence=evidence(source,candidate);row.put("EVIDENCE",evidence);row.put("ERROR",null);}catch(ResponseStatusException e){row.put("EVIDENCE",List.of());row.put("ERROR",e.getReason());}
   var ids=jdbc.queryForList("SELECT PROGRAM_ID FROM BSDGPROG WHERE PROJECT_ID=? AND SOURCE_GROUP_ID=? AND SOURCE_ANALYSIS_ID=? AND SOURCE_CANDIDATE_INDEX=?",String.class,project,group,analysis,index);
   row.put("PROGRAM_ID",ids.isEmpty()?null:ids.getFirst());
   var extraWarnings=new ArrayList<String>();
   var existing=existing(project,candidate,evidence,extraWarnings);
   var warningCodes=new ArrayList<String>();candidate.path("warnings").forEach(code->warningCodes.add(code.asText()));warningCodes.addAll(extraWarnings);
   var blockers=blockers(candidate,compare);
   row.put("LEDGER_COMPARE",compare);
   row.put("DECISION",candidate.path("decision").isTextual()?candidate.path("decision").asText():null);
   row.put("EXISTING_PROGRAM_ID",candidate.path("existingProgramId").isTextual()?candidate.path("existingProgramId").asText():null);
   row.put("DECISION_REASON",candidate.path("reason").isTextual()?candidate.path("reason").asText():null);
   row.put("CHANGE_SUMMARY",candidate.path("changeSummary").isTextual()?candidate.path("changeSummary").asText():null);
   row.put("REVIEW_STATUS",candidate.path("reviewStatus").isTextual()?candidate.path("reviewStatus").asText():null);
   row.put("ISSUES",described(candidate.path("issues"),ISSUES));
   row.put("WARNINGS",warningCodes.stream().map(code->Map.of("CODE",code,"MESSAGE",WARNINGS.getOrDefault(code,code))).toList());
   row.put("EXISTING",existing);
   row.put("BLOCK_REASONS",blockers);
   row.put("REGISTRABLE",blockers.isEmpty() && row.get("PROGRAM_ID")==null && row.get("ERROR")==null);
   result.add(row);index++;
  }return result;
 }
 private static String normalized(String name) {return name==null ? "":name.strip().replaceAll("\\s+"," ").toLowerCase(Locale.ROOT);}
 private static boolean similar(String left,String right) {
  if(left.isEmpty() || right.isEmpty() || left.equals(right))return false;
  if(Math.min(left.length(),right.length())>=3 && (left.contains(right) || right.contains(left)))return true;
  var a=new HashSet<>(Arrays.asList(left.split("[^\\p{L}\\p{N}]+")));var b=new HashSet<>(Arrays.asList(right.split("[^\\p{L}\\p{N}]+")));
  a.remove("");b.remove("");if(a.isEmpty() || b.isEmpty())return false;
  var both=new HashSet<>(a);both.retainAll(b);var all=new HashSet<>(a);all.addAll(b);
  return both.size()*2>=all.size();
 }
 private List<Map<String,Object>> registeredAfter(String project,String analysis) {
  return jdbc.queryForList("SELECT PROGRAM_ID,PROGRAM_NAME FROM BSDGPROG WHERE PROJECT_ID=? AND CREATED_AT>(SELECT CREATED_AT FROM BSDRGANL WHERE ANALYSIS_ID=?) AND (SOURCE_ANALYSIS_ID IS NULL OR SOURCE_ANALYSIS_ID<>?) ORDER BY CREATED_AT,PROGRAM_ID",project,analysis,analysis).stream().map(this::upper).toList();
 }
 /** Re-reads the current register right before registration: same names block, newer programs and similar names need review. */
 @Transactional(readOnly=true) public Map<String,Object> adoptionCheck(String project,String group,String analysis,List<Integer> indexes) {
  var source=source(project,group,analysis);
  var current=jdbc.queryForList("SELECT PROGRAM_ID,PROGRAM_NAME FROM BSDGPROG WHERE PROJECT_ID=? ORDER BY CREATED_AT,PROGRAM_ID",project).stream().map(this::upper).toList();
  var conflicts=new ArrayList<Map<String,Object>>();var similar=new ArrayList<Map<String,Object>>();
  for(Integer index:new LinkedHashSet<>(indexes==null ? List.<Integer>of():indexes)) {
   if(index==null || index<0 || index>=source.candidates().size())throw bad("후보 번호가 올바르지 않습니다.");
   String wanted=normalized(name(source.candidates().get(index)));
   for(var program:current) {
    String existing=normalized((String)program.get("PROGRAM_NAME"));
    var entry=new LinkedHashMap<String,Object>();entry.put("CANDIDATE_INDEX",index);entry.put("CANDIDATE_NAME",name(source.candidates().get(index)));entry.put("PROGRAM_ID",program.get("PROGRAM_ID"));entry.put("PROGRAM_NAME",program.get("PROGRAM_NAME"));
    if(existing.equals(wanted))conflicts.add(entry);else if(similar(wanted,existing))similar.add(entry);
   }
  }
  var result=new LinkedHashMap<String,Object>();
  result.put("NAME_CONFLICTS",conflicts);result.put("SIMILAR_NAMES",similar);result.put("ADDED_AFTER_ANALYSIS",registeredAfter(project,analysis));
  return result;
 }
 private record Picked(int index,JsonNode candidate,List<JsonNode> evidence) {}
 @Transactional public List<Map<String,Object>> adopt(String project,Adopt request) {
  if(request==null || request.CANDIDATE_INDEXES()==null || request.CANDIDATE_INDEXES().isEmpty() || request.CANDIDATE_INDEXES().size()>100)throw bad("채택할 후보를 선택하세요.");
  var source=source(project,request.GROUP_ID(),request.ANALYSIS_ID());var result=new ArrayList<Map<String,Object>>();
  String compare=compareState(source.response());
  var picked=new ArrayList<Picked>();
  for(Integer index:new LinkedHashSet<>(request.CANDIDATE_INDEXES())) {
   if(index==null || index<0 || index>=source.candidates().size())throw bad("후보 번호가 올바르지 않습니다.");
   var candidate=source.candidates().get(index);validate(new Edit(name(candidate),description(candidate),null));var evidence=evidence(source,candidate);
   var prior=jdbc.queryForList("SELECT PROGRAM_ID FROM BSDGPROG WHERE PROJECT_ID=? AND SOURCE_GROUP_ID=? AND SOURCE_ANALYSIS_ID=? AND SOURCE_CANDIDATE_INDEX=?",String.class,project,request.GROUP_ID(),request.ANALYSIS_ID(),index);
   if(!prior.isEmpty())throw new ResponseStatusException(HttpStatus.CONFLICT,"이미 등록한 분석 후보입니다. 목록을 다시 조회하세요.");
   var blocked=blockers(candidate,compare);
   if(!blocked.isEmpty())throw bad("등록할 수 없는 후보입니다("+name(candidate)+"): "+String.join(" ",blocked));
   picked.add(new Picked(index,candidate,evidence));
  }
  // The register is read again now: the analysis may be older than the programs registered since.
  var current=jdbc.queryForList("SELECT PROGRAM_ID,PROGRAM_NAME FROM BSDGPROG WHERE PROJECT_ID=?",project).stream().map(this::upper).toList();
  var taken=new HashMap<String,String>();for(var program:current)taken.putIfAbsent(normalized((String)program.get("PROGRAM_NAME")),(String)program.get("PROGRAM_NAME"));
  for(var item:picked) {
   String key=normalized(name(item.candidate()));
   if(taken.containsKey(key))throw new ResponseStatusException(HttpStatus.CONFLICT,"같은 이름의 프로그램이 이미 대장에 있습니다: "+taken.get(key)+". 기존 프로그램을 확인하세요.");
   taken.put(key,name(item.candidate()));
  }
  var added=registeredAfter(project,request.ANALYSIS_ID());
  if(!added.isEmpty() && !Boolean.TRUE.equals(request.ACKNOWLEDGE_LEDGER_CHANGES()))
   throw new ResponseStatusException(HttpStatus.CONFLICT,"분석 이후 대장에 "+added.size()+"건이 등록되었습니다("+added.stream().limit(5).map(row->(String)row.get("PROGRAM_NAME")).collect(Collectors.joining(", "))+"). 내용을 확인한 후 확인 표시와 함께 다시 등록하세요.");
  for(var item:picked) {
   int index=item.index();var candidate=item.candidate();var evidence=item.evidence();
   String id="SDPG-"+UUID.randomUUID();
   try {jdbc.update("INSERT INTO BSDGPROG(PROGRAM_ID,PROJECT_ID,PROGRAM_NAME,PURPOSE,SOURCE_GROUP_ID,SOURCE_ANALYSIS_ID,SOURCE_RESULT_VERSION,SOURCE_CANDIDATE_INDEX,SOURCE_CANDIDATE_ID,STATUS) VALUES(?,?,?,?,?,?,?,?,?,'DRAFT')",id,project,name(candidate).strip(),description(candidate),request.GROUP_ID(),request.ANALYSIS_ID(),source.run().get("GROUP_VERSION"),index,"GC-"+UUID.nameUUIDFromBytes((request.ANALYSIS_ID()+":"+index).getBytes(java.nio.charset.StandardCharsets.UTF_8)));}
   catch(DuplicateKeyException e){throw new ResponseStatusException(HttpStatus.CONFLICT,"이미 등록한 분석 후보입니다.");}
   for(var req:evidence)jdbc.update("INSERT INTO BSDGPREQ(PROGRAM_ID,REQUIREMENT_ID,REQUIREMENT_REVISION,SNAPSHOT_JSON) VALUES(?,?,?,?)",id,req.path("requirementId").asText(),req.path("revision").isIntegralNumber()?req.path("revision").asLong():null,req.toString());
   result.add(get(project,id));
  }return result;
 }
}
