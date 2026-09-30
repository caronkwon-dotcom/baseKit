package com.caron.basekit.standarddesign.projectmenu;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class ProjectMenuService {
    private final ProjectMenuMapper mapper;
    ProjectMenuService(ProjectMenuMapper mapper) { this.mapper = mapper; }

    @Transactional(readOnly = true)
    public ProjectMenuPageData page(String projectId) {
        requireProject(projectId);
        return new ProjectMenuPageData(projectId, mode(projectId), mapper.findAll(projectId));
    }
    @Transactional
    public ProjectMenuPageData setMode(ProjectMenuModeRequest request) {
        requireProject(request.PROJECT_ID());
        String next = normalizeMode(request.MENU_MANAGEMENT_MODE());
        if (mapper.findMode(request.PROJECT_ID()) == null) mapper.insertMode(request.PROJECT_ID(), next);
        else mapper.updateMode(request.PROJECT_ID(), next);
        return page(request.PROJECT_ID());
    }
    @Transactional
    public ProjectMenuData create(ProjectMenuSaveRequest request) {
        validate(request, null);
        String projectId = request.PROJECT_ID().trim();
        String menuId = request.MENU_ID().trim();
        if (mapper.countByMenuId(projectId, menuId, null) > 0) throw new IllegalArgumentException("이미 등록된 메뉴 ID입니다.");
        ProjectMenuData row = new ProjectMenuData("PM-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase(Locale.ROOT), projectId,
                menuId, request.MENU_NAME().trim(), normalizedLevel(projectId, request.MENU_LEVEL()), normalizedLevel1(projectId, request.MENU_LEVEL(), request.LEVEL1_MENU_ID()),
                request.SORT_ORDER() == null ? mapper.findAll(projectId).size() + 1 : request.SORT_ORDER(), null, null);
        mapper.insert(row);
        return mapper.findOne(row.PROJECT_MENU_ID());
    }
    @Transactional
    public ProjectMenuData update(String id, ProjectMenuSaveRequest request) {
        ProjectMenuData current = mapper.findOne(id);
        if (current == null) throw new NoSuchElementException("프로젝트 메뉴를 찾을 수 없습니다.");
        validate(request, id);
        if (!current.PROJECT_ID().equals(request.PROJECT_ID().trim())) throw new IllegalArgumentException("프로젝트 메뉴의 프로젝트는 변경할 수 없습니다.");
        if (mapper.countByMenuId(current.PROJECT_ID(), request.MENU_ID().trim(), id) > 0) throw new IllegalArgumentException("이미 등록된 메뉴 ID입니다.");
        ProjectMenuData row = new ProjectMenuData(id, current.PROJECT_ID(), request.MENU_ID().trim(), request.MENU_NAME().trim(),
                normalizedLevel(current.PROJECT_ID(), request.MENU_LEVEL()), normalizedLevel1(current.PROJECT_ID(), request.MENU_LEVEL(), request.LEVEL1_MENU_ID()),
                request.SORT_ORDER() == null ? current.SORT_ORDER() : request.SORT_ORDER(), current.REG_DT(), current.MOD_DT());
        mapper.update(row);
        return mapper.findOne(id);
    }
    @Transactional
    public void delete(String id) {
        ProjectMenuData row = mapper.findOne(id);
        if (row == null) throw new NoSuchElementException("프로젝트 메뉴를 찾을 수 없습니다.");
        if (mapper.countRequirementReferences(id) > 0) throw new IllegalStateException("요구사항에 연결된 프로젝트 메뉴는 삭제할 수 없습니다.");
        mapper.delete(id);
    }
    @Transactional(readOnly = true)
    public void validateForProject(String projectId, List<String> ids) {
        if (ids == null) return;
        for (String id : new LinkedHashSet<>(ids)) {
            ProjectMenuData row = mapper.findOne(id);
            if (row == null || !row.PROJECT_ID().equals(projectId)) throw new IllegalArgumentException("현재 프로젝트의 메뉴만 연결할 수 있습니다.");
        }
    }
    @Transactional
    public void replaceRequirementRelations(String requirementId, List<String> ids) {
        mapper.deleteRequirementRelations(requirementId);
        if (ids != null) for (String id : new LinkedHashSet<>(ids)) mapper.insertRequirementRelation(requirementId, id);
    }
    private void validate(ProjectMenuSaveRequest request, String excludeId) {
        requireProject(request.PROJECT_ID());
        if (request.MENU_ID().trim().isEmpty() || request.MENU_NAME().trim().isEmpty()) throw new IllegalArgumentException("메뉴 ID와 메뉴명을 입력하세요.");
        if ("LEVEL".equals(mode(request.PROJECT_ID()))) {
            if (request.MENU_LEVEL() == null || request.MENU_LEVEL() < 1) throw new IllegalArgumentException("레벨 관리에서는 메뉴 레벨을 입력하세요.");
            if (request.MENU_LEVEL() > 1 && (request.LEVEL1_MENU_ID() == null || request.LEVEL1_MENU_ID().isBlank())) throw new IllegalArgumentException("하위 메뉴의 1레벨 메뉴를 선택하세요.");
            if (request.MENU_LEVEL() > 1 && mapper.countLevel1(request.PROJECT_ID(), request.LEVEL1_MENU_ID().trim()) == 0) throw new IllegalArgumentException("유효한 1레벨 메뉴를 선택하세요.");
        }
    }
    private String mode(String projectId) { String value = mapper.findMode(projectId); return value == null ? "LEVEL" : value; }
    private static String normalizeMode(String value) { if (!"LEVEL".equals(value) && !"SINGLE".equals(value)) throw new IllegalArgumentException("메뉴 관리 방식은 LEVEL 또는 SINGLE이어야 합니다."); return value; }
    private Integer normalizedLevel(String projectId, Integer level) { return "SINGLE".equals(mode(projectId)) ? null : level; }
    private String normalizedLevel1(String projectId, Integer level, String level1) { return "SINGLE".equals(mode(projectId)) || level == null || level <= 1 ? null : level1 == null ? null : level1.trim(); }
    private static void requireProject(String projectId) { if (projectId == null || projectId.isBlank()) throw new IllegalArgumentException("프로젝트 ID가 필요합니다."); }
}
