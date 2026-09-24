package com.caron.basekit.standarddesign.llm;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(StandardDesignLlmController.class)
class StandardDesignLlmControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private DesignLlmClient llmClient;

    @Test
    void returnsCompanyLlmResponseThroughBackend() throws Exception {
        when(llmClient.chat(anyString(), anyString()))
                .thenReturn(new DesignLlmClient.LlmChatResult("qwen3.8-27b", "연결되었습니다."));
        mockMvc.perform(post("/api/standard-design/v1/llm/test").contentType("application/json")
                        .content("{\"MESSAGE\":\"연결 확인\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.SUCCESS").value(true))
                .andExpect(jsonPath("$.DATA.MODEL").value("qwen3.8-27b"))
                .andExpect(jsonPath("$.DATA.CONTENT").value("연결되었습니다."));
    }

    @Test
    void forwardsUserPromptToCompanyLlmThroughPromptEndpoint() throws Exception {
        String prompt = "화면 설계에서 검색 조건과 결과 그리드를 제안해 주세요.";
        when(llmClient.chat(anyString(), eq(prompt)))
                .thenReturn(new DesignLlmClient.LlmChatResult("qwen3.8-27b", "검색 조건과 결과 그리드입니다."));

        mockMvc.perform(post("/api/standard-design/v1/llm/prompt").contentType("application/json")
                        .content("{\"MESSAGE\":\"" + prompt + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.SUCCESS").value(true))
                .andExpect(jsonPath("$.DATA.MODEL").value("qwen3.8-27b"))
                .andExpect(jsonPath("$.DATA.CONTENT").value("검색 조건과 결과 그리드입니다."));

        verify(llmClient).chat(anyString(), eq(prompt));
    }

    @Test
    void rejectsBlankMessageWithoutCallingCompanyLlm() throws Exception {
        mockMvc.perform(post("/api/standard-design/v1/llm/test").contentType("application/json")
                        .content("{\"MESSAGE\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.ERROR_CODE").value("VALIDATION_ERROR"));
    }

    @Test
    void returnsSanitizedUnavailableResponse() throws Exception {
        when(llmClient.chat(anyString(), anyString()))
                .thenThrow(new LlmConnectionException("회사 LLM 연동이 비활성화되어 있습니다."));
        mockMvc.perform(post("/api/standard-design/v1/llm/test").contentType("application/json")
                        .content("{\"MESSAGE\":\"연결 확인\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.ERROR_CODE").value("COMPANY_LLM_UNAVAILABLE"))
                .andExpect(jsonPath("$.MESSAGE").value("회사 LLM 연동이 비활성화되어 있습니다."));
    }
}
