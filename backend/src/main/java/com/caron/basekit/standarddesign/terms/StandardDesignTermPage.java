package com.caron.basekit.standarddesign.terms;

import java.util.List;

record StandardDesignTermPage(
        List<StandardDesignTerm> ITEMS,
        int PAGE,
        int SIZE,
        int TOTAL_COUNT,
        int TOTAL_PAGES
) {
}
