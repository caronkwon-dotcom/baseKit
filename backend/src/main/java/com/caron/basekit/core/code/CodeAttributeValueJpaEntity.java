package com.caron.basekit.core.code;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@IdClass(CodeAttributeValueId.class)
@Table(name = "BSYCAVL")
class CodeAttributeValueJpaEntity {
    @Id @Column(name = "CODE_ID", length = 50) private String CODE_ID;
    @Id @Column(name = "ATTRIBUTE_DEF_ID", length = 50) private String ATTRIBUTE_DEF_ID;
    @Column(name = "ATTRIBUTE_VALUE", length = 1000) private String ATTRIBUTE_VALUE;
    @Column(name = "DEL_YN", nullable = false, length = 1, columnDefinition = "CHAR(1)")
    @JdbcTypeCode(SqlTypes.CHAR) private String DEL_YN;
    @Column(name = "REG_DT", nullable = false) private OffsetDateTime REG_DT;
    @Column(name = "REG_BY", nullable = false, length = 50) private String REG_BY;
    @Column(name = "MOD_DT", nullable = false) private OffsetDateTime MOD_DT;
    @Column(name = "MOD_BY", nullable = false, length = 50) private String MOD_BY;
}
