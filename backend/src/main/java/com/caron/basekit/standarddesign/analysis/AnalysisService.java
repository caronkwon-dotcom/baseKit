package com.caron.basekit.standarddesign.analysis;

import com.caron.basekit.standarddesign.llm.DesignLlmClient;
import com.caron.basekit.standarddesign.llm.LlmProperties;
import com.caron.basekit.standarddesign.requirement.RequirementData;
import com.caron.basekit.standarddesign.requirement.RequirementService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.*;

@Service
public class AnalysisService {
    public record RequirementInput(String REQUIREMENT_ID, String MOD_DT, String DESIGN_OPINION) { }
    public record AnalysisRequest(String PROJECT_ID, String REQUEST_ID, List<RequirementInput> REQUIREMENTS, String OVERALL_OPINION) { }
    public record InputDraft(List<RequirementInput> REQUIREMENTS, String OVERALL_OPINION) { }
    public record CandidateUpdate(Integer RESULT_VERSION, JsonNode EDITED, Boolean SELECTED, Boolean RESET) { }
    public record ConfirmRequest(Integer RESULT_VERSION, List<String> CANDIDATE_IDS, InputDraft INPUT) { }
    public record GenerateRequest(String GENERATION_REQUEST_ID, Integer RESULT_VERSION, InputDraft INPUT) { }

    private static final Set<String> STALE_CHECKED = Set.of("REVIEW_READY", "CONFIRMED", "PARTIAL", "GENERATION_FAILED");
    private static final Set<String> NO_RESULT_RETRY = Set.of("STALE", "ANALYSIS_FAILED", "ANALYSIS_UNKNOWN", "INPUT_READY");
    private static final Map<String, String> ERROR_MESSAGES = Map.of(
            "LLM_NOT_CONFIGURED", "회사 LLM 연결 설정이 되어 있지 않습니다. 관리자에게 문의하세요.",
            "LLM_UNAVAILABLE", "회사 LLM 호출에 실패했습니다. 잠시 후 다시 분석하세요.",
            "LLM_EMPTY_RESPONSE", "LLM 응답이 비어 있습니다. 다시 분석하세요.",
            "LLM_TIMEOUT", "분석 응답 시간이 초과되었습니다. 결과를 알 수 없으므로 다시 분석하세요.",
            "INVALID_LLM_STRUCTURE", "LLM 응답이 정해진 구조와 달라 사용할 수 없습니다. 다시 분석하세요.");

    private final JdbcTemplate jdbc;
    private final RequirementService requirements;
    private final DesignLlmClient llm;
    private final LlmProperties llmProps;
    private final ObjectMapper om;
    private final ProgramFactory programFactory;
    private final TransactionTemplate tx;
    private final AnalysisResultValidator validator = new AnalysisResultValidator();
    private final ExecutorService runner = daemonPool(2, "sd-analysis");
    private final ExecutorService llmCalls = daemonPool(2, "sd-analysis-llm");
    private final long timeoutSeconds;

    AnalysisService(JdbcTemplate jdbc, RequirementService requirements, DesignLlmClient llm, LlmProperties llmProps, ObjectMapper om,
                    ProgramFactory programFactory, TransactionTemplate tx,
                    @Value("${standard-design.analysis.timeout-seconds:120}") long timeoutSeconds) {
        this.jdbc = jdbc; this.requirements = requirements; this.llm = llm; this.llmProps = llmProps; this.om = om;
        this.programFactory = programFactory; this.tx = tx; this.timeoutSeconds = timeoutSeconds;
    }

    @PreDestroy void shutdown() { runner.shutdownNow(); llmCalls.shutdownNow(); }

    private static ExecutorService daemonPool(int n, String name) {
        return Executors.newFixedThreadPool(n, r -> { Thread t = new Thread(r, name); t.setDaemon(true); return t; });
    }

    /** Responses of a previous process can never be delivered, so unfinished runs become unknown. */
    @EventListener(ApplicationReadyEvent.class)
    void recover() {
        jdbc.update("UPDATE BSDAANLS SET ANALYSIS_STATUS='STALE', ERROR_CODE='LLM_TIMEOUT', ACTIVE_REQUEST_ID=NULL WHERE ANALYSIS_STATUS='ANALYZING' AND RESULT_VERSION>0");
        jdbc.update("UPDATE BSDAANLS SET ANALYSIS_STATUS='ANALYSIS_UNKNOWN', ERROR_CODE='LLM_TIMEOUT', ACTIVE_REQUEST_ID=NULL WHERE ANALYSIS_STATUS='ANALYZING'");
        jdbc.update("UPDATE BSDAANLS SET ANALYSIS_STATUS='GENERATION_UNKNOWN' WHERE ANALYSIS_STATUS='GENERATING'");
    }

    // ---------- analysis ----------

    public ObjectNode create(AnalysisRequest req) {
        if (blank(req.PROJECT_ID()) || blank(req.REQUEST_ID())) throw bad("PROJECT_ID와 REQUEST_ID가 필요합니다.");
        List<String> existing = jdbc.queryForList("SELECT ANALYSIS_ID FROM BSDAANLS WHERE PROJECT_ID=? AND REQUEST_ID=?", String.class, req.PROJECT_ID(), req.REQUEST_ID());
        if (!existing.isEmpty()) return view(existing.getFirst());
        List<Snapshot> snaps = snapshots(req.PROJECT_ID(), req.REQUIREMENTS());
        String analysisId = "SDA-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        String token = UUID.randomUUID().toString();
        String version = inputVersion(snaps, req.OVERALL_OPINION());
        try {
            tx.executeWithoutResult(s -> {
                jdbc.update("INSERT INTO BSDAANLS(ANALYSIS_ID,PROJECT_ID,REQUEST_ID,ACTIVE_REQUEST_ID,INPUT_VERSION,RESULT_VERSION,ANALYSIS_STATUS,OVERALL_OPINION) VALUES (?,?,?,?,?,0,'ANALYZING',?)",
                        analysisId, req.PROJECT_ID(), req.REQUEST_ID(), token, version, req.OVERALL_OPINION());
                writeSnapshots(analysisId, version, snaps);
            });
        } catch (org.springframework.dao.DuplicateKeyException e) {
            return view(jdbc.queryForObject("SELECT ANALYSIS_ID FROM BSDAANLS WHERE PROJECT_ID=? AND REQUEST_ID=?", String.class, req.PROJECT_ID(), req.REQUEST_ID()));
        }
        launch(analysisId, token);
        return view(analysisId);
    }

    public ObjectNode reanalyze(String id, InputDraft input) {
        Map<String, Object> a = row(id);
        String status = (String) a.get("ANALYSIS_STATUS");
        if (!NO_RESULT_RETRY.contains(status)) throw new AnalysisException(HttpStatus.CONFLICT, "ANALYSIS_NOT_RETRYABLE", "현재 상태에서는 다시 분석할 수 없습니다.");
        List<Snapshot> snaps = snapshots((String) a.get("PROJECT_ID"), input.REQUIREMENTS());
        String token = UUID.randomUUID().toString();
        String version = inputVersion(snaps, input.OVERALL_OPINION());
        tx.executeWithoutResult(s -> {
            int n = jdbc.update("UPDATE BSDAANLS SET ANALYSIS_STATUS='ANALYZING', ACTIVE_REQUEST_ID=?, INPUT_VERSION=?, OVERALL_OPINION=?, ERROR_CODE=NULL, UPDATED_AT=CURRENT_TIMESTAMP WHERE ANALYSIS_ID=? AND ANALYSIS_STATUS=?",
                    token, version, input.OVERALL_OPINION(), id, status);
            if (n == 0) throw new AnalysisException(HttpStatus.CONFLICT, "ANALYSIS_NOT_RETRYABLE", "다른 요청이 먼저 처리되었습니다.");
            jdbc.update("DELETE FROM BSDAAREQ WHERE ANALYSIS_ID=?", id);
            writeSnapshots(id, version, snaps);
        });
        launch(id, token);
        return view(id);
    }

    /** Draft input changed in the UI: a reviewed result no longer matches the input. */
    public ObjectNode checkInput(String id, InputDraft input) {
        Map<String, Object> a = row(id);
        String status = (String) a.get("ANALYSIS_STATUS");
        if (STALE_CHECKED.contains(status) && !inputMatches(a, input)) markStale(id);
        return view(id);
    }

    /** An empty selection, a changed opinion/version or a vanished requirement all mean the result no longer matches the input. */
    private boolean inputMatches(Map<String, Object> a, InputDraft input) {
        if (input == null || input.REQUIREMENTS() == null || input.REQUIREMENTS().isEmpty()) return false;
        try {
            return inputVersion(snapshots((String) a.get("PROJECT_ID"), input.REQUIREMENTS()), input.OVERALL_OPINION()).equals(a.get("INPUT_VERSION"));
        } catch (AnalysisException e) {
            if (Set.of("REQUIREMENT_VERSION_CONFLICT", "REQUIREMENT_NOT_FOUND").contains(e.code())) return false;
            throw e;
        }
    }

    private void requireCurrentInput(String id, Map<String, Object> a, InputDraft input) {
        if (input == null) throw bad("현재 입력(INPUT)이 필요합니다.");
        if (inputMatches(a, input)) return;
        if (STALE_CHECKED.contains((String) a.get("ANALYSIS_STATUS"))) markStale(id);
        throw new AnalysisException(HttpStatus.CONFLICT, "ANALYSIS_STALE", "입력이 변경되어 결과가 최신이 아닙니다. 다시 분석하세요.");
    }

    public ObjectNode get(String id) {
        detectStale(id);
        return view(id);
    }

    public List<Map<String, Object>> list(String projectId) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : jdbc.queryForList("SELECT ANALYSIS_ID, REQUEST_ID, ANALYSIS_STATUS, RESULT_VERSION, CREATED_AT, UPDATED_AT FROM BSDAANLS WHERE PROJECT_ID=? ORDER BY CREATED_AT DESC", projectId)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ANALYSIS_ID", r.get("ANALYSIS_ID")); m.put("REQUEST_ID", r.get("REQUEST_ID"));
            m.put("ANALYSIS_STATUS", r.get("ANALYSIS_STATUS")); m.put("RESULT_VERSION", r.get("RESULT_VERSION"));
            m.put("CREATED_AT", String.valueOf(r.get("CREATED_AT"))); m.put("UPDATED_AT", String.valueOf(r.get("UPDATED_AT")));
            out.add(m);
        }
        return out;
    }

    private void launch(String analysisId, String token) {
        runner.execute(() -> run(analysisId, token));
    }

    void run(String analysisId, String token) {
        try {
            if (!llmProps.enabled() || blank(llmProps.baseUrl()) || blank(llmProps.apiKey()) || blank(llmProps.model())) {
                fail(analysisId, token, "LLM_NOT_CONFIGURED", null);
                return;
            }
            String[] prompts = prompts(analysisId);
            String content;
            try {
                content = CompletableFuture.supplyAsync(() -> llm.chat(prompts[0], prompts[1]).content(), llmCalls).get(timeoutSeconds, TimeUnit.SECONDS);
            } catch (TimeoutException e) {
                fail(analysisId, token, "LLM_TIMEOUT", null);
                return;
            } catch (ExecutionException | InterruptedException e) {
                fail(analysisId, token, "LLM_UNAVAILABLE", null);
                return;
            }
            if (blank(content)) { fail(analysisId, token, "LLM_EMPTY_RESPONSE", null); return; }
            JsonNode root;
            try {
                root = om.readTree(extractJson(content));
            } catch (Exception e) {
                fail(analysisId, token, "INVALID_LLM_STRUCTURE", content);
                return;
            }
            Set<String> ids = new HashSet<>(jdbc.queryForList("SELECT REQUIREMENT_ID FROM BSDAAREQ WHERE ANALYSIS_ID=?", String.class, analysisId));
            if (!validator.validate(root, ids).isEmpty()) { fail(analysisId, token, "INVALID_LLM_STRUCTURE", content); return; }
            succeed(analysisId, token, root, content);
        } catch (RuntimeException e) {
            fail(analysisId, token, "LLM_UNAVAILABLE", null);
        }
    }

    private void succeed(String id, String token, JsonNode root, String raw) {
        tx.executeWithoutResult(s -> {
            int n = jdbc.update("UPDATE BSDAANLS SET ANALYSIS_STATUS='REVIEW_READY', RESULT_VERSION=RESULT_VERSION+1, ACTIVE_REQUEST_ID=NULL, ERROR_CODE=NULL, LAST_RAW_RESPONSE=NULL, UPDATED_AT=CURRENT_TIMESTAMP WHERE ANALYSIS_ID=? AND ACTIVE_REQUEST_ID=? AND ANALYSIS_STATUS='ANALYZING'", id, token);
            if (n == 0) return; // late response of a superseded run
            Map<String, Object> a = row(id);
            int version = ((Number) a.get("RESULT_VERSION")).intValue();
            jdbc.update("INSERT INTO BSDARSLT(ANALYSIS_ID,RESULT_VERSION,INPUT_VERSION,RAW_RESPONSE,SUMMARY_JSON,BUSINESS_STRUCTURE_JSON,PROCESS_JSON,LAYOUT_JSON) VALUES (?,?,?,?,?,?,?,?)",
                    id, version, a.get("INPUT_VERSION"), raw, root.path("ANALYSIS_SUMMARY").toString(), root.path("BUSINESS_STRUCTURE").toString(), root.path("PROCESS_MODEL").toString(), root.path("LAYOUT_RECOMMENDATION").toString());
            int sortOrder = 0;
            for (JsonNode c : root.path("SD_PROGRAM_CANDIDATES")) {
                ObjectNode original = ((ObjectNode) c.deepCopy());
                String cid = "SDC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
                jdbc.update("INSERT INTO BSDACAND(CANDIDATE_ID,ANALYSIS_ID,RESULT_VERSION,TEMP_ID,PROGRAM_NAME,PURPOSE,SORT_ORDER,ORIGINAL_JSON) VALUES (?,?,?,?,?,?,?,?)",
                        cid, id, version, c.path("TEMP_ID").asText(), c.path("PROGRAM_NAME").asText(), c.path("PURPOSE").asText(), sortOrder++, original.toString());
            }
        });
    }

    private void fail(String id, String token, String code, String raw) {
        tx.executeWithoutResult(s -> {
            Map<String, Object> a = row(id);
            boolean hasResult = ((Number) a.get("RESULT_VERSION")).intValue() > 0;
            String status = hasResult ? "STALE" : ("LLM_TIMEOUT".equals(code) ? "ANALYSIS_UNKNOWN" : "ANALYSIS_FAILED");
            jdbc.update("UPDATE BSDAANLS SET ANALYSIS_STATUS=?, ERROR_CODE=?, LAST_RAW_RESPONSE=?, ACTIVE_REQUEST_ID=NULL, UPDATED_AT=CURRENT_TIMESTAMP WHERE ANALYSIS_ID=? AND ACTIVE_REQUEST_ID=? AND ANALYSIS_STATUS='ANALYZING'",
                    status, code, raw, id, token);
        });
    }

    // ---------- STALE ----------

    private void detectStale(String id) {
        Map<String, Object> a = row(id);
        if (!STALE_CHECKED.contains((String) a.get("ANALYSIS_STATUS"))) return;
        for (Map<String, Object> r : jdbc.queryForList("SELECT REQUIREMENT_ID, SNAPSHOT_JSON FROM BSDAAREQ WHERE ANALYSIS_ID=?", id)) {
            try {
                RequirementData now = requirements.one((String) r.get("REQUIREMENT_ID"));
                String snapMod = json((String) r.get("SNAPSHOT_JSON")).path("MOD_DT_INSTANT").asText();
                if (!instant(now.MOD_DT()).toString().equals(snapMod)) { markStale(id); return; }
            } catch (NoSuchElementException e) {
                markStale(id);
                return;
            }
        }
    }

    private void markStale(String id) {
        tx.executeWithoutResult(s -> {
            int n = jdbc.update("UPDATE BSDAANLS SET ANALYSIS_STATUS='STALE', UPDATED_AT=CURRENT_TIMESTAMP WHERE ANALYSIS_ID=? AND ANALYSIS_STATUS IN ('REVIEW_READY','CONFIRMED','PARTIAL','GENERATION_FAILED')", id);
            if (n > 0) jdbc.update("UPDATE BSDACAND SET SELECTED_YN='N', CONFIRMED_YN='N', UPDATED_AT=CURRENT_TIMESTAMP WHERE ANALYSIS_ID=? AND GENERATED_YN='N'", id);
        });
    }

    // ---------- candidates ----------

    public ObjectNode updateCandidate(String id, String candidateId, CandidateUpdate u) {
        detectStale(id);
        Map<String, Object> a = row(id);
        guardEditable(a, u.RESULT_VERSION());
        Map<String, Object> c = candidate(id, candidateId);
        if ("Y".equals(c.get("GENERATED_YN"))) throw new AnalysisException(HttpStatus.CONFLICT, "CANDIDATE_GENERATED", "이미 생성된 후보는 수정할 수 없습니다.");
        if (u.EDITED() != null && !u.EDITED().isObject()) throw bad("EDITED는 객체여야 합니다.");
        tx.executeWithoutResult(s -> {
            if (Boolean.TRUE.equals(u.RESET())) jdbc.update("UPDATE BSDACAND SET EDITED_JSON=NULL, PROGRAM_NAME=NULL, PURPOSE=NULL WHERE CANDIDATE_ID=?", candidateId);
            else if (u.EDITED() != null) jdbc.update("UPDATE BSDACAND SET EDITED_JSON=?, PROGRAM_NAME=?, PURPOSE=? WHERE CANDIDATE_ID=?",
                    u.EDITED().toString(), u.EDITED().path("PROGRAM_NAME").asText(""), u.EDITED().path("PURPOSE").asText(""), candidateId);
            if (u.SELECTED() != null) jdbc.update("UPDATE BSDACAND SET SELECTED_YN=? WHERE CANDIDATE_ID=?", u.SELECTED() ? "Y" : "N", candidateId);
            jdbc.update("UPDATE BSDACAND SET CONFIRMED_YN='N', UPDATED_AT=CURRENT_TIMESTAMP WHERE ANALYSIS_ID=? AND RESULT_VERSION=?", id, a.get("RESULT_VERSION"));
            jdbc.update("UPDATE BSDAANLS SET ANALYSIS_STATUS='REVIEW_READY', UPDATED_AT=CURRENT_TIMESTAMP WHERE ANALYSIS_ID=? AND ANALYSIS_STATUS='CONFIRMED'", id);
        });
        return view(id);
    }

    public ObjectNode confirm(String id, ConfirmRequest req) {
        detectStale(id);
        Map<String, Object> a = row(id);
        guardEditable(a, req.RESULT_VERSION());
        requireCurrentInput(id, a, req.INPUT());
        List<String> ids = req.CANDIDATE_IDS() == null ? List.of() : req.CANDIDATE_IDS();
        if (ids.isEmpty()) throw bad("확정할 후보를 1개 이상 선택하세요.");
        Set<String> reqIds = reqIds(id);
        Set<String> menus = menuIds((String) a.get("PROJECT_ID"));
        boolean unresolved = hasUnresolved(id, ((Number) a.get("RESULT_VERSION")).intValue());
        List<String> blocked = new ArrayList<>();
        for (String cid : ids) {
            Map<String, Object> c = candidate(id, cid);
            if ("Y".equals(c.get("GENERATED_YN"))) { blocked.add(cid + ": 이미 생성됨"); continue; }
            if (CandidateRules.blocked(CandidateRules.issues(effective(c), reqIds, menus, unresolved))) blocked.add(cid);
        }
        if (!blocked.isEmpty()) throw new AnalysisException(HttpStatus.UNPROCESSABLE_ENTITY, "CANDIDATE_BLOCKED", "검증 오류가 있는 후보는 확정할 수 없습니다: " + String.join(", ", blocked));
        tx.executeWithoutResult(s -> {
            int version = ((Number) a.get("RESULT_VERSION")).intValue();
            jdbc.update("UPDATE BSDACAND SET SELECTED_YN='N', CONFIRMED_YN='N' WHERE ANALYSIS_ID=? AND RESULT_VERSION=? AND GENERATED_YN='N'", id, version);
            for (String cid : ids) jdbc.update("UPDATE BSDACAND SET SELECTED_YN='Y', CONFIRMED_YN='Y', UPDATED_AT=CURRENT_TIMESTAMP WHERE CANDIDATE_ID=? AND ANALYSIS_ID=?", cid, id);
            jdbc.update("UPDATE BSDAANLS SET ANALYSIS_STATUS='CONFIRMED', UPDATED_AT=CURRENT_TIMESTAMP WHERE ANALYSIS_ID=?", id);
        });
        return view(id);
    }

    private void guardEditable(Map<String, Object> a, Integer clientVersion) {
        String status = (String) a.get("ANALYSIS_STATUS");
        if ("STALE".equals(status)) throw new AnalysisException(HttpStatus.CONFLICT, "ANALYSIS_STALE", "입력이 변경되어 결과가 최신이 아닙니다. 다시 분석하세요.");
        if (!Set.of("REVIEW_READY", "CONFIRMED").contains(status)) throw new AnalysisException(HttpStatus.CONFLICT, "ANALYSIS_NOT_EDITABLE", "현재 상태에서는 후보를 편집·확정할 수 없습니다.");
        if (clientVersion == null || clientVersion.intValue() != ((Number) a.get("RESULT_VERSION")).intValue())
            throw new AnalysisException(HttpStatus.CONFLICT, "RESULT_VERSION_CONFLICT", "분석 결과가 갱신되었습니다. 화면을 새로 고치세요.");
    }

    // ---------- generation ----------

    public ObjectNode generate(String id, GenerateRequest req) {
        if (blank(req.GENERATION_REQUEST_ID())) throw bad("GENERATION_REQUEST_ID가 필요합니다.");
        Map<String, Object> existing = jdbc.queryForList("SELECT * FROM BSDAGREQ WHERE GENERATION_REQUEST_ID=?", req.GENERATION_REQUEST_ID()).stream().findFirst().orElse(null);
        if (existing != null) {
            if (!id.equals(existing.get("ANALYSIS_ID"))) throw new AnalysisException(HttpStatus.CONFLICT, "GENERATION_REQUEST_CONFLICT", "다른 분석에서 사용한 생성 요청 ID입니다.");
            if ("GENERATED".equals(existing.get("STATUS"))) return generation(id);
        }
        detectStale(id);
        Map<String, Object> a = row(id);
        String status = (String) a.get("ANALYSIS_STATUS");
        if ("STALE".equals(status)) throw new AnalysisException(HttpStatus.CONFLICT, "ANALYSIS_STALE", "입력이 변경되어 결과가 최신이 아닙니다. 다시 분석하세요.");
        if ("GENERATION_UNKNOWN".equals(status))
            throw new AnalysisException(HttpStatus.CONFLICT, "GENERATION_STATE_UNCONFIRMED", "이전 생성 결과가 확인되지 않았습니다. 생성 상태를 먼저 조회하세요.");
        if ("GENERATING".equals(status))
            throw new AnalysisException(HttpStatus.CONFLICT, "GENERATION_IN_PROGRESS", "생성이 진행 중입니다. 생성 상태를 조회하세요.");
        if (!Set.of("CONFIRMED", "PARTIAL", "GENERATION_FAILED").contains(status))
            throw new AnalysisException(HttpStatus.CONFLICT, "ANALYSIS_NOT_CONFIRMED", "확정된 후보가 없어 생성할 수 없습니다.");
        int version = ((Number) a.get("RESULT_VERSION")).intValue();
        if (req.RESULT_VERSION() == null || req.RESULT_VERSION() != version)
            throw new AnalysisException(HttpStatus.CONFLICT, "RESULT_VERSION_CONFLICT", "분석 결과가 갱신되었습니다. 화면을 새로 고치세요.");
        requireCurrentInput(id, a, req.INPUT());
        if (existing == null) {
            List<String> targets = jdbc.queryForList("SELECT CANDIDATE_ID FROM BSDACAND WHERE ANALYSIS_ID=? AND RESULT_VERSION=? AND SELECTED_YN='Y' AND CONFIRMED_YN='Y' AND GENERATED_YN='N'", String.class, id, version);
            Set<String> reqIds = reqIds(id);
            Set<String> menus = menuIds((String) a.get("PROJECT_ID"));
            boolean unresolved = hasUnresolved(id, version);
            for (String cid : targets)
                if (CandidateRules.blocked(CandidateRules.issues(effective(candidate(id, cid)), reqIds, menus, unresolved)))
                    throw new AnalysisException(HttpStatus.UNPROCESSABLE_ENTITY, "CANDIDATE_BLOCKED", "확정 이후 검증 오류가 생긴 후보가 있습니다. 후보를 다시 확정하세요: " + cid);
            if (targets.isEmpty()) throw new AnalysisException(HttpStatus.UNPROCESSABLE_ENTITY, "NOTHING_TO_GENERATE", "생성할 확정 후보가 없습니다.");
            try {
                tx.executeWithoutResult(s -> {
                    jdbc.update("INSERT INTO BSDAGREQ(GENERATION_REQUEST_ID,ANALYSIS_ID,RESULT_VERSION,STATUS) VALUES (?,?,?,'GENERATING')", req.GENERATION_REQUEST_ID(), id, version);
                    for (String cid : targets) jdbc.update("INSERT INTO BSDAGITM(GENERATION_REQUEST_ID,CANDIDATE_ID,STATUS) VALUES (?,?,'PENDING')", req.GENERATION_REQUEST_ID(), cid);
                });
            } catch (org.springframework.dao.DuplicateKeyException e) {
                // concurrent identical request: continue with the stored one
            }
        }
        jdbc.update("UPDATE BSDAANLS SET ANALYSIS_STATUS='GENERATING', UPDATED_AT=CURRENT_TIMESTAMP WHERE ANALYSIS_ID=?", id);
        jdbc.update("UPDATE BSDAGREQ SET STATUS='GENERATING', UPDATED_AT=CURRENT_TIMESTAMP WHERE GENERATION_REQUEST_ID=?", req.GENERATION_REQUEST_ID());
        for (Map<String, Object> item : jdbc.queryForList("SELECT CANDIDATE_ID FROM BSDAGITM WHERE GENERATION_REQUEST_ID=? AND STATUS<>'SUCCESS'", req.GENERATION_REQUEST_ID())) {
            String cid = (String) item.get("CANDIDATE_ID");
            try {
                String programId = programFactory.create(cid);
                jdbc.update("UPDATE BSDAGITM SET STATUS='SUCCESS', PROGRAM_ID=?, ERROR_CODE=NULL, ERROR_MESSAGE=NULL, UPDATED_AT=CURRENT_TIMESTAMP WHERE GENERATION_REQUEST_ID=? AND CANDIDATE_ID=?", programId, req.GENERATION_REQUEST_ID(), cid);
            } catch (AnalysisException e) {
                itemFailed(req.GENERATION_REQUEST_ID(), cid, e.code(), e.getMessage());
            } catch (RuntimeException e) {
                itemFailed(req.GENERATION_REQUEST_ID(), cid, "PROGRAM_CREATE_FAILED", "Program 생성에 실패했습니다. 재시도할 수 있습니다.");
            }
        }
        finalizeGeneration(id, req.GENERATION_REQUEST_ID());
        return generation(id);
    }

    private void finalizeGeneration(String id, String requestId) {
        int total = jdbc.queryForObject("SELECT COUNT(*) FROM BSDAGITM WHERE GENERATION_REQUEST_ID=?", Integer.class, requestId);
        int ok = jdbc.queryForObject("SELECT COUNT(*) FROM BSDAGITM WHERE GENERATION_REQUEST_ID=? AND STATUS='SUCCESS'", Integer.class, requestId);
        String result = ok == total ? "GENERATED" : ok > 0 ? "PARTIAL" : "GENERATION_FAILED";
        jdbc.update("UPDATE BSDAGREQ SET STATUS=?, UPDATED_AT=CURRENT_TIMESTAMP WHERE GENERATION_REQUEST_ID=?", result, requestId);
        jdbc.update("UPDATE BSDAANLS SET ANALYSIS_STATUS=?, UPDATED_AT=CURRENT_TIMESTAMP WHERE ANALYSIS_ID=?", result, id);
    }

    /** Querying an unconfirmed generation checks which Programs really exist, then opens retry for the failed items only. */
    private void reconcileGeneration(String id) {
        List<Map<String, Object>> reqs = jdbc.queryForList("SELECT GENERATION_REQUEST_ID FROM BSDAGREQ WHERE ANALYSIS_ID=? ORDER BY CREATED_AT DESC, GENERATION_REQUEST_ID DESC", id);
        if (reqs.isEmpty()) {
            jdbc.update("UPDATE BSDAANLS SET ANALYSIS_STATUS='CONFIRMED', UPDATED_AT=CURRENT_TIMESTAMP WHERE ANALYSIS_ID=?", id);
            return;
        }
        String requestId = (String) reqs.getFirst().get("GENERATION_REQUEST_ID");
        for (Map<String, Object> item : jdbc.queryForList("SELECT CANDIDATE_ID FROM BSDAGITM WHERE GENERATION_REQUEST_ID=? AND STATUS<>'SUCCESS'", requestId)) {
            String cid = (String) item.get("CANDIDATE_ID");
            List<String> programs = jdbc.queryForList("SELECT PROGRAM_ID FROM BSDGPROG WHERE SOURCE_CANDIDATE_ID=?", String.class, cid);
            if (!programs.isEmpty())
                jdbc.update("UPDATE BSDAGITM SET STATUS='SUCCESS', PROGRAM_ID=?, ERROR_CODE=NULL, ERROR_MESSAGE=NULL, UPDATED_AT=CURRENT_TIMESTAMP WHERE GENERATION_REQUEST_ID=? AND CANDIDATE_ID=?", programs.getFirst(), requestId, cid);
            else
                itemFailed(requestId, cid, "GENERATION_NOT_CONFIRMED", "생성 여부를 확인할 수 없어 실패로 처리했습니다. 재시도할 수 있습니다.");
        }
        finalizeGeneration(id, requestId);
    }

    private void itemFailed(String requestId, String candidateId, String code, String message) {
        jdbc.update("UPDATE BSDAGITM SET STATUS='FAILED', ERROR_CODE=?, ERROR_MESSAGE=?, UPDATED_AT=CURRENT_TIMESTAMP WHERE GENERATION_REQUEST_ID=? AND CANDIDATE_ID=?",
                code, message, requestId, candidateId);
    }

    public ObjectNode generation(String id) {
        if ("GENERATION_UNKNOWN".equals(row(id).get("ANALYSIS_STATUS"))) reconcileGeneration(id);
        ObjectNode out = om.createObjectNode();
        List<Map<String, Object>> reqs = jdbc.queryForList("SELECT GENERATION_REQUEST_ID, RESULT_VERSION, STATUS FROM BSDAGREQ WHERE ANALYSIS_ID=? ORDER BY CREATED_AT DESC, GENERATION_REQUEST_ID DESC", id);
        out.put("ANALYSIS_ID", id);
        out.put("ANALYSIS_STATUS", (String) row(id).get("ANALYSIS_STATUS"));
        if (reqs.isEmpty()) { out.putNull("GENERATION_REQUEST_ID"); out.putArray("ITEMS"); return out; }
        Map<String, Object> r = reqs.getFirst();
        out.put("GENERATION_REQUEST_ID", (String) r.get("GENERATION_REQUEST_ID"));
        out.put("RESULT_VERSION", ((Number) r.get("RESULT_VERSION")).intValue());
        out.put("STATUS", (String) r.get("STATUS"));
        ArrayNode items = out.putArray("ITEMS");
        for (Map<String, Object> i : jdbc.queryForList("SELECT i.CANDIDATE_ID, i.STATUS, i.PROGRAM_ID, i.ERROR_CODE, i.ERROR_MESSAGE, c.PROGRAM_NAME FROM BSDAGITM i JOIN BSDACAND c ON c.CANDIDATE_ID=i.CANDIDATE_ID WHERE i.GENERATION_REQUEST_ID=? ORDER BY i.CANDIDATE_ID", r.get("GENERATION_REQUEST_ID"))) {
            ObjectNode n = items.addObject();
            for (String k : List.of("CANDIDATE_ID", "STATUS", "PROGRAM_ID", "ERROR_CODE", "ERROR_MESSAGE", "PROGRAM_NAME")) n.put(k, i.get(k) == null ? null : String.valueOf(i.get(k)));
        }
        return out;
    }

    // ---------- view ----------

    private ObjectNode view(String id) {
        Map<String, Object> a = row(id);
        int version = ((Number) a.get("RESULT_VERSION")).intValue();
        ObjectNode out = om.createObjectNode();
        for (String k : List.of("ANALYSIS_ID", "PROJECT_ID", "REQUEST_ID", "INPUT_VERSION", "ANALYSIS_STATUS", "OVERALL_OPINION", "ERROR_CODE"))
            out.put(k, a.get(k) == null ? null : String.valueOf(a.get(k)));
        out.put("RESULT_VERSION", version);
        out.put("CREATED_AT", String.valueOf(a.get("CREATED_AT")));
        out.put("UPDATED_AT", String.valueOf(a.get("UPDATED_AT")));
        out.put("ERROR_MESSAGE", a.get("ERROR_CODE") == null ? null : ERROR_MESSAGES.get((String) a.get("ERROR_CODE")));
        ArrayNode reqs = out.putArray("REQUIREMENTS");
        for (Map<String, Object> r : jdbc.queryForList("SELECT * FROM BSDAAREQ WHERE ANALYSIS_ID=? ORDER BY REQUIREMENT_ID", id)) {
            ObjectNode n = reqs.addObject();
            n.put("REQUIREMENT_ID", (String) r.get("REQUIREMENT_ID"));
            n.put("REQUIREMENT_NAME", (String) r.get("REQUIREMENT_NAME"));
            n.put("MOD_DT", json((String) r.get("SNAPSHOT_JSON")).path("MOD_DT").asText());
            n.put("DESIGN_OPINION", (String) r.get("DESIGN_OPINION"));
        }
        if (version == 0) { out.putNull("RESULT"); out.putArray("CANDIDATES"); return out; }
        Map<String, Object> res = jdbc.queryForMap("SELECT * FROM BSDARSLT WHERE ANALYSIS_ID=? AND RESULT_VERSION=?", id, version);
        ObjectNode result = out.putObject("RESULT");
        result.set("ANALYSIS_SUMMARY", json((String) res.get("SUMMARY_JSON")));
        result.set("BUSINESS_STRUCTURE", json((String) res.get("BUSINESS_STRUCTURE_JSON")));
        result.set("PROCESS_MODEL", json((String) res.get("PROCESS_JSON")));
        result.set("LAYOUT_RECOMMENDATION", json((String) res.get("LAYOUT_JSON")));
        Set<String> reqIds = reqIds(id);
        Set<String> menus = menuIds((String) a.get("PROJECT_ID"));
        boolean unresolved = hasUnresolved(id, version);
        ArrayNode cands = out.putArray("CANDIDATES");
        for (Map<String, Object> c : jdbc.queryForList("SELECT * FROM BSDACAND WHERE ANALYSIS_ID=? AND RESULT_VERSION=? ORDER BY SORT_ORDER, CANDIDATE_ID", id, version)) {
            ObjectNode n = cands.addObject();
            n.put("CANDIDATE_ID", (String) c.get("CANDIDATE_ID"));
            n.put("TEMP_ID", (String) c.get("TEMP_ID"));
            n.set("ORIGINAL", json((String) c.get("ORIGINAL_JSON")));
            n.set("EDITED", c.get("EDITED_JSON") == null ? JsonNodeFactory.instance.nullNode() : json((String) c.get("EDITED_JSON")));
            n.set("EFFECTIVE", effective(c));
            for (String k : List.of("SELECTED_YN", "CONFIRMED_YN", "GENERATED_YN")) n.put(k, (String) c.get(k));
            n.put("GENERATED_PROGRAM_ID", (String) c.get("GENERATED_PROGRAM_ID"));
            n.set("ISSUES", CandidateRules.issues(effective(c), reqIds, menus, unresolved));
        }
        return out;
    }

    // ---------- helpers ----------

    private record Snapshot(RequirementData data, String opinion) { }

    private List<Snapshot> snapshots(String projectId, List<RequirementInput> inputs) {
        if (inputs == null || inputs.isEmpty()) throw bad("분석할 요구사항을 1개 이상 선택하세요.");
        Set<String> seen = new HashSet<>();
        List<Snapshot> out = new ArrayList<>();
        for (RequirementInput in : inputs) {
            if (blank(in.REQUIREMENT_ID()) || !seen.add(in.REQUIREMENT_ID())) throw bad("요구사항 ID가 비어 있거나 중복되었습니다.");
            RequirementData d;
            try { d = requirements.one(in.REQUIREMENT_ID()); }
            catch (NoSuchElementException e) { throw new AnalysisException(HttpStatus.NOT_FOUND, "REQUIREMENT_NOT_FOUND", "요구사항을 찾을 수 없습니다: " + in.REQUIREMENT_ID()); }
            if (!projectId.equals(d.PROJECT_ID())) throw bad("다른 Project의 요구사항은 분석할 수 없습니다.");
            if (blank(in.MOD_DT())) throw bad("요구사항 MOD_DT가 필요합니다.");
            Instant client;
            try { client = OffsetDateTime.parse(in.MOD_DT()).toInstant(); } catch (RuntimeException e) { throw bad("MOD_DT 형식이 올바르지 않습니다."); }
            if (!client.equals(instant(d.MOD_DT())))
                throw new AnalysisException(HttpStatus.CONFLICT, "REQUIREMENT_VERSION_CONFLICT", "요구사항이 변경되었습니다. 목록을 새로 고친 뒤 다시 선택하세요: " + d.REQUIREMENT_ID());
            out.add(new Snapshot(d, in.DESIGN_OPINION() == null ? "" : in.DESIGN_OPINION()));
        }
        out.sort(Comparator.comparing(s -> s.data().REQUIREMENT_ID()));
        return out;
    }

    private void writeSnapshots(String analysisId, String version, List<Snapshot> snaps) {
        for (Snapshot s : snaps) {
            RequirementData d = s.data();
            ObjectNode j = om.createObjectNode();
            j.put("MOD_DT", d.MOD_DT().toString());
            j.put("MOD_DT_INSTANT", instant(d.MOD_DT()).toString());
            jdbc.update("INSERT INTO BSDAAREQ(ANALYSIS_ID,REQUIREMENT_ID,INPUT_VERSION,REQUIREMENT_MOD_DT,REQUIREMENT_NAME,REQUIREMENT_TYPE_CODE,DESCRIPTION,PROCESS_DESCRIPTION,DESIGN_OPINION,SNAPSHOT_JSON) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    analysisId, d.REQUIREMENT_ID(), version, d.MOD_DT(), d.REQUIREMENT_NAME(), d.REQUIREMENT_TYPE_CODE(), d.DESCRIPTION(), d.PROCESS_DESCRIPTION(), s.opinion(), j.toString());
        }
    }

    private String inputVersion(List<Snapshot> snaps, String overall) {
        StringBuilder sb = new StringBuilder();
        for (Snapshot s : snaps) sb.append(s.data().REQUIREMENT_ID()).append('|').append(instant(s.data().MOD_DT())).append('|').append(s.opinion().trim()).append('\n');
        sb.append('#').append(overall == null ? "" : overall.trim());
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(h);
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    private String[] prompts(String analysisId) {
        String system = "당신은 SI 프로젝트 요구사항을 분석해 표준설계 산출물을 제안하는 설계 보조자입니다. "
                + "반드시 JSON 객체 하나만 출력하고 설명 문장이나 코드 블록을 붙이지 마세요. 모든 키는 SCREAMING_SNAKE_CASE입니다. "
                + "최상위 키: ANALYSIS_SUMMARY{TITLE,SUMMARY,SOURCE_REQUIREMENT_IDS,KEY_POINTS,ASSUMPTIONS,UNRESOLVED_ITEMS}, "
                + "BUSINESS_STRUCTURE{MENUS,ROLES,ACTIONS: 각 [{TEMP_ID,NAME}]}, PROCESS_MODEL{STEPS:[{TEMP_ID,NAME}],TRANSITIONS:[{FROM,TO}]}, "
                + "LAYOUT_RECOMMENDATION{LAYOUT_TYPE,COMPONENTS,REASON}, SD_PROGRAM_CANDIDATES[{TEMP_ID,PROGRAM_NAME,PURPOSE,SOURCE_REQUIREMENT_IDS,MENU_TEMP_IDS,ROLE_TEMP_IDS,ACTION_TEMP_IDS,STEP_TEMP_IDS,LAYOUT_TYPE}]. "
                + "LAYOUT_TYPE은 " + AnalysisResultValidator.LAYOUTS + " 중 하나, COMPONENTS는 " + AnalysisResultValidator.COMPONENTS + " 중에서만 고르세요. "
                + "SOURCE_REQUIREMENT_IDS는 입력에 주어진 요구사항 ID만 사용하세요. TEMP_ID는 응답 안에서 유일해야 하며 참조는 반드시 존재하는 TEMP_ID여야 합니다. "
                + "STEPS가 2개 이상이면 모든 STEP이 TRANSITIONS로 연결되어야 합니다. 시스템 Menu·Role·Action·권한·코드를 확정하지 말고 제안만 하세요.";
        Map<String, Object> a = row(analysisId);
        StringBuilder u = new StringBuilder("[요구사항]\n");
        for (Map<String, Object> r : jdbc.queryForList("SELECT * FROM BSDAAREQ WHERE ANALYSIS_ID=? ORDER BY REQUIREMENT_ID", analysisId)) {
            u.append("- ID: ").append(r.get("REQUIREMENT_ID")).append("\n  이름: ").append(r.get("REQUIREMENT_NAME"))
                    .append("\n  유형: ").append(r.get("REQUIREMENT_TYPE_CODE")).append("\n  설명: ").append(r.get("DESCRIPTION"))
                    .append("\n  처리 설명: ").append(r.get("PROCESS_DESCRIPTION")).append("\n  설계 의견: ").append(r.get("DESIGN_OPINION")).append('\n');
        }
        u.append("\n[전체 의견]\n").append(a.get("OVERALL_OPINION") == null ? "" : a.get("OVERALL_OPINION"));
        return new String[]{system, u.toString()};
    }

    private static String extractJson(String content) {
        int s = content.indexOf('{'), e = content.lastIndexOf('}');
        return s >= 0 && e > s ? content.substring(s, e + 1) : content;
    }

    private Map<String, Object> row(String id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM BSDAANLS WHERE ANALYSIS_ID=?", id);
        if (rows.isEmpty()) throw new AnalysisException(HttpStatus.NOT_FOUND, "ANALYSIS_NOT_FOUND", "분석을 찾을 수 없습니다.");
        return rows.getFirst();
    }

    private Map<String, Object> candidate(String analysisId, String candidateId) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM BSDACAND WHERE CANDIDATE_ID=? AND ANALYSIS_ID=?", candidateId, analysisId);
        if (rows.isEmpty()) throw new AnalysisException(HttpStatus.NOT_FOUND, "CANDIDATE_NOT_FOUND", "후보를 찾을 수 없습니다.");
        return rows.getFirst();
    }

    private JsonNode effective(Map<String, Object> c) {
        return json((String) (c.get("EDITED_JSON") != null ? c.get("EDITED_JSON") : c.get("ORIGINAL_JSON")));
    }

    private Set<String> reqIds(String analysisId) {
        return new HashSet<>(jdbc.queryForList("SELECT REQUIREMENT_ID FROM BSDAAREQ WHERE ANALYSIS_ID=?", String.class, analysisId));
    }

    private Set<String> menuIds(String projectId) {
        return new HashSet<>(jdbc.queryForList("SELECT PROJECT_MENU_ID FROM BSDPMENU WHERE PROJECT_ID=?", String.class, projectId));
    }

    private boolean hasUnresolved(String analysisId, int version) {
        String summary = jdbc.queryForObject("SELECT SUMMARY_JSON FROM BSDARSLT WHERE ANALYSIS_ID=? AND RESULT_VERSION=?", String.class, analysisId, version);
        return json(summary).path("UNRESOLVED_ITEMS").size() > 0;
    }

    private JsonNode json(String s) {
        try { return om.readTree(s); } catch (Exception e) { throw new IllegalStateException(e); }
    }

    private static Instant instant(OffsetDateTime t) { return t.toInstant(); }
    private static boolean blank(String s) { return s == null || s.isBlank(); }
    private static AnalysisException bad(String m) { return new AnalysisException(HttpStatus.BAD_REQUEST, "ANALYSIS_INVALID", m); }
}
