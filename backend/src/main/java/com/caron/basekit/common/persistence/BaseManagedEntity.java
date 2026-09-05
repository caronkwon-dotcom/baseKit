package com.caron.basekit.common.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;

@MappedSuperclass
public abstract class BaseManagedEntity extends BaseEntity {

    @Column(name = "USE_YN", nullable = false, length = 1)
    protected String USE_YN = "Y";

    @Column(name = "DEL_YN", nullable = false, length = 1)
    protected String DEL_YN = "N";
}
