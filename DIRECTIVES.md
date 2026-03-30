# DIRECTIVES — HexCurse
# Human-readable task chain. Taskmaster tasks.json is the machine source of truth.
# Sync these after every session close.
# Format: D[3-digit number] — mirrors Taskmaster task IDs where possible.

---

## ✅ Completed
- D000: Governance + MCP scaffold (repo initialization) ✓ 2026-03-29 bef73ac
- D001: Verify and freeze governance rules ✓ 2026-03-29 d1f0f65

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
- D002: Sync DIRECTIVES.md with Taskmaster | Priority: HIGH | Depends on: D001
- D003: Configure .env for Taskmaster AI providers | Priority: HIGH | Depends on: —
- D004: Re-run parse-prd when API keys available | Priority: MED | Depends on: D003
- D005: Seed memory MCP from docs/MEMORY_SEED.md | Priority: MED | Depends on: —
- D006: Verify MCP servers show green in Cursor | Priority: MED | Depends on: —
- D007: Commit governance scaffold to Git | Priority: MED | Depends on: D002
- D008: Confirm product stack and update ARCHITECTURE | Priority: LOW | Depends on: —
- D009: Add application source tree (post-stack confirmation) | Priority: LOW | Depends on: D008
- D010: Optional: tm rules --setup for Cursor integration | Priority: LOW | Depends on: —
- D014: cursor-governance installer — Windows PowerShell readline prompts + ora removal (verify complete) | Priority: HIGH | Depends on: —
- D015: Linux compatibility for cursor-governance installer (`setup.js` only) | Priority: HIGH | Depends on: D014

---

## 💡 Backlog
<!-- Ideas not yet approved as directives. -->
- Confirm application purpose, primary language, and framework; then add Phase B directives.
