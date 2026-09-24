package com.caron.basekit.standarddesign.terms;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Repository
class StandardDesignTermRepository {

    private static final List<String> HEADER = List.of(
            "공통표준용어명", "공통표준용어설명", "공통표준용어영문약어명", "공통표준도메인명",
            "허용값", "저장 형식", "표현 형식", "행정표준코드명", "소관기관명", "용어 이음동의어 목록",
            "제정차수", "개정구분명(폐기 또는 변경)", "개정항목", "개정사유"
    );

    private final Path csvPath;

    StandardDesignTermRepository(
            @Value("${standard-design.terms.csv-path:../frontend/public/data/common-standard-terms-20251101.csv}")
            String csvPath
    ) {
        this.csvPath = Path.of(csvPath);
    }

    List<StandardDesignTerm> findAll() {
        try (BufferedReader reader = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8)) {
            List<List<String>> rows = parse(reader);
            if (rows.isEmpty() || !HEADER.equals(rows.getFirst())) {
                throw new IllegalStateException("Standard Design 용어집 CSV 헤더가 예상과 다릅니다.");
            }
            List<StandardDesignTerm> terms = new ArrayList<>();
            for (int index = 1; index < rows.size(); index++) {
                List<String> row = rows.get(index);
                if (row.stream().allMatch(String::isBlank)) {
                    continue;
                }
                if (row.size() > HEADER.size()) {
                    throw new IllegalStateException("Standard Design 용어집 CSV 행의 필드 수가 올바르지 않습니다: " + (index + 1));
                }
                while (row.size() < HEADER.size()) {
                    row.add("");
                }
                terms.add(toTerm(row, index));
            }
            return List.copyOf(terms);
        } catch (IOException exception) {
            throw new IllegalStateException("Standard Design 용어집 원본을 읽지 못했습니다.", exception);
        }
    }

    private StandardDesignTerm toTerm(List<String> row, int zeroBasedDataIndex) {
        return new StandardDesignTerm(
                "TERM-%06d".formatted(zeroBasedDataIndex),
                zeroBasedDataIndex,
                row.get(0), row.get(1), row.get(2), row.get(3), row.get(4), row.get(5), row.get(6),
                row.get(7), row.get(8), row.get(9), row.get(10), row.get(11), row.get(12), row.get(13)
        );
    }

    private List<List<String>> parse(BufferedReader reader) throws IOException {
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder value = new StringBuilder();
        boolean quoted = false;
        int codePoint;
        while ((codePoint = reader.read()) != -1) {
            char character = (char) codePoint;
            if (character == '"') {
                if (quoted && reader.markSupported()) {
                    reader.mark(1);
                    int next = reader.read();
                    if (next == '"') {
                        value.append('"');
                    } else {
                        quoted = false;
                        if (next != -1) reader.reset();
                    }
                } else {
                    quoted = !quoted;
                }
            } else if (character == ',' && !quoted) {
                row.add(value.toString());
                value.setLength(0);
            } else if ((character == '\n' || character == '\r') && !quoted) {
                if (character == '\r') {
                    reader.mark(1);
                    int next = reader.read();
                    if (next != '\n' && next != -1) reader.reset();
                }
                row.add(value.toString());
                value.setLength(0);
                rows.add(row);
                row = new ArrayList<>();
            } else {
                value.append(character);
            }
        }
        if (value.length() > 0 || !row.isEmpty()) {
            row.add(value.toString());
            rows.add(row);
        }
        if (!rows.isEmpty() && !rows.getFirst().isEmpty()) {
            rows.getFirst().set(0, rows.getFirst().getFirst().replace("\uFEFF", ""));
        }
        return rows;
    }
}
