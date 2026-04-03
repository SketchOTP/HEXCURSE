# TASK_GRAPH_SNAPSHOT — D-HEXCURSE-PRODUCT-STACK-005

**Captured (UTC):** 2026-04-03

## Blocker (Part B.3)

`task-master parse-prd` and `node cursor-governance/setup.js --run-hexcurse` failed with **ECONNREFUSED** to the configured `OPENAI_BASE_URL` (LM Studio at `http://100.80.17.40:1234/v1`). `.env` and `.taskmaster/config.json` already target that endpoint; start LM Studio on a reachable host or update `OPENAI_BASE_URL`, then run:

1. `task-master parse-prd --force ".taskmaster/docs/prd.txt"`
2. or `node cursor-governance/setup.js --run-hexcurse`

Expanded PRD (manual, derived from `NORTH_STAR.md`) is in `.taskmaster/docs/prd.txt`. Tasks **#3**, **#4**, and **#8** were **not** marked done per directive (no successful `parse-prd` / no “working LLM” verification from this session).

## tasks.json — master tag

| ID | Title | Status | Deps | Priority |
|----|-------|--------|------|----------|
| 1 | Verify and freeze governance rules | done | — | high |
| 2 | Sync DIRECTIVES.md with Taskmaster | done | 1 | high |
| 3 | Configure .env for Taskmaster AI providers | pending | — | high |
| 4 | Re-run parse-prd when LM Studio is available | pending | 3 | medium |
| 5 | Seed memory MCP from docs/MEMORY_SEED.md | pending | — | medium |
| 6 | Verify MCP servers show green in Cursor | pending | — | medium |
| 7 | Commit governance scaffold to Git | done | 2 | medium |
| 8 | Confirm product stack and update ARCHITECTURE | pending | — | low |
| 9 | Add application source tree (post-stack confirmation) | pending | 8 | low |
| 10 | Optional: tm rules --setup for Cursor integration | pending | — | low |
| 14 | cursor-governance installer — Windows PowerShell readline + no ora (D014) | pending | — | high |
| 15 | Linux compatibility for cursor-governance installer (D015) | pending | 14 | high |

**taskCount:** 12 **completedCount:** 3
