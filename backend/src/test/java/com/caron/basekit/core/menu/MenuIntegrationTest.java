package com.caron.basekit.core.menu;

import com.caron.basekit.core.program.ProgramSaveRequest;
import com.caron.basekit.core.program.ProgramService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MenuIntegrationTest {
    @Autowired
    MockMvc mockMvc;

    @Autowired
    ProgramService programService;

    @Test
    void createsFolderAndPageAndReturnsTree() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String folder = "TEST.FOLDER." + suffix;
        String page = folder + ".PAGE";
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(folderJson(folder)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.DATA.MENU_TYPE_CODE").value("FOLDER"))
                .andExpect(jsonPath("$.DATA.PROGRAM_KEY").isEmpty());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(pageJson(page, folder, "PROGRAM_MGMT")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.DATA.PROGRAM_KEY").value("PROGRAM_MGMT"));
        mockMvc.perform(get("/api/core/menus/tree"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.DATA.length()", greaterThanOrEqualTo(1)));
    }

    @Test
    void rejectsInvalidMenuProgramAndParentRules() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        programService.createProgram(new ProgramSaveRequest(
                "TEST_INACTIVE_" + suffix, "TEST_INACTIVE_" + suffix, "미사용 테스트 프로그램",
                "SYSTEM", "GRID", "/test/inactive/" + suffix, null, "N"));
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(pageJson("TEST.PAGE." + suffix, null, null)))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(folderWithProgramJson("TEST.FOLDER.PROGRAM." + suffix)))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(pageJson("TEST.PAGE.PROGRAM." + suffix, null, "NOT_ACTIVE_PROGRAM")))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(pageJson("TEST.PAGE.INACTIVE." + suffix, null, "TEST_INACTIVE_" + suffix)))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(pageJson("TEST.PAGE.PARENT." + suffix, "NOT_FOUND_PARENT", "PROGRAM_MGMT")))
                .andExpect(status().isConflict());
    }

    @Test
    void rejectsDeleteWhenActiveChildExistsAndDeletesLeafLogically() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String folder = "TEST.DELETE.FOLDER." + suffix;
        String page = folder + ".PAGE";
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(folderJson(folder)))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(pageJson(page, folder, "PROGRAM_MGMT")))
                .andExpect(status().isCreated());
        mockMvc.perform(put("/api/core/menus/" + folder).contentType(MediaType.APPLICATION_JSON)
                        .content(folderJson(folder, null, 1, "N")))
                .andExpect(status().isConflict());
        mockMvc.perform(delete("/api/core/menus/" + folder)).andExpect(status().isConflict());
        mockMvc.perform(delete("/api/core/menus/" + page)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/core/menus/" + page)).andExpect(status().isNotFound());
    }

    @Test
    void allowsMultipleMenusToReferenceTheSameProgram() throws Exception {
        String suffix = suffix();
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON)
                        .content(pageJson("TEST.SAME.PROGRAM.A." + suffix, null, "PROGRAM_MGMT")))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON)
                        .content(pageJson("TEST.SAME.PROGRAM.B." + suffix, null, "PROGRAM_MGMT")))
                .andExpect(status().isCreated());
    }

    @Test
    void rejectsParentCycleAndFourthDepth() throws Exception {
        String suffix = suffix();
        String root = "TEST.DEPTH.ROOT." + suffix;
        String second = root + ".SECOND";
        String third = second + ".THIRD";
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(folderJson(root)))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(folderJson(second, root, 1, "Y")))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(folderJson(third, second, 1, "Y")))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON)
                        .content(pageJson(third + ".FOURTH", third, "PROGRAM_MGMT")))
                .andExpect(status().isConflict());
        mockMvc.perform(put("/api/core/menus/" + root).contentType(MediaType.APPLICATION_JSON)
                        .content(folderJson(root, third, 1, "Y")))
                .andExpect(status().isConflict());
    }

    @Test
    void sortsTreeCalculatesLevelsAndExcludesUnusedOrDeletedMenus() throws Exception {
        String suffix = suffix();
        String lateRoot = "TEST.TREE.LATE." + suffix;
        String earlyRoot = "TEST.TREE.EARLY." + suffix;
        String child = earlyRoot + ".CHILD";
        String firstChild = earlyRoot + ".FIRST";
        String grandchild = child + ".GRANDCHILD";
        String unused = "TEST.TREE.UNUSED." + suffix;
        String deleted = "TEST.TREE.DELETED." + suffix;
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(folderJson(lateRoot, null, 20, "Y")))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(folderJson(earlyRoot, null, 10, "Y")))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(folderJson(child, earlyRoot, 2, "Y")))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(folderJson(firstChild, earlyRoot, 1, "Y")))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(pageJson(grandchild, child, "PROGRAM_MGMT", 1)))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(folderJson(unused, null, 1, "N")))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/core/menus").contentType(MediaType.APPLICATION_JSON).content(folderJson(deleted)))
                .andExpect(status().isCreated());
        mockMvc.perform(delete("/api/core/menus/" + deleted)).andExpect(status().isNoContent());

        String tree = mockMvc.perform(get("/api/core/menus/tree"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Map<String, Object>> roots = JsonPath.read(tree, "$.DATA");
        Map<String, Object> earlyNode = roots.stream()
                .filter(node -> earlyRoot.equals(node.get("MENU_KEY")))
                .findFirst()
                .orElseThrow();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> childNodes = (List<Map<String, Object>>) earlyNode.get("CHILDREN");
        List<String> rootKeys = roots.stream().map(node -> String.valueOf(node.get("MENU_KEY"))).toList();
        List<String> childKeys = childNodes.stream().map(node -> String.valueOf(node.get("MENU_KEY"))).toList();
        assertTrue(rootKeys.indexOf(earlyRoot) < rootKeys.indexOf(lateRoot));
        assertTrue(childKeys.indexOf(firstChild) < childKeys.indexOf(child));
        assertEquals(1, ((Number) earlyNode.get("MENU_LEVEL")).intValue());
        assertEquals(2, ((Number) childNodes.get(0).get("MENU_LEVEL")).intValue());
        assertEquals(2, ((Number) childNodes.get(1).get("MENU_LEVEL")).intValue());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> grandChildren = (List<Map<String, Object>>) childNodes.get(1).get("CHILDREN");
        assertEquals(3, ((Number) grandChildren.get(0).get("MENU_LEVEL")).intValue());
        assertEquals(grandchild, grandChildren.get(0).get("MENU_KEY"));
        assertFalse(rootKeys.contains(unused));
        assertFalse(rootKeys.contains(deleted));
    }

    private static String folderJson(String key) {
        return folderJson(key, null, 1, "Y");
    }

    private static String folderJson(String key, String parent, int sortOrder, String useYn) {
        return "{\"MENU_KEY\":\"" + key + "\",\"MENU_NAME\":\"테스트 폴더\",\"PARENT_MENU_KEY\":" + jsonString(parent) + ",\"MENU_TYPE_CODE\":\"FOLDER\",\"SORT_ORDER\":" + sortOrder + ",\"PROGRAM_KEY\":null,\"USE_YN\":\"" + useYn + "\"}";
    }

    private static String folderWithProgramJson(String key) {
        return "{\"MENU_KEY\":\"" + key + "\",\"MENU_NAME\":\"잘못된 폴더\",\"PARENT_MENU_KEY\":null,\"MENU_TYPE_CODE\":\"FOLDER\",\"SORT_ORDER\":1,\"PROGRAM_KEY\":\"PROGRAM_MGMT\",\"USE_YN\":\"Y\"}";
    }

    private static String pageJson(String key, String parent, String programKey) {
        return pageJson(key, parent, programKey, 1);
    }

    private static String pageJson(String key, String parent, String programKey, int sortOrder) {
        return "{\"MENU_KEY\":\"" + key + "\",\"MENU_NAME\":\"테스트 페이지\",\"PARENT_MENU_KEY\":" + jsonString(parent) + ",\"MENU_TYPE_CODE\":\"PAGE\",\"SORT_ORDER\":" + sortOrder + ",\"PROGRAM_KEY\":" + jsonString(programKey) + ",\"USE_YN\":\"Y\"}";
    }

    private static String suffix() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private static String jsonString(String value) {
        return value == null ? "null" : "\"" + value + "\"";
    }
}
