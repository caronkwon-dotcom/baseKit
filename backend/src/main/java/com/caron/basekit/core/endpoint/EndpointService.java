package com.caron.basekit.core.endpoint;

import com.caron.basekit.core.program.ProgramService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;

@Service
public class EndpointService {
    private final EndpointMapper mapper;
    private final ProgramService programs;
    public EndpointService(EndpointMapper mapper, ProgramService programs) { this.mapper=mapper; this.programs=programs; }

    @Transactional
    public void collect(List<EndpointData> endpoints) {
        mapper.markStale();
        for (EndpointData endpoint : endpoints) {
            if (mapper.countEndpoint(endpoint.ENDPOINT_ID()) == 0) mapper.insertEndpoint(endpoint);
            else mapper.updateEndpoint(endpoint);
        }
    }
    @Transactional(readOnly=true)
    public List<EndpointData> endpoints(String programId) { programs.findProgram(programId); return mapper.findEndpoints(programId); }
    @Transactional(readOnly=true)
    public List<ButtonGroup> groups(String programId) { programs.findProgram(programId); return mapper.findGroups(programId); }

    @Transactional
    public List<ButtonGroup> saveGroups(String programId, List<ButtonGroup> groups) {
        programs.findProgram(programId);
        Set<String> codes = new HashSet<>();
        for (ButtonGroup group : groups) {
            if (!group.GROUP_CODE().startsWith(group.GROUP_TYPE()+".") || !codes.add(group.GROUP_CODE()))
                throw bad("권한 그룹 구분과 코드가 일치해야 하며 중복 코드는 허용하지 않습니다.");
        }
        var mappings = mapper.findEndpoints(programId).stream().filter(e -> "MAPPED".equals(e.MAPPING_STATUS())).toList();
        if (mappings.stream().anyMatch(e -> e.GROUP_CODE()!=null && !codes.contains(e.GROUP_CODE())))
            throw bad("Endpoint에서 사용 중인 권한 그룹은 먼저 연결을 해제하세요.");
        mapper.deleteMappings(programId, null);
        mapper.deleteGroups(programId);
        groups.forEach(group -> mapper.insertGroup(programId, group));
        mappings.forEach(e -> mapper.insertMapping(programId, e.ENDPOINT_ID(), e.GROUP_CODE()));
        return mapper.findGroups(programId);
    }
    @Transactional
    public void map(String programId, String endpointId, String groupCode) {
        programs.findProgram(programId);
        if (mapper.countEndpoint(endpointId)==0) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Endpoint를 찾을 수 없습니다.");
        String code = groupCode==null || groupCode.isBlank() ? null : groupCode;
        if (code!=null && mapper.findGroups(programId).stream().noneMatch(g -> g.GROUP_CODE().equals(code) && "Y".equals(g.USE_YN())))
            throw bad("선택 Program의 사용 중인 권한 그룹을 지정하세요.");
        mapper.deleteMappings(programId, endpointId);
        mapper.insertMapping(programId, endpointId, code);
    }
    @Transactional
    public void unmap(String programId, String endpointId) { programs.findProgram(programId); mapper.deleteMappings(programId,endpointId); }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
}
