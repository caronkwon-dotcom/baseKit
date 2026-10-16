package com.caron.basekit.devguide.llmfile;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * PoC 전용 BaseKit 서버 메모리 파일 보관소. 회사 LLM의 파일 기능이 아니며 재시작하면 사라진다.
 * 파일은 PROJECT_ID 경계 안에서만 조회된다.
 */
@Component
class LlmFileStore {

    static final long MAX_FILE_BYTES = 10L * 1024 * 1024;

    private final ObjectMapper objectMapper;
    private final Map<String, StoredFile> files = new ConcurrentHashMap<>();

    LlmFileStore(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    StoredFile save(String projectId, String fileName, byte[] content) {
        String text = new String(content, StandardCharsets.UTF_8);
        StoredFile file = new StoredFile("FILE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                projectId, fileName, content.length, OffsetDateTime.now().toString(), text,
                split(fileName, text), new AtomicInteger());
        files.put(file.fileId(), file);
        return file;
    }

    List<StoredFile> list(String projectId) {
        return files.values().stream().filter(file -> file.projectId().equals(projectId))
                .sorted(Comparator.comparing(StoredFile::registeredAt).reversed()).toList();
    }

    StoredFile find(String projectId, String fileId) {
        StoredFile file = files.get(fileId);
        return file != null && file.projectId().equals(projectId) ? file : null;
    }

    List<Hit> search(StoredFile file, String query, int topK) {
        List<String> tokens = tokenize(query);
        List<Hit> hits = new ArrayList<>();
        for (Chunk chunk : file.chunks()) {
            String lower = chunk.text().toLowerCase(Locale.ROOT);
            int score = 0;
            for (String token : tokens) {
                if (lower.contains(token)) score += 3;
                else score += (int) bigrams(token).stream().filter(lower::contains).count();
            }
            if (score > 0) hits.add(new Hit(chunk.position(), chunk.text(), score));
        }
        return hits.stream().sorted(Comparator.comparingInt(Hit::SCORE).reversed()).limit(topK).toList();
    }

    private List<String> tokenize(String query) {
        List<String> tokens = new ArrayList<>();
        for (String token : query.toLowerCase(Locale.ROOT).split("[\\s,.;:?!()\\[\\]{}\"']+")) {
            if (token.length() >= 2) tokens.add(token);
        }
        return tokens;
    }

    private List<String> bigrams(String token) {
        List<String> result = new ArrayList<>();
        for (int i = 0; i + 2 <= token.length(); i++) result.add(token.substring(i, i + 2));
        return result;
    }

    private List<Chunk> split(String fileName, String text) {
        String lowerName = fileName.toLowerCase(Locale.ROOT);
        List<Chunk> chunks = new ArrayList<>();
        if (lowerName.endsWith(".json")) {
            try {
                JsonNode root = objectMapper.readTree(text);
                JsonNode array = root.isArray() ? root : firstArray(root);
                if (array != null) {
                    int index = 1;
                    for (JsonNode item : array) chunks.add(new Chunk("item " + index++, item.toString()));
                    return chunks;
                }
            } catch (Exception ignored) {
                // JSON이 아니면 일반 텍스트 분할로 처리한다.
            }
        }
        String[] lines = text.split("\\R");
        if (lowerName.endsWith(".csv") && lines.length > 1) {
            for (int i = 1; i < lines.length; i++) {
                if (!lines[i].isBlank()) chunks.add(new Chunk("row " + i, lines[0] + "\n" + lines[i]));
            }
            return chunks;
        }
        StringBuilder block = new StringBuilder();
        int start = 1;
        for (int i = 0; i < lines.length; i++) {
            if (lines[i].isBlank() && !block.isEmpty()) {
                chunks.add(new Chunk("line " + start, block.toString()));
                block.setLength(0);
                start = i + 2;
            } else if (!lines[i].isBlank()) {
                block.append(lines[i]).append('\n');
            }
        }
        if (!block.isEmpty()) chunks.add(new Chunk("line " + start, block.toString()));
        return chunks;
    }

    private JsonNode firstArray(JsonNode node) {
        for (JsonNode child : node) {
            if (child.isArray()) return child;
        }
        return null;
    }

    record Chunk(String position, String text) {
    }

    record Hit(String POSITION, String TEXT, int SCORE) {
    }

    record StoredFile(String fileId, String projectId, String fileName, long sizeBytes, String registeredAt,
                      String content, List<Chunk> chunks, AtomicInteger useCount) {
    }
}
