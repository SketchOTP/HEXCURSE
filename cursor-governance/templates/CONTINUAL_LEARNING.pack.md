# Continual learning — {{PROJECT_NAME}}

**MCP context:** **agents-memory-updater** is **RULE 9** in **`mcp-usage.mdc`**. Full stack map: **HEXCURSE/docs/MCP_COORDINATION.md**.

**Taxonomy:** Classify per **HEXCURSE/docs/MEMORY_TAXONOMY.md** (`[hexcurse:<bucket>]`, **AGENTS.md** subsections under **Learned Workspace Facts**). **Codebase grounding:** for **invariant**, **gotcha**, **architecture** — confirm **`path::symbol`** with **Serena** or path check before persisting.

Mine durable facts from transcripts into **memory MCP** and **HEXCURSE/AGENTS.md** using the incremental index.

## Paths (see **HEXCURSE/PATHS.json**)

| Artifact | Path |
|----------|------|
| Incremental transcript index | `.cursor/hooks/state/continual-learning-index.json` |
| Hook / automation state | `.cursor/hooks/state/continual-learning.json` |
| Skill promotion queue | `.cursor/hooks/state/skill-promotion-queue.json` |
| Memory taxonomy | **HEXCURSE/docs/MEMORY_TAXONOMY.md** |
| Rolling consolidation | **docs/ROLLING_CONTEXT.md** (repo root) |
| Cursor skills | `.cursor/skills/` |

## How to run (Cursor agent)

When **RULE 9** fires, the human asks, or **`continual-learning.json`** indicates pending work:

1. **agents-memory-updater** (or equivalent Task).
2. **Incremental:** parent transcripts only; **mtime** vs index per **CONTINUAL_LEARNING** standard rules.
3. **Refresh** index mtimes after processing.
4. **classify → dedupe → merge** (never raw chat into **AGENTS.md**).
5. **Memory:** `[hexcurse:<bucket>]` prefixes.
6. **HEXCURSE/AGENTS.md:** subsections **### Invariant** … **### Workflow** only for high-signal facts.
7. **Skill promotion:** update **`candidates[<lessonKey>]`** in **skill-promotion-queue.json** (see **`.cursor/skills/README.md`**); at **count ≥ 3**, add **`.cursor/skills/<kebab>/SKILL.md`**, then reset/archive that candidate.
8. **Rolling context:** Prefer **`node cursor-governance/setup.js --learning-rollup`** (no LLM) to append **SESSION_LOG** excerpts to **docs/ROLLING_CONTEXT.md**; **`continual-learning.json`** tracks **`lastRollupAt`** / **`lastRollupSessionKey`**. Optionally add an LLM summary when **RULE 9** runs and rollup is stale (~14 days or missing per **mcp-usage.mdc**).
9. If nothing qualifies: `No high-signal memory updates.`

Parent transcripts: `%USERPROFILE%\.cursor\projects\<project>\agent-transcripts\<uuid>\<uuid>.jsonl` (Windows example). Use absolute paths as index keys.

## Self-improvement loop

1. **During work:** memory MCP (**RULE 2**), tagged buckets.
2. **Session close:** **RULE 9** / **AGENTS** STEP 10 — updater when governance touch, **transcript delta**, human request, or debounce fields in **`continual-learning.json`**.
3. **Debounced skip:** If transcript delta qualifies but **`lastMemoryUpdaterRunDateUtc`** blocks a run, set **`pendingLearning`: true**; next session runs RULE 9 early (**SESSION_START_PROMPT**). Clear after a successful pass.
4. **Incremental index** limits re-reads.

## Installer

Re-running **cursor-governance** does not overwrite existing hook state (skip if present).
