# 브라우저 검증 결과

2026-10-07 · DESIGN Prototype 검증 / 제품 연동 검증과 분리

## 기준과 판정

- 시작 dev-pm: `a2c60889036a0275dfdef3a62b7a6df6393c1c64`.
- 작업지시: `618e94ce5d05a6a7fd506916025f9b7989f249e3`.
- Prototype commit: `ef147d46cf18b20f672fcdfaec2ac37f326716f0`.
- 실행 환경: Windows, 설치된 Chrome `154.0.8037.98`, Playwright headless, 로컬 정적 HTTP 서버.
- 분석 TAB 검증 **67항목 통과**, 기존 그룹 회귀 **83항목 통과**, page JavaScript 오류 **0건**.
- 판정: 요구된 UX 범위의 DESIGN 검토 Prototype 통과. 제품 그룹 분석 API/DB/LLM 동작 완료 판정은 아니다.

## 브라우저 검증 범위

| 범위 | 실제 확인 | 결과 |
|---|---|---|
| Context / 책임 | TAB 왕복 그룹·초안·선택 Analysis 보존, 검색 밖 선택, 그룹 전환 이력 분리, 새 그룹 기본정보 복귀, 분석에 구성 편집 없음 | 통과 |
| Gate | DRAFT 차단, CONFIRMED 실행, Requirement 변경 REVIEW_REQUIRED 차단, 미저장 차단 | 통과 |
| Snapshot | 읽기 전용 그룹/Revision/설계 의견, 취소 실행 없음, 확인 중 상태·입력 변경 차단, 실행 접수 실패 입력 유지 | 통과 |
| 실행 / 실패 | 새 독립 RUNNING, 완료/실패 예시, FAILED 원본 보존·새 ID 재시도, 응답 유실 신규 실행 잠금·상태 조회 | 통과 |
| 결과 / 검토 | 5영역 조회, 과거 입력 배너·Snapshot 보존, 명시적 검토/실패/재시도, 검토 후 그룹 상태 보존, 영역 Empty/전체 결과 누락 | 통과 |
| 조회 예외 | 이력/결과 Loading·Error, 재조회가 새 실행을 만들지 않음, 이력 Empty 안내 | 통과 |
| 비교 | 동일 그룹 완료 2건·독립 쌍, RUNNING/FAILED 제외, 입력 차이, 5영역 병렬, 한쪽 Error 격리/쌍 보존·재조회 | 통과 |
| 키보드 | 상세/결과 TAB 방향키·End·roving focus, native dialog Tab 내부 유지/Escape/trigger 복귀 | 통과 |
| 화면 크기 / 긴 내용 | 분석 1920/1440/1280/768/320px, 외곽 가로 overflow 없음, Snapshot Modal 뷰포트 내부, 320px 비교 1열·긴 이름/요약 | 통과 |
| 기존 그룹 회귀 | 직접/추천 근거 선택·누적 basket·출처/중복·미저장 보호·저장/충돌·확정·변경 검토·상세 연결·dialog/화면 크기 | 83항목 통과 |

분석/비교 화면 1440px와 비교 320px, 기존 추천 추가 Modal을 이미지로 열어 육안 확인했다. 외곽 overflow 대신 Grid 안 스크롤, Title/총건수/Toolbar, 좁은 화면 버튼 줄바꿈, 양쪽 Analysis 식별을 확인했다. 비교 Grid의 긴 출처는 내부 가로 스크롤로 읽는다. 720×450 기존 회귀는 축소된 CSS 뷰포트 검사이며 실제 브라우저 200% zoom 검증이 아니다.

증거: `browser-results.json`(67항목), `group-browser-results.json`(83항목), `evidence/analysis-1440.png`, `evidence/comparison-1440.png`, `evidence/comparison-320.png`. 기존 그룹 회귀는 원 `../sd-requirement-group/reviews/verify.cjs`의 assertion을 재사용하고 정적 asset 제공/출력 위치/검증일·기준만 wrapper에서 바꿨다.

## 최신 dev-pm 참조 검증

제품 코드 변경이 없어 아래 검증은 최신 제품 기준 checkout의 기존 회귀 확인이며 신규 그룹 분석 구현 테스트가 아니다. detached dev-pm `a2c6088`에서 수행했고 저장소 변경 없음.

| 명령 / 범위 | 결과 |
|---|---|
| npm run build | 통과 |
| npm run lint | 통과 |
| node --test frontend/tests/*.test.mjs | 55/55 통과 |
| npm run backend:test | BUILD SUCCESS, 51건 중 46건 통과/조건부 5건 skip, failure/error 0 |
| git diff --check (DESIGN 변경) | 통과 |

Backend 최초 시도는 Maven home이 `C:/.m2`로 해석되어 접근 실패했다. 작업 폴더의 JAVA user.home/Maven cache로 옮겨 다시 실행해 통과했다. 외부 PostgreSQL이나 실제 회사 LLM 검증으로 대체하지 않는다.

## 재현

설치된 Node/Playwright와 Chrome을 사용한다. bundled dependency 환경에서는 NODE_PATH를 bundled node_modules로 지정한다. 저장소 루트에서:

```powershell
node docs/design/sd-requirement-group-analysis/reviews/verify.cjs <검증출력폴더>
node docs/design/sd-requirement-group-analysis/reviews/group-regression.cjs <회귀출력폴더>
```

첫 스크립트는 127.0.0.1:18762, 회귀는 18761의 임시 정적 서버를 열고 종료한다. 생성 캡처는 지정 출력 폴더에만 저장한다. Prototype는 `docs/design/sd-requirement-group/Prototype.html`을 열어 검토하며 하단 상태 제어는 제품에 포함하지 않는다.

## 미검증 / SD 제품 재검수

실 회사 LLM, 실제 그룹 분석 API/DB, 요청 멱등성·서버 최신성/경합, 새로고침/MDI 재진입 후 작업 복구, 실제 Runtime 권한, PostgreSQL, 제품 BaseTabs 키보드/실 FormModal focus, 우 Detail 공통 연결점은 미검증이다. 기존 제품 build/test 성공 또는 Prototype 모사 통과를 이 항목의 완료 근거로 쓰지 않는다. 미결정 사항은 open-decisions A01~A10을 따른다. 이번에 제품 코드를 변경하지 않았으므로 dev-pm 반영할 UI commit은 없다.
