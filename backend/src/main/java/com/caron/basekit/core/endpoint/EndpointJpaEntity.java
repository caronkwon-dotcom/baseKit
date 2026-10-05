package com.caron.basekit.core.endpoint;

import jakarta.persistence.*;
import com.caron.basekit.common.persistence.BaseEntity;

/** Schema validation only; operational SQL is owned by EndpointMapper. */
@Entity @Table(name="BSYENDP")
@AttributeOverrides({@AttributeOverride(name="REG_BY",column=@Column(name="REG_BY",nullable=false,length=50)),@AttributeOverride(name="MOD_BY",column=@Column(name="MOD_BY",nullable=false,length=50))})
class EndpointJpaEntity extends BaseEntity {
    @Id @Column(name="ENDPOINT_ID",length=64) private String ENDPOINT_ID;
    @Column(name="HTTP_METHOD",nullable=false,length=10) private String HTTP_METHOD;
    @Column(name="PATH",nullable=false,length=1000) private String PATH;
    @Column(name="CONTROLLER_CLASS",nullable=false,length=500) private String CONTROLLER_CLASS;
    @Column(name="HANDLER_METHOD",nullable=false,length=500) private String HANDLER_METHOD;
    @Column(name="COLLECTION_STATUS",nullable=false,length=10) private String COLLECTION_STATUS;
    protected EndpointJpaEntity() {}
}
