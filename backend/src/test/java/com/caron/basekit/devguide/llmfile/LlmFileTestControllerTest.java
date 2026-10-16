package com.caron.basekit.devguide.llmfile;

import com.caron.basekit.standarddesign.llm.DesignLlmClient;
import com.caron.basekit.standarddesign.llm.LlmProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(LlmFileTestController.class)
@Import(LlmFileStore.class)
class LlmFileTestControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private DesignLlmClient llmClient;
    @MockitoBean private LlmProperties properties;

    private String upload(String project) throws Exception {
        String csv = "REQ_ID,TITLE\nREQ-001,로그인 인증\nREQ-002,주문 취소 처리\nREQ-003,재고 조회\n";
        String body = mockMvc.perform(multipart("/api/dev-guide/v1/llm-files/files").file(
                        new MockMultipartFile("FILE", "req.csv", "text/csv", csv.getBytes("UTF-8"))).param("PROJECT_ID", project))
                .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.CHUNK_COUNT").value(3))
                .andReturn().getResponse().getContentAsString();
        return com.jayway.jsonpath.JsonPath.read(body, "$.DATA.FILE_ID");
    }

    @Test
    void searchReturnsRealRowsAndReusesFileWithinProject() throws Exception {
        String fileId = upload("P1");
        String request = "{\"PROJECT_ID\":\"P1\",\"FILE_ID\":\"" + fileId + "\",\"QUESTION\":\"주문 취소\"}";
        mockMvc.perform(post("/api/dev-guide/v1/llm-files/search").contentType("application/json").content(request))
                .andExpect(jsonPath("$.DATA.HITS[0].TEXT").value(org.hamcrest.Matchers.containsString("REQ-002")))
                .andExpect(jsonPath("$.DATA.FILE_REUSED").value(false));
        mockMvc.perform(post("/api/dev-guide/v1/llm-files/search").contentType("application/json").content(request))
                .andExpect(jsonPath("$.DATA.FILE_REUSED").value(true));
    }

    @Test
    void otherProjectCannotAccessFile() throws Exception {
        String fileId = upload("P1");
        mockMvc.perform(get("/api/dev-guide/v1/llm-files/files").param("PROJECT_ID", "P2"))
                .andExpect(jsonPath("$.DATA").isEmpty());
        mockMvc.perform(post("/api/dev-guide/v1/llm-files/search").contentType("application/json")
                        .content("{\"PROJECT_ID\":\"P2\",\"FILE_ID\":\"" + fileId + "\",\"QUESTION\":\"주문\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void queryOnlySendsRetrievedContextNotFullFile() throws Exception {
        String fileId = upload("P1");
        when(llmClient.chat(anyString(), anyString())).thenReturn(new DesignLlmClient.LlmChatResult("m", "REQ-002"));
        mockMvc.perform(post("/api/dev-guide/v1/llm-files/query").contentType("application/json")
                        .content("{\"PROJECT_ID\":\"P1\",\"FILE_ID\":\"" + fileId + "\",\"QUESTION\":\"주문 취소\",\"TOP_K\":1}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.FULL_FILE_SENT").value(false))
                .andExpect(jsonPath("$.DATA.SOURCE").value("COMPANY_LLM"))
                .andExpect(jsonPath("$.DATA.ANSWER").value("REQ-002"));
    }
}
