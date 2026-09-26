# ADR-032 BaseFileUpload 공통 컴포넌트

## Status

ACCEPTED — 2026-09-26

## 현재 구조와 문제

Requirement Intake V1은 서버 업로드 API를 갖췄지만 화면이 기능별 파일 선택과 전송 로직을 직접 소유하면 같은 업로드 정책과 진행 상태 처리가 반복된다. 업로드는 요구사항 ID를 아는 업무 화면과 파일 전송을 담당하는 공통 UI/Transport를 분리해야 한다.

## 결정

- `BaseFileUpload`는 숨겨진 native file input, 클릭/drag & drop, 다중 선택, 파일 목록, 진행률, 취소, 실패 재시도, 삭제 버튼을 제공한다. Requirement ID나 도메인 DTO는 알지 못한다.
- `uploadMultipart`는 XHR 기반으로 multipart 업로드 진행률과 `AbortController`에 준하는 실제 취소(`XMLHttpRequest.abort`)를 제공한다. 업로드 URL과 결과 매핑은 업무 모듈의 transport가 소유한다.
- 컴포넌트는 정책 객체로 확장자, MIME, 파일당 최대 크기, 최대 개수, 확장자별 MIME을 받는다. 브라우저 검증은 편의 기능이며 서버의 MIME·내용·크기 검증이 최종 권위다.
- 동시 업로드 기본값은 2이며 각 파일은 독립 상태로 처리한다. 실패한 항목만 재시도하고 성공 항목은 유지한다. 청크, 재개, 클라우드 저장소, 상용 업로드 라이브러리와 OCR/LLM은 V1 범위에 넣지 않는다.
- 이미지 표시만 `BaseImagePreview`로 분리한다. 파일 목록과 서버 첨부 삭제는 업무 화면이 제공하는 callback으로 연결한다.

## 영향범위

Requirement Intake의 첨부 영역은 공통 컴포넌트와 Requirement 전용 transport/panel을 사용한다. 서버는 기존 `BSDRATCH`와 multipart API를 유지하며 정책 조회 API를 추가한다. 향후 다른 업무는 같은 컴포넌트에 자체 업로드 URL과 callback만 연결할 수 있다.

## 검증

`npm run build`, `npm run lint`, `RequirementIntegrationTest`, `git diff --check`를 사용한다. 브라우저에서는 drag & drop, 진행률, 취소, 실패 재시도, 이미지 Preview, 서버 파일 삭제를 확인한다.
