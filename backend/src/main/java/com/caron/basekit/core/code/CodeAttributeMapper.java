package com.caron.basekit.core.code;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
interface CodeAttributeMapper {
    List<CodeAttributeDefinitionData> findDefinitions(@Param("CODE_GROUP_ID") String codeGroupId);
    CodeAttributeDefinitionData findDefinition(@Param("ATTRIBUTE_DEF_ID") String attributeDefId);
    int countDuplicateDefinition(@Param("CODE_GROUP_ID") String codeGroupId,
                                 @Param("ATTRIBUTE_CODE") String attributeCode,
                                 @Param("EXCLUDE_ATTRIBUTE_DEF_ID") String excludeAttributeDefId);
    int insertDefinition(CodeAttributeDefinitionData definition);
    int updateDefinition(CodeAttributeDefinitionData definition);
    int logicalDeleteDefinition(@Param("ATTRIBUTE_DEF_ID") String attributeDefId,
                                @Param("MOD_BY") String modifiedBy);
    int logicalDeleteValuesByDefinition(@Param("ATTRIBUTE_DEF_ID") String attributeDefId,
                                        @Param("MOD_BY") String modifiedBy);
    int countActiveValuesByDefinition(@Param("ATTRIBUTE_DEF_ID") String attributeDefId);
    int countActiveCodeOption(@Param("CODE_GROUP_ID") String codeGroupId, @Param("CODE") String code);
    List<CodeAttributeValueData> findValuesByGroup(@Param("CODE_GROUP_ID") String codeGroupId);
    int countValue(@Param("CODE_ID") String codeId, @Param("ATTRIBUTE_DEF_ID") String attributeDefId);
    int insertValue(@Param("CODE_ID") String codeId, @Param("ATTRIBUTE_DEF_ID") String attributeDefId,
                    @Param("ATTRIBUTE_VALUE") String attributeValue, @Param("ACTOR") String actor);
    int updateValue(@Param("CODE_ID") String codeId, @Param("ATTRIBUTE_DEF_ID") String attributeDefId,
                    @Param("ATTRIBUTE_VALUE") String attributeValue, @Param("ACTOR") String actor);
    int logicalDeleteValue(@Param("CODE_ID") String codeId,
                           @Param("ATTRIBUTE_DEF_ID") String attributeDefId,
                           @Param("MOD_BY") String modifiedBy);
    int logicalDeleteValuesByCode(@Param("CODE_ID") String codeId, @Param("MOD_BY") String modifiedBy);
}
