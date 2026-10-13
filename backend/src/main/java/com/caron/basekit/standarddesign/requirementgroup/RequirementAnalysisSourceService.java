package com.caron.basekit.standarddesign.requirementgroup;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.OffsetDateTime;
import java.util.*;
import static com.caron.basekit.standarddesign.requirementgroup.RequirementRecommendationService.*;

/** Read-only projection; never copies overview runs into the recommendation model. */
@Service
public class RequirementAnalysisSourceService {
 private final JdbcTemplate jdbc;
 private final ObjectMapper json;
 private final RequirementRecommendationService recommendations;
 private final RequirementGroupAnalysisService analyses;
 public RequirementAnalysisSourceService(JdbcTemplate jdbc, ObjectMapper json, RequirementRecommendationService recommendations, RequirementGroupAnalysisService analyses) {
  this.jdbc=jdbc; this.json=json; this.recommendations=recommendations; this.analyses=analyses;
 }
 @Transactional(readOnly=true)
 public List<Result> list(String project) {
  var result=new ArrayList<>(recommendations.list(project));
  // Project lives in the immutable input, so evidence remains readable after source group deletion.
  for(String id:jdbc.queryForList("SELECT ANALYSIS_ID FROM BSDRGANL ORDER BY CREATED_AT DESC,ANALYSIS_ID",String.class)) {
   var source=get(id);
   if(project.equals(source.PROJECT_ID())) result.add(source);
  }
  result.sort(Comparator.comparing(Result::EXECUTED_AT).reversed().thenComparing(Result::ANALYSIS_ID));
  return result;
 }
 @Transactional(readOnly=true)
 public Result get(String id) {
  if(!id.startsWith("GA-")) return recommendations.get(id);
  var rows=jdbc.queryForList("SELECT REQUIREMENT_GROUP_ID,REQUEST_JSON,REQUEST_ID,CREATED_AT FROM BSDRGANL WHERE ANALYSIS_ID=?",id);
  if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Analysis 근거를 찾을 수 없습니다.");
  var row=rows.getFirst();
  try {
   var input=json.readTree((String)row.get("REQUEST_JSON"));
   String project=input.path("project").path("projectId").asText();
   var originals=new HashSet<String>(); input.path("requirements").forEach(r->originals.add(r.path("requirementId").asText()));
   var run=analyses.get((String)row.get("REQUIREMENT_GROUP_ID"),id);
   var reasons=new LinkedHashMap<String,List<String>>();
   if(run.get("RESPONSE") instanceof JsonNode response) {
    for(String key:List.of("businessAreas","processCandidates","programCandidates","businessStructure","processes","screenCandidates")) {
     for(JsonNode proposal:response.path(key)) {
      var evidence=proposal.path("evidenceRequirementIds"); if(!evidence.isArray()) continue;
      String reason=proposal.path("name").asText(proposal.path("title").asText())+" · "+proposal.path("description").asText(proposal.path("purpose").asText());
      for(JsonNode requirement:evidence) {
       String rid=requirement.asText();
       if(requirement.isTextual() && originals.contains(rid) && jdbc.queryForObject("SELECT COUNT(*) FROM BSDRREQ WHERE REQUIREMENT_ID=? AND PROJECT_ID=?",Integer.class,rid,project)>0)
        reasons.computeIfAbsent(rid,k->new ArrayList<>()).add(reason);
      }
     }
    }
   }
   var items=reasons.entrySet().stream().map(e->new Item(e.getKey(),String.join("\n",e.getValue()),null)).toList();
   return new Result(id,project,(String)row.get("REQUEST_ID"),"그룹 개요 근거 · "+input.path("group").path("groupName").asText()+" · "+run.get("STATUS"),
    (OffsetDateTime)row.get("CREATED_AT"),items);
  }catch(com.fasterxml.jackson.core.JsonProcessingException e) { throw new ResponseStatusException(HttpStatus.CONFLICT,"저장된 분석 입력을 읽지 못했습니다."); }
 }
 public boolean contains(String id,String project,String requirement) {
  try {var source=get(id);return project.equals(source.PROJECT_ID()) && source.ITEMS().stream().anyMatch(i->requirement.equals(i.REQUIREMENT_ID()));}
  catch(ResponseStatusException e) {return false;}
 }
}
