package com.caron.basekit.standarddesign.requirement;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
interface RequirementMapper {
    List<RequirementRow> findAll(@Param("PROJECT_ID") String projectId);
    RequirementRow findOne(@Param("REQUIREMENT_ID") String id);
    RequirementRow findLegacy(@Param("PROJECT_ID") String projectId, @Param("LEGACY_SOURCE_ID") String legacyId);
    int insert(RequirementRow row);
    int update(RequirementRow row);
    int delete(@Param("REQUIREMENT_ID") String id);
    List<String> menuKeys(@Param("REQUIREMENT_ID") String id);
    int insertMenu(@Param("REQUIREMENT_ID") String id, @Param("MENU_KEY") String menuKey);
    int deleteMenus(@Param("REQUIREMENT_ID") String id);
    List<AttachmentData> attachments(@Param("REQUIREMENT_ID") String id);
    AttachmentData attachment(@Param("ATTACHMENT_ID") String id);
    int insertAttachment(AttachmentData row);
    int deleteAttachment(@Param("ATTACHMENT_ID") String id);
    int countActiveRequirementType(@Param("CODE") String code);
}
