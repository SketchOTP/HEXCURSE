# Rolling context — HexCurse

Long-horizon consolidation of **what changed** and **what we learned** across sessions. **LLM-written** summaries go in dated sections below. **Deterministic** excerpts from **`SESSION_LOG.md`** are appended by:

`node cursor-governance/setup.js --learning-rollup`

Do not delete historical sections; append new ones. For taxonomy-classified facts, prefer **`docs/MEMORY_TAXONOMY.md`** + **`AGENTS.md` Learned Workspace Facts** + **`.cursor/skills/`**.

---

## How this file is updated

| Mechanism | What it does |
|-----------|----------------|
| **agents-memory-updater** (RULE 9) | Summarizes recent **`SESSION_LOG.md`** + transcripts into a new **dated** `## YYYY-MM-DD` section when triggered. |
| **`--learning-rollup`** | Parses last **N** session blocks from **`SESSION_LOG.md`** and appends a **Raw session index** (no LLM). Safe for OS cron. |

State: **`.cursor/hooks/state/continual-learning.json`** — rollup dedupe: `lastRollupAt`, `lastRollupSessionKey`, `sessionsSinceRollup`; learning debounce: `lastMemoryUpdaterRunDateUtc`; optional next-chat hint: `pendingLearning`. Full schema and procedures: **`docs/CONTINUAL_LEARNING.md`**.

---

## Summaries and rollups

*(No entries yet — run a learning pass or `learning-rollup` after you have **SESSION_LOG** sessions.)*


## Raw session index — 2026-03-30T22:18:42.151Z

_(Last 2 session block(s) from SESSION_LOG.md — deterministic rollup, no LLM.)_

### Session S-002 — 2026-03-29
**Directive:** (ad hoc) — LM Studio + qwen3.5-2b (~8k ctx)
**Taskmaster Task ID:** n/a
**Branch:** n/a
**Files modified:** `.taskmaster/config.json`, `.env.example`, `.cursor/rules/base.mdc`, `docs/ARCHITECTURE.md`, `docs/MEMORY_SEED.md`, `.taskmaster/tasks/tasks.json`, `CURSOR_SYSTEM_USER_GUIDE.md`, `CURSOR_AGENT_SETUP_PROMPT_V2.md`, `docs/PART0_MCP_TEMPLATE.json`
**Files created:** none
**Outcome:** COMPLETE
**Blockers logged to memory:** no
**PR opened:** no
**Commit hash:** 6943d06 (LM Studio config); 59ed750 (SESSION_LOG hash correction)
**Notes:** Main/research/fallback models set to provider `lmstudio`, `qwen3.5-2b`, baseURL `http://100.80.17.40:1234/v1`, ~8k context. If LM Studio shows a different model string, align `modelId` or re-run `task-master models --set-main "<id>" --lmstudio --baseURL http://100.80.17.40:1234/v1`.

### Session S-003 — 2026-03-29
**Directive:** D001 — Verify and freeze governance rules
**Taskmaster Task ID:** 1 (set to done)
**Branch:** D001-verify-freeze-governance (local only; no `git remote`)
**Files modified:** `AGENTS.md`, `DIRECTIVES.md`, `.taskmaster/tasks/tasks.json`, `SESSION_LOG.md`
**Files created:** none
**Outcome:** COMPLETE
**Blockers logged to memory:** no (noted: no GitHub remote — tooling observation stored in memory graph)
**PR opened:** no — `git remote` empty; add `origin` before GitHub MCP PR flow
**Commit hash:** 48f08a8
**Notes:** Reviewed `.cursor/rules/base.mdc` and `mcp-usage.mdc` (`alwaysApply: true`); aligned with `AGENTS.md` SESSION START. **Change:** STEP 3 now defers Taskmaster/DIRECTIVES bookkeeping drift to D002 when it does not block the active directive. Follow-up commits on this branch repaired SESSION_LOG after a case-insensitive PowerShell `-replace` accident. Next queued directive: **D002** (Taskmaster task 2).

