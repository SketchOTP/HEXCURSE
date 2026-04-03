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
<!-- Synced with `.taskmaster/tasks/tasks.json` — 2026-04-03 (15 tasks; #3 #4 #8 → done). -->
- D005 (Taskmaster #5): Seed memory MCP from docs/MEMORY_SEED.md | Priority: MED | Depends on: —
- D006 (Taskmaster #6): Verify MCP servers show green in Cursor | Priority: MED | Depends on: —
- D009 (Taskmaster #9): Installer correctness — setup.js parity with AGENTS + GOVERNANCE_PARITY | Priority: HIGH | Depends on: D001
- D010 (Taskmaster #10): Validate continual learning loop in a real repo | Priority: HIGH | Depends on: D009
- D011 (Taskmaster #11): Skill promotion pipeline and PAMPA cadence | Priority: MED | Depends on: D010
- D012 (Taskmaster #12): Token efficiency measurement protocol (session 1 vs N) | Priority: MED | Depends on: D010
- D013 (Taskmaster #13): Session ritual accuracy vs live MCP coordination | Priority: MED | Depends on: D001, D002
- D014 (Taskmaster #14): cursor-governance installer — Windows PowerShell readline + no ora | Priority: HIGH | Depends on: D009
- D015 (Taskmaster #15): Linux compatibility for cursor-governance installer (`setup.js` only) | Priority: HIGH | Depends on: D014

---

## 💡 Backlog
<!-- Ideas not yet approved as directives. -->
- (none — product stack confirmed in NORTH_STAR / ARCHITECTURE)
