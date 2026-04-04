# MCP & tool coordination — HexCurse

This document is the **human-readable map** of how Cursor MCP servers and CLIs work together. The **binding specification** is **`.cursor/rules/mcp-usage.mdc`**; **`.cursor/rules/process-gates.mdc`** is the short always-on checklist. If anything here disagrees with those files, **the `.mdc` rules win**.

## Layout (two valid shapes)

| Layout | Where governance docs live | Session-start paste |
|--------|----------------------------|---------------------|
| **Source** (this HexCurse repo) | Repo root + **`docs/`** | **`docs/SESSION_START.md`** |
| **Install pack** (other projects after `setup.js`) | **`HEXCURSE/`** | **`HEXCURSE/SESSION_START.md`** (`PATHS.json` → **`paths.sessionStart`**) |

The **ritual and MCP stack are the same**; only path prefixes change.

## Server inventory (17 MCP servers)

Canonical merge order and wiring: **`buildMcpServers()`** in **`cursor-governance/setup.js`**. Archival table: **`docs/directives/D-HEXCURSE-MCP-RECONCILE-003.md`**.

| # | Server ID | Kind | Launch (summary) | Always on | Primary use |
|---|-----------|------|------------------|-----------|-------------|
| 1 | `taskmaster-ai` | stdio | `npx` **task-master-ai** | Yes | Task graph: **get_tasks**, **set_task_status**, **expand_task** |
| 2 | `context7` | stdio | **@upstash/context7-mcp** | Yes | Live library / API docs — never trust training data for APIs |
| 3 | `repomix` | stdio | **repomix --mcp** | Yes | One **compress** snapshot per session start |
| 4 | `serena` | stdio | **serena-mcp-server** (**uvx**) | Yes | Symbol navigation and workspace edits |
| 5 | `gitmcp` | URL | **gitmcp.io/docs** | Yes | Niche GitHub / SDK docs not covered by context7 |
| 6 | `gitmcp-adafruit-mpu6050` | URL | **gitmcp.io** Adafruit MPU6050 | When hardware | Driver / sensor / register docs |
| 7 | `sequential-thinking` | stdio | **@modelcontextprotocol/server-sequential-thinking** | Yes | Non-trivial plans before implementation |
| 8 | `memory` | stdio | **@modelcontextprotocol/server-memory** | Yes | Durable facts; never overrides repo truth |
| 9 | `github` | stdio | **@modelcontextprotocol/server-github** | Optional remote | PR / issue / API only when human asks — not local branch discovery |
| 10 | `jcodemunch` | stdio | **jcodemunch-mcp** (**uvx**) | Yes | Index, outline, symbols, references, blast radius (**RULE 10**) |
| 11 | `playwright` | stdio | **@playwright/mcp** | When UI work | E2E / browser verification |
| 12 | `semgrep` | stdio | **semgrep-mcp** (**uvx**) | When coding | **security_check** after writes; gate before commit |
| 13 | `sentry` | stdio | **@sentry/mcp-server** | When debugging | Issue / error context before deep source reads |
| 14 | `firecrawl` | stdio | **firecrawl-mcp** | When researching | Scrape / fetch external docs and pages |
| 15 | `linear` | stdio | **@mseep/linear-mcp** | When Linear enabled | Issues ↔ Taskmaster sync |
| 16 | `pampa` | stdio | **node** + global **pampa** path | When skills matter | Semantic **`.cursor/skills/`** search |
| 17 | `supabase` | URL | **mcp.supabase.com** | When using Supabase | Schema, RLS, Auth, Edge Functions |

**Not counted in 17:** **agents-memory-updater** (Cursor **Task** subagent / **RULE 9**), **`task-master`** CLI — same ritual, different mechanism.

### `mcp-usage.mdc` rule mapping

| RULE | Server / topic |
|------|----------------|
| 1 | taskmaster-ai |
| 2 | memory |
| 3 | sequential-thinking |
| 4 | Serena |
| 5 | context7 |
| 6 | repomix |
| 7 | gitmcp |
| 8 | Local git; github optional |
| 9 | agents-memory-updater / continual learning |
| 10 | jcodemunch |
| 11 | gitmcp-adafruit-mpu6050 |
| 12 | supabase |

## Invocation order within a session

Align with **`AGENTS.md`** / **`docs/SESSION_START.md`** (pack: **`HEXCURSE/…`**).

### SESSION START (typical order)

1. **memory** — Cross-session context first (after NORTH_STAR / ROLLING / Taskmaster per **`AGENTS.md`** step order).
2. **taskmaster-ai** — **get_tasks**; report active + next queued.
3. **DIRECTIVES** — Read from disk; reconcile with Taskmaster.
4. **jcodemunch** — **STEP 4a:** index / outline / **suggest_queries**.
5. **repomix** — **STEP 4b:** **--compress** once.
6. **semgrep** — **STEP 4c:** baseline on last 5 modified files when available.
7. **linear** — **STEP 4d:** **In Progress** issues when **LINEAR_API_KEY** set.
8. **pampa** — **STEP 4e:** skill search.
9. **sequential-thinking** — Full plan; then human **Confirmed. Proceed.** then **local git** branch.

### DURING IMPLEMENTATION (on trigger)

| Trigger | Server |
|---------|--------|
| Any library API | **context7** |
| UI change | **playwright** |
| Runtime / Sentry-linked error | **sentry** |
| External research | **firecrawl** (+ context7 for libs) |
| DB / Supabase | **supabase** |
| Human asked remote GitHub | **github** |
| Niche upstream / hardware docs | **gitmcp** / **gitmcp-adafruit-mpu6050** |
| Multi-step reasoning | **sequential-thinking** |
| Code discovery / impact | **jcodemunch** |
| Symbol edit | **Serena** |
| New fact | **memory** |

### SESSION CLOSE (typical order)

1. **git** — Diff / scope check.
2. **semgrep** — Final **security_check** on all modified source files (**process-gates.mdc**).
3. **playwright** — If UI work: final pass on affected flows.
4. **linear** — Done / create issues vs Taskmaster.
5. **memory** — Confirm discoveries saved.
6. **taskmaster-ai** — **set_task_status** etc.
7. **SESSION_LOG** + MCP utilization report.
8. **agents-memory-updater** when **RULE 9** applies; optional **`--learning-rollup`**.

## Coordination patterns

| Pattern | Flow |
|---------|------|
| Bug triage | **sentry** → **github** (search) → **semgrep** → **playwright** (verify fix) |
| Research → implement | **firecrawl** + **context7** → **Serena** (insertion point) → **semgrep** |
| Database feature | **supabase** (schema) → **Serena** → **semgrep** → **supabase** (verify) |
| Hardware driver | **gitmcp-adafruit-mpu6050** → **Serena** → **semgrep** |
| PR review | **github** (diff) → **semgrep** → **playwright** (E2E) |
| Multi-agent | **taskmaster-ai** (claim) → **swarm-protocol** (locks) → **Serena** → **github** (PR) |

## DEGRADED_MODE (17-server view)

When a server is **red**, **missing**, or **tool calls fail**, state **`DEGRADED_MODE: <id> — <reason>`** before proceeding and list what you will **not** assume. See **`mcp-usage.mdc`** for the full policy.

**Essential — session quality is severely degraded without these (get human or fix MCP):**

- **taskmaster-ai**, **memory**, **Serena**, **context7**

**Important — degrade gracefully; compensate with manual checks:**

- **sequential-thinking**, **repomix**, **gitmcp**, **jcodemunch**, **semgrep**

**Optional — continue with explicit gaps noted:**

- **github** (remote), **playwright**, **sentry**, **firecrawl**, **linear**, **pampa**, **gitmcp-adafruit-mpu6050**, **supabase**

**In DEGRADED_MODE:**

- Log unavailable servers in **SESSION_LOG.md**.
- Do not pretend a tool ran if it did not.
- **Do not commit** changed source without **semgrep** unless **semgrep** is explicitly unavailable — then **document the exception** in **SESSION_LOG.md** and the handoff.

## Token budget

Each active MCP adds roughly **500–1000** tokens of tool-description overhead per agent turn. Prefer disabling session-conditional servers in **`~/.cursor/mcp.json`** when you will not use them.

| Server | Always needed | When to disable |
|--------|---------------|-----------------|
| taskmaster-ai | Yes | Never |
| memory | Yes | Never |
| sequential-thinking | Yes | Never |
| github | Core ritual | Read-only sessions with no remote ops |
| context7 | Yes | Never (when writing code with deps) |
| serena | Yes | Never (when editing code) |
| repomix | Yes | Never (existing codebases) |
| gitmcp | Yes | Rarely |
| jcodemunch | Yes | Never (when touching code) |
| gitmcp-adafruit-mpu6050 | Project | Non-hardware sessions |
| supabase | When using Supabase | Frontend-only / no DB |
| playwright | When UI work | Backend-only |
| semgrep | When writing code | Read-only research |
| sentry | When debugging errors | Greenfield |
| firecrawl | When researching | Air-gapped |
| linear | When using Linear | Teams not on Linear |
| pampa | When searching skills | Minimal first sessions |

Full notes: **`docs/MCP_TOKEN_BUDGET.md`** (pack: **`HEXCURSE/docs/MCP_TOKEN_BUDGET.md`**).

**CLI:** **`task-master`** (Taskmaster) is used with MCP; align **`.taskmaster/config.json`** with your local LLM (e.g. LM Studio) per **`docs/ARCHITECTURE.md`** (pack: **`HEXCURSE/docs/ARCHITECTURE.md`**).

### Taskmaster LLM vs Cursor CLI (headless)

- **Taskmaster** (`task-master` CLI / taskmaster-ai MCP) talks to an **HTTP** LLM provider (LM Studio OpenAI-compatible, Anthropic, OpenAI, **`task-master models --openai-compatible --baseURL …`**, etc.). It does **not** embed the [Cursor headless](https://cursor.com/docs/cli/headless) agent process.
- **[Cursor CLI auth](https://cursor.com/docs/cli/reference/authentication.md)** (`agent login`, `agent status`, optional `CURSOR_API_KEY`) applies to **`agent`** (including headless `agent -p`). To **gate** the NORTH_STAR bridge so `parse-prd` runs only after CLI login, set **`HEXCURSE_PREFLIGHT_CURSOR_AGENT=1`** (runs `agent status` before `task-master parse-prd` in **`setup.js --run-hexcurse` / `--run-hexcurse-raw`**), or run **`npm run preflight:cursor-agent`** / **`node cursor-governance/setup.js --preflight-cursor-agent`**.

## Continual learning artifacts (skills, taxonomy, rollup)

- **`docs/MEMORY_TAXONOMY.md`** — fixed buckets and MCP tag convention for merges into memory and **`AGENTS.md`** **Learned Workspace Facts**.
- **`.cursor/skills/`** — committed procedural memory (**`README.md`**, per-skill **`SKILL.md`**); promotion from **`skill-promotion-queue.json`** when a **`lessonKey`** hits threshold (see **`docs/CONTINUAL_LEARNING.md`**).
- **`docs/ROLLING_CONTEXT.md`** — rolling consolidation; deterministic append via **`setup.js --learning-rollup`** (safe for OS cron); LLM summary optional when **RULE 9** runs and rollup is stale.
- **Codebase grounding:** **invariant** / **gotcha** / **architecture** facts should cite **`path::symbol`**; use **Serena** and, when cross-file confirmation helps, **jcodemunch** (`search_symbols` / `get_symbol_source`) before persisting (see taxonomy + continual-learning procedure).

## Maximum usefulness (not “check the box”)

- Use each MCP where it is **materially relevant**; if you skip one that is available and relevant, say **why** in the handoff and SESSION_LOG.
- Do not substitute **guessing** or **bulk file reads** when this document and **`mcp-usage.mdc`** name a better tool.

## Related docs

In **`HEXCURSE/`** pack repos, the same filenames live under **`HEXCURSE/`** (see **`HEXCURSE/PATHS.json`**).

- **`AGENTS.md`** (pack: **`HEXCURSE/AGENTS.md`**) — Session start/close checklists and Learned Workspace Facts.
- **Session-start paste** — **`docs/SESSION_START.md`** or **`HEXCURSE/SESSION_START.md`**.
- **`docs/CONTINUAL_LEARNING.md`** (pack: **`HEXCURSE/docs/...`**) — Transcript mining and RULE 9.
- **`docs/CURSOR_MODES.md`** (pack: **`HEXCURSE/docs/...`**) — Agent vs Architect vs Ask.
- **`docs/ARCHITECTURE.md`** (pack: **`HEXCURSE/docs/...`**) — System map and dependency table.
- **`docs/GOVERNANCE_PARITY.md`** (pack: **`HEXCURSE/docs/GOVERNANCE_PARITY.md`**) — Rules vs automation; CI doctor behavior.
- **`CURSOR.md`** — Quick links and human-side strengthening (User rules + MCP green).
