# 설계 초안 검토 — HTML v2 디자인 이식 검증 (2026-10-27)

사용자 첨부 `sd-design-draft-review-v2.html`을 참조 대화의 실제 첨부 경로에서 직접 읽었다. 임시 복사본의 HTML을 기존 개발 서버에서 렌더링하고 제품 React 화면과 비교했다. 합성 DTO와 디자인 의뢰 안내·단독 시안 헤더/푸터는 제품에 이식하지 않았다.

## 변경

- `frontend/src/modules/standard-design/ui/pages/DesignReviewPage.tsx`: 컨텍스트 6칸, 이력 선택, 요약, sticky 후보 탐색, 업무영역/프로세스/프로그램 카드, 근거 펼침·Rev 비교, 경고, 원본 4개 접힘 영역.
- 같은 폴더 `designReview.css`: 기준본 네이비·블루·청록·보라 토큰과 카드/본문/반응형 스타일을 `.sd-design-review`에 한정. 공통 workspace와 충돌하지 않는 내부 dr-workspace 사용.
- 기존 GROUP_DESIGN API/DTO/adapter/입력 스냅샷/URL/복귀 로직 그대로 사용. API·DB·공통 Shell/TITLE/Breadcrumb/메뉴/툴바/공통 CSS 변경 없음. 새 저장·편집·승인·실행 기능 없음.

## 실제 URL

http://localhost:5176/baseKit/#/standard-design/design-review?project=SDP-001&group=RG-8407ff295d3f49b995ddad85ff9cd9fe&analysis=GA-cdd0ab6b40e849d99326bdbdfb1e5f7d

## 시각 검증 및 차이

- 내장 브라우저에서 innerWidth 1920/1440/390 실측. 각 너비의 원본 HTML/React 전체 캡처를 저장해 직접 확인했다. 긴 본문 전체를 담기 위해 전체 캡처는 높이 3000, 모바일 4096을 사용했다. 후보 상세는 별도 캡처했다. Edge 캡처/viewport가 불안정해 내장 브라우저로 검증했다.
- 250px 좌측 sticky, 16px 간격, 색상별 왼쪽 선·번호·근거 행, 요약·원본 패널을 기준본과 비교. 실제 데이터의 내용·길이·근거 수가 달라 카드 높이는 다르다. 실제 프로세스 설명은 문장인 경우 문장으로 표시하며 실제 화살표가 있는 경우에만 단계 칩으로 표시한다.
- 제품 기존 Shell/MDI를 유지하므로 시안 단독 헤더와 전체 상단 높이가 다르다. 합성 데이터 안내, 의뢰 가이드, 작업용 푸터는 제외하고 실제 복귀 링크를 제공한다. 원본의 그룹 버전 경고와 근거 Rev 경고를 유지한다.
- 390px에서 본문은 366px, 내부 scrollWidth 366px로 맞췄다. 공통 Shell/body 최소 폭 1280px은 수정하지 않아 전체 페이지 가로 스크롤은 남는다. 독립 HTML과 같은 전체 화면 모바일 인수 완료로 주장하지 않는다.

캡처는 요청 실행 채팅의 outputs에 제공: reference/React 1920·1440·390 full, 후보 상세 1920·1440·390. 원본/제품 합성 데이터를 맞추거나 제품 API를 샘플로 대체하지 않았다.

## 동작 및 회귀

- 실제 선택 분석 직접 진입, 다른 이력 GA-5f25ad76e45b4557ab10a1ea45178778 선택 후 URL/다른 요약, 전체 보기 초기화, 열린 근거 0, 새로고침 후 같은 ID 유지 확인.
- 프로그램 후보만 보기·근거 펼침·분석 당시 본문 표시 확인. 실제 현재 그룹 v15/기준 v13 및 REQ-0391B232-20E 근거 Rev1/현재 Rev3 경고 확인.
- 그룹관리 복귀 후 같은 반품프로세스, 분석 탭과 선택 이력·기존 보고서·실행/새로고침/원본 UI 유지 확인. 실행·저장 버튼은 누르지 않았다.
- 존재하지 않는 분석 ID 직접 URL은 조회 오류를 표시. RUNNING/실패/빈 데이터/권한 오류는 기존 회귀 테스트로 확인하며, 실데이터에 새 분석이나 실패/빈 기록을 만들지 않았다.
- frontend tests 133/133. build/lint/diff 통과. 기존 xlsx import/큰 번들 경고 유지. backend tests 90건, 실패0/오류0/skip12 (격리 H2). 데이터 불변은 변경 코드가 조회·표시에 한정됨을 확인했으며 이번 작업에서 운영 DB 전후 해시는 별도 측정하지 않았다.

## Git 경계

G:/CARON/basekit/sd, sd-work 유지. 시작 HEAD/origin/sd-work 89e3c14, fetch 후 origin/dev-pm d10c9e2. 기존 Draft PR40의 base dev-pm/head sd-work 확인. 기존 2개 커밋은 동일한 설계 초안 검토 기능이며 다른 열린 작업 PR 혼입 없음. backend/data 미추적 보존. 신규 branch/worktree·merge/rebase·dev-pm 수정 없음. PM 승인 전 병합하지 않는다. workroom CURRENT.md는 없었으며 현재 사용자의 구체적인 구현/commit/push/기존 PR 갱신 지시에 따라 진행했다.
