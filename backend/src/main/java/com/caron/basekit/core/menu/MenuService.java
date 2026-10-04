package com.caron.basekit.core.menu;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class MenuService {
    private static final String SYSTEM_ACTOR = "system";
    private static final ZoneId SYSTEM_ZONE = ZoneId.of("Asia/Seoul");
    private static final int MAX_DEPTH = 3;
    private static final Set<String> PHASE_ONE_TYPES = Set.of("FOLDER", "PAGE");

    private final MenuMapper mapper;

    MenuService(MenuMapper mapper) {
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<MenuData> findMenus(String keyword, String parentMenuKey, String menuTypeCode,
                                    String programKey, String useYn) {
        return mapper.findMenus(trim(keyword), trim(parentMenuKey), trim(menuTypeCode), trim(programKey), trim(useYn));
    }

    @Transactional(readOnly = true)
    public MenuData findMenu(String menuKey) {
        MenuData row = mapper.findMenu(trimRequired(menuKey, "메뉴 KEY"));
        if (row == null) {
            throw new MenuNotFoundException("메뉴를 찾을 수 없습니다.");
        }
        return row;
    }

    @Transactional(readOnly = true)
    public List<MenuTreeData> findMenuTree() {
        List<MenuData> rows = mapper.findMenus(null, null, null, null, "Y");
        Map<String, List<MenuData>> childrenByParent = new HashMap<>();
        for (MenuData row : rows) {
            childrenByParent.computeIfAbsent(row.PARENT_MENU_KEY(), ignored -> new ArrayList<>()).add(row);
        }

        Set<String> visited = new HashSet<>();
        List<MenuTreeData> tree = buildTree(childrenByParent, null, 1, visited);
        if (visited.size() != rows.size()) {
            throw new MenuConflictException("메뉴 Tree에 연결되지 않은 메뉴가 있습니다.");
        }
        return tree;
    }

    @Transactional
    public MenuData createMenu(MenuSaveRequest request) {
        String menuKey = trimRequired(request.MENU_KEY(), "메뉴 KEY");
        if (mapper.countMenuKey(menuKey) > 0) {
            throw new MenuConflictException("이미 사용된 메뉴 KEY입니다.");
        }

        MenuData candidate = toCandidate(request, menuKey, null, null, null, null, null);
        validateCandidate(candidate, null);
        OffsetDateTime now = OffsetDateTime.now(SYSTEM_ZONE);
        MenuData row = new MenuData(candidate.MENU_KEY(), candidate.MENU_NAME(), candidate.PARENT_MENU_KEY(),
                candidate.MENU_TYPE_CODE(), candidate.SORT_ORDER(), candidate.PROGRAM_KEY(), candidate.USE_YN(),
                "N", now, SYSTEM_ACTOR, now, SYSTEM_ACTOR);
        mapper.insertMenu(row);
        return findMenu(menuKey);
    }

    @Transactional
    public MenuData updateMenu(String menuKey, MenuSaveRequest request) {
        String pathKey = trimRequired(menuKey, "메뉴 KEY");
        String bodyKey = trimRequired(request.MENU_KEY(), "메뉴 KEY");
        if (!pathKey.equals(bodyKey)) {
            throw new MenuConflictException("메뉴 KEY가 요청 경로와 일치하지 않습니다.");
        }
        MenuData current = findMenu(pathKey);
        if ("N".equals(request.USE_YN()) && mapper.countActiveChildren(pathKey) > 0) {
            throw new MenuConflictException("활성 하위 메뉴가 있어 미사용 처리할 수 없습니다.");
        }
        MenuData candidate = toCandidate(request, pathKey, current.DEL_YN(), current.REG_DT(), current.REG_BY(),
                current.MOD_DT(), current.MOD_BY());
        validateCandidate(candidate, pathKey);
        MenuData row = new MenuData(candidate.MENU_KEY(), candidate.MENU_NAME(), candidate.PARENT_MENU_KEY(),
                candidate.MENU_TYPE_CODE(), candidate.SORT_ORDER(), candidate.PROGRAM_KEY(), candidate.USE_YN(),
                current.DEL_YN(), current.REG_DT(), current.REG_BY(), OffsetDateTime.now(SYSTEM_ZONE), SYSTEM_ACTOR);
        mapper.updateMenu(row);
        return findMenu(pathKey);
    }

    @Transactional
    public void deleteMenu(String menuKey) {
        String key = trimRequired(menuKey, "메뉴 KEY");
        findMenu(key);
        if (mapper.countActiveChildren(key) > 0) {
            throw new MenuConflictException("활성 하위 메뉴가 있어 삭제할 수 없습니다.");
        }
        mapper.logicalDeleteMenu(key, SYSTEM_ACTOR);
    }

    private void validateCandidate(MenuData candidate, String currentKey) {
        String type = trimRequired(candidate.MENU_TYPE_CODE(), "메뉴 유형");
        if (!PHASE_ONE_TYPES.contains(type) || mapper.countActiveMenuType(type) == 0) {
            throw new MenuConflictException("Phase 1에서 지원하지 않는 메뉴 유형입니다.");
        }

        String programKey = trim(candidate.PROGRAM_KEY());
        if ("FOLDER".equals(type) && programKey != null) {
            throw new MenuConflictException("FOLDER 메뉴에는 Program을 연결할 수 없습니다.");
        }
        if ("PAGE".equals(type) && programKey == null) {
            throw new MenuConflictException("PAGE 메뉴에는 Program이 필요합니다.");
        }
        if (programKey != null && mapper.countActiveProgram(programKey) == 0) {
            throw new MenuConflictException("사용 가능한 Program을 찾을 수 없습니다.");
        }

        String parentKey = trim(candidate.PARENT_MENU_KEY());
        if (parentKey == null) {
            return;
        }
        if (parentKey.equals(currentKey)) {
            throw new MenuConflictException("메뉴가 자기 자신을 부모로 참조할 수 없습니다.");
        }

        int depth = 1;
        Set<String> visited = new HashSet<>();
        String cursor = parentKey;
        while (cursor != null) {
            if (cursor.equals(currentKey)) {
                throw new MenuConflictException("메뉴 부모 관계에 순환 참조가 있습니다.");
            }
            if (!visited.add(cursor)) {
                throw new MenuConflictException("메뉴 부모 관계에 순환 참조가 있습니다.");
            }
            MenuData parent = mapper.findMenu(cursor);
            if (parent == null || "N".equals(parent.USE_YN())) {
                throw new MenuConflictException("사용 가능한 부모 메뉴를 찾을 수 없습니다.");
            }
            depth++;
            if (depth > MAX_DEPTH) {
                throw new MenuConflictException("메뉴는 최대 3Depth까지만 허용됩니다.");
            }
            cursor = trim(parent.PARENT_MENU_KEY());
        }
    }

    private List<MenuTreeData> buildTree(Map<String, List<MenuData>> childrenByParent,
                                         String parentKey, int level, Set<String> visited) {
        List<MenuData> rows = childrenByParent.getOrDefault(parentKey, List.of());
        return rows.stream().map(row -> {
            if (!visited.add(row.MENU_KEY()) || level > MAX_DEPTH) {
                throw new MenuConflictException("메뉴 Tree에 순환 또는 3Depth 초과가 있습니다.");
            }
            return new MenuTreeData(row.MENU_KEY(), row.MENU_NAME(), row.PARENT_MENU_KEY(), row.MENU_TYPE_CODE(),
                    row.SORT_ORDER(), row.PROGRAM_KEY(), level,
                    buildTree(childrenByParent, row.MENU_KEY(), level + 1, visited));
        }).toList();
    }

    private static MenuData toCandidate(MenuSaveRequest request, String menuKey, String delYn,
                                       OffsetDateTime regDt, String regBy, OffsetDateTime modDt,
                                       String modBy) {
        return new MenuData(menuKey, trimRequired(request.MENU_NAME(), "메뉴명"), trim(request.PARENT_MENU_KEY()),
                trim(request.MENU_TYPE_CODE()), request.SORT_ORDER(), trim(request.PROGRAM_KEY()),
                trimRequired(request.USE_YN(), "사용 여부"), delYn, regDt, regBy, modDt, modBy);
    }

    private static String trimRequired(String value, String fieldName) {
        String trimmed = trim(value);
        if (trimmed == null) {
            throw new MenuConflictException(fieldName + "을(를) 입력해 주세요.");
        }
        return trimmed;
    }

    private static String trim(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
