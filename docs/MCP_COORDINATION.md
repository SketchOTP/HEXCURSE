# MCP & tool coordination — HexCurse

This document is the **human-readable map** of how Cursor MCP servers and CLIs work together. The **binding specification** is **`.cursor/rules/mcp-usage.mdc`**; **`.cursor/rules/process-gates.mdc`** is the short always-on checklist. If anything here disagrees with those files, **the `.mdc` rules win**.

## Layout (two valid shapes)

| Layout | Where governance docs live | Session-start paste |
|--------|----------------------------|---------------------|
| **Source** (this HexCurse repo) | Repo root + **`docs/`** | **`docs/SESSION_START_PROMPT.md`** |
| **Install pack** (other projects after `setup.js`) | **`HEXCURSE/`** | **`HEXCURSE/SESSION_START_PROMPT.md`** (`PATHS.json` lists paths) |

The **ritual and MCP stack are the same**; only path prefixes change.

## MCP stack — role, rule, and when to use it

| MCP / tool | `mcp-usage.mdc` | Role | Use it to |
|------------|-----------------|------|-----------|
| **memory** | RULE 2 | Durable project facts | **Session start:** query before reading DIRECTIVES / ARCHITECTURE. **During:** write immediately on discoveries. **Close:** confirm discoveries saved. Never overrides Taskmaster / DIRECTIVES / ARCHITECTURE / live tree. |
| **taskmaster-ai** | RULE 1 | Task graph | **`get_tasks`** right after memory, before planning or code. **`set_task_status`** when a directive completes. **`expand_task`** when scope is too large. |
| **repomix** | RULE 6 | Repo structure | **Once** at session start on an existing codebase (`repomix --compress`). Structural map — not for per-symbol work. |
| **jcodemunch** | RULE 10 | Indexed local exploration | **After repomix** when code work is planned: `resolve_repo` / `index_folder` on the workspace root; `get_repo_outline`, `suggest_queries`. **During work:** `search_symbols`, `get_symbol_source`, `get_context_bundle`, `get_ranked_context`, `find_references`, `get_blast_radius`, `search_text`, etc. Complements **Serena** (discovery + impact vs symbol edits). Package: **`jcodemunch-mcp`**. |
| **sequential-thinking** | RULE 3 | Plan quality | Before any **non-trivial implementation plan** shown to the human. Output: numbered plan with paths and symbols. |
| **Serena** | RULE 4 | Code intelligence | **Before** touching code: `find_symbol`, `find_referencing_symbols`, targeted edits. Avoid whole-file reads when symbols suffice; >100-line `read_file` forbidden without human approval. |
| **context7** | RULE 5 | Library truth | **Before every** external library / API call you are about to write. Training data is stale; context7 is not. |
| **gitmcp** | RULE 7 | Niche upstream docs | Hardware SDKs, firmware, niche GitHub libs **not** well covered as mainstream context7 docs. |
| **github** | RULE 8 (optional) | Remote GitHub API | **Not** for local branch or file discovery. Use only if the human wants a remote PR/issue or API query. Local branch: **git**; publish: **`git push`**. |
| **agents-memory-updater** | RULE 9 | Continual learning | Human request; **automatic** at close when **governance** paths changed (no debounce); or **parent transcript delta** vs index with **debounce** (`lastMemoryUpdaterRunDateUtc` in **continual-learning.json**). Optional **`node cursor-governance/setup.js --learning-rollup`** when **lastRollupAt** is stale. See **`docs/CONTINUAL_LEARNING.md`** (pack: **`HEXCURSE/docs/CONTINUAL_LEARNING.md`**). |

**CLI:** **`task-master`** (Taskmaster) is used with MCP; align **`.taskmaster/config.json`** with your local LLM (e.g. LM Studio) per **`docs/ARCHITECTURE.md`** (pack: **`HEXCURSE/docs/ARCHITECTURE.md`**).

### Taskmaster LLM vs Cursor CLI (headless)

- **Taskmaster** (`task-master` CLI / taskmaster-ai MCP) talks to an **HTTP** LLM provider (LM Studio OpenAI-compatible, Anthropic, OpenAI, **`task-master models --openai-compatible --baseURL …`**, etc.). It does **not** embed the [Cursor headless](https://cursor.com/docs/cli/headless) agent process.
- **[Cursor CLI auth](https://cursor.com/docs/cli/reference/authentication.md)** (`agent login`, `agent status`, optional `CURSOR_API_KEY`) applies to **`agent`** (including headless `agent -p`). To **gate** the NORTH_STAR bridge so `parse-prd` runs only after CLI login, set **`HEXCURSE_PREFLIGHT_CURSOR_AGENT=1`** (runs `agent status` before `task-master parse-prd` in **`setup.js --run-hexcurse` / `--run-hexcurse-raw`**), or run **`npm run preflight:cursor-agent`** / **`node cursor-governance/setup.js --preflight-cursor-agent`**.

## Session timeline (implementation agent)

Order matches **`AGENTS.md` SESSION START** and keeps tools coordinated:

1. **memory** — Query all stored project facts.
2. **taskmaster-ai** — `get_tasks`; report active + next queued.
3. **DIRECTIVES** — Read and confirm sync with Taskmaster (resolve drift before coding).
4. **repomix** — `repomix --compress` once for structure.
4b. **jcodemunch** — Ensure local index (`resolve_repo` / `index_folder` on workspace root); `get_repo_outline` / `suggest_queries` when useful before planning deep code work.
5. **sequential-thinking** — Full plan for the active directive; wait for **"Confirmed. Proceed."**
6. **Local git** — Create branch (`git checkout -b D[NNN]-…` or use existing), then implementation begins. **github** MCP is **not** part of this step.

**During work:** **jcodemunch** for ranked retrieval, outlines, references, blast radius, and multi-file search; **Serena** for symbol-level edits in the workspace; context7 before library calls; gitmcp when the dependency is niche; memory writes on discoveries. **Source of truth** is files **on disk** in the workspace — see **SOURCE OF TRUTH** in **`mcp-usage.mdc`**.

**Session close (see `AGENTS.md`):** git diff → memory check → Taskmaster done → DIRECTIVES → SESSION_LOG → optional remote PR (**github** MCP **only if** the human asked) → **MCP utilization report** (used + not used with reasons) → **RULE 9** if applicable.

## Continual learning artifacts (skills, taxonomy, rollup)

- **`docs/MEMORY_TAXONOMY.md`** — fixed buckets and MCP tag convention for merges into memory and **`AGENTS.md`** **Learned Workspace Facts**.
- **`.cursor/skills/`** — committed procedural memory (**`README.md`**, per-skill **`SKILL.md`**); promotion from **`skill-promotion-queue.json`** when a **`lessonKey`** hits threshold (see **`docs/CONTINUAL_LEARNING.md`**).
- **`docs/ROLLING_CONTEXT.md`** — rolling consolidation; deterministic append via **`setup.js --learning-rollup`** (safe for OS cron); LLM summary optional when **RULE 9** runs and rollup is stale.
- **Codebase grounding:** **invariant** / **gotcha** / **architecture** facts should cite **`path::symbol`**; use **Serena** and, when cross-file confirmation helps, **jcodemunch** (`search_symbols` / `get_symbol_source`) before persisting (see taxonomy + continual-learning procedure).

## Maximum usefulness (not “check the box”)

- Use each MCP where it is **materially relevant**; if you skip one that is available and relevant, say **why** in the handoff and SESSION_LOG.
- Do not substitute **guessing** or **bulk file reads** when the table above has a better tool.
- **DEGRADED_MODE:** If a server is missing, red, or failing, state `DEGRADED_MODE: <mcp> — <reason>` and what you will **not** assume (see **`process-gates.mdc`**).

## Related docs

In **`HEXCURSE/`** pack repos, the same filenames live under **`HEXCURSE/`** (see **`HEXCURSE/PATHS.json`**).

- **`AGENTS.md`** (pack: **`HEXCURSE/AGENTS.md`**) — Session start/close checklists and Learned Workspace Facts.
- **Session-start paste** — **`docs/SESSION_START_PROMPT.md`** or **`HEXCURSE/SESSION_START_PROMPT.md`**.
- **`docs/CONTINUAL_LEARNING.md`** (pack: **`HEXCURSE/docs/...`**) — Transcript mining and RULE 9.
- **`docs/CURSOR_MODES.md`** (pack: **`HEXCURSE/docs/...`**) — Agent vs Architect vs Ask.
- **`docs/ARCHITECTURE.md`** (pack: **`HEXCURSE/docs/...`**) — System map and dependency table.
- **`docs/GOVERNANCE_PARITY.md`** (pack: **`HEXCURSE/docs/GOVERNANCE_PARITY.md`**) — Rules vs automation; CI doctor behavior.
- **`CURSOR.md`** — Quick links and human-side strengthening (User rules + MCP green).
