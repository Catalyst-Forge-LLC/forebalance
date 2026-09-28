---
format_version: 0.1.0
id: lesson-9ecba7212645
kind: lesson
title: parseEntries walks every recurring occurrence from the text start to
  forecast en
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
  problem: "parseEntries walks every recurring occurrence from the text start to
    forecast end, then slices at the B line. Old starts (2020) are extra CPU and
    inflate #N indexes."
  resolution: "Entries → Roll recurring starts rewrites unbounded series to one
    period before B. Optional later: skip generation before that period without
    changing the text."
  limits: Imported as a historical assertion. Verification was not recorded.
  generalization_status: observed
---


