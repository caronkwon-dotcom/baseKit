package com.caron.basekit.core.code;

import com.caron.basekit.common.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
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
@RequestMapping("/api/core/codes")
public class CoreCodeController {

    private final CoreCodeService service;
    private final CodeAttributeService attributeService;

    CoreCodeController(CoreCodeService service, CodeAttributeService attributeService) {
        this.service = service;
        this.attributeService = attributeService;
    }

    @GetMapping("/groups")
    ApiResponse<List<CodeGroupData>> findCodeGroups(
            @RequestParam(name = "KEYWORD", required = false) String keyword,
            @RequestParam(name = "USE_YN", required = false) String useYn) {
        return ApiResponse.success(service.findCodeGroups(keyword, useYn));
    }

    @GetMapping("/groups/{codeGroupId}")
    ApiResponse<CodeGroupData> findCodeGroup(@PathVariable String codeGroupId) {
        return ApiResponse.success(service.findCodeGroup(codeGroupId));
    }

    @PostMapping("/groups")
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<CodeGroupData> createCodeGroup(@Valid @RequestBody CodeGroupSaveRequest request) {
        return ApiResponse.success(service.createCodeGroup(request));
    }

    @PutMapping("/groups/{codeGroupId}")
    ApiResponse<CodeGroupData> updateCodeGroup(@PathVariable String codeGroupId,
                                               @Valid @RequestBody CodeGroupSaveRequest request) {
        return ApiResponse.success(service.updateCodeGroup(codeGroupId, request));
    }

    @DeleteMapping("/groups/{codeGroupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteCodeGroup(@PathVariable String codeGroupId) {
        service.deleteCodeGroup(codeGroupId);
    }
    @PostMapping("/groups/batch")
    ApiResponse<BatchSaveResult> saveCodeGroupBatch(@Valid @RequestBody CodeGroupBatchSaveRequest request) {
        return ApiResponse.success(service.saveCodeGroupBatch(request));
    }

    @GetMapping("/groups/{codeGroupId}/attribute-definitions")
    ApiResponse<List<CodeAttributeDefinitionData>> findAttributeDefinitions(@PathVariable String codeGroupId) {
        return ApiResponse.success(attributeService.findDefinitions(codeGroupId));
    }

    @PostMapping("/groups/{codeGroupId}/attribute-definitions")
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<CodeAttributeDefinitionData> createAttributeDefinition(
            @PathVariable String codeGroupId, @Valid @RequestBody CodeAttributeDefinitionSaveRequest request) {
        return ApiResponse.success(attributeService.createDefinition(codeGroupId, request));
    }

    @PutMapping("/attribute-definitions/{attributeDefId}")
    ApiResponse<CodeAttributeDefinitionData> updateAttributeDefinition(
            @PathVariable String attributeDefId, @Valid @RequestBody CodeAttributeDefinitionSaveRequest request) {
        return ApiResponse.success(attributeService.updateDefinition(attributeDefId, request));
    }

    @DeleteMapping("/attribute-definitions/{attributeDefId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteAttributeDefinition(@PathVariable String attributeDefId) {
        attributeService.deleteDefinition(attributeDefId);
    }
    @PostMapping("/groups/{codeGroupId}/attributes/batch")
    ApiResponse<BatchSaveResult> saveAttributeBatch(@PathVariable String codeGroupId,
                                                     @Valid @RequestBody CodeAttributeDefinitionBatchSaveRequest request) {
        return ApiResponse.success(attributeService.saveDefinitionBatch(codeGroupId, request));
    }

    @GetMapping("/groups/{codeGroupId}/attribute-values")
    ApiResponse<List<CodeAttributeValueData>> findAttributeValues(@PathVariable String codeGroupId) {
        return ApiResponse.success(attributeService.findValues(codeGroupId));
    }

    @GetMapping
    ApiResponse<List<CommonCodeData>> findCodes(
            @RequestParam(name = "CODE_GROUP_ID", required = false) String codeGroupId,
            @RequestParam(name = "CODE_NAME", required = false) String codeName,
            @RequestParam(name = "USE_YN", required = false) String useYn) {
        return ApiResponse.success(service.findCodes(codeGroupId, codeName, useYn));
    }

    @GetMapping("/{codeId}")
    ApiResponse<CommonCodeData> findCode(@PathVariable String codeId) {
        return ApiResponse.success(service.findCode(codeId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<CommonCodeData> createCode(@Valid @RequestBody CommonCodeSaveRequest request) {
        return ApiResponse.success(service.createCode(request));
    }

    @PutMapping("/{codeId}")
    ApiResponse<CommonCodeData> updateCode(@PathVariable String codeId,
                                           @Valid @RequestBody CommonCodeSaveRequest request) {
        return ApiResponse.success(service.updateCode(codeId, request));
    }

    @DeleteMapping("/{codeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteCode(@PathVariable String codeId) {
        service.deleteCode(codeId);
    }
    @PostMapping("/groups/{codeGroupId}/codes/batch")
    ApiResponse<BatchSaveResult> saveCodeBatch(@PathVariable String codeGroupId,
                                                @Valid @RequestBody CommonCodeBatchSaveRequest request) {
        return ApiResponse.success(service.saveCodeBatch(codeGroupId, request));
    }
}
