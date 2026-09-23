# ADR-031 Standard Design Project Foundation and Shared Context

## Status

ACCEPTED / implemented as a browser-storage reference

## Decision

The Standard Design project is the foundation for WBS, requirements, screen design, and DB design. Project records own project name, customer, description, lifecycle status, start date, and end date. Start and end dates are required and start must not follow end.

System `USER` remains the account and authentication identity. `MEMBER` is a project-planning profile and may refer to a `USER` through nullable `USER_ID`, allowing future external or non-login participants without treating them as system users. `PROJECT_MEMBER` is the project-specific assignment joining a project and member. Participation type, project role, project grade, assignment dates, planned person-months, participation status, and note belong to this assignment. In particular, grade is project-specific and is not added to the global USER profile. A project can have at most one active assignment for the same member in this reference implementation.

The active member picker reuses BaseKit's existing USER list and filters to active, unlocked, enabled, non-deleted accounts. This first UI stores the selected USER's basic display identity as a MEMBER profile; it does not change the USER administration flow.

## Shared project context

The active project ID is persisted separately from lifecycle data in browser localStorage. WBS, Requirements, Screen Design, and DB Design expose a selector in their page header, outside the MDI tab strip. Changing context reloads the current program's project-scoped list. These four programs require a valid context before activation; canceling the selector leaves the prior MDI program active. Project Management remains available to create a project when none exists.

This is module-level reference persistence only. No API, database table, migration, authorization framework, or cross-device synchronization is introduced. A future relational model should use PROJECT as root, MEMBER as the planning profile, and PROJECT_MEMBER as an assignment with foreign keys to PROJECT and MEMBER; `MEMBER.USER_ID` is nullable and references the system USER when present. Project deletion removes project assignments but does not delete reusable member profiles.

## Scope and follow-up

The current implementation is limited to Standard Design Project Management and the four context-aware Standard Design programs. It does not migrate other screens, add Project Member permissions, or implement deep-copy behavior. UI checks should cover context gating and switching, assignment uniqueness and date bounds, and project date validation.
