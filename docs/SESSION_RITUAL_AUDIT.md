# Session Ritual Audit — 2026-04-03

**Cursor version:** (host — check Help → About in Cursor)  
**HexCurse version:** 1.6.0 → 1.6.1 (D-007 omnibus in progress)

Audit performed during the **D-HEXCURSE-OMNIBUS-007** implementation chat in `N:\HexCurse`. The human pasted the directive file path and execution rules rather than the full `docs/SESSION_START.md` block; the agent treated that as explicit scope and proceeded with directive-first execution.

## STEP 0 — Read NORTH_STAR.md

- Invoked: partial (not read this session; prior context from directive)
- Result: skipped — acceptable when scope is a repo-local omnibus with written directive

## STEP 1 — Read ROLLING_CONTEXT.md

- Invoked: no
- Result: skipped for this session type — **gap** for strict ritual compliance

## STEP 2 — Load Taskmaster context

- taskmaster-ai MCP invoked: intermittently (`set-status` used after phases; explicit **get_tasks** at session open not shown in transcript)
- Tasks loaded: yes (human enumerated tasks #5, #6, #9–#15)
- Result: **gap** — STEP 3 **REQUIRED** line added to `docs/SESSION_START.md` / pack template / `AGENTS.md` so agents always call **get_tasks** even when the human names a directive

## STEP 3 — Load memory MCP

- memory MCP invoked: yes (Phase 2 seeding via `create_entities`)
- Memories retrieved: n/a at start
- Result: ok for Phase 2; full start ritual should still **query** memory before other governance reads

## STEP 4a — jcodemunch

- Invoked: no
- Result: **gap** — acceptable for doc/template-only edits; not acceptable for multi-file code discovery without index

## STEP 4b — repomix

- Invoked: no
- Result: **gap** — same as 4a for this session’s code scope

## STEP 4c — Semgrep security baseline

- semgrep MCP invoked: no at session start
- Result: **gap** at start; semgrep policy updated to Streamable HTTP in installer and doctor migration

## STEP 4d — Linear sync

- LINEAR_API_KEY set: unknown
- linear MCP invoked: no
- Result: skipped

## STEP 4e — PAMPA skill search

- pampa MCP invoked: no
- Result: skipped

## STEP 5 — Confirm task scope

- Done: yes (human supplied full directive and phase rules)

## STEP 6 — Load relevant .mdc rules

- Rules loaded: via Cursor alwaysApply (base, mcp-usage, process-gates, etc.)

## GAPS IDENTIFIED

1. Session did not paste canonical **SESSION START** block; ritual steps 1–2, 4a–4e were not executed in order at open.
2. **get_tasks** should run even when the human lists task IDs in prose — addressed by **REQUIRED** wording in STEP 3.
3. **repomix** / **jcodemunch** not run before broad `setup.js` work — mitigated by targeted grep/read and parity scripts.

## RECOMMENDATIONS

1. Keep **STEP 3 REQUIRED** text (shipped in this omnibus).
2. For large omnibus directives, human should paste `docs/SESSION_START.md` **or** explicitly waive ritual in chat.
3. After substantive code edits, run **semgrep** `security_check` on touched files before commit (process gate).
