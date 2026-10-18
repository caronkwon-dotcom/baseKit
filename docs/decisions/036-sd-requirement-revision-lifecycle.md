# ADR 036: SD 요구사항 Revision·폐기·첨부 이력

- 일자: 2026-10-18
- 상태: 사용자 정책 승인, SD 구현·격리 검증, 공유 PostgreSQL 적용 전
- 작업 환경: sd / sd-work. dev-pm 통합과 COMMON 반영은 검수 후 별도 단계.

## 결정

논리 ID는 기존 API/DB 명칭 REQUIREMENT_ID를 그대로 사용한다. BSDRREQ는 후속 그룹·분석이 조회하는 현행 projection이다. BSDRCHG는 동일 ID의 변경 초안/확정/취소 기록이며, BSDRRHIS의 기존 snapshot은 수정하지 않는다. 미참조 DRAFT만 기존 저장을 허용한다. 실제 그룹 멤버의 REVIEWED_REVISION, 분석/독립 추천의 기준 MOD_DT, 프로젝트 그룹핑 입력과 그룹 분석 Context snapshot을 조회하여 참조 여부를 판정한다. 수동 상태만으로 편집을 허용하지 않는다. 변경 확정본도 직접 수정하지 않는다.

변경 사유 필수. 현행 내용과 첨부 연결만 새 Revision으로 복사한다. 같은 ID에 열린 초안 하나를 행 잠금 및 OPEN_REQUIREMENT_ID unique/check로 보장한다. 초안 저장·첨부 변경은 초안 VERSION으로 낙관적 충돌 검사하고 현행 MOD_DT/Revision, 그룹 VERSION/구성/분석 결과를 변경하지 않는다. 확정 시에만 현행 projection/메뉴 관계를 원자 교체하고 연결된 모든 그룹(DRAFT 포함)을 REVIEW_REQUIRED로 변경한다. 그룹 멤버·검토 snapshot·LLM 원문은 그대로 유지한다. 자동 재분석·자동 확정은 없다. 취소된 Revision 번호는 재사용하지 않는다.

파일 실체는 기존 BSDRATCH와 STORAGE_KEY를 재사용하고 BSDRRATT에 버전별 연결을 저장한다. 초안 생성 시 bytes 복사/재업로드는 없다. 제외는 해당 버전 연결만 제거한다. 새 파일은 새 ATTACHMENT_ID/STORAGE_KEY로 저장한다. 같은 이름/크기의 파일을 교체하려면 초안에서 기존 연결을 먼저 제외한다. 실체/실파일을 삭제하지 않으므로 과거 버전 및 취소 초안의 근거도 조회할 수 있다. 기존 업로드/다운로드/미리보기 화면을 유지한다. 예전 BSDRRHIS 첨부 목록도 원본 snapshot 그대로 제공한다. V21은 기존 현행 첨부 연결만 추가 테이블에 채우며 과거 snapshot/기존 행을 재작성하지 않는다.

폐기는 REQUIREMENT_ID 전체의 DISCARDED_YN 변경이며 내용 Revision을 새로 만들지 않는다. BSDRDEVT에 필수 사유/시간/행위자를 기록한다. Principal이 있으면 그 이름을 사용하고 인증 없는 개발 실행은 system으로 명시 기록한다. 반복 폐기는 첫 감사 기록을 보존한다. 열린 초안은 취소 상태로 보존한다. 전체 내용/첨부/기존 관계는 남고 모든 쓰기를 차단한다. 신규 그룹 포함·프로젝트 그룹핑·독립 추천·요구사항 설계 분석에서 제외한다. 폐기 항목을 가진 기존 그룹의 신규 분석은 먼저 구성을 검토하도록 차단한다. 진행 중이거나 과거 실행의 입력/원문은 변경하지 않는다. 기존 그룹을 사람이 검토·저장/재확정하는 동작은 유지한다.

## UI/API

기존 Master/Detail과 기본정보·변경이력·첨부/미리보기·메뉴·연관정보 탭을 유지한다. 공통 FormModal로 변경/폐기 사유와 확정/취소를 처리한다. 현행 Rev, 작성중 Rev, 읽기전용을 표시하고 이력에서 변경 전후 내용·첨부를 비교한다. 기본정보 미저장 중에는 첨부 변경을 비활성화하여 재조회로 입력을 잃지 않도록 한다. 초안 첨부 업로드는 한 파일씩 처리한다.

- GET /requirements/{id}/revisions: 현행, 읽기전용, 열린 초안, 기존 이력, 변경 기록, 폐기 감사.
- POST /requirements/{id}/changes: REASON 필수.
- PUT /requirements/{id}/changes: REVISION/VERSION/CONTENT 필수.
- POST /requirements/{id}/changes/confirm 또는 cancel: REVISION/VERSION 필수.
- DELETE /requirements/{id}: JSON REASON 필수. 기존 사유 없는 요청은 400.
- 첨부 POST/DELETE에 REVISION/VERSION을 함께 전달하면 변경 초안의 연결만 조작한다.

## 적용 경계

V21은 세 테이블 추가 및 기존 현행 첨부 연결 INSERT만 수행하며, 기존 migration 수정/clean/repair/DB 초기화가 없다. Maven이 database/migration을 기존 Flyway 리소스와 합치므로 중복 파일을 만들지 않는다.

공유 PostgreSQL과 기존 서버에는 이번 변경을 적용하지 않았다. 새 코드는 V21이 필요하므로 검수 후 dev-pm을 통해 COMMON과 쓰기 경로를 함께 전환해야 한다. 새 빌드로 기존 PostgreSQL 서버를 시작하면 Flyway가 V21을 적용하므로 적용 단계에서 별도로 실행한다. 구버전 COMMON 쓰기 경로의 정책 우회는 통합/전환 때 해소할 배포 과제이며 SD 개발 중단 사유로 삼지 않는다. PostgreSQL V21 실적용과 운영 Host 권한은 미검증이다.
