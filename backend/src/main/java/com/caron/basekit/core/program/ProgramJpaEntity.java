package com.caron.basekit.core.program;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;

@Entity
@Table(name = "BSYPROG")
class ProgramJpaEntity {
    @Id @Column(name = "PROGRAM_ID", length = 50) private String PROGRAM_ID;
    @Column(name = "PROGRAM_KEY", nullable = false, unique = true, length = 100) private String PROGRAM_KEY;
    @Column(name = "PROGRAM_NAME", nullable = false, length = 100) private String PROGRAM_NAME;
    @Column(name = "MODULE_CODE", nullable = false, length = 50) private String MODULE_CODE;
    @Column(name = "PROGRAM_TYPE_CODE", nullable = false, length = 50) private String PROGRAM_TYPE_CODE;
    @Column(name = "ROUTE", nullable = false, length = 255) private String ROUTE;
    @Column(name = "DESCRIPTION", length = 500) private String DESCRIPTION;
    @Column(name = "USE_YN", nullable = false, length = 1, columnDefinition = "CHAR(1)") @JdbcTypeCode(SqlTypes.CHAR) private String USE_YN;
    @Column(name = "DEL_YN", nullable = false, length = 1, columnDefinition = "CHAR(1)") @JdbcTypeCode(SqlTypes.CHAR) private String DEL_YN;
    @Column(name = "REG_DT", nullable = false) private OffsetDateTime REG_DT;
    @Column(name = "REG_BY", nullable = false, length = 50) private String REG_BY;
    @Column(name = "MOD_DT", nullable = false) private OffsetDateTime MOD_DT;
    @Column(name = "MOD_BY", nullable = false, length = 50) private String MOD_BY;
    protected ProgramJpaEntity() { }
}
