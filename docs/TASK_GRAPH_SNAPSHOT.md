# TASK_GRAPH_SNAPSHOT — D-HEXCURSE-PRODUCT-STACK-005

**Captured (UTC):** 2026-04-03T09:12:00Z

**Source:** `.taskmaster/tasks/tasks.json` after **agent-curated** rebuild from `NORTH_STAR.md` + `.taskmaster/docs/prd.txt` (equivalent to `task-master parse-prd` when no LLM endpoint is available). Tasks **#3**, **#4**, **#8** marked **done** per directive.

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 15 |
| Done | 6 (1, 2, 3, 4, 7, 8) |
| Pending | 9 |

## tasks.json — master tag

| ID | Title | Status | Deps | Priority |
|----|-------|--------|------|----------|
| 1 | Verify and freeze governance rules | done | — | high |
| 2 | Sync DIRECTIVES.md with Taskmaster | done | 1 | high |
| 3 | Document Taskmaster LLM configuration and no-endpoint fallback | done | — | high |
| 4 | Rebuild Taskmaster task graph from NORTH_STAR and prd.txt | done | 3 | high |
| 5 | Seed memory MCP from docs/MEMORY_SEED.md | pending | — | medium |
| 6 | Verify MCP servers show green in Cursor | pending | — | medium |
| 7 | Commit governance scaffold to Git | done | 2 | medium |
| 8 | Confirm product stack and update docs/ARCHITECTURE.md | done | — | high |
| 9 | Installer correctness: setup.js parity with AGENTS and GOVERNANCE_PARITY | pending | 1 | high |
| 10 | Validate continual learning loop in a real repo | pending | 9 | high |
| 11 | Skill promotion pipeline and PAMPA cadence | pending | 10 | medium |
| 12 | Token efficiency measurement protocol (session 1 vs session N) | pending | 10 | medium |
| 13 | Session ritual accuracy vs live MCP coordination | pending | 1, 2 | medium |
| 14 | cursor-governance installer — Windows PowerShell readline + no ora (D014) | pending | 9 | high |
| 15 | Linux compatibility for cursor-governance installer (D015) | pending | 14 | high |

**Subtasks:** Tasks **10** and **11** include nested subtasks (session/rollup steps; promotion-queue documentation).
