package com.caron.basekit.core.code;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "BSYCMCD", uniqueConstraints = @UniqueConstraint(
        name = "UK_BSYCMCD_GROUP_CODE", columnNames = {"CODE_GROUP_ID", "CODE"}))
class CommonCodeJpaEntity extends CoreManagedJpaEntity {

    @Id
    @Column(name = "CODE_ID", length = 50)
    private String CODE_ID;

    @Column(name = "CODE_GROUP_ID", nullable = false, length = 50)
    private String CODE_GROUP_ID;

    @Column(name = "CODE", nullable = false, length = 50)
    private String CODE;

    @Column(name = "CODE_NAME", nullable = false, length = 100)
    private String CODE_NAME;

    @Column(name = "SORT_ORDER", nullable = false)
    private Integer SORT_ORDER;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CODE_GROUP_ID", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "FK_BSYCMCD_CODE_GROUP"))
    private CodeGroupJpaEntity CODE_GROUP;

    protected CommonCodeJpaEntity() {
    }
}
