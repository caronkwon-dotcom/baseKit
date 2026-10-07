package com.caron.basekit.standarddesign.requirementgroup;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Component
public class RequirementGroupSnapshot {
 private final JdbcTemplate jdbc;
 private final ObjectMapper json;
 public RequirementGroupSnapshot(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc=jdbc; this.json=json; }
 // Called inside the confirmation transaction after Requirement and group locks.
 public void capture(String id, String project, String projectName, String name, String description, long version) {
  try {
   var input=json.createObjectNode();
   input.putObject("project").put("projectId",project).put("projectName",projectName);
   input.putObject("analysisRequest").put("groupId",id).put("groupName",name).put("groupDescription",description);
   var items=input.putArray("requirements");
   for(var row:jdbc.queryForList("SELECT REQUIREMENT_ID,REVIEWED_REVISION,REVIEWED_SNAPSHOT FROM BSDRGRQ WHERE REQUIREMENT_GROUP_ID=? ORDER BY REQUIREMENT_ID",id)) {
    var original=json.readTree((String)row.get("REVIEWED_SNAPSHOT"));
    if(!original.isObject() || !original.path("REQUIREMENT_ID").asText().equals(row.get("REQUIREMENT_ID")) || original.path("REQUIREMENT_REVISION").asLong()!=((Number)row.get("REVIEWED_REVISION")).longValue())
     throw new IllegalArgumentException("Snapshot revision mismatch");
    var item=items.addObject();
    String[][] fields={{"requirementId","REQUIREMENT_ID"},{"revision","REQUIREMENT_REVISION"},{"name","REQUIREMENT_NAME"},{"type","REQUIREMENT_TYPE_CODE"},{"description","DESCRIPTION"},{"processDescription","PROCESS_DESCRIPTION"},{"designOpinion","DESIGN_OPINION"}};
    for(var field:fields) item.set(field[0],original.path(field[1]).isMissingNode() ? json.nullNode():original.get(field[1]));
    // Preserve discard context instead of presenting retained discarded members as active.
    item.set("discardedYn",original.path("DISCARDED_YN").isMissingNode() ? json.nullNode():original.get("DISCARDED_YN"));
   }
   jdbc.update("INSERT INTO BSDRGCTX(REQUIREMENT_GROUP_ID,GROUP_VERSION,REQUEST_JSON) VALUES(?,?,?)",id,version,json.writeValueAsString(input));
  } catch(Exception e) { throw new ResponseStatusException(HttpStatus.CONFLICT,"확정 Snapshot을 보존하지 못했습니다. 그룹 내용을 다시 검토하세요."); }
 }
}
