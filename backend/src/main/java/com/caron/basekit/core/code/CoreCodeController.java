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

    CoreCodeController(CoreCodeService service) {
        this.service = service;
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
}
