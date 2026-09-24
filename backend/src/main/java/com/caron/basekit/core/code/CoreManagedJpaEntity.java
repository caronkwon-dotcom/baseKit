package com.caron.basekit.core.code;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@MappedSuperclass
abstract class CoreManagedJpaEntity {

    @Column(name = "USE_YN", nullable = false, length = 1, columnDefinition = "CHAR(1)")
    @JdbcTypeCode(SqlTypes.CHAR)
    protected String USE_YN;

    @Column(name = "DEL_YN", nullable = false, length = 1, columnDefinition = "CHAR(1)")
    @JdbcTypeCode(SqlTypes.CHAR)
    protected String DEL_YN;

    @Column(name = "REG_DT", nullable = false)
    protected OffsetDateTime REG_DT;

    @Column(name = "REG_BY", nullable = false, length = 50)
    protected String REG_BY;

    @Column(name = "MOD_DT", nullable = false)
    protected OffsetDateTime MOD_DT;

    @Column(name = "MOD_BY", nullable = false, length = 50)
    protected String MOD_BY;
}
