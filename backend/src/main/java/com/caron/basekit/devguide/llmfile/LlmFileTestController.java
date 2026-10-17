package com.caron.basekit.devguide.llmfile;

import com.caron.basekit.common.api.ApiResponse;
import com.caron.basekit.common.api.ErrorResponse;
import com.caron.basekit.standarddesign.llm.DesignLlmClient;
import com.caron.basekit.standarddesign.llm.LlmConnectionException;
import com.caron.basekit.standarddesign.llm.LlmProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/** 개발자가이드 "LLM 파일·검색 테스트" PoC API. SD 업무 기능이 아닌 기술 검증용이다. */
@RestController
@RequestMapping("/api/dev-guide/v1/llm-files")
class LlmFileTestController {

    private static final String SYSTEM_PROMPT =
            "You answer only from the provided document context. Cite the requirement IDs or positions you used. "
                    + "If the context does not contain the answer, say so.";

    private final LlmFileStore store;
    private final DesignLlmClient llmClient;
    private final LlmProperties properties;

    LlmFileTestController(LlmFileStore store, DesignLlmClient llmClient, LlmProperties properties) {
        this.store = store;
        this.llmClient = llmClient;
        this.properties = properties;
    }

    @GetMapping("/capabilities")
    ApiResponse<List<Capability>> capabilities() {
        return ApiResponse.success(List.of(
                probe("회사 LLM 모델 목록 (/models)", "/models"),
                probe("회사 LLM 파일 API (/files)", "/files"),
                new Capability("BaseKit 서버 파일 보관·검색", "SUPPORTED", "BaseKit 서버 메모리(PoC). 회사 LLM 기능 아님")));
    }

    @PostMapping("/files")
    ApiResponse<FileInfo> upload(@RequestParam String PROJECT_ID, @RequestParam("FILE") MultipartFile file) throws IOException {
        if (file.isEmpty()) throw new IllegalArgumentException("빈 파일은 등록할 수 없습니다.");
        if (file.getSize() > LlmFileStore.MAX_FILE_BYTES) throw new IllegalArgumentException("파일은 10MB 이하만 등록할 수 있습니다.");
        String name = StringUtils.getFilename(file.getOriginalFilename());
        return ApiResponse.success(toInfo(store.save(PROJECT_ID, name == null ? "unnamed" : name, file.getBytes())));
    }

    @GetMapping("/files")
    ApiResponse<List<FileInfo>> list(@RequestParam String PROJECT_ID) {
        return ApiResponse.success(store.list(PROJECT_ID).stream().map(this::toInfo).toList());
    }

    @PostMapping("/search")
    ApiResponse<SearchResult> search(@RequestBody QueryRequest request) {
        long startedAt = System.nanoTime();
        LlmFileStore.StoredFile file = requireFile(request);
        file.useCount().incrementAndGet();
        List<LlmFileStore.Hit> hits = store.search(file, request.QUESTION(), topK(request));
        return ApiResponse.success(new SearchResult("BASEKIT_SERVER_KEYWORD_SEARCH", file.useCount().get() > 1,
                elapsedMillis(startedAt), 0, hits));
    }

    @PostMapping("/query")
    ApiResponse<QueryResult> query(@RequestBody QueryRequest request) {
        LlmFileStore.StoredFile file = requireFile(request);
        boolean fullFile = "FULL_FILE".equals(request.MODE());
        int reuse = file.useCount().incrementAndGet();
        List<LlmFileStore.Hit> hits = fullFile ? List.of() : store.search(file, request.QUESTION(), topK(request));
        String context = fullFile ? file.content() : buildContext(hits);
        String userPrompt = "[Document context]\n" + context + "\n\n[Question]\n" + request.QUESTION();
        long requestBytes = utf8Length(SYSTEM_PROMPT) + utf8Length(userPrompt);
        long startedAt = System.nanoTime();
        DesignLlmClient.LlmChatResult result = llmClient.chat(SYSTEM_PROMPT, userPrompt);
        return ApiResponse.success(new QueryResult(fullFile ? "FULL_FILE_IN_PROMPT" : "SERVER_RETRIEVAL_THEN_COMPANY_LLM_CHAT",
                "COMPANY_LLM", result.model(), result.content(), elapsedMillis(startedAt), requestBytes, file.sizeBytes(),
                fullFile, reuse > 1, hits));
    }

    @ExceptionHandler(LlmConnectionException.class)
    ResponseEntity<ErrorResponse> handleLlm(LlmConnectionException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ErrorResponse.of("COMPANY_LLM_UNAVAILABLE", exception.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ErrorResponse> handleBadRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(ErrorResponse.of("LLM_FILE_BAD_REQUEST", exception.getMessage()));
    }

    private LlmFileStore.StoredFile requireFile(QueryRequest request) {
        if (!StringUtils.hasText(request.QUESTION())) throw new IllegalArgumentException("질문을 입력해 주세요.");
        LlmFileStore.StoredFile file = store.find(request.PROJECT_ID(), request.FILE_ID());
        if (file == null) throw new IllegalArgumentException("등록된 파일을 찾을 수 없습니다.");
        return file;
    }

    private int topK(QueryRequest request) {
        return request.TOP_K() == null ? 5 : Math.max(1, Math.min(request.TOP_K(), 20));
    }

    private String buildContext(List<LlmFileStore.Hit> hits) {
        StringBuilder builder = new StringBuilder();
        for (LlmFileStore.Hit hit : hits) builder.append('[').append(hit.POSITION()).append("]\n").append(hit.TEXT()).append("\n\n");
        return builder.isEmpty() ? "(no matching content)" : builder.toString();
    }

    private Capability probe(String name, String path) {
        if (!properties.enabled() || !StringUtils.hasText(properties.baseUrl()) || !StringUtils.hasText(properties.apiKey())) {
            return new Capability(name, "NOT_CONFIGURED", "회사 LLM 연결 설정이 없어 확인하지 못했습니다.");
        }
        try {
            int status = RestClient.create().get().uri(properties.baseUrl().replaceAll("/+$", "") + path)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                    .exchange((request, response) -> response.getStatusCode().value());
            return new Capability(name, status >= 200 && status < 300 ? "SUPPORTED" : "UNSUPPORTED_OR_DENIED", "HTTP " + status);
        } catch (RuntimeException exception) {
            return new Capability(name, "UNREACHABLE", "연결에 실패했습니다.");
        }
    }

    private FileInfo toInfo(LlmFileStore.StoredFile file) {
        return new FileInfo(file.fileId(), file.projectId(), file.fileName(), file.sizeBytes(), file.chunks().size(),
                "REGISTERED", "BASEKIT_SERVER", file.useCount().get(), file.registeredAt());
    }

    private long utf8Length(String value) {
        return value.getBytes(StandardCharsets.UTF_8).length;
    }

    private long elapsedMillis(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }

    record Capability(String FEATURE, String STATUS, String DETAIL) {
    }

    record FileInfo(String FILE_ID, String PROJECT_ID, String FILE_NAME, long FILE_SIZE_BYTES, int CHUNK_COUNT,
                    String STATUS, String STORAGE, int USE_COUNT, String REGISTERED_AT) {
    }

    record QueryRequest(String PROJECT_ID, String FILE_ID, String QUESTION, Integer TOP_K, String MODE) {
    }

    record SearchResult(String METHOD, boolean FILE_REUSED, long ELAPSED_MS, long REQUEST_BYTES, List<LlmFileStore.Hit> HITS) {
    }

    record QueryResult(String METHOD, String SOURCE, String MODEL, String ANSWER, long ELAPSED_MS, long REQUEST_BYTES,
                       long FILE_SIZE_BYTES, boolean FULL_FILE_SENT, boolean FILE_REUSED, List<LlmFileStore.Hit> HITS) {
    }
}
