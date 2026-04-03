# DIRECTIVES — HexCurse
# Human-readable task chain. Taskmaster tasks.json is the machine source of truth.
# Sync these after every session close.
# Format: D[3-digit number] — mirrors Taskmaster task IDs where possible.

---

## ✅ Completed
- D000: Governance + MCP scaffold (repo initialization) ✓ 2026-03-29 bef73ac
- D001: Verify and freeze governance rules ✓ 2026-03-29 48f08a8
- D-HEXCURSE-DOCS-AUDIT-004: Governance documentation audit — 17 MCP servers, 10 `.mdc` rules, cursor-governance **v1.5.8** ✓ 2026-04-02 ec416d0
- D002 (Taskmaster #2): Sync DIRECTIVES.md with Taskmaster ✓ 2026-04-02 ec416d0
- D007 (Taskmaster #7): Commit governance scaffold to Git ✓ 2026-04-02 ec416d0
- D-HEXCURSE-PRODUCT-STACK-005 (Taskmaster #3): Document Taskmaster LLM + no-endpoint fallback (`.env.example`, `ARCHITECTURE`) ✓ 2026-04-03
- D-HEXCURSE-PRODUCT-STACK-005 (Taskmaster #4): Rebuild task graph from NORTH_STAR + prd.txt (agent-curated) ✓ 2026-04-03
- D-HEXCURSE-PRODUCT-STACK-005 (Taskmaster #8): Confirm product stack in `docs/ARCHITECTURE.md` ✓ 2026-04-03
- D-HEXCURSE-PRODUCT-STACK-005: Part B closed — `docs/TASK_GRAPH_SNAPSHOT.md`, cursor-governance **v1.5.9**, tasks #3/#4/#8 done ✓ 2026-04-03
- D-HEXCURSE-AGENT-PARSE-006 (Taskmaster #16): `--parse-prd-via-agent` in `setup.js` — PRD → agent prompt, `--apply` writes `tasks.json`, doctor stub check, PATHS `agentParsePromptCache` — cursor-governance **v1.6.0** ✓ 2026-04-03
- D-HEXCURSE-OMNIBUS-007 (Taskmaster **#5, #6, #9–#15**): Semgrep Streamable HTTP, memory seed, installer parity, session ritual audit, Windows ConPTY + Linux Pampa/npm fallback, continual learning validation, skill promotion guide, token efficiency protocol — cursor-governance **v1.6.1** ✓ 2026-04-03 **1431f90**

---

## 🔄 In Progress
<!-- Only ONE directive In Progress at a time. -->
<!--
### D[NNN]: [Title]
**Taskmaster Task ID:** [ID from tasks.json]
**Branch:** D[NNN]-[kebab-desc]
**Scope:** [Files/modules this touches]
**Goal:** [What done looks like]
**Blockers:** [Known blockers — also log to memory MCP]
**Started:** [YYYY-MM-DD]
-->

---

## 📋 Queued
<!-- Synced with `.taskmaster/tasks/tasks.json` — 2026-04-03 (omnibus #5–#15 → done). -->
- Taskmaster **#16** — `Add --parse-prd-via-agent mode to setup.js` (implemented in **v1.6.0**; **pending** in JSON — close or expand when you reconcile the graph) | Priority: HIGH

---

## 💡 Backlog
<!-- Ideas not yet approved as directives. -->
- (none — product stack confirmed in NORTH_STAR / ARCHITECTURE)
