---
format_version: 0.1.0
id: change-a47e8e50e9cf
kind: change
title: Unmapped tracking fields
record_status: active
created_at: 2026-09-03T00:00:00Z
updated_at: 2026-09-03T00:00:00Z
recorded_by:
  id: migration-import
  type: import
visibility: internal
relations: []
claims: []
extensions:
  migration:
    unmapped:
      phases.4-feature-iteration:
        iterations:
          - feature: Roll recurring starts
            status: complete
            approach: Rewrite unbounded series start to occurrence immediately before first
              on/after earliest B (or today). Remap overrides by date. Skip
              counted series.
data:
  change_type: added
  affected_ids:
    - app-6abac1159e23
  reason: Fields from the tracking file that have no ledger mapping were retained.
  evidence_refs: []
  operation: reconciliation
---

The unmapped fields are in extensions.migration.unmapped.
