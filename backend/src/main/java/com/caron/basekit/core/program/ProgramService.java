package com.caron.basekit.core.program;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class ProgramService {
    private static final String SYSTEM_ACTOR = "system";
    private static final ZoneId SYSTEM_ZONE = ZoneId.of("Asia/Seoul");
    private final ProgramMapper mapper;
    ProgramService(ProgramMapper mapper) { this.mapper = mapper; }

    @Transactional(readOnly = true)
    public List<ProgramData> findPrograms(String keyword, String moduleCode, String programTypeCode, String useYn) {
        return mapper.findPrograms(trim(keyword), trim(moduleCode), trim(programTypeCode), trim(useYn));
    }
    @Transactional(readOnly = true)
    public ProgramData findProgram(String id) {
        ProgramData row = mapper.findProgram(id);
        if (row == null) throw new ProgramNotFoundException("프로그램을 찾을 수 없습니다.");
        return row;
    }
    @Transactional
    public ProgramData createProgram(ProgramSaveRequest request) {
        if (mapper.countProgramId(request.PROGRAM_ID()) > 0) throw new ProgramConflictException("이미 사용된 프로그램 ID입니다.");
        ensureUniqueKey(request.PROGRAM_KEY(), null);
        OffsetDateTime now = OffsetDateTime.now(SYSTEM_ZONE);
        ProgramData row = new ProgramData(request.PROGRAM_ID(), request.PROGRAM_KEY(), request.PROGRAM_NAME(),
                request.MODULE_CODE(), request.PROGRAM_TYPE_CODE(), request.ROUTE(), request.DESCRIPTION(),
                request.USE_YN(), "N", now, SYSTEM_ACTOR, now, SYSTEM_ACTOR);
        mapper.insertProgram(row);
        return findProgram(row.PROGRAM_ID());
    }
    @Transactional
    public ProgramData updateProgram(String id, ProgramSaveRequest request) {
        if (!id.equals(request.PROGRAM_ID())) throw new ProgramConflictException("프로그램 ID가 요청 경로와 일치하지 않습니다.");
        ProgramData current = findProgram(id);
        ensureUniqueKey(request.PROGRAM_KEY(), id);
        ProgramData row = new ProgramData(current.PROGRAM_ID(), request.PROGRAM_KEY(), request.PROGRAM_NAME(),
                request.MODULE_CODE(), request.PROGRAM_TYPE_CODE(), request.ROUTE(), request.DESCRIPTION(),
                request.USE_YN(), current.DEL_YN(), current.REG_DT(), current.REG_BY(),
                OffsetDateTime.now(SYSTEM_ZONE), SYSTEM_ACTOR);
        mapper.updateProgram(row);
        return findProgram(id);
    }
    @Transactional
    public void deleteProgram(String id) { findProgram(id); mapper.logicalDeleteProgram(id, SYSTEM_ACTOR); }
    private void ensureUniqueKey(String key, String excludeId) {
        if (mapper.countProgramKey(key, excludeId) > 0) throw new ProgramConflictException("이미 사용된 프로그램 KEY입니다.");
    }
    private static String trim(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
