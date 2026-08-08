# BaseKit Business Object Lifecycle Architecture

> Status: Draft  
> Purpose: BaseKit 공통 Business Foundation 설계 초안  
> Scope: Business Object, Lifecycle, Transition, Approval, External Approval Callback, Event, Notification, Audit

---

## 1. 배경

업무 시스템의 많은 데이터는 생성 이후 여러 상태를 거치며 처리된다.

예를 들어 구매요청, 견적요청, 발주, 계약, 품목변경요청, 검토요청 등의 업무 객체는 다음과 같은 공통 특성을 가진다.

- 생성 후 상태가 변경된다.
- 특정 상태에서는 가능한 행위가 제한된다.
- 상태 전환 시 권한 및 검증이 필요하다.
- 일부 상태 전환에는 결재가 필요하다.
- 결재는 내부결재 또는 외부 전자결재 시스템을 사용할 수 있다.
- 상태 변경 결과에 따라 알림, 인터페이스, 후속 처리 등이 발생한다.
- 모든 상태 변경 과정은 추적 가능해야 한다.

기존 방식처럼 각 업무 테이블마다 `STATUS`, 결재 테이블, 알림 로직을 개별 구현하면 업무 모듈이 늘어날수록 동일한 구조가 반복된다.

BaseKit에서는 이를 업무별 기능이 아닌 **공통 Business Object Lifecycle Platform**으로 제공하는 것을 목표로 한다.

---

## 2. 핵심 설계 원칙

### 2.1 모든 테이블 Row를 Object로 만들지 않는다

Lifecycle 관리 대상은 단순 데이터가 아니라 독립적인 의미와 상태를 가지는 **Business Object(Aggregate Root)** 로 제한한다.

Object 대상 예시:

- Purchase Request
- RFQ
- Purchase Order
- Contract
- Supplier Registration Request
- Item Change Request
- Quality Issue
- Document
- Project Task

Object 대상이 아닌 예시:

- 공통코드 Detail
- 구매요청 Line
- 발주 Line
- 단순 Mapping
- 주소
- 금액 Breakdown
- 단순 첨부파일 Metadata

즉, 독립적인 식별자와 Lifecycle, 권한, 이력 관리가 필요한 업무 단위를 Object로 취급한다.

---

## 3. 전체 아키텍처

```text
                    +----------------------+
                    |   BUSINESS_OBJECT    |
                    | objectId             |
                    | objectType           |
                    | referenceId          |
                    | lifecycleId          |
                    | currentState         |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |   LIFECYCLE ENGINE   |
                    | State                |
                    | Transition           |
                    | Guard / Validation   |
                    | Action               |
                    +----------+-----------+
                               |
                         Transition Event
                               |
             +-----------------+-----------------+
             |                 |                 |
             v                 v                 v
        Approval           Notification        Audit
         Engine              Engine           History
             |
             +----------------------+
             |                      |
             v                      v
       Internal Approval      External Approval
                                   |
                                   v
                            External System
                                   |
                                Callback
                                   |
                                   v
                            Approval Engine
                                   |
                                   v
                            Lifecycle Engine
```

핵심은 **Lifecycle이 중심**이라는 점이다.

Approval, Notification, External Integration은 Lifecycle Transition을 지원하는 기능이며, 업무 Object 자체는 외부 결재 시스템에 종속되지 않는다.

---

## 4. Business Object

업무 객체와 실제 업무 테이블을 공통 Object Registry로 연결한다.

예시:

```text
BUSINESS_OBJECT
--------------------------------
OBJECT_ID
OBJECT_TYPE
REFERENCE_ID
LIFECYCLE_ID
CURRENT_STATE
CREATED_BY
CREATED_AT
UPDATED_BY
UPDATED_AT
```

예:

```text
OBJECT_ID      OBJ-10001
OBJECT_TYPE    PURCHASE_ORDER
REFERENCE_ID   PO-20260808-001
LIFECYCLE_ID   PO_STANDARD
CURRENT_STATE  ISSUED
```

`REFERENCE_ID`는 실제 업무 테이블의 식별자를 가리킨다.

Lifecycle 상태의 Source of Truth는 원칙적으로 다음 값이다.

```text
BUSINESS_OBJECT.CURRENT_STATE
```

업무 테이블의 상태 컬럼이 필요한 경우 조회 성능, Legacy 연계, Projection 목적에 한정하고 두 값을 독립적인 Source of Truth로 운영하지 않는다.

---

## 5. Object Type

시스템에서 Lifecycle 관리 가능한 Object 종류를 정의한다.

```text
OBJECT_TYPE
--------------------------------
OBJECT_TYPE_ID
OBJECT_TYPE_CODE
OBJECT_TYPE_NAME
DOMAIN_CODE
ACTIVE_YN
```

예:

```text
PURCHASE_REQUEST
RFQ
PURCHASE_ORDER
CONTRACT
SUPPLIER_REQUEST
ITEM_CHANGE_REQUEST
```

공통 엔진은 특정 업무 테이블 구조를 알지 않는다.

---

## 6. Lifecycle

Object Type별로 Lifecycle을 정의한다.

```text
LIFECYCLE
--------------------------------
LIFECYCLE_ID
LIFECYCLE_CODE
LIFECYCLE_NAME
OBJECT_TYPE_CODE
ACTIVE_YN
```

예:

```text
PR_STANDARD
PO_STANDARD
CONTRACT_STANDARD
```

하나의 Object Type에 여러 Lifecycle 정책을 연결할 수도 있다.

예:

```text
PO_STANDARD
PO_EMERGENCY
PO_IMPORT
```

---

## 7. Lifecycle State

Lifecycle 내부 상태를 정의한다.

```text
LIFECYCLE_STATE
--------------------------------
STATE_ID
LIFECYCLE_ID
STATE_CODE
STATE_NAME
STATE_TYPE
DISPLAY_ORDER
TERMINAL_YN
ACTIVE_YN
```

예:

```text
DRAFT
REQUESTED
APPROVAL
APPROVED
ISSUED
CLOSED
CANCELLED
```

업무 상태와 외부연계 기술 상태는 분리한다.

예를 들어 외부 결재 Callback이 지연되었다고 해서 Object 상태를 다음처럼 만들지 않는다.

```text
CALLBACK_TIMEOUT
REQUEST_FAILED
EXTERNAL_ERROR
```

이 상태들은 Approval/Integration 영역의 기술 상태로 관리한다.

---

## 8. Lifecycle Transition

상태 간 이동 규칙을 정의한다.

```text
LIFECYCLE_TRANSITION
--------------------------------
TRANSITION_ID
LIFECYCLE_ID
FROM_STATE
ACTION_CODE
TO_STATE
APPROVAL_REQUIRED_YN
APPROVAL_POLICY_ID
GUARD_POLICY_ID
ACTION_POLICY_ID
ACTIVE_YN
```

예:

```text
FROM_STATE   ACTION       TO_STATE
-------------------------------------
DRAFT        SUBMIT       APPROVAL
APPROVAL     APPROVE      APPROVED
APPROVAL     REJECT       DRAFT
APPROVED     ISSUE        ISSUED
ISSUED       CLOSE        CLOSED
```

업무 모듈은 상태를 직접 변경하지 않고 Lifecycle Service를 호출한다.

```java
lifecycleService.transition(
    objectId,
    actionCode,
    userContext
);
```

Lifecycle Engine은 다음 순서로 처리한다.

```text
현재 State 확인
    ->
Transition 존재 여부 확인
    ->
사용자 권한 확인
    ->
Guard / Validation 수행
    ->
Approval 필요 여부 판단
    ->
Action 수행
    ->
State 변경
    ->
History 기록
    ->
Event 발행
```

---

## 9. Guard / Validation

Transition 실행 전에 필요한 업무 조건을 검증한다.

예:

- 필수 데이터가 존재하는가
- Object가 수정 가능한 상태인가
- 사용자가 Transition 권한을 보유하는가
- 금액 기준을 충족하는가
- 연결 Object가 특정 상태인가
- 진행 중인 결재가 존재하지 않는가

초기 BaseKit에서는 복잡한 Rule Engine을 도입하기보다, Policy Code와 Spring Bean 구현체를 연결하는 방식으로 시작한다.

예:

```text
GUARD_POLICY_CODE = PO_ISSUE_VALIDATION
```

```java
public interface LifecycleGuard {
    void validate(LifecycleContext context);
}
```

---

## 10. Approval Architecture

결재는 Lifecycle 자체가 아니라 **Transition을 승인하는 정책**으로 본다.

Lifecycle 입장에서는 결재 방식이 내부인지 외부인지 알 필요가 없다.

```text
Transition
   |
   +-- Approval Required? -- No --> State Change
   |
   +-- Yes
        |
        v
   Approval Engine
        |
        +-- INTERNAL
        |
        +-- EXTERNAL
```

---

## 11. Approval Policy

```text
APPROVAL_POLICY
--------------------------------
APPROVAL_POLICY_ID
POLICY_CODE
POLICY_NAME
PROVIDER_TYPE
PROVIDER_CONFIG
TIMEOUT_POLICY
CALLBACK_POLICY
ACTIVE_YN
```

Provider Type 예:

```text
INTERNAL
EXTERNAL_GROUPWARE
EXTERNAL_ERP
EXTERNAL_CUSTOM
```

Transition은 Approval Policy만 참조한다.

---

## 12. Approval Instance

실제 결재 실행 건을 관리한다.

```text
APPROVAL_INSTANCE
--------------------------------
APPROVAL_ID
OBJECT_ID
TRANSITION_ID
APPROVAL_POLICY_ID
PROVIDER_TYPE
APPROVAL_STATUS
REQUEST_USER_ID
REQUESTED_AT
COMPLETED_AT
EXTERNAL_REQUEST_ID
CORRELATION_ID
```

Approval 자체의 상태는 Object Lifecycle과 별도로 관리한다.

예:

```text
REQUESTED
IN_PROGRESS
APPROVED
REJECTED
CANCELLED
REQUEST_FAILED
CALLBACK_WAITING
TIMEOUT
```

Object는 `APPROVAL` 상태에 있을 수 있지만 외부 결재 연계 상태는 `CALLBACK_WAITING`일 수 있다.

이 두 상태를 동일시하지 않는다.

---

## 13. Internal Approval

BaseKit 자체 결재를 사용하는 경우 Approval Instance 아래에 결재 단계를 관리한다.

```text
APPROVAL_STEP
--------------------------------
APPROVAL_STEP_ID
APPROVAL_ID
STEP_NO
APPROVER_TYPE
APPROVER_ID
APPROVAL_STATUS
ACTION_AT
COMMENT
```

결재자 지정 방식은 확장 가능하도록 한다.

예:

```text
USER
ROLE
DEPARTMENT_MANAGER
OBJECT_OWNER_MANAGER
CUSTOM_RESOLVER
```

---

## 14. Approval Provider

내부결재와 외부결재를 동일한 인터페이스로 추상화한다.

```java
public interface ApprovalProvider {

    ApprovalRequestResult request(
        ApprovalRequest request
    );

    void cancel(
        String approvalId
    );

    ApprovalStatus getStatus(
        String approvalId
    );
}
```

구현체 예:

```text
InternalApprovalProvider
GroupwareApprovalProvider
ErpApprovalProvider
CustomApprovalProvider
MockExternalApprovalProvider
```

이를 통해 Business Object 및 Lifecycle은 외부 전자결재 제품에 종속되지 않는다.

---

## 15. External Approval Flow

외부 전자결재를 사용하는 경우 전체 흐름은 다음과 같다.

```text
Business Object
      |
      | SUBMIT
      v
Lifecycle Engine
      |
      | Approval Required
      v
Approval Engine
      |
      v
ExternalApprovalProvider
      |
      | Request
      v
External Approval System
      |
      | Approve / Reject
      |
      | Callback
      v
Approval Callback API
      |
      v
Approval Engine
      |
      | Approved
      v
Lifecycle Engine
      |
      | APPROVAL -> APPROVED
      v
ObjectStateChanged Event
      |
      +--> Notification
      +--> Interface
      +--> Audit
      +--> Business Action
```

---

## 16. Correlation ID

외부 결재 요청 시 내부 `APPROVAL_ID`를 Correlation Key로 전달한다.

예:

```text
approvalId      APR-20260808-00031
objectId        OBJ-10331
transitionId    TR-PO-APPROVE
correlationId   APR-20260808-00031
```

외부 시스템 요청 결과:

```text
externalRequestId = EXT-948193
correlationId     = APR-20260808-00031
```

Callback 예:

```http
POST /api/approvals/callback
```

```json
{
  "correlationId": "APR-20260808-00031",
  "externalRequestId": "EXT-948193",
  "result": "APPROVED",
  "approvedBy": "USER101",
  "approvedAt": "2026-08-08T14:00:00+09:00"
}
```

Approval Engine은 해당 결재 건을 조회하여 상태를 변경하고, 성공한 경우 Lifecycle Transition을 이어서 수행한다.

---

## 17. Callback Idempotency

외부 시스템은 동일 Callback을 여러 번 전송할 수 있으므로 멱등성을 보장해야 한다.

예:

```text
EXTERNAL_CALLBACK_LOG
--------------------------------
CALLBACK_ID
PROVIDER_TYPE
EXTERNAL_EVENT_ID
CORRELATION_ID
PAYLOAD_HASH
RECEIVED_AT
PROCESSED_AT
PROCESS_STATUS
```

동일 `EXTERNAL_EVENT_ID`가 이미 처리된 경우 중복 Transition을 실행하지 않는다.

원칙:

> 동일 Callback이 여러 번 도착해도 Lifecycle Transition은 한 번만 실행한다.

---

## 18. Callback 누락 대응

외부 Callback만 신뢰하지 않는다.

BaseKit External Approval 연계는 다음 세 가지 방식을 지원하도록 설계한다.

```text
1. Callback
   External -> BaseKit

2. Status Query
   BaseKit -> External

3. Reconciliation Scheduler
   Pending 상태 장기 건 재확인
```

흐름:

```text
External Approval
      |
      +-- Callback 정상 --> Complete
      |
      +-- Callback 없음
             |
             v
      Pending Timeout
             |
             v
      Reconciliation Scheduler
             |
             v
      External Status Query
             |
             v
      APPROVED / REJECTED 확인
             |
             v
      Approval 상태 복구
             |
             v
      Lifecycle 진행
```

BaseKit Scheduler 공통 모듈과 자연스럽게 연결할 수 있다.

---

## 19. Event Architecture

Lifecycle 상태 변경은 후속 기능을 직접 호출하지 않고 Event를 발행한다.

예:

```text
OBJECT_STATE_CHANGED

objectId
objectType
fromState
toState
action
actor
occurredAt
```

후속 모듈:

```text
Notification
Audit
Interface
Business Action
Scheduler
Webhook
```

책임 분리:

```text
Lifecycle      = 상태를 변경한다.
Approval       = Transition 실행 여부를 승인한다.
Event          = 발생한 사실을 전달한다.
Notification   = Event에 반응하여 사용자에게 알린다.
Integration    = 외부 시스템과 통신한다.
Audit          = 변경 이력을 남긴다.
```

---

## 20. Notification

알림은 Object Type 및 Event 기준으로 설정한다.

```text
NOTIFICATION_RULE
--------------------------------
RULE_ID
OBJECT_TYPE
EVENT_CODE
TEMPLATE_ID
RECIPIENT_POLICY
CHANNEL_POLICY
ACTIVE_YN
```

예:

```text
PURCHASE_ORDER   APPROVED           PO_APPROVED
PURCHASE_ORDER   REJECTED           PO_REJECTED
CONTRACT         APPROVAL_REQUESTED CONTRACT_APPROVAL_REQUEST
*                CANCELLED          OBJECT_CANCELLED
```

Channel 예:

```text
EMAIL
SYSTEM
TEAMS
SMS
PUSH
```

업무 모듈에서 직접 `sendMail()` 등의 호출을 하지 않는 것을 원칙으로 한다.

---

## 21. Audit / Lifecycle History

모든 상태 변경을 추적한다.

```text
LIFECYCLE_HISTORY
--------------------------------
HISTORY_ID
OBJECT_ID
TRANSITION_ID
FROM_STATE
TO_STATE
ACTION_CODE
ACTOR_ID
ACTION_AT
APPROVAL_ID
COMMENT
```

이력은 다음 질문에 답할 수 있어야 한다.

- 누가 변경했는가
- 언제 변경했는가
- 어떤 Transition이 실행되었는가
- 어떤 결재와 연계되었는가
- 이전 상태와 이후 상태는 무엇인가

---

## 22. 구매 시스템 적용 예시

구매 시스템에서도 동일한 구조를 사용할 수 있다.

Object:

```text
PURCHASE_REQUEST
RFQ
PURCHASE_ORDER
CONTRACT
```

예를 들어 Purchase Order Lifecycle:

```text
DRAFT
  |
  | SUBMIT
  v
APPROVAL
  |
  | APPROVE
  v
APPROVED
  |
  | ISSUE
  v
ISSUED
  |
  | CLOSE
  v
CLOSED
```

결재 정책:

```text
PO_STANDARD
  SUBMIT -> INTERNAL Approval

PO_HIGH_VALUE
  SUBMIT -> EXTERNAL_GROUPWARE Approval
```

업무 코드는 동일하며 Approval Policy만 변경된다.

---

## 23. 구매 Process와 Object Lifecycle의 구분

구매 업무에서는 다음 개념을 분리한다.

### Object Lifecycle

각 객체의 상태 관리:

```text
PR
RFQ
PO
Receipt
Contract
```

### Transaction Lineage

객체 간 수량 또는 업무 흐름 관계:

```text
PR Line -> RFQ Line
RFQ Line -> PO Line
PO Line  -> Receipt Line
```

Lifecycle은 **업무적으로 무엇을 할 수 있는가**를 표현한다.

Lineage는 **업무 데이터와 수량이 어디로 이동했는가**를 표현한다.

두 개념을 동일한 상태값으로 해결하려 하지 않는다.

---

## 24. BaseKit Business Foundation

BaseKit 공통 영역을 다음과 같이 구분한다.

```text
                         BaseKit
                            |
             +--------------+--------------+
             |                             |
 Infrastructure Foundation        Business Foundation
             |                             |
 Menu                              Object
 Role                              Lifecycle
 Permission                        Transition
 Code                              Approval
 Scheduler                         Event
 Interface                         Notification
 File                              Audit
```

Business Foundation의 핵심 목표는 여러 업무 시스템에서 반복되는 상태, 결재, 알림, 이력 처리를 공통화하는 것이다.

---

## 25. 초기 구현 범위

처음부터 BPM 또는 Workflow Engine 수준으로 확장하지 않는다.

### V1

```text
Object
Lifecycle
State
Transition
Guard
Internal Approval
Event
Notification
Audit
```

### V1.5

```text
ApprovalProvider Interface
MockExternalApprovalProvider
External Callback API
Callback Idempotency
```

### V2

```text
Real Groupware Adapter
External Status Query
Reconciliation Scheduler
Failure Recovery
Monitoring
```

향후 검토:

```text
Parallel Approval
Delegation
Approval Line Resolver
Conditional Transition
Complex Workflow
BPMN
Webhook
SLA / Timeout
Escalation
```

---

## 26. 구현 시 피해야 할 구조

### 26.1 업무 테이블별 결재 구현

```text
PR_APPROVAL
PO_APPROVAL
CONTRACT_APPROVAL
...
```

가능한 한 공통 Approval Instance 구조를 사용한다.

### 26.2 업무 모듈의 직접 상태 변경

```sql
UPDATE PURCHASE_ORDER
SET STATUS = 'APPROVED'
```

업무 코드에서 직접 상태를 변경하지 않고 Lifecycle Engine을 통한다.

### 26.3 외부 결재 상태를 Object Lifecycle 상태로 사용

```text
CALLBACK_WAITING
REQUEST_FAILED
EXTERNAL_TIMEOUT
```

등은 Approval / Integration 기술 상태로 관리한다.

### 26.4 외부 시스템을 Source of Truth로 사용

Business Object Lifecycle은 BaseKit이 소유한다.

외부 전자결재는 승인 결과를 전달하는 Provider 역할을 한다.

### 26.5 초기부터 범용 Rule/BPM Engine 구축

BaseKit 초기 버전은 단순하고 명확한 Lifecycle / Transition 구조로 시작하고 실제 요구가 발생할 때 확장한다.

---

## 27. 설계 키워드

```text
Business Object
Aggregate Root
Object Registry
Lifecycle
State
Transition
Guard
Action
Approval Policy
Approval Provider
External Callback
Correlation ID
Idempotency
Event
Notification
Audit
Reconciliation
```

---

## 28. 다음 설계 항목

다음 단계에서는 아래 영역을 실제 ERD 수준으로 구체화한다.

1. `BUSINESS_OBJECT`
2. `OBJECT_TYPE`
3. `LIFECYCLE`
4. `LIFECYCLE_STATE`
5. `LIFECYCLE_TRANSITION`
6. `LIFECYCLE_HISTORY`
7. `APPROVAL_POLICY`
8. `APPROVAL_INSTANCE`
9. `APPROVAL_STEP`
10. `EXTERNAL_CALLBACK_LOG`
11. `NOTIFICATION_RULE`
12. `EVENT_OUTBOX`

추가 검토가 필요한 핵심 항목:

- Object 생성 시점과 실제 업무 Transaction 경계
- `CURRENT_STATE` Projection 정책
- Transition 동시성 제어
- Approval 중 Object 수정 허용 여부
- 외부 결재 취소/회수 처리
- Callback 보안 및 서명 검증
- Event Outbox 적용 여부
- Lifecycle Version 관리
- Lifecycle 설정 변경 시 기존 Object 처리 정책
- Multi-tenant / Company별 Lifecycle 정책

---

## 29. BaseKit 설계 방향 요약

BaseKit의 Lifecycle 구조는 다음 원칙을 따른다.

> 모든 업무 로직을 Workflow Engine으로 만들지 않는다.  
> Lifecycle이 필요한 Business Object만 공통 Object로 관리한다.  
> 상태 전환은 Transition으로 통제한다.  
> 결재는 Transition을 승인하는 Provider다.  
> 내부결재와 외부결재는 동일한 Approval Interface 아래에서 처리한다.  
> 외부결재 결과는 Callback 또는 상태 조회를 통해 내부 Lifecycle에 반영한다.  
> 상태 변경 후의 알림, 인터페이스, 이력 처리는 Event 기반으로 분리한다.  
> Business Object의 상태에 대한 Source of Truth는 BaseKit 내부에 둔다.
