# DESIGN 작업지시 — SD 요구사항 그룹 분석 TAB UX 설계

## 0. 작업 기준
- 저장소: `caronkwon-dotcom/baseKit`
- 작업 브랜치: `design-work`
- 작업 시작 전 최신 `origin/dev-pm` 기준을 확인한다.
- `docs/basekit-branch-integration-rules.md`를 따른다.
- `docs/design/DESIGN-role.md`를 따른다.
- 기존 요구사항 그룹 UX 산출물과 Prototype을 우선 재사용/연결한다.
- 이번 작업은 **상세 구현이 아니라 요구사항 그룹 + 분석 TAB UX 프로토타입/설계**다.
- 실제 API / DB / LLM / Program 생성 / 코드 생성은 구현하지 않는다.
- 제품 코드가 필요하더라도 DESIGN 검토 완료 후 별도 구현 인계안으로 분리한다.

---

# 1. 목적

현재 `요구사항 그룹 관리` 기능은 완료 단계이며, 다음 단계로 **선택된 요구사항 그룹을 LLM으로 분석하는 화면 UX 설계**가 필요하다.

신규 메뉴를 만드는 방향보다는 기존 `요구사항 그룹 관리` 화면 안에서 우측 Detail을 다음처럼 나누는 방향을 우선 검토한다.

```
[요구사항 그룹 목록]

[기본정보] [분석]
```

- `기본정보` TAB: 현재 완료된 요구사항 그룹 관리 화면
- `분석` TAB: 선택한 그룹을 대상으로 LLM 분석 실행 및 결과 조회

핵심:

> 사용자가 별도 메뉴로 이동해서 다시 그룹을 찾지 않고, 선택한 그룹 Context를 그대로 유지한 채 분석 TAB으로 이동한다.

---

# 2. 요구사항 그룹과 분석의 관계

요구사항 그룹은 다음 설계를 위해 함께 볼 Requirement 묶음이다.

```
요구사항 그룹
 ├ REQ-001
 ├ REQ-002
 ├ REQ-005
 └ REQ-008
```

분석은 이 그룹을 입력으로 LLM에 설계 제안을 요청하는 기능이다.

중요:

> 분석은 그룹을 수정하는 기능이 아니다.

Requirement 추가/삭제, 그룹명/설명 변경 등은 `기본정보` TAB에서만 수행한다.

---

# 3. Analysis 기본 개념

Analysis는 **버전 업 개념이 아니다.**

사용자가 분석 버튼을 누를 때마다 독립된 Analysis가 새로 생성된다.

```
ANALYSIS-001
ANALYSIS-002
ANALYSIS-003
```

세 결과는 서로 독립적이다.

최신 Analysis가 이전 Analysis를 자동 대체하지 않는다.

사용자는:
- ANALYSIS-001이 가장 적절하다고 판단할 수도 있고
- ANALYSIS-002의 일부 결과를 참고할 수도 있고
- ANALYSIS-003은 참고하지 않을 수도 있고
- LLM 결과와 무관하게 직접 설계를 진행할 수도 있다.

LLM은 제안자이며 최종 판단은 사용자에게 있다.

---

# 4. Analysis 실행 가능 상태

그룹 상태에 따라 분석 실행 가능 여부를 구분한다.

## DRAFT
분석 실행 불가.

예:
```
요구사항 그룹을 먼저 확정해 주세요.
```

## REVIEW_REQUIRED
분석 실행 불가.

예:
```
포함된 Requirement가 변경되었습니다.
그룹을 재검토 후 다시 확정해 주세요.
```

## CONFIRMED
분석 실행 가능.

```
[새 분석 실행]
```

---

# 5. 분석 실행 시 입력 Snapshot

사용자가 `[새 분석 실행]`을 누르면 그 시점의 그룹 입력을 고정한다.

예:

```
GROUP_ID
GROUP_NAME
GROUP_DESCRIPTION

REQ-001 / Revision 3
REQ-002 / Revision 1
REQ-005 / Revision 4
```

이후 Requirement가 변경되더라도 기존 Analysis 결과는 수정하지 않는다.

기존 Analysis는:

> 당시 입력 Snapshot으로 수행된 독립 분석 결과

로 계속 보존한다.

---

# 6. 분석 TAB 기본 화면 구조

분석 TAB은 크게 두 영역으로 나눈다.

## 상단 — Analysis 실행 및 이력

예:

```
분석 이력                           [새 분석 실행]

ANALYSIS-003   2026-10-07 20:30   검토필요
ANALYSIS-002   2026-10-07 19:10   검토완료
ANALYSIS-001   2026-10-07 18:20   검토완료
```

사용자가 Analysis를 선택하면 하단에 해당 결과를 표시한다.

## 하단 — 선택한 Analysis 결과

기존 설계 방향의 다음 영역을 활용한다.

```
[요약]
[업무구조]
[프로세스]
[Layout 추천]
[Program 후보]
```

기존 분석 결과 데이터 개념:

```
ANALYSIS_SUMMARY
BUSINESS_STRUCTURE
PROCESS_MODEL
LAYOUT_RECOMMENDATION
SD_PROGRAM_CANDIDATES
```

DESIGN에서는 이 결과들을 사용자가 검토하기 쉬운 구조로 프로토타입화한다.

---

# 7. 새 분석 실행 UX

`새 분석 실행` 클릭 시 바로 LLM 호출하지 않고 실행 전 확인 단계를 둔다.

예:

```
분석 대상 그룹
구매요청 처리

포함 Requirement
총 10건

REQ-001 구매요청 등록
REQ-002 구매요청 승인
REQ-003 구매요청 반려
...

그룹 설명
구매요청 등록부터 승인 및 발주 연결까지

[분석 실행]
```

중요:
- 여기서는 Requirement를 수정하지 않는다.
- 그룹 설명을 수정하지 않는다.
- 입력 변경이 필요하면 기본정보 TAB으로 돌아간다.
- 분석 실행 확인 역할만 수행한다.

---

# 8. Analysis 상태

최소 상태:

```
RUNNING
FAILED
REVIEW_REQUIRED
REVIEWED
```

## RUNNING
LLM 분석 실행 중

## FAILED
분석 실행 실패

## REVIEW_REQUIRED
LLM 결과 생성 완료, 사용자 검토 필요

## REVIEWED
사용자가 결과 확인 완료

중요:

> REVIEWED는 “이 Analysis 전체를 최종 설계로 확정”했다는 의미가 아니다.

단순히 사용자가 결과를 검토했다는 의미다.

---

# 9. LLM 결과와 사용자 판단

LLM 결과는 자동 확정되지 않는다.

예:

```
ANALYSIS-001
 → 업무구조 A
 → Process A
 → Layout A
 → Program 후보 A,B

ANALYSIS-002
 → 업무구조 B
 → Process A'
 → Layout B
 → Program 후보 A,C
```

사용자는 여러 Analysis를 비교하고 판단한다.

최종 설계 반영은 이후 별도 단계에서 수행한다.

이번 화면에서는:
- 결과 조회
- 결과 검토
- 여러 Analysis 누적
- 사용자 판단

까지를 중심으로 설계한다.

---

# 10. 여러 Analysis 비교 방향

여러 Analysis를 비교할 수 있는 UX는 중요하다.

다만 V1에서는 복잡한 자동 Diff까지 필수는 아니다.

최소 방향:

```
[Analysis 비교]
```

선택:

```
ANALYSIS-001
vs
ANALYSIS-003
```

비교 대상:
- 업무구조
- 프로세스
- Layout 추천
- Program 후보
- 주요 근거

DESIGN에서는 V1에서 어느 수준까지 자연스럽게 표현할 수 있을지 제안한다.

단순 병렬 조회 방식도 허용한다.

---

# 11. Requirement 변경 후 기존 Analysis

Requirement가 변경되면 그룹은:

```
CONFIRMED
→ REVIEW_REQUIRED
```

로 전환된다.

하지만 기존 Analysis는 삭제하거나 덮어쓰지 않는다.

예:

```
ANALYSIS-001
ANALYSIS-002
```

는 그대로 보존한다.

화면에서는 필요 시:

```
현재 그룹 구성 이전의 입력 기준으로 수행된 분석입니다.
```

같은 안내를 표시할 수 있다.

그룹을 다시 검토하고 CONFIRMED 상태로 전환한 후 새 분석을 실행하면:

```
ANALYSIS-003
```

이 새로 생성된다.

---

# 12. 기본정보 TAB과 분석 TAB 책임 분리

## 기본정보 TAB
- 그룹명
- 그룹 설명
- 상태
- Requirement 구성
- Requirement 직접 추가
- Analysis 근거 기반 추가
- 그룹 확정
- 재검토
- Requirement 제거

## 분석 TAB
- Analysis 이력
- 새 분석 실행
- 실행 상태
- 결과 조회
- 결과 검토
- 여러 Analysis 비교

분석 TAB에서는 그룹 구성 자체를 수정하지 않는다.

---

# 13. 메뉴 구조 방향

현재는 신규 메뉴를 만들기보다 기존 화면에 통합하는 방향을 우선한다.

```
Standard Design
 └ 요구사항 그룹 관리
      ├ 기본정보
      └ 분석
```

이유:
- Analysis는 항상 특정 요구사항 그룹을 기준으로 수행
- 별도 메뉴에서도 결국 그룹을 다시 선택해야 함
- 동일 Context를 유지하는 것이 사용자 흐름상 자연스러움

향후 실제 SD 설계 산출물 관리가 커지면 별도 메뉴 분리는 다시 검토할 수 있다.

---

# 14. V1 DESIGN 범위

이번 DESIGN에서 우선 프로토타입으로 검토할 범위:

- 기본정보 / 분석 TAB 구조
- 선택된 그룹 Context 유지
- 분석 실행 가능/불가 상태
- 새 분석 실행 확인 UX
- Analysis 이력 목록
- RUNNING / FAILED / REVIEW_REQUIRED / REVIEWED 상태
- 분석 결과 5개 영역 표현
- 기존 Analysis 조회
- Requirement 변경 후 과거 Analysis 안내
- 여러 Analysis 비교 진입 UX
- Empty / Loading / Error 상태

---

# 15. 이번 DESIGN에서 제외

이번 설계에서는 다음을 구현 범위로 확정하지 않는다.

- 최종 Program 생성
- 메뉴/Role/Action 자동 생성
- 실제 코드 생성
- Analysis 결과 자동 확정
- 여러 Analysis 결과 자동 병합
- 자동 최적 Analysis 선정
- 복잡한 Diff 엔진
- 신규 설계 결과 자동 DB 반영

---

# 16. UI 표준

반드시 기존 BaseKit 화면 표준을 우선한다.

- 기존 Grid
- BaseTabs
- Toolbar
- Button
- Form
- Modal
- Title / Section Title
- 총건수
- spacing / padding / density

Prototype은 UX 검토용이지만 실제 구현 가능성을 고려한다.

새로운 독자 CSS 체계나 별도 디자인 시스템을 제안하지 않는다.

---

# 17. DESIGN 수행 요청

다음을 실제로 수행한다.

1. 기존 Requirement Group UX 산출물과 Prototype 확인
2. 최신 dev-pm 및 기존 Requirement Analysis 관련 DESIGN 문서 확인
3. 기본정보 / 분석 TAB 통합 UX 설계
4. 선택 그룹 Context 유지 방식 설계
5. DRAFT / REVIEW_REQUIRED / CONFIRMED별 분석 실행 가능/불가 UX
6. 새 분석 실행 확인 흐름 설계
7. Analysis 이력 목록과 상태 UX 설계
8. 결과 5개 영역(요약/업무구조/프로세스/Layout 추천/Program 후보) 프로토타입화
9. 기존 Analysis 조회 UX 설계
10. Requirement 변경 후 과거 Analysis 안내 UX 설계
11. 여러 Analysis 비교 진입 및 V1 비교 방식 제안
12. Empty / Loading / Error / 실패 재시도 / RUNNING UX 설계
13. 미결정 사항 정리
14. SD 구현팀 인계안 작성
15. 브라우저 검수 및 결과 기록

---

# 18. 산출물 기대

최종적으로 최소 다음을 남긴다.

- 수정 Prototype
- 분석 TAB UX 설계서
- 상태별 화면 정의
- 새 분석 실행 흐름
- Analysis 이력 조회 흐름
- 결과 검토 흐름
- 여러 Analysis 비교 방향
- Empty / Loading / Error 처리
- 미결정 사항
- SD 구현팀 인계안
- 검증 결과

핵심 사용자 흐름:

> 그룹을 만든다 → 확정한다 → 같은 화면에서 분석한다 → 여러 Analysis 결과를 축적하고 사람이 판단한다.

---

# 19. 완료 보고

완료 시 다음 형식으로 보고한다.

- 작업 브랜치
- 시작 기준 dev-pm SHA
- 변경 파일 목록
- Prototype commit SHA
- DESIGN 문서/검증 commit SHA
- 제품 코드 변경 여부
- 검증 결과
- 미결정 사항
- SD 구현팀 인계 문서 위치
- dev-pm 반영 필요 여부

DESIGN 내부 산출물과 제품 UI 코드는 commit을 분리한다.
브랜치 전체 merge를 요청하지 않는다.
