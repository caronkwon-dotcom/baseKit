package com.caron.basekit.core.endpoint;

import jakarta.persistence.*;
import com.caron.basekit.common.persistence.BaseEntity;
import java.io.Serializable;
import java.util.Objects;

@Entity @Table(name="BSYPREP") @IdClass(ProgramEndpointJpaEntity.Key.class)
@AttributeOverrides({@AttributeOverride(name="REG_BY",column=@Column(name="REG_BY",nullable=false,length=50)),@AttributeOverride(name="MOD_BY",column=@Column(name="MOD_BY",nullable=false,length=50))})
class ProgramEndpointJpaEntity extends BaseEntity {
    @Id @Column(name="PROGRAM_ID",length=50) private String PROGRAM_ID;
    @Id @Column(name="ENDPOINT_ID",length=64) private String ENDPOINT_ID;
    @Column(name="GROUP_CODE",length=100) private String GROUP_CODE;
    protected ProgramEndpointJpaEntity() {}
    public static class Key implements Serializable {
        public String PROGRAM_ID;
        public String ENDPOINT_ID;
        public Key() {}
        @Override public boolean equals(Object other) { return other instanceof Key key && Objects.equals(PROGRAM_ID,key.PROGRAM_ID) && Objects.equals(ENDPOINT_ID,key.ENDPOINT_ID); }
        @Override public int hashCode() { return Objects.hash(PROGRAM_ID,ENDPOINT_ID); }
    }
}
