package com.caron.basekit.core.endpoint;

import jakarta.persistence.*;
import com.caron.basekit.common.persistence.BaseEntity;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.io.Serializable;
import java.util.Objects;

@Entity @Table(name="BSYBTGP") @IdClass(ButtonGroupJpaEntity.Key.class)
@AttributeOverrides({@AttributeOverride(name="REG_BY",column=@Column(name="REG_BY",nullable=false,length=50)),@AttributeOverride(name="MOD_BY",column=@Column(name="MOD_BY",nullable=false,length=50))})
class ButtonGroupJpaEntity extends BaseEntity {
    @Id @Column(name="PROGRAM_ID",length=50) private String PROGRAM_ID;
    @Id @Column(name="GROUP_CODE",length=100) private String GROUP_CODE;
    @Column(name="GROUP_TYPE",nullable=false,length=10) private String GROUP_TYPE;
    @Column(name="GROUP_NAME",nullable=false,length=100) private String GROUP_NAME;
    @Column(name="DESCRIPTION",length=500) private String DESCRIPTION;
    @Column(name="USE_YN",nullable=false,columnDefinition="CHAR(1)",length=1) @JdbcTypeCode(SqlTypes.CHAR) private String USE_YN;
    protected ButtonGroupJpaEntity() {}
    public static class Key implements Serializable {
        public String PROGRAM_ID;
        public String GROUP_CODE;
        public Key() {}
        @Override public boolean equals(Object other) { return other instanceof Key key && Objects.equals(PROGRAM_ID,key.PROGRAM_ID) && Objects.equals(GROUP_CODE,key.GROUP_CODE); }
        @Override public int hashCode() { return Objects.hash(PROGRAM_ID,GROUP_CODE); }
    }
}
