package com.caron.basekit.standarddesign.requirement;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity @Table(name = "BSDRREQ")
class RequirementJpaEntity {
    @Id @Column(name="REQUIREMENT_ID",length=50) private String id;
    @Column(name="PROJECT_ID",nullable=false,length=50) private String projectId;
    @Column(name="REQUIREMENT_NAME",nullable=false,length=200) private String name;
    @Column(name="REQUIREMENT_TYPE_CODE",nullable=false,length=50) private String type;
    @Column(name="DESCRIPTION",nullable=false,length=10000) private String description;
    @Column(name="PROCESS_DESCRIPTION",nullable=false,length=10000) private String processDescription;
    @Column(name="STATUS",nullable=false,length=30) private String status;
    @Column(name="LEGACY_WBS_IDS",length=2000) private String legacyWbs;
    @Column(name="LEGACY_SCREEN_IDS",length=2000) private String legacyScreens;
    @Column(name="LEGACY_TABLE_IDS",length=2000) private String legacyTables;
    @Column(name="LEGACY_SOURCE_ID",length=100) private String legacyId;
    @Column(name="REG_DT",nullable=false) private OffsetDateTime registered;
    @Column(name="REG_BY",nullable=false,length=50) private String registeredBy;
    @Column(name="MOD_DT",nullable=false) private OffsetDateTime modified;
    @Column(name="MOD_BY",nullable=false,length=50) private String modifiedBy;
}
