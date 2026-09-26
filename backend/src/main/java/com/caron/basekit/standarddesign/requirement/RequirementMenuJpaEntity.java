package com.caron.basekit.standarddesign.requirement;

import jakarta.persistence.*;
import java.io.Serializable;

@Entity @Table(name="BSDRRMNU") @IdClass(RequirementMenuJpaEntity.Key.class)
class RequirementMenuJpaEntity {
    @Id @Column(name="REQUIREMENT_ID",length=50) private String requirementId;
    @Id @Column(name="MENU_KEY",length=150) private String menuKey;
    static class Key implements Serializable {
        public String requirementId;
        public String menuKey;
        public Key() { }
        @Override public boolean equals(Object other) {
            if (!(other instanceof Key key)) return false;
            return java.util.Objects.equals(requirementId,key.requirementId) && java.util.Objects.equals(menuKey,key.menuKey);
        }
        @Override public int hashCode() { return java.util.Objects.hash(requirementId,menuKey); }
    }
}
