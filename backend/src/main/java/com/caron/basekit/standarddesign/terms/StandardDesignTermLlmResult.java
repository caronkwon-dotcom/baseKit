package com.caron.basekit.standarddesign.terms;

import java.util.List;

record StandardDesignTermLlmResult(
        String question,
        String interpretedIntent,
        List<String> searchKeywords,
        List<StandardTermCandidate> candidates,
        String recommendedTermId,
        String answer,
        String model
) {
}
