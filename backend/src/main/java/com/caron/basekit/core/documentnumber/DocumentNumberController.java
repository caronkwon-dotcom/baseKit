package com.caron.basekit.core.documentnumber;

import com.caron.basekit.common.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/core/document-number-rules")
class DocumentNumberController {
    private final DocumentNumberAdminService service;

    DocumentNumberController(DocumentNumberAdminService service) { this.service = service; }

    @GetMapping
    ApiResponse<List<DocumentNumberRuleData>> findRules(
            @RequestParam(name = "KEYWORD", required = false) String keyword,
            @RequestParam(name = "USE_YN", required = false) String useYn) {
        return ApiResponse.success(service.findRules(keyword, useYn));
    }

    @GetMapping("/{ruleKey}")
    ApiResponse<DocumentNumberRuleData> findRule(@PathVariable String ruleKey,
            @RequestParam(name = "RULE_VERSION", required = false) Integer version) {
        return ApiResponse.success(service.findRule(ruleKey, version));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<DocumentNumberRuleData> createRule(@Valid @RequestBody DocumentNumberRuleSaveRequest request) {
        return ApiResponse.success(service.createRule(request));
    }

    @PutMapping("/{ruleKey}/{version}")
    ApiResponse<DocumentNumberRuleData> updateRule(@PathVariable String ruleKey, @PathVariable int version,
            @Valid @RequestBody DocumentNumberRuleSaveRequest request) {
        return ApiResponse.success(service.updateRule(ruleKey, version, request));
    }

    @PatchMapping("/{ruleKey}/{version}/usage")
    ApiResponse<DocumentNumberRuleData> setUsage(@PathVariable String ruleKey, @PathVariable int version,
            @RequestParam("USE_YN") String useYn) {
        return ApiResponse.success(service.setUsage(ruleKey, version, useYn));
    }

    @PostMapping("/preview")
    ApiResponse<DocumentNumberPreviewData> preview(@Valid @RequestBody DocumentNumberPreviewRequest request) {
        return ApiResponse.success(service.preview(request));
    }

    @GetMapping("/{ruleKey}/{version}/issues")
    ApiResponse<List<DocumentNumberIssueData>> history(@PathVariable String ruleKey, @PathVariable int version,
            @RequestParam(name = "KEYWORD", required = false) String keyword,
            @RequestParam(name = "LIMIT", required = false) Integer limit) {
        return ApiResponse.success(service.findHistory(ruleKey, version, keyword, limit));
    }
}
