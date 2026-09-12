package com.caron.basekit.standarddesign.terms;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
class StandardDesignTermService {

    private final StandardDesignTermRepository repository;

    StandardDesignTermService(StandardDesignTermRepository repository) {
        this.repository = repository;
    }

    StandardDesignTermPage search(String keyword, int page, int size) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 100);
        List<RankedTerm> ranked = repository.findAll().stream()
                .map(term -> new RankedTerm(term, rank(term, normalizedKeyword)))
                .filter(candidate -> candidate.rank() >= 0)
                .sorted(Comparator.comparingInt(RankedTerm::rank)
                        .thenComparing(candidate -> candidate.term().SOURCE_ROW_NUMBER()))
                .toList();
        int fromIndex = Math.min((safePage - 1) * safeSize, ranked.size());
        int toIndex = Math.min(fromIndex + safeSize, ranked.size());
        List<StandardDesignTerm> items = ranked.subList(fromIndex, toIndex).stream()
                .map(RankedTerm::term)
                .toList();
        return new StandardDesignTermPage(items, safePage, safeSize, ranked.size(),
                (ranked.size() + safeSize - 1) / safeSize);
    }

    StandardDesignTerm get(String termId) {
        return repository.findAll().stream()
                .filter(term -> term.TERM_ID().equals(termId))
                .findFirst()
                .orElseThrow(() -> new StandardDesignTermNotFoundException(termId));
    }

    List<StandardDesignTerm> searchTerms(String keyword, int limit) {
        return search(keyword, 1, Math.min(Math.max(limit, 1), 100)).ITEMS();
    }

    private int rank(StandardDesignTerm term, String keyword) {
        if (!StringUtils.hasText(keyword)) return 3;
        String name = term.COMMON_STANDARD_TERM_NAME().toLowerCase(Locale.ROOT);
        String abbreviation = term.COMMON_STANDARD_TERM_ENGLISH_ABBREVIATION_NAME().toLowerCase(Locale.ROOT);
        String text = term.searchText();
        if (name.equals(keyword) || abbreviation.equals(keyword)) return 0;
        if (name.startsWith(keyword) || abbreviation.startsWith(keyword)) return 1;
        return text.contains(keyword) ? 2 : -1;
    }

    private record RankedTerm(StandardDesignTerm term, int rank) {
    }
}
