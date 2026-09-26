package com.caron.basekit.standarddesign.requirement;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.*;
import java.util.zip.ZipFile;

@Component
class AttachmentUploadPolicy {
    private static final Map<String, String> MIME_BY_EXTENSION = Map.of(
        "png", "image/png", "jpg", "image/jpeg", "jpeg", "image/jpeg", "webp", "image/webp",
        "pdf", "application/pdf", "txt", "text/plain",
        "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    private final long maxFileSize;
    private final long maxRequestSize;
    private final int maxFiles;

    AttachmentUploadPolicy(
        @Value("${standard-design.requirements.upload.max-file-size:20MB}") DataSize maxFileSize,
        @Value("${standard-design.requirements.upload.max-request-size:21MB}") DataSize maxRequestSize,
        @Value("${standard-design.requirements.upload.max-files:20}") int maxFiles) {
        this.maxFileSize = maxFileSize.toBytes();
        this.maxRequestSize = maxRequestSize.toBytes();
        this.maxFiles = maxFiles;
    }
    AttachmentPolicyData describe() {
        return new AttachmentPolicyData(maxFileSize, maxRequestSize, maxFiles,
            MIME_BY_EXTENSION.keySet().stream().sorted().toList(),
            MIME_BY_EXTENSION.values().stream().distinct().sorted().toList(), MIME_BY_EXTENSION);
    }
    String validateMetadata(MultipartFile file, String extension, int existingCount) {
        if (file.isEmpty()) throw new IllegalArgumentException("빈 파일은 업로드할 수 없습니다.");
        if (file.getSize() > maxFileSize) throw new IllegalArgumentException("파일 크기 제한을 초과했습니다.");
        if (existingCount >= maxFiles) throw new IllegalArgumentException("첨부파일 개수 제한을 초과했습니다.");
        String expected = MIME_BY_EXTENSION.get(extension);
        if (expected == null) throw new IllegalArgumentException("허용되지 않은 파일 확장자입니다.");
        if (!expected.equalsIgnoreCase(Objects.toString(file.getContentType(), "")))
            throw new IllegalArgumentException("파일 형식과 MIME Type이 일치하지 않습니다.");
        return expected;
    }
    void validateContent(Path path, String extension) throws IOException {
        byte[] header;
        try (var input = java.nio.file.Files.newInputStream(path)) { header = input.readNBytes(12); }
        boolean valid = switch (extension) {
            case "png" -> startsWith(header, 0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a);
            case "jpg", "jpeg" -> startsWith(header, 0xff,0xd8,0xff);
            case "webp" -> startsWith(header, 0x52,0x49,0x46,0x46) && at(header,8,0x57,0x45,0x42,0x50);
            case "pdf" -> startsWith(header, 0x25,0x50,0x44,0x46,0x2d);
            case "docx", "xlsx" -> officePackage(path, extension, header);
            case "txt" -> textFile(path);
            default -> false;
        };
        if (!valid) throw new IllegalArgumentException("파일 내용이 선택한 형식과 일치하지 않습니다.");
    }
    private static boolean startsWith(byte[] bytes, int... expected) { return at(bytes, 0, expected); }
    private static boolean at(byte[] bytes, int offset, int... expected) {
        if (bytes.length < offset + expected.length) return false;
        for (int i=0; i<expected.length; i++) if ((bytes[offset+i] & 0xff) != expected[i]) return false;
        return true;
    }
    private static boolean officePackage(Path path, String extension, byte[] header) throws IOException {
        if (!startsWith(header,0x50,0x4b,0x03,0x04)) return false;
        try (ZipFile zip = new ZipFile(path.toFile())) {
            return zip.getEntry("[Content_Types].xml") != null &&
                (extension.equals("docx") ? zip.getEntry("word/document.xml") != null : zip.getEntry("xl/workbook.xml") != null);
        } catch (java.util.zip.ZipException e) { return false; }
    }
    private static boolean textFile(Path path) throws IOException {
        byte[] bytes = java.nio.file.Files.readAllBytes(path);
        for (byte value : bytes) if (value == 0) return false;
        try {
            java.nio.charset.StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(java.nio.charset.CodingErrorAction.REPORT).decode(java.nio.ByteBuffer.wrap(bytes));
            return true;
        } catch (java.nio.charset.CharacterCodingException e) { return false; }
    }
}
