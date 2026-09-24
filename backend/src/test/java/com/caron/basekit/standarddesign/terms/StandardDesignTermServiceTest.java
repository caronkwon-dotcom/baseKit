package com.caron.basekit.standarddesign.terms;

import com.caron.basekit.standarddesign.llm.DesignLlmClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StandardDesignTermServiceTest {

    @Test
    void parsesQuotedValuesAndRanksExactPrefixThenPartialMatches() throws Exception {
        Path csv = Files.createTempFile("standard-terms-", ".csv");
        Files.writeString(csv, """
                공통표준용어명,공통표준용어설명,공통표준용어영문약어명,공통표준도메인명,허용값,저장 형식,표현 형식,행정표준코드명,소관기관명,용어 이음동의어 목록,제정차수,개정구분명(폐기 또는 변경),개정항목,개정사유
                이름,"설명, 상세",NM,사람,,,,,,,,,,
                이름번호,이름 관련,NMNO,사람,,,,,,,,,,
                사용자,사용자 설명,USER,계정,,,,,,,,,,
                """);
        try {
            StandardDesignTermService service = new StandardDesignTermService(
                    new StandardDesignTermRepository(csv.toString()));

            StandardDesignTermPage result = service.search("이름", 1, 10);

            assertThat(result.TOTAL_COUNT()).isEqualTo(2);
            assertThat(result.ITEMS()).extracting(StandardDesignTerm::TERM_ID)
                    .containsExactly("TERM-000001", "TERM-000002");
            assertThat(result.ITEMS().getFirst().COMMON_STANDARD_TERM_DESCRIPTION()).isEqualTo("설명, 상세");
            assertThat(service.get("TERM-000001").COMMON_STANDARD_TERM_NAME()).isEqualTo("이름");
        } finally {
            Files.deleteIfExists(csv);
        }
    }

    @Test
    void limitsLlmRecommendationToRealCandidates() throws Exception {
        Path csv = Files.createTempFile("standard-terms-", ".csv");
        Files.writeString(csv, """
                공통표준용어명,공통표준용어설명,공통표준용어영문약어명,공통표준도메인명,허용값,저장 형식,표현 형식,행정표준코드명,소관기관명,용어 이음동의어 목록,제정차수,개정구분명(폐기 또는 변경),개정항목,개정사유
                고객번호,고객 식별 번호,CUST_NO,식별자,,,,,,,,,,
                """);
        try {
            DesignLlmClient client = mock(DesignLlmClient.class);
            when(client.chat(org.mockito.ArgumentMatchers.contains("extract search intent"), org.mockito.ArgumentMatchers.anyString()))
                    .thenReturn(new DesignLlmClient.LlmChatResult("test", "{\"interpretedIntent\":\"고객 번호\",\"searchKeywords\":[\"고객번호\"]}"));
            when(client.chat(org.mockito.ArgumentMatchers.contains("supplied STANDARD_TERM_CANDIDATES"), org.mockito.ArgumentMatchers.anyString()))
                    .thenReturn(new DesignLlmClient.LlmChatResult("test", "{\"recommendedTermId\":\"TERM-999999\",\"answer\":\"가짜 용어\"}"));

            StandardDesignTermRepository repository = new StandardDesignTermRepository(csv.toString());
            StandardDesignTermLlmService service = new StandardDesignTermLlmService(
                    client, new StandardDesignTermService(repository), new ObjectMapper());

            StandardDesignTermLlmResult result = service.recommend("고객번호");

            assertThat(result.candidates()).extracting(StandardTermCandidate::termId)
                    .containsExactly("TERM-000001");
            assertThat(result.recommendedTermId()).isNull();
            assertThat(result.recommendedTerm()).isNull();
            assertThat(result.message()).isEqualTo("회사 표준용어집에서 적합한 표준용어를 찾지 못했습니다.");
        } finally {
            Files.deleteIfExists(csv);
        }
    }

    @Test
    void returnsCanonicalRecommendedTermAndShortReason() throws Exception {
        Path csv = Files.createTempFile("standard-terms-", ".csv");
        Files.writeString(csv, """
                공통표준용어명,공통표준용어설명,공통표준용어영문약어명,공통표준도메인명,허용값,저장 형식,표현 형식,행정표준코드명,소관기관명,용어 이음동의어 목록,제정차수,개정구분명(폐기 또는 변경),개정항목,개정사유
                고객번호,고객 식별 번호,CUST_NO,식별자,,,,,,,,,,
                """);
        try {
            DesignLlmClient client = mock(DesignLlmClient.class);
            when(client.chat(org.mockito.ArgumentMatchers.contains("extract search intent"), org.mockito.ArgumentMatchers.anyString()))
                    .thenReturn(new DesignLlmClient.LlmChatResult("test",
                            "{\"interpretedIntent\":\"고객 번호\",\"searchKeywords\":[\"고객번호\"]}"));
            when(client.chat(org.mockito.ArgumentMatchers.contains("supplied STANDARD_TERM_CANDIDATES"), org.mockito.ArgumentMatchers.anyString()))
                    .thenReturn(new DesignLlmClient.LlmChatResult("test",
                            "{\"recommendedTermId\":\"TERM-000001\",\"reason\":\"질문의 고객 식별 번호와 일치\"}"));

            StandardDesignTermLlmResult result = new StandardDesignTermLlmService(
                    client,
                    new StandardDesignTermService(new StandardDesignTermRepository(csv.toString())),
                    new ObjectMapper()).recommend("고객번호");

            assertThat(result.recommendedTermId()).isEqualTo("TERM-000001");
            assertThat(result.recommendedTerm()).isNotNull();
            assertThat(result.recommendedTerm().COMMON_STANDARD_TERM_NAME()).isEqualTo("고객번호");
            assertThat(result.recommendedTerm().COMMON_STANDARD_TERM_ENGLISH_ABBREVIATION_NAME()).isEqualTo("CUST_NO");
            assertThat(result.reason()).isEqualTo("질문의 고객 식별 번호와 일치");
            assertThat(result.message()).isEqualTo("회사 표준용어집에서 추천 후보를 확인했습니다.");
        } finally {
            Files.deleteIfExists(csv);
        }
    }

    @Test
    void discardsHallucinatedStandardMetadataAndUsesCanonicalCsvRecord() throws Exception {
        Path csv = Files.createTempFile("standard-terms-", ".csv");
        Files.writeString(csv, """
                공통표준용어명,공통표준용어설명,공통표준용어영문약어명,공통표준도메인명,허용값,저장 형식,표현 형식,행정표준코드명,소관기관명,용어 이음동의어 목록,제정차수,개정구분명(폐기 또는 변경),개정항목,개정사유
                고객번호,고객 식별 번호,CUST_NO,식별자,,,,,,,,,,
                """);
        try {
            DesignLlmClient client = mock(DesignLlmClient.class);
            when(client.chat(org.mockito.ArgumentMatchers.contains("extract search intent"), org.mockito.ArgumentMatchers.anyString()))
                    .thenReturn(new DesignLlmClient.LlmChatResult("test",
                            "{\"interpretedIntent\":\"업무용 식별키\",\"searchKeywords\":[\"초고도화거래추적식별키\"]}"));
            when(client.chat(org.mockito.ArgumentMatchers.contains("supplied STANDARD_TERM_CANDIDATES"), org.mockito.ArgumentMatchers.anyString()))
                    .thenReturn(new DesignLlmClient.LlmChatResult("test",
                            "{\"recommendedTermId\":\"TERM-999999\",\"reason\":\"초고도화거래추적식별키\\u0000FAKE_TRACKING_KEY\\u0000FKEY\\u0000가상도메인\\u0000문자열V999\\u0000length=999\\u0000scale=9\"}"));

            StandardDesignTermLlmService service = new StandardDesignTermLlmService(
                    client,
                    new StandardDesignTermService(new StandardDesignTermRepository(csv.toString())),
                    new ObjectMapper());

            StandardDesignTermLlmResult result = service.recommend("초고도화거래추적식별키");
            String serialized = new ObjectMapper().writeValueAsString(result);

            assertThat(result.recommendedTermId()).isNull();
            assertThat(result.recommendedTerm()).isNull();
            assertThat(result.message()).isEqualTo("회사 표준용어집에서 적합한 표준용어를 찾지 못했습니다.");
            assertThat(result.candidates()).isEmpty();
            assertThat(serialized)
                    .doesNotContain("FAKE_TRACKING_KEY", "FKEY", "가상도메인", "문자열V999", "length=999", "scale=9");
        } finally {
            Files.deleteIfExists(csv);
        }
    }
}
