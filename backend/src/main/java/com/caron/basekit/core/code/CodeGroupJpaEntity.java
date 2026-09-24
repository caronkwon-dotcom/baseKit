package com.caron.basekit.core.code;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "BSYCDGP")
class CodeGroupJpaEntity extends CoreManagedJpaEntity {

    @Id
    @Column(name = "CODE_GROUP_ID", length = 50)
    private String CODE_GROUP_ID;

    @Column(name = "CODE_GROUP_NAME", nullable = false, length = 100)
    private String CODE_GROUP_NAME;

    @Column(name = "DESCRIPTION", length = 500)
    private String DESCRIPTION;

    protected CodeGroupJpaEntity() {
    }
}
