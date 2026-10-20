package com.caron.basekit.core.menuexecution;
import com.caron.basekit.common.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api/core/menu-execution-settings")
public class MenuExecutionController {
 private final MenuExecutionService service;
 public MenuExecutionController(MenuExecutionService service) {
  this.service=service;
 }
 @GetMapping public ApiResponse<List<MenuExecutionSetting>> findAll() {
  return ApiResponse.success(service.findAll());
 }
 @PutMapping("/{menuId}") public ApiResponse<MenuExecutionSetting> save(@PathVariable String menuId, @Valid @RequestBody MenuExecutionSaveRequest body) {
  return ApiResponse.success(service.save(menuId,body));
 }
}
