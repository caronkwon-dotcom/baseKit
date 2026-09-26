package com.caron.basekit.standarddesign.requirement;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity @Table(name="BSDRATCH")
class AttachmentJpaEntity {
    @Id @Column(name="ATTACHMENT_ID",length=50) private String id;
    @Column(name="REQUIREMENT_ID",nullable=false,length=50) private String requirementId;
    @Column(name="ORIGINAL_FILE_NAME",nullable=false,length=255) private String originalName;
    @Column(name="STORAGE_KEY",nullable=false,length=100) private String storageKey;
    @Column(name="FILE_TYPE",nullable=false,length=30) private String fileType;
    @Column(name="MIME_TYPE",nullable=false,length=150) private String mimeType;
    @Column(name="FILE_SIZE",nullable=false) private Long fileSize;
    @Column(name="UPLOAD_DT",nullable=false) private OffsetDateTime uploaded;
    @Column(name="ANALYSIS_STATUS",nullable=false,length=30) private String analysisStatus;
}
