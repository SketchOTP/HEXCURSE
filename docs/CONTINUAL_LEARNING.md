# Continual learning — HexCurse (this repository)

**MCP context:** **agents-memory-updater** is **RULE 9** in **`mcp-usage.mdc`**. How it fits with memory, Taskmaster, github, etc.: **`docs/MCP_COORDINATION.md`**.

**Taxonomy:** Classify and merge all durable output per **`docs/MEMORY_TAXONOMY.md`** (`[hexcurse:<bucket>]` tags, **`AGENTS.md`** subsections). **Codebase grounding:** for **invariant**, **gotcha**, and **architecture** facts, confirm **`path::symbol`** with **Serena** `find_symbol` and, when useful, **jcodemunch** `search_symbols` / `get_symbol_source` (or verify the path exists) before writing memory or **`AGENTS.md`**. For **structural** lessons, note **repomix** top-level dirs or section hints in one line.

Mine **durable workspace facts** from Cursor agent transcripts into **memory MCP** and **`AGENTS.md`** (**Learned Workspace Facts**) using an **incremental index** so you do not re-read every transcript every time.

## Paths

| Artifact | Path |
|----------|------|
| Incremental transcript index | `.cursor/hooks/state/continual-learning-index.json` |
| Hook / automation state | `.cursor/hooks/state/continual-learning.json` |
| Skill promotion queue (gitignored) | `.cursor/hooks/state/skill-promotion-queue.json` |
| Memory taxonomy | `docs/MEMORY_TAXONOMY.md` |
| Rolling consolidation (committed) | **`HEXCURSE/docs/ROLLING_CONTEXT.md`** on pack installs; legacy `docs/ROLLING_CONTEXT.md` still read by `--learning-rollup` if present |
| Cursor skills (committed) | `.cursor/skills/` |

The `.cursor/hooks/state/` directory is **gitignored** (machine-local). **cursor-governance** installs seed JSON files on new repos; this workspace already uses them if present.

**New installs** under **`HEXCURSE/`** also get **`HEXCURSE/docs/CONTINUAL_LEARNING.md`** and the same paths in **`HEXCURSE/PATHS.json`**.

## How to run (Cursor agent)

When **RULE 9** fires, the human asks for continual learning, or **`continual-learning.json`** indicates a pending pass:

1. Use the **agents-memory-updater** subagent (or equivalent **Task**) for the full flow.
2. **Incremental processing:** Only process **parent** agent transcripts that are **not** in the index, or whose filesystem **mtime** is **newer** than the `mtimeUtc` stored for that path. Do **not** use `agent-transcripts/.../subagents/` as transcript sources unless the human explicitly asks.
3. After processing: **refresh** `mtimeUtc` for every remaining index entry to match disk; **remove** entries for deleted transcript files.
4. **Pipeline:** **classify** (taxonomy bucket) → **dedupe** (memory + **`AGENTS.md`** subsection) → **merge**. Never dump raw transcript text into **`AGENTS.md`**.
5. **Memory MCP:** store only durable, non-secret facts with **`[hexcurse:<bucket>]`** prefixes per **`docs/MEMORY_TAXONOMY.md`**.
6. **`AGENTS.md`:** update **## Learned Workspace Facts** subsections (**### Invariant** … **### Workflow**) only for **high-signal** recurring or long-lived facts.
7. **Skill promotion:** Update **`.cursor/hooks/state/skill-promotion-queue.json`** under **`candidates[<lessonKey>]`** (see **`.cursor/skills/README.md`** example): increment **`count`**; when **count ≥ 3**, draft or extend **`.cursor/skills/<kebab>/SKILL.md`**, then reset or archive that candidate.
8. **Rolling context:** Prefer **`node cursor-governance/setup.js --learning-rollup`** (no LLM) to append recent session log blocks (**`HEXCURSE/SESSION_LOG.md`** or legacy root **`SESSION_LOG.md`**) to **`HEXCURSE/docs/ROLLING_CONTEXT.md`** (or legacy **`docs/ROLLING_CONTEXT.md`**); **`continual-learning.json`** tracks **`lastRollupAt`** / **`lastRollupSessionKey`**. Optionally add an LLM summary when **RULE 9** runs and **`lastRollupAt`** is stale (align with **mcp-usage.mdc** RULE 9 optional rollup).
9. If nothing qualifies, respond exactly: `No high-signal memory updates.`

Parent transcripts (example path shape on Windows):

`%USERPROFILE%\.cursor\projects\<project-folder>\agent-transcripts\<uuid>\<uuid>.jsonl`

Use **absolute paths** from the local filesystem as index keys.

## Self-improvement loop (HexCurse)

1. **During work:** Write durable facts to **memory MCP** as you learn them (**mcp-usage.mdc RULE 2**), tagged by bucket.
2. **Session close:** **mcp-usage.mdc RULE 9** and **AGENTS.md** STEP 10 — run **agents-memory-updater** when triggers apply (governance touch, **transcript delta**, human request, debounce rules in **`continual-learning.json`**).
3. **Debounced skip:** If **transcript delta** qualifies but **`lastMemoryUpdaterRunDateUtc`** blocks a run for that UTC day, set **`pendingLearning`: true** in **`continual-learning.json`** so the next session can prioritize RULE 9 early (**`docs/SESSION_START_PROMPT.md`**). Clear **`pendingLearning`** after a successful updater pass.
4. **Incremental index** limits work to new or **mtime-updated** parent transcripts only.

## Installer

Re-running **cursor-governance** does **not** overwrite existing hook state files. Delete the JSON files manually if you need a fresh index.
