package com.caron.basekit.core.code;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Predicate;

@Service
public class CodeAttributeService {
    private static final String SYSTEM_ACTOR = "system";
    private static final ZoneId SYSTEM_ZONE = ZoneId.of("Asia/Seoul");
    private static final String CODE_GROUP_SOURCE = "CODE_GROUP:";

    private final CodeAttributeMapper mapper;
    private final CoreCodeMapper codeMapper;

    CodeAttributeService(CodeAttributeMapper mapper, CoreCodeMapper codeMapper) {
        this.mapper = mapper;
        this.codeMapper = codeMapper;
    }

    @Transactional(readOnly = true)
    public List<CodeAttributeDefinitionData> findDefinitions(String codeGroupId) {
        requireCodeGroup(codeGroupId);
        return mapper.findDefinitions(codeGroupId);
    }

    @Transactional(readOnly = true)
    public List<CodeAttributeValueData> findValues(String codeGroupId) {
        requireCodeGroup(codeGroupId);
        return mapper.findValuesByGroup(codeGroupId);
    }

    @Transactional
    public CodeAttributeDefinitionData createDefinition(String codeGroupId, CodeAttributeDefinitionSaveRequest request) {
        requireCodeGroup(codeGroupId);
        validateDefinition(request);
        ensureUnique(codeGroupId, request.ATTRIBUTE_CODE(), null);
        OffsetDateTime now = OffsetDateTime.now(SYSTEM_ZONE);
        CodeAttributeDefinitionData row = new CodeAttributeDefinitionData(
                UUID.randomUUID().toString(), codeGroupId, normalizedCode(request.ATTRIBUTE_CODE()), request.ATTRIBUTE_NAME().trim(),
                request.DATA_TYPE(), request.CONTROL_TYPE(), request.DISPLAY_TYPE(), request.REQUIRED_YN(),
                trimToNull(request.DEFAULT_VALUE()), trimToNull(request.OPTION_SOURCE()), request.SORT_ORDER(), request.USE_YN(), "N",
                now, SYSTEM_ACTOR, now, SYSTEM_ACTOR);
        mapper.insertDefinition(row);
        return requireDefinition(row.ATTRIBUTE_DEF_ID());
    }

    @Transactional
    public CodeAttributeDefinitionData updateDefinition(String attributeDefId, CodeAttributeDefinitionSaveRequest request) {
        CodeAttributeDefinitionData current = requireDefinition(attributeDefId);
        validateDefinition(request);
        if (!current.DATA_TYPE().equals(request.DATA_TYPE()) && mapper.countActiveValuesByDefinition(attributeDefId) > 0) {
            throw new CoreCodeConflictException("속성값이 존재하여 DATA_TYPE을 변경할 수 없습니다.");
        }
        ensureUnique(current.CODE_GROUP_ID(), request.ATTRIBUTE_CODE(), attributeDefId);
        CodeAttributeDefinitionData row = new CodeAttributeDefinitionData(
                current.ATTRIBUTE_DEF_ID(), current.CODE_GROUP_ID(), normalizedCode(request.ATTRIBUTE_CODE()), request.ATTRIBUTE_NAME().trim(),
                request.DATA_TYPE(), request.CONTROL_TYPE(), request.DISPLAY_TYPE(), request.REQUIRED_YN(),
                trimToNull(request.DEFAULT_VALUE()), trimToNull(request.OPTION_SOURCE()), request.SORT_ORDER(), request.USE_YN(),
                current.DEL_YN(), current.REG_DT(), current.REG_BY(), OffsetDateTime.now(SYSTEM_ZONE), SYSTEM_ACTOR);
        mapper.updateDefinition(row);
        return requireDefinition(attributeDefId);
    }

    @Transactional
    public void deleteDefinition(String attributeDefId) {
        requireDefinition(attributeDefId);
        mapper.logicalDeleteValuesByDefinition(attributeDefId, SYSTEM_ACTOR);
        mapper.logicalDeleteDefinition(attributeDefId, SYSTEM_ACTOR);
    }
    @Transactional
    public BatchSaveResult saveDefinitionBatch(String groupId, CodeAttributeDefinitionBatchSaveRequest request) {
        requireCodeGroup(groupId);
        request.INSERTED().forEach(row -> createDefinition(groupId, row));
        request.UPDATED().forEach(row -> {
            requireDefinitionGroup(groupId, row.ATTRIBUTE_DEF_ID());
            updateDefinition(row.ATTRIBUTE_DEF_ID(), row.VALUE());
        });
        request.DELETED().forEach(id -> {
            requireDefinitionGroup(groupId, id);
            deleteDefinition(id);
        });
        return new BatchSaveResult(request.INSERTED().size(), request.UPDATED().size(), request.DELETED().size());
    }

    @Transactional
    public void saveValues(String codeId, String codeGroupId, Map<String, String> values) {
        if (values == null) return;
        List<CodeAttributeDefinitionData> definitions = mapper.findDefinitions(codeGroupId).stream()
                .filter(definition -> "Y".equals(definition.USE_YN()))
                .toList();
        Map<String, CodeAttributeDefinitionData> byCode = new HashMap<>();
        definitions.forEach(definition -> byCode.put(definition.ATTRIBUTE_CODE(), definition));
        values.keySet().forEach(attributeCode -> {
            if (!byCode.containsKey(attributeCode)) {
                throw new CoreCodeConflictException("정의되지 않은 코드 속성입니다: " + attributeCode);
            }
        });

        for (CodeAttributeDefinitionData definition : definitions) {
            String supplied = values.get(definition.ATTRIBUTE_CODE());
            String resolved = trimToNull(supplied);
            if (resolved == null) resolved = trimToNull(definition.DEFAULT_VALUE());
            if (resolved == null && "Y".equals(definition.REQUIRED_YN())) {
                throw new CoreCodeConflictException(definition.ATTRIBUTE_NAME() + "은(는) 필수 속성입니다.");
            }
            if (resolved == null) {
                mapper.logicalDeleteValue(codeId, definition.ATTRIBUTE_DEF_ID(), SYSTEM_ACTOR);
                continue;
            }
            String canonical = validateAndCanonicalize(definition, resolved);
            if (mapper.countValue(codeId, definition.ATTRIBUTE_DEF_ID()) > 0) {
                mapper.updateValue(codeId, definition.ATTRIBUTE_DEF_ID(), canonical, SYSTEM_ACTOR);
            } else {
                mapper.insertValue(codeId, definition.ATTRIBUTE_DEF_ID(), canonical, SYSTEM_ACTOR);
            }
        }
    }

    @Transactional
    public void deleteValuesForCode(String codeId) {
        mapper.logicalDeleteValuesByCode(codeId, SYSTEM_ACTOR);
    }

    private void validateDefinition(CodeAttributeDefinitionSaveRequest request) {
        validateControlCompatibility(request.DATA_TYPE(), request.CONTROL_TYPE());
        String optionSource = trimToNull(request.OPTION_SOURCE());
        if ("SELECT".equals(request.CONTROL_TYPE())) {
            if (optionSource == null || !optionSource.startsWith(CODE_GROUP_SOURCE)) {
                throw new CoreCodeConflictException("SELECT Control은 CODE_GROUP:<그룹ID> OPTION_SOURCE가 필요합니다.");
            }
            requireCodeGroup(optionSource.substring(CODE_GROUP_SOURCE.length()));
        } else if (optionSource != null) {
            throw new CoreCodeConflictException("OPTION_SOURCE는 SELECT Control에서만 사용할 수 있습니다.");
        }
        String defaultValue = trimToNull(request.DEFAULT_VALUE());
        if (defaultValue != null) {
            CodeAttributeDefinitionData temporary = new CodeAttributeDefinitionData(
                    "", "", normalizedCode(request.ATTRIBUTE_CODE()), request.ATTRIBUTE_NAME(), request.DATA_TYPE(),
                    request.CONTROL_TYPE(), request.DISPLAY_TYPE(), request.REQUIRED_YN(), defaultValue, optionSource,
                    request.SORT_ORDER(), request.USE_YN(), "N", null, "", null, "");
            validateAndCanonicalize(temporary, defaultValue);
        }
    }

    private String validateAndCanonicalize(CodeAttributeDefinitionData definition, String value) {
        try {
            String canonical = switch (definition.DATA_TYPE()) {
                case "STRING" -> value;
                case "NUMBER" -> new BigDecimal(value).stripTrailingZeros().toPlainString();
                case "BOOLEAN" -> parseBoolean(value);
                case "DATE" -> LocalDate.parse(value).toString();
                case "DATETIME" -> LocalDateTime.parse(value).toString();
                default -> throw new IllegalArgumentException();
            };
            if ("COLOR_PICKER".equals(definition.CONTROL_TYPE()) && !canonical.matches("#[0-9A-Fa-f]{6}")) {
                throw new IllegalArgumentException();
            }
            String source = trimToNull(definition.OPTION_SOURCE());
            if (source != null && source.startsWith(CODE_GROUP_SOURCE)
                    && mapper.countActiveCodeOption(source.substring(CODE_GROUP_SOURCE.length()), canonical) == 0) {
                throw new IllegalArgumentException();
            }
            return canonical;
        } catch (RuntimeException exception) {
            throw new CoreCodeConflictException(definition.ATTRIBUTE_NAME() + " 값이 " + definition.DATA_TYPE() + " 규칙에 맞지 않습니다.");
        }
    }

    private static String parseBoolean(String value) {
        if ("true".equalsIgnoreCase(value) || "Y".equalsIgnoreCase(value)) return "true";
        if ("false".equalsIgnoreCase(value) || "N".equalsIgnoreCase(value)) return "false";
        throw new IllegalArgumentException();
    }

    private static void validateControlCompatibility(String dataType, String controlType) {
        Predicate<String> allowed = switch (dataType) {
            case "STRING" -> value -> List.of("TEXT", "SELECT", "COLOR_PICKER").contains(value);
            case "NUMBER" -> value -> List.of("NUMBER", "SELECT").contains(value);
            case "BOOLEAN" -> value -> List.of("SWITCH", "SELECT").contains(value);
            case "DATE" -> value -> "DATE_PICKER".equals(value);
            case "DATETIME" -> value -> "TEXT".equals(value);
            default -> value -> false;
        };
        if (!allowed.test(controlType)) throw new CoreCodeConflictException("DATA_TYPE과 CONTROL_TYPE 조합이 올바르지 않습니다.");
    }

    private void ensureUnique(String groupId, String attributeCode, String excludeId) {
        if (mapper.countDuplicateDefinition(groupId, normalizedCode(attributeCode), excludeId) > 0) {
            throw new CoreCodeConflictException("같은 그룹에 이미 사용된 속성 코드입니다.");
        }
    }

    private void requireCodeGroup(String codeGroupId) {
        if (codeMapper.findCodeGroup(codeGroupId) == null) throw new CoreCodeNotFoundException("공통코드 그룹을 찾을 수 없습니다.");
    }

    private CodeAttributeDefinitionData requireDefinition(String id) {
        CodeAttributeDefinitionData result = mapper.findDefinition(id);
        if (result == null) throw new CoreCodeNotFoundException("코드 속성 정의를 찾을 수 없습니다.");
        return result;
    }

    private void requireDefinitionGroup(String groupId, String attributeDefId) {
        if (!groupId.equals(requireDefinition(attributeDefId).CODE_GROUP_ID())) {
            throw new CoreCodeConflictException("속성정의가 요청 코드그룹에 속하지 않습니다.");
        }
    }

    private static String normalizedCode(String value) { return value.trim().toUpperCase(); }
    private static String trimToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
