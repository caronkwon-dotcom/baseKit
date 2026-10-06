# DESIGN 작업지시 — SD 요구사항 그룹 UX 재설계

## 0. 작업 기준
- 작업 브랜치: `design-work`
- 최신 `origin/dev-pm` 기준을 먼저 확인한다.
- `docs/design/DESIGN-role.md` 역할/완료 기준을 따른다.
- `docs/basekit-branch-integration-rules.md` 브랜치 통합 원칙을 따른다.
- 이번 작업은 **DESIGN 설계/프로토타입 작업**이다.
- 실제 API / DB / LLM 구현은 하지 않는다.
- 제품 코드가 필요한 경우에도 DESIGN 검토 완료 후 별도 구현 인계안을 작성한다.

---

## 1. 목적

`요구사항 그룹`은 다음 설계 단계에서 함께 보고 판단해야 하는 Requirement들을 하나의 분석 Context로 묶는 기능이다.

이 메뉴에서는 화면/프로세스/Program 설계를 수행하지 않는다.

핵심 원칙:

> 어떤 Requirement들을 다음 설계 단계에서 함께 볼 것인지 사용자가 최종 결정한다.

LLM Analysis는 그룹을 자동 생성하거나 확정하지 않는다.
LLM은 추천자이고 최종 판단자는 사용자다.

---

## 2. 전체 흐름

```
요구사항 관리
    ↓
Requirement Analysis
- 특정 Requirement 기준
- 함께 검토할 Requirement 후보를 LLM이 제안
- 실행할 때마다 독립 Analysis 결과 생성
    ↓
요구사항 그룹
- Requirement 직접 선택
- 여러 Analysis 결과를 참고하여 일부 Requirement 선택
- 사용자가 최종 묶음 구성
    ↓
그룹 확정
    ↓
다음 단계: 요구사항 그룹 분석 / 설계
```

---

## 3. 그룹의 책임

그룹에 최종적으로 확정되는 것은 Requirement 목록이다.

예:

```
구매요청 처리 그룹

REQ-001 구매요청 등록
REQ-004 구매요청 승인
REQ-007 구매요청 반려
REQ-010 발주 생성
```

이번 메뉴에서 하지 않는 것:

- 업무 프로세스 설계
- 화면 설계
- 메뉴 설계
- Layout 추천
- Role / Action 설계
- SD Program 후보 생성

위 기능은 다음 `요구사항 그룹 분석/설계` 단계의 책임이다.

---

## 4. 그룹 구성 경로

### A. 요구사항에서 직접 추가

사용자가 전체 Requirement 목록을 조회하고 직접 선택한다.

```
[요구사항에서 추가]

☑ REQ-001
☑ REQ-007
☑ REQ-010

→ 그룹에 추가
```

이 경우 AI 근거는 없다.

개념:
```
SOURCE_TYPE = HUMAN
SOURCE_ANALYSIS_ID = NULL
```

UI에는 내부 코드 `HUMAN`을 그대로 노출하지 말고 "직접 추가" 등 사용자 언어로 표현한다.

### B. Analysis 결과에서 추가

Analysis 전체를 그룹에 넣는 개념이 아니다.

여러 독립 Analysis를 탐색한 뒤, 각 Analysis 안에서 필요한 Requirement만 선택해서 그룹에 추가한다.

예:

```
ANALYSIS-001
→ REQ-002
→ REQ-004
→ REQ-005

ANALYSIS-002
→ REQ-002
→ REQ-006
→ REQ-008

ANALYSIS-003
→ REQ-004
→ REQ-010
```

사용자 선택 예:
```
ANALYSIS-001에서 REQ-002 선택
ANALYSIS-003에서 REQ-010 선택
REQ-007은 사람이 직접 추가
```

최종 그룹:
```
REQ-002 ← ANALYSIS-001 근거
REQ-010 ← ANALYSIS-003 근거
REQ-007 ← 직접 추가
```

---

## 5. Analysis 의미

`ANALYSIS-001/002/003`은 버전 관계가 아니라 각각 독립된 LLM 실행 결과다.

- 최신 Analysis가 이전 Analysis를 자동 대체하지 않는다.
- 첫 번째 결과가 더 적절할 수 있다.
- 여러 Analysis에서 일부만 골라 사용할 수 있다.
- 모든 Analysis를 참고만 하고 사람이 직접 구성할 수도 있다.

DESIGN은 UX에서 이 독립성을 명확히 보여줘야 한다.

---

## 6. 기본 화면 구조

기존 Requirement Group Prototype을 재검토하되 BaseKit 실제 화면 표준을 우선한다.

### 좌측 — 요구사항 그룹 목록
예상 항목:
- 그룹명
- 요구사항 수
- 상태
- AI 활용 여부
- 수정일

### 우측 상단 — 그룹 기본정보
- 요구사항 그룹명
- 그룹 설명
- 상태
- 요구사항 수

### 우측 하단 — 그룹 포함 요구사항
- 요구사항 ID
- 요구사항명
- 요구유형
- 포함 사유
- 추가 출처
- Analysis 근거
- 제거 Action

Toolbar 주요 Action은 다음 두 경로가 명확히 구분되게 설계한다.

```
[요구사항에서 추가] [Analysis에서 추가]
```

기존 `[행 추가]`, `[AI 관련 요구사항 추천]` 표현은 사용하지 않는다.

---

## 7. Analysis에서 추가 UX

사용자가 여러 Analysis 결과를 탐색하고 비교한 뒤 일부 Requirement만 선택할 수 있어야 한다.

권장 출발 구조:

```
┌ Analysis 목록 ───────┬ 선택 Analysis 내용 ──────────────┐
│ ANALYSIS-001         │ 기준: REQ-001 구매요청 등록      │
│ ANALYSIS-002         │                                  │
│ ANALYSIS-003         │ ☐ REQ-002 구매요청 승인          │
│                      │    승인 흐름 연결                 │
│                      │ ☐ REQ-004 구매요청 반려          │
│                      │    승인 예외 흐름                 │
└──────────────────────┴───────────────────────────────────┘
```

단, 위 레이아웃은 강제안이 아니다.
DESIGN 수행팀이 더 나은 비교/탐색 UX를 제안할 수 있다.

필수 UX 조건:
- Analysis 여러 건 탐색 가능
- Analysis마다 기준 Requirement 확인 가능
- 추천 Requirement와 추천 사유 확인 가능
- Analysis별로 일부 Requirement만 선택 가능
- 여러 Analysis에서 선택한 항목을 누적 가능
- 최종 추가 전 선택 항목과 출처 확인 가능
- AI 추천 결과 자동 반영/자동 확정 금지

---

## 8. Requirement / Analysis 근거 표현

그룹 Grid에서 출처는 사용자 관점의 표현을 사용한다.

예:

```
추가 출처        Analysis 근거
직접 추가        -
Analysis         ANALYSIS-001
Analysis         ANALYSIS-003
```

Analysis 근거를 선택/조회했을 때 최소한 다음 맥락을 확인할 수 있어야 한다.

- Analysis ID
- 기준 Requirement
- 해당 Requirement가 추천된 사유

Analysis 결과 원문 전체를 그룹 데이터로 복제하는 UX는 지양한다.
핵심은 "왜 이 Requirement가 그룹에 포함되었는지 추적 가능"한 것이다.

---

## 9. Requirement와 Group 관계

Requirement는 여러 그룹에 포함될 수 있다.

```
REQ-001
 ├ 구매요청 그룹
 ├ 승인 프로세스 그룹
 └ 발주 연계 그룹
```

다음 두 개념을 절대 혼동하지 않는다.

- Requirement Relation = 업무 관계
- Requirement Group = 다음 설계를 위해 함께 볼 분석 Context

UI 용어/탭/설명에서도 구분한다.

---

## 10. Requirement 변경과 그룹 상태

그룹은 Requirement 특정 버전이 아니라 대표 `REQUIREMENT_ID`를 참조하는 개념이다.

포함 Requirement가 수정/폐기되는 경우:

```
Requirement 변경
    ↓
해당 Requirement가 포함된 그룹 조회
    ↓
그룹 상태 = 재검토 필요
```

기존 그룹 구성은 자동 삭제/자동 변경하지 않는다.

사용자는 변경 내용을 확인한 뒤:
- 그룹 구성 수정 후 다시 확정
- 영향 없음 판단 후 그대로 다시 확정

할 수 있어야 한다.

핵심 원칙:

> 기존 산출물 유지 + 검토 Gate 재오픈

과거 단계 롤백 UX로 설계하지 않는다.

---

## 11. 그룹 상태

최소 상태:
- 작성중
- 확정
- 재검토 필요

### 작성중
- 그룹 구성 편집 가능

### 확정
- 다음 요구사항 그룹 분석/설계 단계 입력으로 사용 가능

### 재검토 필요
- 포함 Requirement 변경 등으로 기존 확정 내용의 재검토가 필요한 상태
- 변경 내용 확인 후 다시 확정해야 최신 Context로 사용 가능

DESIGN은 각 상태별:
- 표시
- 편집 가능 여부
- 주요 Action
- 안내 Message
- Empty / Error / Loading / 미저장 변경
을 정의한다.

---

## 12. Requirement 상세 연결

Requirement 상세의 `연관정보`에서는 그룹 자체를 편집하지 않는다.

예:

```
이 요구사항이 포함된 그룹

- 구매요청 처리
- 발주 연계

[요구사항 그룹에서 관리]
```

실제 그룹 구성은 `요구사항 그룹 관리` 메뉴에서 수행한다.

---

## 13. BaseKit UI 원칙

실제 화면 설계 시 기존 BaseKit 표준을 우선한다.

- BaseKit 공통 CSS / spacing / padding / density
- 기존 Grid 규격
- Title / Section Title
- 목록/그리드 총건수
- Toolbar / Action / Tab / Modal
- Master-Detail / Workspace 표준
- 공통 Component 우선 사용
- responsive / overflow / focus / keyboard 접근성

프로토타입은 UX 검토용이며 제품 화면 규격을 새로 정의하는 수단이 아니다.

---

## 14. DESIGN 수행 요청

다음을 실제로 수행한다.

1. 기존 Requirement Group Prototype / 관련 DESIGN 문서 / 최신 dev-pm 구현 상태 확인
2. 현행과 이번 인수인계의 차이 분석
3. Requirement Group UX 재설계
4. `요구사항에서 추가` 흐름 설계
5. `Analysis에서 추가` 흐름 및 여러 Analysis 탐색/비교 UX 설계
6. HUMAN/Analysis 출처와 근거 표현 설계
7. 작성중/확정/재검토 필요 상태 UX 설계
8. Requirement 변경 → 재검토 Gate UX 설계
9. Requirement 상세 → 포함 그룹 조회/이동 UX 설계
10. Empty / Error / Loading / 미저장 변경 UX 설계
11. 수정 Prototype 작성
12. UX 설계서 및 주요 화면 흐름 작성
13. 미결정 사항을 명시
14. SD 개발팀에 전달할 구현 인계안 작성

DESIGN 수행팀이 상세 구현 방법, Prototype 제작 방식, Codex 작업지시 구조를 결정한다.

---

## 15. 산출물 기대

최종적으로 최소 다음을 남긴다.

- 수정 Prototype
- UX 설계서
- 주요 화면 흐름
- 상태 정의
- 직접 추가 흐름
- Analysis 기반 추가 흐름
- 그룹 확정/재검토 흐름
- Requirement 상세 연결 UX
- Empty / Error / Loading / 미저장 변경 정의
- 미결정 사항
- SD 개발팀 구현 인계안
- 검증 결과

제품 코드 구현은 DESIGN 승인 이후 별도 결정한다.

---

## 16. 완료 보고

완료 시 다음 형식으로 보고한다.

- 작업 브랜치
- 시작 기준 dev-pm SHA
- 변경 파일 목록
- DESIGN 문서/Prototype commit SHA
- 제품 코드 변경 여부
- 검증 결과
- 미결정 사항
- SD 개발팀 인계 문서 위치
- dev-pm 반영 필요 여부

브랜치 전체 merge를 요청하지 않는다.
제품 반영이 필요한 경우 제품 코드 commit과 DESIGN 내부 산출물 commit을 분리해서 보고한다.
