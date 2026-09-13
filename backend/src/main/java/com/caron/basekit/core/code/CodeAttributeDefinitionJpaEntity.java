package com.caron.basekit.core.code;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "BSYCADF")
class CodeAttributeDefinitionJpaEntity extends CoreManagedJpaEntity {
    @Id @Column(name = "ATTRIBUTE_DEF_ID", length = 50) private String ATTRIBUTE_DEF_ID;
    @Column(name = "CODE_GROUP_ID", nullable = false, length = 50) private String CODE_GROUP_ID;
    @Column(name = "ATTRIBUTE_CODE", nullable = false, length = 50) private String ATTRIBUTE_CODE;
    @Column(name = "ATTRIBUTE_NAME", nullable = false, length = 100) private String ATTRIBUTE_NAME;
    @Column(name = "DATA_TYPE", nullable = false, length = 20) private String DATA_TYPE;
    @Column(name = "CONTROL_TYPE", nullable = false, length = 30) private String CONTROL_TYPE;
    @Column(name = "DISPLAY_TYPE", nullable = false, length = 20) private String DISPLAY_TYPE;
    @Column(name = "REQUIRED_YN", nullable = false, length = 1, columnDefinition = "CHAR(1)")
    @JdbcTypeCode(SqlTypes.CHAR) private String REQUIRED_YN;
    @Column(name = "DEFAULT_VALUE", length = 1000) private String DEFAULT_VALUE;
    @Column(name = "OPTION_SOURCE", length = 200) private String OPTION_SOURCE;
    @Column(name = "SORT_ORDER", nullable = false) private Integer SORT_ORDER;
}
