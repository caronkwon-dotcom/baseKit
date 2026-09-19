package com.caron.basekit.core.code;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CoreCodeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void providesSeededCodeGroupsAndCodes() throws Exception {
        mockMvc.perform(get("/api/core/codes/groups"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.DATA.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(7)));

        mockMvc.perform(get("/api/core/codes").param("CODE_GROUP_ID", "USER_TYPE_CODE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.DATA.length()").value(4))
                .andExpect(jsonPath("$.DATA[0].CODE_GROUP_ID").value("USER_TYPE_CODE"));
    }

    @Test
    void performsCodeGroupAndCodeCrudWithLogicalDelete() throws Exception {
        String groupCreate = """
                {"CODE_GROUP_ID":"TEST_TYPE_CODE","CODE_GROUP_NAME":"테스트유형코드",
                 "DESCRIPTION":"통합 테스트", "USE_YN":"Y"}
                """;
        mockMvc.perform(post("/api/core/codes/groups")
                        .contentType(MediaType.APPLICATION_JSON).content(groupCreate))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.DATA.CODE_GROUP_ID").value("TEST_TYPE_CODE"));

        String codeCreate = """
                {"CODE_ID":"TEST_TYPE_A","CODE_GROUP_ID":"TEST_TYPE_CODE","CODE":"A",
                 "CODE_NAME":"테스트 A", "SORT_ORDER":1, "USE_YN":"Y"}
                """;
        mockMvc.perform(post("/api/core/codes")
                        .contentType(MediaType.APPLICATION_JSON).content(codeCreate))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.DATA.CODE_NAME").value("테스트 A"));

        String codeUpdate = """
                {"CODE_ID":"TEST_TYPE_A","CODE_GROUP_ID":"TEST_TYPE_CODE","CODE":"A",
                 "CODE_NAME":"테스트 A 수정", "SORT_ORDER":2, "USE_YN":"N"}
                """;
        mockMvc.perform(put("/api/core/codes/TEST_TYPE_A")
                        .contentType(MediaType.APPLICATION_JSON).content(codeUpdate))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.DATA.CODE_NAME").value("테스트 A 수정"))
                .andExpect(jsonPath("$.DATA.USE_YN").value("N"));

        mockMvc.perform(delete("/api/core/codes/groups/TEST_TYPE_CODE"))
                .andExpect(status().isConflict());

        mockMvc.perform(delete("/api/core/codes/TEST_TYPE_A"))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/core/codes/TEST_TYPE_A"))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/core/codes/groups/TEST_TYPE_CODE"))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/core/codes/groups/TEST_TYPE_CODE"))
                .andExpect(status().isNotFound());
    }

    @Test
    void rejectsDuplicateCodeValueWithinGroup() throws Exception {
        String duplicate = """
                {"CODE_ID":"USER_TYPE_INTERNAL_COPY","CODE_GROUP_ID":"USER_TYPE_CODE","CODE":"INTERNAL",
                 "CODE_NAME":"중복", "SORT_ORDER":99, "USE_YN":"Y"}
                """;
        mockMvc.perform(post("/api/core/codes")
                        .contentType(MediaType.APPLICATION_JSON).content(duplicate))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.ERROR_CODE").value("CORE_CODE_CONFLICT"));
    }

    @Test
    void savesBatchAndRollsBackEveryRowWhenAnyRowFails() throws Exception {
        String success = """
                {"INSERTED":[
                  {"CODE_GROUP_ID":"BATCH_TYPE_CODE","CODE_GROUP_NAME":"Batch Test","DESCRIPTION":"batch","USE_YN":"Y"}
                ],"UPDATED":[],"DELETED":[]}
                """;
        mockMvc.perform(post("/api/core/codes/groups/batch")
                        .contentType(MediaType.APPLICATION_JSON).content(success))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.DATA.INSERTED_COUNT").value(1));
        mockMvc.perform(get("/api/core/codes/groups/BATCH_TYPE_CODE"))
                .andExpect(status().isOk());

        String invalid = """
                {"INSERTED":[
                  {"CODE_GROUP_ID":"BATCH_ROLLBACK_CODE","CODE_GROUP_NAME":"First","DESCRIPTION":null,"USE_YN":"Y"},
                  {"CODE_GROUP_ID":"BATCH_ROLLBACK_CODE","CODE_GROUP_NAME":"Duplicate","DESCRIPTION":null,"USE_YN":"Y"}
                ],"UPDATED":[],"DELETED":[]}
                """;
        mockMvc.perform(post("/api/core/codes/groups/batch")
                        .contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isConflict());
        mockMvc.perform(get("/api/core/codes/groups/BATCH_ROLLBACK_CODE"))
                .andExpect(status().isNotFound());
    }

    @Test
    void managesMetadataDefinitionAndPersistsDynamicCodeValue() throws Exception {
        String definition = """
                {"ATTRIBUTE_CODE":"TEST_LABEL","ATTRIBUTE_NAME":"테스트라벨",
                 "DATA_TYPE":"STRING","CONTROL_TYPE":"TEXT","DISPLAY_TYPE":"BADGE",
                 "REQUIRED_YN":"Y","DEFAULT_VALUE":null,"OPTION_SOURCE":null,
                 "SORT_ORDER":90,"USE_YN":"Y"}
                """;
        String definitionId = com.jayway.jsonpath.JsonPath.read(mockMvc.perform(post("/api/core/codes/groups/USER_TYPE_CODE/attribute-definitions")
                        .contentType(MediaType.APPLICATION_JSON).content(definition))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.DATA.ATTRIBUTE_DEF_ID");

        String code = """
                {"CODE_ID":"USER_TYPE_META_TEST","CODE_GROUP_ID":"USER_TYPE_CODE","CODE":"META_TEST",
                 "CODE_NAME":"Metadata Test","SORT_ORDER":99,"USE_YN":"Y",
                 "ATTRIBUTE_VALUES":{"TEST_LABEL":"검증완료"}}
                """;
        mockMvc.perform(post("/api/core/codes").contentType(MediaType.APPLICATION_JSON).content(code))
                .andExpect(status().isCreated());
        mockMvc.perform(get("/api/core/codes/groups/USER_TYPE_CODE/attribute-values"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.DATA[?(@.CODE_ID == 'USER_TYPE_META_TEST')].ATTRIBUTE_VALUE").value("검증완료"));

        mockMvc.perform(delete("/api/core/codes/USER_TYPE_META_TEST")).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/core/codes/attribute-definitions/{id}", definitionId)).andExpect(status().isNoContent());
    }
}
