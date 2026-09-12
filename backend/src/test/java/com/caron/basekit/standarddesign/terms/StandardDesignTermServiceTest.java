package com.caron.basekit.standarddesign.terms;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

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
}
