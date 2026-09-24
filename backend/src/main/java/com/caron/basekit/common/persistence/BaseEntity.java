package com.caron.basekit.common.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;

import java.time.OffsetDateTime;

@MappedSuperclass
public abstract class BaseEntity {

    @Column(name = "REG_DT", nullable = false, updatable = false)
    protected OffsetDateTime REG_DT;

    @Column(name = "REG_BY", nullable = false, updatable = false, length = 100)
    protected String REG_BY;

    @Column(name = "MOD_DT", nullable = false)
    protected OffsetDateTime MOD_DT;

    @Column(name = "MOD_BY", nullable = false, length = 100)
    protected String MOD_BY;
}
