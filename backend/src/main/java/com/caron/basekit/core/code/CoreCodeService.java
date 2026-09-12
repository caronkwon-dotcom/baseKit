package com.caron.basekit.core.code;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class CoreCodeService {

    private static final String SYSTEM_ACTOR = "system";
    private static final ZoneId SYSTEM_ZONE = ZoneId.of("Asia/Seoul");

    private final CoreCodeMapper mapper;

    CoreCodeService(CoreCodeMapper mapper) {
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<CodeGroupData> findCodeGroups(String keyword, String useYn) {
        return mapper.findCodeGroups(trimToNull(keyword), trimToNull(useYn));
    }

    @Transactional(readOnly = true)
    public CodeGroupData findCodeGroup(String codeGroupId) {
        CodeGroupData result = mapper.findCodeGroup(codeGroupId);
        if (result == null) {
            throw new CoreCodeNotFoundException("공통코드 그룹을 찾을 수 없습니다.");
        }
        return result;
    }

    @Transactional
    public CodeGroupData createCodeGroup(CodeGroupSaveRequest request) {
        if (mapper.countCodeGroupId(request.CODE_GROUP_ID()) > 0) {
            throw new CoreCodeConflictException("이미 사용된 코드그룹 ID입니다.");
        }
        OffsetDateTime now = OffsetDateTime.now(SYSTEM_ZONE);
        CodeGroupData row = new CodeGroupData(
                request.CODE_GROUP_ID(), request.CODE_GROUP_NAME(), request.DESCRIPTION(), request.USE_YN(), "N",
                now, SYSTEM_ACTOR, now, SYSTEM_ACTOR);
        mapper.insertCodeGroup(row);
        return findCodeGroup(request.CODE_GROUP_ID());
    }

    @Transactional
    public CodeGroupData updateCodeGroup(String codeGroupId, CodeGroupSaveRequest request) {
        requireMatchingId(codeGroupId, request.CODE_GROUP_ID(), "코드그룹 ID");
        CodeGroupData current = findCodeGroup(codeGroupId);
        CodeGroupData row = new CodeGroupData(
                current.CODE_GROUP_ID(), request.CODE_GROUP_NAME(), request.DESCRIPTION(), request.USE_YN(),
                current.DEL_YN(), current.REG_DT(), current.REG_BY(), OffsetDateTime.now(SYSTEM_ZONE), SYSTEM_ACTOR);
        mapper.updateCodeGroup(row);
        return findCodeGroup(codeGroupId);
    }

    @Transactional
    public void deleteCodeGroup(String codeGroupId) {
        findCodeGroup(codeGroupId);
        if (mapper.countActiveCodes(codeGroupId) > 0) {
            throw new CoreCodeConflictException("사용 중인 공통코드가 있어 그룹을 삭제할 수 없습니다.");
        }
        mapper.logicalDeleteCodeGroup(codeGroupId, SYSTEM_ACTOR);
    }

    @Transactional(readOnly = true)
    public List<CommonCodeData> findCodes(String codeGroupId, String codeName, String useYn) {
        return mapper.findCodes(trimToNull(codeGroupId), trimToNull(codeName), trimToNull(useYn));
    }

    @Transactional(readOnly = true)
    public CommonCodeData findCode(String codeId) {
        CommonCodeData result = mapper.findCode(codeId);
        if (result == null) {
            throw new CoreCodeNotFoundException("공통코드를 찾을 수 없습니다.");
        }
        return result;
    }

    @Transactional
    public CommonCodeData createCode(CommonCodeSaveRequest request) {
        findCodeGroup(request.CODE_GROUP_ID());
        if (mapper.countCodeId(request.CODE_ID()) > 0) {
            throw new CoreCodeConflictException("이미 사용된 코드 ID입니다.");
        }
        ensureUniqueCode(request.CODE_GROUP_ID(), request.CODE(), null);
        OffsetDateTime now = OffsetDateTime.now(SYSTEM_ZONE);
        CommonCodeData row = new CommonCodeData(
                request.CODE_ID(), request.CODE_GROUP_ID(), request.CODE(), request.CODE_NAME(), request.SORT_ORDER(),
                request.USE_YN(), "N", now, SYSTEM_ACTOR, now, SYSTEM_ACTOR);
        mapper.insertCode(row);
        return findCode(request.CODE_ID());
    }

    @Transactional
    public CommonCodeData updateCode(String codeId, CommonCodeSaveRequest request) {
        requireMatchingId(codeId, request.CODE_ID(), "코드 ID");
        CommonCodeData current = findCode(codeId);
        requireMatchingId(current.CODE_GROUP_ID(), request.CODE_GROUP_ID(), "코드그룹 ID");
        ensureUniqueCode(current.CODE_GROUP_ID(), request.CODE(), codeId);
        CommonCodeData row = new CommonCodeData(
                current.CODE_ID(), current.CODE_GROUP_ID(), request.CODE(), request.CODE_NAME(), request.SORT_ORDER(),
                request.USE_YN(), current.DEL_YN(), current.REG_DT(), current.REG_BY(),
                OffsetDateTime.now(SYSTEM_ZONE), SYSTEM_ACTOR);
        mapper.updateCode(row);
        return findCode(codeId);
    }

    @Transactional
    public void deleteCode(String codeId) {
        findCode(codeId);
        mapper.logicalDeleteCode(codeId, SYSTEM_ACTOR);
    }

    private void ensureUniqueCode(String codeGroupId, String code, String excludeCodeId) {
        if (mapper.countDuplicateCode(codeGroupId, code, excludeCodeId) > 0) {
            throw new CoreCodeConflictException("같은 그룹에 이미 사용된 코드값입니다.");
        }
    }

    private static void requireMatchingId(String pathId, String bodyId, String fieldName) {
        if (!pathId.equals(bodyId)) {
            throw new CoreCodeConflictException(fieldName + "가 요청 경로와 일치하지 않습니다.");
        }
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
