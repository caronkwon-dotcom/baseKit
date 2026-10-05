package com.caron.basekit.core.endpoint;

import java.util.List;
import java.util.function.Predicate;
import java.util.function.BiPredicate;

public final class EndpointPermissionPolicy {
    private EndpointPermissionPolicy() {}
    public static boolean allowed(List<EndpointMapper.EndpointGrant> grants,
            Predicate<String> hasProgram, BiPredicate<String,String> hasGroup) {
        // UNMAPPED preserves existing behavior. For shared endpoints, one complete grant is enough.
        return grants.isEmpty() || grants.stream().anyMatch(g -> "Y".equals(g.USE_YN())
                && hasProgram.test(g.PROGRAM_KEY())
                && (g.GROUP_CODE()==null || hasGroup.test(g.PROGRAM_KEY(),g.GROUP_CODE())));
    }
}
