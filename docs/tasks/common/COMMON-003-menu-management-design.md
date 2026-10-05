# COMMON-003 Menu Management Design

## 1. Objective
Design the next COMMON management stage after Program and Endpoint management.

This task is for COMMON system management only. Do not mix it with the SD requirement-analysis flow.

Current completed baseline:
- Program management implemented
- Endpoint auto-discovery implemented
- Program ↔ Endpoint mapping implemented
- Button permission group structure implemented
- Program permission is the default execution boundary; selected operations may require an additional button permission group

## 2. Core flow
Target COMMON flow:

Program → Endpoint → Menu → Role/Permission

This task focuses on Menu management and its relationship to Program.

## 3. Design principles
1. Menu is a navigation structure, not the authority source.
2. Program remains the execution / functional ownership unit.
3. A menu item may reference a Program.
4. Folder/group menu nodes may exist without a Program reference.
5. Menu visibility and Program execution permission must be distinguishable.
6. Direct URL/API access must not rely on menu visibility for security.
7. Existing BaseKit menu, route, program registry and permission structures must be inspected before finalizing the model.

## 4. Items to investigate before design confirmation
- Current menu source of truth: source registry, DB seed, runtime registry, or mixed
- Current 1/2/3 depth handling
- Current fields for menu type, parent, order, route, program key, active status
- Whether one Program can be referenced by multiple menus
- Whether menu nodes without Program are already supported
- How current route and tab opening behavior are connected to menu data
- How role-based menu visibility is currently calculated
- Existing backend/menu APIs and persistence model

## 5. Initial relationship model
Recommended starting model:

MENU
- menuId
- parentMenuId
- menuName
- menuType: FOLDER | PROGRAM
- programKey: nullable
- sortOrder
- useYn / active
- icon / presentation metadata if already supported

Rules:
- FOLDER: programKey nullable/absent
- PROGRAM: programKey required
- Program may be referenced by more than one menu if product requirements need multiple navigation entry points
- Runtime route should ultimately come from Program ownership rather than duplicating independent route truth in Menu where possible

## 6. UX direction
BaseKit standard screen rules must be reused.

Proposed first structure:
- LEFT or TOP: hierarchical Menu tree/grid
- RIGHT or BOTTOM detail: selected menu properties and linked Program information

Alternative layout must be chosen only after inspecting the current BaseKit menu management screen and common Master/Detail patterns.

The design must preserve:
- BaseKit common CSS
- PageHeader / SearchPanel conventions
- Grid density / padding / total-count placement
- Existing action button conventions
- Existing Master/Detail and tree-grid conventions

## 7. Permission boundary
For this task, distinguish at least:
- Menu visibility: whether the user sees the navigation item
- Program permission: whether the user may enter/use the Program
- Button permission group: whether selected operations inside the Program are additionally allowed

Do not use Menu as the primary backend authorization boundary.

## 8. Scope exclusions
Not in this task unless required to complete the design:
- Full user-role management screen redesign
- Host authentication provider integration
- SD requirement flow
- Endpoint discovery redesign
- Large-scale authorization model rewrite

## 9. Deliverables
1. Current Menu implementation analysis
2. Recommended Menu ↔ Program relationship
3. Menu hierarchy / type rules
4. Menu visibility vs Program permission boundary
5. BaseKit-standard management screen proposal
6. Open decisions and migration risks
7. Follow-up implementation TASK proposal

## 10. Completion criteria
The design is complete when Menu ownership, hierarchy, Program linkage, route ownership, visibility rules, and the standard management-screen structure are explicit enough to create the next implementation TASK without ambiguity.
