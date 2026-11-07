package com.caron.basekit.core.documentnumber;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Independent transaction boundary: committed reservations survive a caller's business rollback. */
@Service
public class DocumentNumberAllocator {
    private final DocumentNumberMapper mapper;

    DocumentNumberAllocator(DocumentNumberMapper mapper) { this.mapper = mapper; }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public DocumentNumberIssueData reserve(String ruleKey, int version, String scopeKey,
                                           String idempotencyKey, String requestFingerprint, String businessRef) {
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 160) {
            throw new DocumentNumberConflictException("IDEMPOTENCY_KEY가 필요하며 160자 이하여야 합니다.");
        }
        if (requestFingerprint == null || requestFingerprint.isBlank() || requestFingerprint.length() > 128) {
            throw new DocumentNumberConflictException("REQUEST_FINGERPRINT가 필요하며 128자 이하여야 합니다.");
        }

        // Locking the immutable version row serializes first-counter creation and rechecks duplicate keys
        // after any competing reservation for this rule has committed.
        DocumentNumberRuleData rule = mapper.lockRule(ruleKey, version);
        if (rule == null) throw new DocumentNumberNotFoundException("채번 규칙 버전을 찾을 수 없습니다.");
        String normalizedScope = DocumentNumberAdminService.normalizeScope(rule, scopeKey);
        DocumentNumberIssueData prior = mapper.findByIdempotency(ruleKey, idempotencyKey);
        if (prior != null) {
            String previousFingerprint = mapper.requestFingerprint(ruleKey, idempotencyKey);
            if (!requestFingerprint.equals(previousFingerprint)) {
                throw new DocumentNumberConflictException("같은 IDEMPOTENCY_KEY를 다른 요청 내용에 사용할 수 없습니다.");
            }
            if (!normalizedScope.equals(prior.SCOPE_KEY())) {
                throw new DocumentNumberConflictException("같은 IDEMPOTENCY_KEY를 다른 적용 범위에 사용할 수 없습니다.");
            }
            if ("ABANDONED".equals(prior.ISSUE_STATUS())) mapper.updateIssueStatus(prior.ISSUE_ID(), "RESERVED", businessRef);
            return mapper.findIssue(prior.ISSUE_ID());
        }
        if (!"Y".equals(rule.USE_YN())) throw new DocumentNumberConflictException("사용 중지된 RULE은 번호를 발급할 수 없습니다.");

        var now = mapper.databaseNow();
        String period = DocumentNumberAdminService.period(rule.RESET_CYCLE(), now);
        Long lastValue = mapper.lastValue(ruleKey, version, normalizedScope, period);
        long sequence;
        if (lastValue == null) {
            sequence = rule.START_VALUE();
            mapper.insertCounter(ruleKey, version, normalizedScope, period, sequence);
        } else {
            try { sequence = Math.addExact(lastValue, rule.INCREMENT_VALUE()); }
            catch (ArithmeticException exception) { throw new DocumentNumberConflictException("순번 최대값을 초과했습니다."); }
            mapper.updateCounter(ruleKey, version, normalizedScope, period, sequence);
        }
        String number = DocumentNumberAdminService.format(rule, now, sequence);
        DocumentNumberIssueData issue = new DocumentNumberIssueData(UUID.randomUUID().toString(), ruleKey, version,
                normalizedScope, period, sequence, number, idempotencyKey, "RESERVED", businessRef, now.toOffsetDateTime(), now.toOffsetDateTime());
        try {
            mapper.insertIssue(issue, requestFingerprint);
        } catch (org.springframework.dao.DuplicateKeyException exception) {
            throw new DocumentNumberConflictException("같은 출력 형식에서 이미 발급된 번호입니다. RULE 접두어와 초기화 설정을 점검하세요.");
        }
        return issue;
    }

    /** Call inside the business write transaction so status commits with the business row. */
    @Transactional
    public void markCompleted(String issueId, String businessRef) {
        DocumentNumberIssueData issue = mapper.findIssue(issueId);
        if (issue == null) throw new DocumentNumberNotFoundException("발급 예약을 찾을 수 없습니다.");
        if ("COMPLETED".equals(issue.ISSUE_STATUS())) {
            if (businessRef != null && issue.BUSINESS_REF() != null && !businessRef.equals(issue.BUSINESS_REF())) {
                throw new DocumentNumberConflictException("완료된 발급 예약을 다른 업무 데이터에 연결할 수 없습니다.");
            }
            return;
        }
        mapper.updateIssueStatus(issueId, "COMPLETED", businessRef);
    }

    /** Call after a business transaction fails; this state update must not roll the reservation back. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markAbandoned(String issueId) {
        DocumentNumberIssueData issue = mapper.findIssue(issueId);
        if (issue == null) throw new DocumentNumberNotFoundException("발급 예약을 찾을 수 없습니다.");
        if (!"COMPLETED".equals(issue.ISSUE_STATUS())) mapper.updateIssueStatus(issueId, "ABANDONED", null);
    }
}
