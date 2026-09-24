# ADR-027 Standard Design Lifecycle Foundation

## Status

ACCEPTED / implemented first phase

## Decision

Standard Design keeps a project root context and records hierarchical WBS, requirements, screen designs, and DB designs as module-owned design metadata. Requirements are the traceability center and hold explicit WBS, screen, and table identifiers. This deliberately supports a later Screen Field-to-DB Column mapping without creating automatic mappings or a generic relation engine.

Screen contracts own `FIELDS`; DB table contracts own `COLUMNS`. DB tables may reference the existing Core `schemaCatalog` table key, rather than duplicating Core schema definitions.

## Persistence

The first phase uses the module Repository and browser JSON storage. No Flyway migration or Backend schema is added: ADR-012 keeps JSON persistence until the DB adapter and operating authority are decided, and ADR-015 requires approved migration scripts rather than automatic schema generation.

## Scope

The module manifest exposes project overview, WBS, requirements, screen design, and DB design as CRUD-capable programs. Standard Term list/detail and the existing LLM recommendation API remain outside this lifecycle persistence boundary.
