package com.caron.basekit.standarddesign.terms;

import com.caron.basekit.standarddesign.llm.DesignLlmClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
class StandardDesignTermLlmService {

    private static final Logger log = LoggerFactory.getLogger(StandardDesignTermLlmService.class);
    private static final String NOT_FOUND_ANSWER = "회사 표준용어집에서 적합한 표준용어를 찾지 못했습니다.";
    private static final String INTERPRET_SYSTEM_PROMPT = """
            You extract search intent for a Korean standard-term glossary.
            Return JSON only: {"interpretedIntent":"string","searchKeywords":["string"]}.
            Use at most 5 concise Korean or English search keywords from the user question.
            Do not invent term IDs, terms, or facts. Do not answer the question.
            """;
    private static final String ANSWER_SYSTEM_PROMPT = """
            You answer using only the supplied STANDARD_TERM_CANDIDATES JSON.
            Return JSON only: {"recommendedTermId":"TERM-######" or null,"answer":"string"}.
            recommendedTermId must be copied exactly from a candidate or be null.
            The answer field is only a short recommendation reason. Do not include term names,
            English names, abbreviations, domains, data types, lengths, scales, or other
            standard metadata; the backend supplies all standard metadata from the CSV.
            If no candidate answers the question, use null.
            """;

    private final DesignLlmClient llmClient;
    private final StandardDesignTermService termService;
    private final ObjectMapper objectMapper;

    StandardDesignTermLlmService(
            DesignLlmClient llmClient,
            StandardDesignTermService termService,
            ObjectMapper objectMapper
    ) {
        this.llmClient = llmClient;
        this.termService = termService;
        this.objectMapper = objectMapper;
    }

    StandardDesignTermLlmResult recommend(String question) {
        return recommend(question, requestId());
    }

    StandardDesignTermLlmResult recommend(String question, String requestId) {
        long requestStartedAt = System.nanoTime();
        log.info("standard-term-llm request start requestId={}", requestId);

        long stageStartedAt = System.nanoTime();
        DesignLlmClient.LlmChatResult interpretationResponse =
                llmClient.chat(INTERPRET_SYSTEM_PROMPT, question);
        Interpretation interpretation = parseInterpretation(interpretationResponse.content(), question);
        log.info("standard-term-llm intent extraction requestId={} elapsedMs={} keywordCount={}",
                requestId, elapsedMillis(stageStartedAt), interpretation.searchKeywords().size());

        stageStartedAt = System.nanoTime();
        List<StandardDesignTerm> initialCandidates = termService.searchTerms(question, 20);
        log.info("standard-term-llm original CSV search requestId={} elapsedMs={} candidateCount={}",
                requestId, elapsedMillis(stageStartedAt), initialCandidates.size());

        LinkedHashSet<String> keywords = new LinkedHashSet<>(interpretation.searchKeywords());
        List<StandardDesignTerm> reconstructedCandidates = new ArrayList<>();
        stageStartedAt = System.nanoTime();
        for (String keyword : keywords) {
            reconstructedCandidates.addAll(termService.searchTerms(keyword, 20));
        }
        log.info("standard-term-llm keyword CSV search requestId={} elapsedMs={} keywordCount={} candidateCount={}",
                requestId, elapsedMillis(stageStartedAt), keywords.size(), reconstructedCandidates.size());

        stageStartedAt = System.nanoTime();
        List<StandardDesignTerm> candidates = mergeCandidates(initialCandidates, reconstructedCandidates, 20);
        log.info("standard-term-llm candidate merge requestId={} elapsedMs={} candidateCount={} candidateIds={}",
                requestId, elapsedMillis(stageStartedAt), candidates.size(), safeCandidateIds(candidates));

        String secondUserPrompt = "QUESTION=" + question + "\nSEARCH_KEYWORDS=" + keywords
                + "\nSTANDARD_TERM_CANDIDATES=" + candidates.stream().map(this::candidateJson).toList();
        log.info("standard-term-llm recommendation LLM request start requestId={} candidateCount={} systemPromptBytes={} userPromptBytes={} inputTokens=unavailable firstResponseByte=unavailable",
                requestId, candidates.size(), utf8Length(ANSWER_SYSTEM_PROMPT), utf8Length(secondUserPrompt));
        stageStartedAt = System.nanoTime();
        DesignLlmClient.LlmChatResult answerResponse = llmClient.chat(
                ANSWER_SYSTEM_PROMPT,
                secondUserPrompt
        );
        log.info("standard-term-llm recommendation LLM response requestId={} firstResponseByte=unavailable responseCompleteElapsedMs={} outputBytes={} outputTokens=unavailable totalElapsedMs={}",
                requestId, elapsedMillis(stageStartedAt), utf8Length(answerResponse.content()),
                elapsedMillis(stageStartedAt));

        stageStartedAt = System.nanoTime();
        Answer answer = parseAnswer(answerResponse.content(), candidates);
        log.info("standard-term-llm whitelist grounding requestId={} elapsedMs={} acceptedTermId={}",
                requestId, elapsedMillis(stageStartedAt), safeId(answer.recommendedTermId()));

        stageStartedAt = System.nanoTime();
        StandardDesignTerm recommendedTerm = null;
        if (answer.recommendedTermId() != null) {
            try {
                recommendedTerm = termService.get(answer.recommendedTermId());
            } catch (StandardDesignTermNotFoundException exception) {
                answer = new Answer(null);
            }
        }
        String answerText = recommendedTerm == null
                ? NOT_FOUND_ANSWER
                : canonicalRecommendation(recommendedTerm);
        StandardDesignTermLlmResult result = new StandardDesignTermLlmResult(
                question,
                interpretation.interpretedIntent(),
                List.copyOf(keywords),
                candidates.stream().map(term -> toCandidate(term, keywords)).toList(),
                answer.recommendedTermId(),
                answerText,
                interpretationResponse.model()
        );
        log.info("standard-term-llm canonical relookup/response assembly requestId={} elapsedMs={} recommendedTermId={}",
                requestId, elapsedMillis(stageStartedAt), safeId(result.recommendedTermId()));
        log.info("standard-term-llm total/end requestId={} elapsedMs={} candidateCount={} recommendedTermId={}",
                requestId, elapsedMillis(requestStartedAt), result.candidates().size(), safeId(result.recommendedTermId()));
        return result;
    }

    private String requestId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private long elapsedMillis(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }

    private int utf8Length(String value) {
        return value == null ? 0 : value.getBytes(java.nio.charset.StandardCharsets.UTF_8).length;
    }

    private List<String> safeCandidateIds(List<StandardDesignTerm> candidates) {
        return candidates.stream().map(StandardDesignTerm::TERM_ID).toList();
    }

    private String safeId(String termId) {
        return termId == null ? "NONE" : termId;
    }

    private List<StandardDesignTerm> mergeCandidates(
            List<StandardDesignTerm> initial,
            List<StandardDesignTerm> reconstructed,
            int limit
    ) {
        Map<String, StandardDesignTerm> merged = new LinkedHashMap<>();
        initial.forEach(term -> merged.put(term.TERM_ID(), term));
        reconstructed.forEach(term -> merged.putIfAbsent(term.TERM_ID(), term));
        return merged.values().stream().limit(limit).toList();
    }

    private String candidateJson(StandardDesignTerm term) {
        return "{\"termId\":\"" + term.TERM_ID() + "\",\"name\":\"" + compact(term.COMMON_STANDARD_TERM_NAME())
                + "\",\"englishAbbreviation\":\"" + compact(term.COMMON_STANDARD_TERM_ENGLISH_ABBREVIATION_NAME())
                + "\",\"domain\":\"" + compact(term.COMMON_STANDARD_DOMAIN_NAME())
                + "\",\"dataType\":\"" + compact(term.STORAGE_FORMAT()) + "\"}";
    }

    private StandardTermCandidate toCandidate(StandardDesignTerm term, Set<String> keywords) {
        String normalizedName = term.COMMON_STANDARD_TERM_NAME().toLowerCase(Locale.ROOT);
        String normalizedAbbreviation = term.COMMON_STANDARD_TERM_ENGLISH_ABBREVIATION_NAME().toLowerCase(Locale.ROOT);
        String matchType = "partial";
        for (String keyword : keywords) {
            String normalizedKeyword = keyword.toLowerCase(Locale.ROOT);
            if (normalizedName.equals(normalizedKeyword) || normalizedAbbreviation.equals(normalizedKeyword)) {
                matchType = "exact";
                break;
            }
            if (normalizedName.startsWith(normalizedKeyword) || normalizedAbbreviation.startsWith(normalizedKeyword)) {
                matchType = "prefix";
            }
        }
        return new StandardTermCandidate(
                term.TERM_ID(),
                term.COMMON_STANDARD_TERM_NAME(),
                term.COMMON_STANDARD_TERM_ENGLISH_ABBREVIATION_NAME(),
                term.COMMON_STANDARD_DOMAIN_NAME(),
                term.STORAGE_FORMAT(),
                matchType,
                "CSV 원본에서 검색어와 일치한 후보"
        );
    }

    private Interpretation parseInterpretation(String content, String question) {
        try {
            JsonNode node = objectMapper.readTree(normalizeJson(content));
            List<String> keywords = new ArrayList<>();
            JsonNode keywordNode = node.path("searchKeywords");
            if (keywordNode.isArray()) {
                keywordNode.forEach(value -> {
                    if (value.isTextual() && StringUtils.hasText(value.asText()) && keywords.size() < 5) {
                        keywords.add(value.asText().trim());
                    }
                });
            }
            if (keywords.isEmpty()) keywords.add(question.trim());
            return new Interpretation(node.path("interpretedIntent").asText("질문 기반 표준용어 검색"), keywords);
        } catch (Exception exception) {
            return new Interpretation("LLM 결과 해석 실패 - 원문 질문으로 안전하게 검색", List.of(question.trim()));
        }
    }

    private Answer parseAnswer(String content, List<StandardDesignTerm> candidates) {
        Set<String> candidateIds = candidates.stream().map(StandardDesignTerm::TERM_ID).collect(java.util.stream.Collectors.toSet());
        try {
            JsonNode node = objectMapper.readTree(normalizeJson(content));
            String id = node.path("recommendedTermId").isTextual() ? node.path("recommendedTermId").asText() : null;
            return new Answer(id != null && candidateIds.contains(id) ? id : null);
        } catch (Exception exception) {
            return new Answer(null);
        }
    }

    private String canonicalRecommendation(StandardDesignTerm term) {
        return "회사 표준용어집 기준 추천 표준용어: " + term.COMMON_STANDARD_TERM_NAME()
                + " (" + term.TERM_ID() + "), 영문약어: "
                + term.COMMON_STANDARD_TERM_ENGLISH_ABBREVIATION_NAME()
                + ", 도메인: " + term.COMMON_STANDARD_DOMAIN_NAME()
                + ", 데이터타입: " + term.STORAGE_FORMAT();
    }

    private String normalizeJson(String content) {
        String normalized = content == null ? "" : content.trim();
        if (normalized.startsWith("```")) {
            normalized = normalized.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
        }
        return normalized;
    }

    private String compact(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ");
    }

    private record Interpretation(String interpretedIntent, List<String> searchKeywords) {
    }

    private record Answer(String recommendedTermId) {
    }
}
