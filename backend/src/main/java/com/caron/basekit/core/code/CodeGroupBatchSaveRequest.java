package com.caron.basekit.core.code;
import jakarta.validation.Valid; import jakarta.validation.constraints.NotBlank; import java.util.List;
public record CodeGroupBatchSaveRequest(List<@Valid CodeGroupSaveRequest> INSERTED, List<@Valid CodeGroupSaveRequest> UPDATED, List<@NotBlank String> DELETED) { public CodeGroupBatchSaveRequest { INSERTED = INSERTED == null ? List.of() : List.copyOf(INSERTED); UPDATED = UPDATED == null ? List.of() : List.copyOf(UPDATED); DELETED = DELETED == null ? List.of() : List.copyOf(DELETED); } }
