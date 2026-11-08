package com.caron.basekit.core.documentnumber;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class DocumentNumberAdminService {
    private final DocumentNumberMapper mapper;

    DocumentNumberAdminService(DocumentNumberMapper mapper) { this.mapper = mapper; }

    @Transactional(readOnly = true)
    public List<DocumentNumberRuleData> findRules(String keyword, String useYn) {
        String normalized = keyword == null || keyword.isBlank() ? null : keyword.trim();
        return mapper.findRules(normalized, useYn == null || useYn.isBlank() ? null : useYn);
    }

    @Transactional(readOnly = true)
    public DocumentNumberRuleData findRule(String ruleKey, Integer version) {
        var rule = mapper.findRule(ruleKey, version);
        if (rule == null) throw new DocumentNumberNotFoundException("채번 규칙을 찾을 수 없습니다.");
        return rule;
    }

    @Transactional
    public DocumentNumberRuleData createRule(DocumentNumberRuleSaveRequest request) {
        validate(request);
        mapper.lockRule(request.RULE_KEY(), null);
        Integer latest = mapper.latestVersion(request.RULE_KEY());
        int version = latest == null ? 1 : latest + 1;
        mapper.disableOtherVersions(request.RULE_KEY(), -1, "system");
        mapper.insertRule(request, version, "system");
        return findRule(request.RULE_KEY(), version);
    }

    @Transactional
    public DocumentNumberRuleData updateRule(String ruleKey, int version, DocumentNumberRuleSaveRequest request) {
        if (!ruleKey.equals(request.RULE_KEY())) throw new DocumentNumberConflictException("RULE_KEY는 변경할 수 없습니다.");
        validate(request);
        var current = mapper.lockRule(ruleKey, version);
        if (current == null) throw new DocumentNumberNotFoundException("채번 규칙을 찾을 수 없습니다.");
        boolean formatChanged = !current.PREFIX().equals(request.PREFIX())
                || !current.DATE_FORMAT().equals(request.DATE_FORMAT())
                || !current.SEQUENCE_LENGTH().equals(request.SEQUENCE_LENGTH())
                || !current.START_VALUE().equals(request.START_VALUE())
                || !current.INCREMENT_VALUE().equals(request.INCREMENT_VALUE())
                || !current.RESET_CYCLE().equals(request.RESET_CYCLE())
                || !current.SCOPE_TYPE().equals(request.SCOPE_TYPE());
        if (formatChanged && mapper.issueCount(ruleKey, version) > 0) {
            throw new DocumentNumberConflictException("발급 이력이 있는 RULE의 채번 형식은 변경할 수 없습니다. 새 RULE 버전을 등록하세요.");
        }
        mapper.updateRule(ruleKey, version, request, "system");
        if ("Y".equals(request.USE_YN())) mapper.disableOtherVersions(ruleKey, version, "system");
        return findRule(ruleKey, version);
    }

    @Transactional
    public DocumentNumberRuleData setUsage(String key, int version, String useYn) {
        if (!List.of("Y", "N").contains(useYn)) throw new DocumentNumberConflictException("USE_YN은 Y 또는 N이어야 합니다.");
        var current = findRule(key, version);
        DocumentNumberRuleSaveRequest request = new DocumentNumberRuleSaveRequest(key, current.RULE_NAME(), current.PREFIX(),
                current.DATE_FORMAT(), current.SEQUENCE_LENGTH(), current.START_VALUE(), current.INCREMENT_VALUE(),
                current.RESET_CYCLE(), current.SCOPE_TYPE(), useYn, current.DESCRIPTION());
        return updateRule(key, version, request);
    }

    @Transactional(readOnly = true)
    public DocumentNumberPreviewData preview(DocumentNumberPreviewRequest request) {
        DocumentNumberRuleData rule;
        if (request.DRAFT_RULE() != null) {
            DocumentNumberRuleSaveRequest draft = request.DRAFT_RULE();
            if (!request.RULE_KEY().equals(draft.RULE_KEY())) throw new DocumentNumberConflictException("미리보기 RULE_KEY가 일치하지 않습니다.");
            validate(draft);
            rule = new DocumentNumberRuleData(draft.RULE_KEY(), request.RULE_VERSION() == null ? 1 : request.RULE_VERSION(),
                    draft.RULE_NAME(), draft.PREFIX(), draft.DATE_FORMAT(), draft.SEQUENCE_LENGTH(), draft.START_VALUE(),
                    draft.INCREMENT_VALUE(), draft.RESET_CYCLE(), draft.SCOPE_TYPE(), draft.USE_YN(), draft.DESCRIPTION(),
                    0L, null, "", null, "");
        } else {
            rule = findRule(request.RULE_KEY(), request.RULE_VERSION());
        }
        if (!"Y".equals(rule.USE_YN())) throw new DocumentNumberConflictException("사용 중인 RULE만 미리보기할 수 있습니다.");
        String scope = normalizeScope(rule, request.SCOPE_KEY());
        ZonedDateTime now = mapper.databaseNow();
        String period = period(rule.RESET_CYCLE(), now);
        Long last = request.DRAFT_RULE() == null ? mapper.lastValue(rule.RULE_KEY(), rule.RULE_VERSION(), scope, period) : null;
        long next = last == null ? rule.START_VALUE() : Math.addExact(last, rule.INCREMENT_VALUE());
        return new DocumentNumberPreviewData(rule.RULE_KEY(), rule.RULE_VERSION(), period, next,
                format(rule, now, next), false);
    }

    @Transactional(readOnly = true)
    public List<DocumentNumberIssueData> findHistory(String key, int version, String keyword, Integer limit) {
        findRule(key, version);
        return mapper.findHistory(key, version, keyword == null || keyword.isBlank() ? null : keyword.trim(),
                Math.max(1, Math.min(limit == null ? 100 : limit, 200)));
    }

    static void validate(DocumentNumberRuleSaveRequest request) {
        if (request.START_VALUE().toString().length() > request.SEQUENCE_LENGTH()) {
            throw new DocumentNumberConflictException("START_VALUE가 순번 자리수를 초과합니다.");
        }
        if ("NONE".equals(request.RESET_CYCLE()) && !"NONE".equals(request.DATE_FORMAT())) {
            throw new DocumentNumberConflictException("RESET_CYCLE이 NONE이면 DATE_FORMAT도 NONE이어야 합니다.");
        }
        if ("YEAR".equals(request.RESET_CYCLE()) && "NONE".equals(request.DATE_FORMAT())) {
            throw new DocumentNumberConflictException("연 초기화는 번호 중복 방지를 위해 YYYY 또는 YYYYMM 형식이 필요합니다.");
        }
        if ("MONTH".equals(request.RESET_CYCLE()) && !"YYYYMM".equals(request.DATE_FORMAT())) {
            throw new DocumentNumberConflictException("월 초기화는 번호 중복 방지를 위해 YYYYMM 형식이 필요합니다.");
        }
    }

    static String normalizeScope(DocumentNumberRuleData rule, String scopeKey) {
        String value = scopeKey == null || scopeKey.isBlank() ? "GLOBAL" : scopeKey.trim();
        if ("GLOBAL".equals(rule.SCOPE_TYPE())) return "GLOBAL";
        if ("GLOBAL".equals(value)) throw new DocumentNumberConflictException("적용 범위에 맞는 SCOPE_KEY가 필요합니다.");
        return value;
    }

    static String period(String reset, ZonedDateTime now) {
        return switch (reset) { case "YEAR" -> now.format(DateTimeFormatter.ofPattern("yyyy"));
            case "MONTH" -> now.format(DateTimeFormatter.ofPattern("yyyyMM")); default -> "ALL"; };
    }

    static String format(DocumentNumberRuleData rule, ZonedDateTime now, long sequence) {
        if (Long.toString(sequence).length() > rule.SEQUENCE_LENGTH()) throw new DocumentNumberConflictException("순번 최대값을 초과했습니다.");
        String date = switch (rule.DATE_FORMAT()) { case "YYYY" -> now.format(DateTimeFormatter.ofPattern("yyyy"));
            case "YYYYMM" -> now.format(DateTimeFormatter.ofPattern("yyyyMM")); default -> ""; };
        return String.join("-", java.util.stream.Stream.of(rule.PREFIX(), date,
                String.format(java.util.Locale.ROOT, "%0" + rule.SEQUENCE_LENGTH() + "d", sequence)).filter(part -> !part.isBlank()).toList());
    }
}
