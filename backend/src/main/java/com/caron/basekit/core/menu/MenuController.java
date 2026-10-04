package com.caron.basekit.core.menu;

import com.caron.basekit.common.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/core/menus")
public class MenuController {
    private final MenuService service;

    MenuController(MenuService service) {
        this.service = service;
    }

    @GetMapping("/tree")
    ApiResponse<List<MenuTreeData>> findMenuTree() {
        return ApiResponse.success(service.findMenuTree());
    }

    @GetMapping
    ApiResponse<List<MenuData>> findMenus(
            @RequestParam(name = "KEYWORD", required = false) String keyword,
            @RequestParam(name = "PARENT_MENU_KEY", required = false) String parentMenuKey,
            @RequestParam(name = "MENU_TYPE_CODE", required = false) String menuTypeCode,
            @RequestParam(name = "PROGRAM_KEY", required = false) String programKey,
            @RequestParam(name = "USE_YN", required = false) String useYn) {
        return ApiResponse.success(service.findMenus(keyword, parentMenuKey, menuTypeCode, programKey, useYn));
    }

    @GetMapping("/{menuKey}")
    ApiResponse<MenuData> findMenu(@PathVariable String menuKey) {
        return ApiResponse.success(service.findMenu(menuKey));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<MenuData> createMenu(@Valid @RequestBody MenuSaveRequest request) {
        return ApiResponse.success(service.createMenu(request));
    }

    @PutMapping("/{menuKey}")
    ApiResponse<MenuData> updateMenu(@PathVariable String menuKey, @Valid @RequestBody MenuSaveRequest request) {
        return ApiResponse.success(service.updateMenu(menuKey, request));
    }

    @DeleteMapping("/{menuKey}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteMenu(@PathVariable String menuKey) {
        service.deleteMenu(menuKey);
    }
}
