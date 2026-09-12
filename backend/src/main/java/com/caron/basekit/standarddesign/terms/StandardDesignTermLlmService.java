package com.caron.basekit.standarddesign.terms;

import com.caron.basekit.standarddesign.llm.DesignLlmClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
class StandardDesignTermLlmService {

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
            Never invent a term, ID, domain, or field. If no candidate answers the question,
            use null and explicitly say that no matching standard term was found.
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
        DesignLlmClient.LlmChatResult interpretationResponse =
                llmClient.chat(INTERPRET_SYSTEM_PROMPT, question);
        Interpretation interpretation = parseInterpretation(interpretationResponse.content(), question);

        List<StandardDesignTerm> initialCandidates = termService.searchTerms(question, 20);
        LinkedHashSet<String> keywords = new LinkedHashSet<>(interpretation.searchKeywords());
        List<StandardDesignTerm> reconstructedCandidates = new ArrayList<>();
        for (String keyword : keywords) {
            reconstructedCandidates.addAll(termService.searchTerms(keyword, 20));
        }
        List<StandardDesignTerm> candidates = mergeCandidates(initialCandidates, reconstructedCandidates, 20);
        String candidateContext = candidates.stream().map(this::candidateJson).toList().toString();
        DesignLlmClient.LlmChatResult answerResponse = llmClient.chat(
                ANSWER_SYSTEM_PROMPT,
                "QUESTION=" + question + "\nSEARCH_KEYWORDS=" + keywords + "\nSTANDARD_TERM_CANDIDATES=" + candidateContext
        );
        Answer answer = parseAnswer(answerResponse.content(), candidates);
        if (answer.recommendedTermId() != null) {
            try {
                termService.get(answer.recommendedTermId());
            } catch (StandardDesignTermNotFoundException exception) {
                answer = new Answer(null, "추천된 용어 ID가 원본 용어집에 없어 추천하지 않았습니다.");
            }
        }
        String answerText = StringUtils.hasText(answer.answer())
                ? answer.answer()
                : candidates.isEmpty() ? "일치하는 표준용어를 찾지 못했습니다." : "후보 중 확정 가능한 표준용어를 찾지 못했습니다.";
        return new StandardDesignTermLlmResult(
                question,
                interpretation.interpretedIntent(),
                List.copyOf(keywords),
                candidates.stream().map(term -> toCandidate(term, keywords)).toList(),
                answer.recommendedTermId(),
                answerText,
                interpretationResponse.model()
        );
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
            return new Answer(id != null && candidateIds.contains(id) ? id : null, node.path("answer").asText(""));
        } catch (Exception exception) {
            return new Answer(null, "LLM 구조화 응답을 해석하지 못했습니다. 후보를 확인해 주세요.");
        }
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

    private record Answer(String recommendedTermId, String answer) {
    }
}
