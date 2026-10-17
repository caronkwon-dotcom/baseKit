package com.caron.basekit.core.menuexecution;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
public record MenuExecutionSaveRequest(
 @NotNull @Pattern(regexp="INNER|WINDOW") String EXECUTION_TYPE,
 @NotNull @Pattern(regexp="BASEKIT|LINEAR") String DESIGN_TYPE) {}
