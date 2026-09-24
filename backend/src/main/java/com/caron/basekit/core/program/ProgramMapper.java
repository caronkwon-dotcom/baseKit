package com.caron.basekit.core.program;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
interface ProgramMapper {
    List<ProgramData> findPrograms(@Param("KEYWORD") String keyword, @Param("MODULE_CODE") String moduleCode,
                                   @Param("PROGRAM_TYPE_CODE") String programTypeCode, @Param("USE_YN") String useYn);
    ProgramData findProgram(@Param("PROGRAM_ID") String programId);
    int countProgramId(@Param("PROGRAM_ID") String programId);
    int countProgramKey(@Param("PROGRAM_KEY") String programKey, @Param("EXCLUDE_PROGRAM_ID") String excludeProgramId);
    int insertProgram(ProgramData program);
    int updateProgram(ProgramData program);
    int logicalDeleteProgram(@Param("PROGRAM_ID") String programId, @Param("MOD_BY") String modifiedBy);
}
