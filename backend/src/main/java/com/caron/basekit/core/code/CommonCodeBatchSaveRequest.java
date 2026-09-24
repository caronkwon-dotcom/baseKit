package com.caron.basekit.core.code;
import jakarta.validation.Valid; import jakarta.validation.constraints.NotBlank; import java.util.List;
public record CommonCodeBatchSaveRequest(List<@Valid CommonCodeSaveRequest> INSERTED, List<@Valid CommonCodeSaveRequest> UPDATED, List<@NotBlank String> DELETED) { public CommonCodeBatchSaveRequest { INSERTED = INSERTED == null ? List.of() : List.copyOf(INSERTED); UPDATED = UPDATED == null ? List.of() : List.copyOf(UPDATED); DELETED = DELETED == null ? List.of() : List.copyOf(DELETED); } }
