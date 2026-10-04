package com.caron.basekit.core.menu;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "BSYMENU")
class MenuJpaEntity {
    @Id
    @Column(name = "MENU_KEY", length = 100)
    private String MENU_KEY;

    @Column(name = "MENU_NAME", nullable = false, length = 100)
    private String MENU_NAME;

    @Column(name = "PARENT_MENU_KEY", length = 100)
    private String PARENT_MENU_KEY;

    @Column(name = "MENU_TYPE_CODE", nullable = false, length = 50)
    private String MENU_TYPE_CODE;

    @Column(name = "SORT_ORDER", nullable = false)
    private Integer SORT_ORDER;

    @Column(name = "PROGRAM_KEY", length = 100)
    private String PROGRAM_KEY;

    @Column(name = "USE_YN", nullable = false, length = 1, columnDefinition = "CHAR(1)")
    @JdbcTypeCode(SqlTypes.CHAR)
    private String USE_YN;

    @Column(name = "DEL_YN", nullable = false, length = 1, columnDefinition = "CHAR(1)")
    @JdbcTypeCode(SqlTypes.CHAR)
    private String DEL_YN;

    @Column(name = "REG_DT", nullable = false)
    private OffsetDateTime REG_DT;

    @Column(name = "REG_BY", nullable = false, length = 50)
    private String REG_BY;

    @Column(name = "MOD_DT", nullable = false)
    private OffsetDateTime MOD_DT;

    @Column(name = "MOD_BY", nullable = false, length = 50)
    private String MOD_BY;

    protected MenuJpaEntity() {
    }
}
