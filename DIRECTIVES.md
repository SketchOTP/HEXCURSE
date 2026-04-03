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
<!-- Synced with `.taskmaster/tasks/tasks.json` pending tasks — 2026-04-02 (tasks 2, 7 → done). Re-sync after parse-prd or task edits. -->
- D003 (Taskmaster #3): Configure .env for Taskmaster AI providers | Priority: HIGH | Depends on: —
- D004 (Taskmaster #4): Re-run parse-prd when LM Studio is available | Priority: MED | Depends on: D003
- D005 (Taskmaster #5): Seed memory MCP from docs/MEMORY_SEED.md | Priority: MED | Depends on: —
- D006 (Taskmaster #6): Verify MCP servers show green in Cursor | Priority: MED | Depends on: —
- D008 (Taskmaster #8): Confirm product stack and update ARCHITECTURE | Priority: LOW | Depends on: —
- D009 (Taskmaster #9): Add application source tree (post-stack confirmation) | Priority: LOW | Depends on: D008
- D010 (Taskmaster #10): Optional: tm rules --setup for Cursor integration | Priority: LOW | Depends on: —
- D014 (Taskmaster #14): cursor-governance installer — Windows PowerShell readline + ora removal | Priority: HIGH | Depends on: —
- D015 (Taskmaster #15): Linux compatibility for cursor-governance installer (`setup.js` only) | Priority: HIGH | Depends on: D014

---

## 💡 Backlog
<!-- Ideas not yet approved as directives. -->
- Confirm application purpose, primary language, and framework; then add Phase B directives.
