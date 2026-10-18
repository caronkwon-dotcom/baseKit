package com.caron.basekit.core.menuexecution;
import com.caron.basekit.common.api.ApiResponse;
import com.caron.basekit.core.endpoint.EndpointPermissionProvider;
import com.caron.basekit.core.windowaccess.WindowAccessPolicy;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
@RestController
@RequestMapping("/api/core/menu-execution-settings")
public class MenuExecutionController {
 private final MenuExecutionService service;
 private final ObjectProvider<EndpointPermissionProvider> providers;
 private final WindowAccessPolicy policy;
 public MenuExecutionController(MenuExecutionService service, ObjectProvider<EndpointPermissionProvider> providers, WindowAccessPolicy policy) {
  this.service=service; this.providers=providers; this.policy=policy;
 }
 @GetMapping public ApiResponse<List<MenuExecutionSetting>> findAll(HttpServletRequest request) {
  authorize(request,false);
  return ApiResponse.success(service.findAll());
 }
 @PutMapping("/{menuId}") public ApiResponse<MenuExecutionSetting> save(@PathVariable String menuId, @Valid @RequestBody MenuExecutionSaveRequest body, HttpServletRequest request) {
  authorize(request,true);
  return ApiResponse.success(service.save(menuId,body));
 }
 private void authorize(HttpServletRequest request, boolean write) {
  var provider=providers.getIfAvailable();
  // TODO common login: apply the same policy to INNER/WINDOW; preserve installed grants.
  if(provider==null && policy.developmentEnvironment() && request.getUserPrincipal()==null) return;
  if(provider==null || request.getUserPrincipal()==null) {
   deny();
  } else if(!provider.hasProgram(request,"MENU_MGMT") || (write && !provider.hasButtonGroup(request,"MENU_MGMT","SAVE"))) deny();
 }
 private static void deny() { throw new ResponseStatusException(HttpStatus.FORBIDDEN,"메뉴 설정 접근 권한이 없습니다."); }
}
