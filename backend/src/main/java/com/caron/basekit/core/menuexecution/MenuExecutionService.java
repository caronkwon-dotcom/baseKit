package com.caron.basekit.core.menuexecution;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
@Service
public class MenuExecutionService {
 private final JdbcTemplate jdbc;
 private final MenuExecutionCatalog catalog;
 public MenuExecutionService(JdbcTemplate jdbc, MenuExecutionCatalog catalog) { this.jdbc=jdbc; this.catalog=catalog; }
 @Transactional(readOnly=true)
 public List<MenuExecutionSetting> findAll() { return catalog.rootIds().stream().map(this::find).toList(); }
 @Transactional(readOnly=true)
 public MenuExecutionSetting find(String menuId) {
  requireRoot(menuId);
  var rows=jdbc.query("SELECT MENU_ID, EXECUTION_TYPE, DESIGN_TYPE FROM BSMEXCFG WHERE MENU_ID = ?",
   (rs,n) -> new MenuExecutionSetting(rs.getString(1),rs.getString(2),rs.getString(3)), menuId);
  return rows.isEmpty() ? new MenuExecutionSetting(menuId,"INNER","BASEKIT") : rows.getFirst();
 }
 @Transactional
 public MenuExecutionSetting save(String menuId, MenuExecutionSaveRequest request) {
  requireRoot(menuId);
  if (request == null || request.EXECUTION_TYPE() == null || request.DESIGN_TYPE() == null || !List.of("INNER","WINDOW").contains(request.EXECUTION_TYPE()) || !List.of("BASEKIT","LINEAR").contains(request.DESIGN_TYPE()))
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"실행/디자인 유형이 올바르지 않습니다.");
  int updated = jdbc.update("UPDATE BSMEXCFG SET EXECUTION_TYPE = ?, DESIGN_TYPE = ? WHERE MENU_ID = ?", request.EXECUTION_TYPE(),request.DESIGN_TYPE(),menuId);
  if (updated == 0) {
   try { jdbc.update("INSERT INTO BSMEXCFG (MENU_ID, EXECUTION_TYPE, DESIGN_TYPE) VALUES (?, ?, ?)", menuId,request.EXECUTION_TYPE(),request.DESIGN_TYPE()); }
   catch (org.springframework.dao.DuplicateKeyException conflict) {
    throw new ResponseStatusException(HttpStatus.CONFLICT,"다른 사용자가 설정을 저장했습니다. 다시 조회한 뒤 저장하세요.",conflict);
   }
  }
  return find(menuId);
 }
 private void requireRoot(String menuId) {
  if (!catalog.rootIds().contains(menuId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"원본에 등록된 1Depth 메뉴 ID만 설정할 수 있습니다.");
 }
}
