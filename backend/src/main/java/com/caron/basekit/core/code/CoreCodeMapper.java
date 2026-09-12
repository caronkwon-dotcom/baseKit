package com.caron.basekit.core.code;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
interface CoreCodeMapper {

    List<CodeGroupData> findCodeGroups(@Param("KEYWORD") String keyword,
                                       @Param("USE_YN") String useYn);

    CodeGroupData findCodeGroup(@Param("CODE_GROUP_ID") String codeGroupId);

    int countCodeGroupId(@Param("CODE_GROUP_ID") String codeGroupId);

    int insertCodeGroup(CodeGroupData codeGroup);

    int updateCodeGroup(CodeGroupData codeGroup);

    int logicalDeleteCodeGroup(@Param("CODE_GROUP_ID") String codeGroupId,
                               @Param("MOD_BY") String modifiedBy);

    int countActiveCodes(@Param("CODE_GROUP_ID") String codeGroupId);

    List<CommonCodeData> findCodes(@Param("CODE_GROUP_ID") String codeGroupId,
                                   @Param("CODE_NAME") String codeName,
                                   @Param("USE_YN") String useYn);

    CommonCodeData findCode(@Param("CODE_ID") String codeId);

    int countCodeId(@Param("CODE_ID") String codeId);

    int countDuplicateCode(@Param("CODE_GROUP_ID") String codeGroupId,
                           @Param("CODE") String code,
                           @Param("EXCLUDE_CODE_ID") String excludeCodeId);

    int insertCode(CommonCodeData code);

    int updateCode(CommonCodeData code);

    int logicalDeleteCode(@Param("CODE_ID") String codeId,
                          @Param("MOD_BY") String modifiedBy);
}
