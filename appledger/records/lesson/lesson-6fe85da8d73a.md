---
format_version: 0.1.0
id: lesson-6fe85da8d73a
kind: lesson
title: Rolling a start remaps |#N= overrides; N is occurrence index from the
  text start
record_status: active
created_at: 2026-09-15T00:00:00Z
updated_at: 2026-09-15T00:00:00Z
recorded_by:
  id: migration-import
  type: import
visibility: internal
relations: []
claims: []
data:
  context: Imported from workflow tracking gotchas[].
  problem: Rolling a start remaps |#N= overrides; N is occurrence index from the
    text start, not a calendar date.
  resolution: Map old N → occurrence date → new index from the new start. Drop
    overrides whose date is before the new start. Do not roll counted series
    (RW5).
  limits: Imported as a historical assertion. Verification was not recorded.
  generalization_status: observed
---


