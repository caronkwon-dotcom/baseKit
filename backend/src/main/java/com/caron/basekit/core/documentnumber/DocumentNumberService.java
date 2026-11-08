package com.caron.basekit.core.documentnumber;

import org.springframework.stereotype.Service;

/** Internal business-service contract. No public reservation endpoint is exposed. */
@Service
public class DocumentNumberService {
    private final DocumentNumberAllocator allocator;

    DocumentNumberService(DocumentNumberAllocator allocator) { this.allocator = allocator; }

    public DocumentNumberIssueData reserve(String ruleKey, int ruleVersion, String scopeKey,
                                           String idempotencyKey, String requestFingerprint, String businessRef) {
        return allocator.reserve(ruleKey, ruleVersion, scopeKey, idempotencyKey, requestFingerprint, businessRef);
    }

    public void markCompleted(String issueId, String businessRef) { allocator.markCompleted(issueId, businessRef); }
    public void markAbandoned(String issueId) { allocator.markAbandoned(issueId); }
}
