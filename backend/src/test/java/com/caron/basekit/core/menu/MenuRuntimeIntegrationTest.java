package com.caron.basekit.core.menu;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MenuRuntimeIntegrationTest {
    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void insertDeterministicRuntimeFixture() {
        jdbc.update("INSERT INTO BSYMENU (MENU_KEY, MENU_NAME, MENU_TYPE_CODE, SORT_ORDER, PROGRAM_KEY, REG_BY, MOD_BY) "
                + "VALUES ('ZZ_RUNTIME_ROOT', 'Runtime root', 'FOLDER', -2147483648, NULL, 'test', 'test')");
        jdbc.update("INSERT INTO BSYMENU (MENU_KEY, MENU_NAME, PARENT_MENU_KEY, MENU_TYPE_CODE, SORT_ORDER, PROGRAM_KEY, REG_BY, MOD_BY) "
                + "VALUES ('ZZ_RUNTIME_FOLDER', 'Runtime folder', 'ZZ_RUNTIME_ROOT', 'FOLDER', -2147483648, NULL, 'test', 'test')");
        jdbc.update("INSERT INTO BSYMENU (MENU_KEY, MENU_NAME, PARENT_MENU_KEY, MENU_TYPE_CODE, SORT_ORDER, PROGRAM_KEY, REG_BY, MOD_BY) "
                + "VALUES ('ZZ_RUNTIME_PAGE_A', 'Runtime page A', 'ZZ_RUNTIME_FOLDER', 'PAGE', 20, 'PROGRAM_MGMT', 'test', 'test')");
        jdbc.update("INSERT INTO BSYMENU (MENU_KEY, MENU_NAME, PARENT_MENU_KEY, MENU_TYPE_CODE, SORT_ORDER, PROGRAM_KEY, REG_BY, MOD_BY) "
                + "VALUES ('ZZ_RUNTIME_PAGE_B', 'Runtime page B', 'ZZ_RUNTIME_FOLDER', 'PAGE', 10, 'TERM_CURATION', 'test', 'test')");
    }

    @Test
    void returnsSeededDbTreeInOrderWithProgramLinks() throws Exception {
        mockMvc.perform(get("/api/core/menus/runtime"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.SUCCESS", is(true)))
                .andExpect(jsonPath("$.DATA.MENUS[0].MENU_KEY", is("ZZ_RUNTIME_ROOT")))
                .andExpect(jsonPath("$.DATA.MENUS[0].MENU_LEVEL", is(1)))
                .andExpect(jsonPath("$.DATA.MENUS[0].CHILDREN[0].MENU_KEY", is("ZZ_RUNTIME_FOLDER")))
                .andExpect(jsonPath("$.DATA.MENUS[0].CHILDREN[0].CHILDREN[0].PROGRAM_KEY", is("TERM_CURATION")))
                .andExpect(jsonPath("$.DATA.MENUS[0].CHILDREN[0].CHILDREN[0].MENU_LEVEL", is(3)))
                .andExpect(jsonPath("$.DATA.MENUS[0].CHILDREN[0].CHILDREN[1].PROGRAM_KEY", is("PROGRAM_MGMT")));
    }

    @Test
    void returnsSuccessfulEmptyDataWhenNoActiveMenusAreRegistered() throws Exception {
        jdbc.update("UPDATE BSYMENU SET USE_YN='N'");

        mockMvc.perform(get("/api/core/menus/runtime"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.SUCCESS", is(true)))
                .andExpect(jsonPath("$.DATA.MENUS.length()", is(0)))
                .andExpect(jsonPath("$.DATA.INVALID_PROGRAM_MENUS.length()", is(0)));
    }

    @Test
    void excludesPagesWhoseDbProgramIsInactiveAndReportsTheLink() throws Exception {
        jdbc.update("UPDATE BSYPROG SET USE_YN='N' WHERE PROGRAM_KEY='TERM_CURATION'");

        mockMvc.perform(get("/api/core/menus/runtime"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.DATA.INVALID_PROGRAM_MENUS[*].MENU_KEY", hasItem("ZZ_RUNTIME_PAGE_B")))
                .andExpect(jsonPath("$.DATA.MENUS[0].MENU_KEY", is("ZZ_RUNTIME_ROOT")))
                .andExpect(jsonPath("$.DATA.MENUS[0].CHILDREN[0].CHILDREN.length()", is(1)));
    }
}
