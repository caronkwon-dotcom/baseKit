package com.caron.basekit.common.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;

import java.time.OffsetDateTime;

@MappedSuperclass
public abstract class BaseEntity {

    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    protected OffsetDateTime CREATED_AT;

    @Column(name = "CREATED_BY", nullable = false, updatable = false, length = 100)
    protected String CREATED_BY;

    @Column(name = "UPDATED_AT", nullable = false)
    protected OffsetDateTime UPDATED_AT;

    @Column(name = "UPDATED_BY", nullable = false, length = 100)
    protected String UPDATED_BY;
}
