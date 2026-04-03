# Cursor — HexCurse (this repository)

This repo is the **cursor-governance** / HexCurse **source**: governance files live at **repo root** and under **`docs/`** — not under a nested **`HEXCURSE/`** folder. Running **`cursor-governance/setup.js`** in **another** project creates a single **`HEXCURSE/`** pack there with **NORTH_STAR**, **CURSOR**, **AGENTS**, **docs/**, and the rest **inside that folder only** (root **`AGENTS.md`** stays a short pointer).

## Consumer projects — minimal flow

1. Fill **`HEXCURSE/NORTH_STAR.md`** (remove the standalone placeholder line **`NORTH_STAR_NOT_READY`** when done).
2. **Either** run the **[Cursor headless CLI](https://cursor.com/docs/cli/headless)** with **`composer-2`** using **`HEXCURSE/HEADLESS_KICKOFF.txt`** (commands in **`HEXCURSE/ONE_PROMPT.md`**), **or** paste the in-IDE fenced block from **`HEXCURSE/ONE_PROMPT.md`** as the **only** first message in a new Agent chat.

See **`docs/ONE_PROMPT.md`** and **`cursor-governance/README.md`**. CLI parameters: [Using headless / print mode](https://cursor.com/docs/cli/headless), [`--model`](https://cursor.com/docs/cli/reference/parameters).

## Start every implementation chat

1. Paste **`docs/SESSION_START_PROMPT.md`** at the top of the chat (or `@` the paths it lists).
2. Full agent rules: **`AGENTS.md`**.
3. **MCP:** Cursor Settings → MCP — keep the [**17 servers**](#mcp-quick-reference-17-servers) you need **green** (see also [`docs/MCP_TOKEN_BUDGET.md`](docs/MCP_TOKEN_BUDGET.md)). **agents-memory-updater** is a Cursor **Task** subagent (RULE 9), not an `mcp.json` id.

## MCP coordination (use the stack fully)

- **Map:** [`docs/MCP_COORDINATION.md`](docs/MCP_COORDINATION.md) — 17-server inventory, invocation order, coordination patterns, **DEGRADED_MODE**, token budget.
- **Binding behavior:** **`.cursor/rules/mcp-usage.mdc`** + **`.cursor/rules/process-gates.mdc`** (short checklist + Semgrep / ADR gates).

## Active governance rules (5 default × `.mdc`)

Same activation summary as **`docs/SESSION_START_PROMPT.md`** STEP 6:

- **Always loaded:** `base.mdc`, `mcp-usage.mdc`, `process-gates.mdc`.
- **When writing/editing source (globs):** `security.mdc`.
- **Architectural decisions (globs):** `adr.mdc`.
- **Multi-agent:** `multi-agent.mdc` only after **`setup.js --multi-agent`** and when **`HEXCURSE_MULTI_AGENT=1`** / **`HEXCURSE/docs/MULTI_AGENT.md`** applies.

## MCP quick reference (17 servers)

**Always-on for typical implementation sessions:** `taskmaster-ai`, `memory`, `sequential-thinking`, `context7`, `repomix`, `serena`, `gitmcp`, `jcodemunch` — plus `github` when you need remote PR/issue/API (optional per **`mcp-usage.mdc`**).

**Session-conditional:** `playwright` (UI), `semgrep` (code + commits), `sentry` (errors), `firecrawl` (research), `linear` (tracked work), `pampa` (`.cursor/skills/` search).

**Project-specific:** `gitmcp-adafruit-mpu6050` (MPU6050), `supabase` (Supabase backends).

Details: [`docs/MCP_COORDINATION.md`](docs/MCP_COORDINATION.md) and [`docs/directives/D-HEXCURSE-MCP-RECONCILE-003.md`](docs/directives/D-HEXCURSE-MCP-RECONCILE-003.md).

## New in v1.5.x

- **Six** new general MCP servers: **playwright**, **semgrep**, **sentry**, **firecrawl**, **linear**, **pampa**.
- **Two** project-specific URL servers: **gitmcp-adafruit-mpu6050**, **supabase**.
- **Six** new `.mdc` rules: **security**, **adr**, **memory-management**, **debugging**, **multi-agent**, **linear-sync** (10 governance rules total with **base**, **mcp-usage**, **process-gates**, **governance**).
- Installer flags **`--multi-agent`** (worktree / swarm scaffold) and **`--sync-rules`** (remote rule refresh); see [`docs/QUICK_COMMAND_REFERENCE.md`](docs/QUICK_COMMAND_REFERENCE.md).

## Strengthen compliance (human-side)

- **User / Project rules:** Cursor Settings → Rules — paste the same bullets as [`.cursor/rules/process-gates.mdc`](.cursor/rules/process-gates.mdc).
- **MCP health:** Red or absent servers mean the agent cannot follow MCP-mandatory rules — expect **`DEGRADED_MODE`** in the reply.
- **First message:** Prefer pasting **only** `docs/SESSION_START_PROMPT.md` first, then your task in a **second** message.

## Architect / planning (outside Cursor)

The **Architect** is a **separate** AI: copy the fenced block from **`docs/ARCH_PROMPT.md`**, paste repo excerpts yourself, then paste the Architect’s **“Next message for Cursor”** back here. Mode overview: **`docs/CURSOR_MODES.md`**.

## CLI (from this repo root)

- Health check: `node cursor-governance/setup.js --doctor`
- Refresh `.cursor/rules` from the installer bundle: `node cursor-governance/setup.js --refresh-rules`
- **Consumer repos — headless Cursor Agent:** from the consumer repo root, `agent -p --model composer-2 --trust --workspace .` with **`HEXCURSE/HEADLESS_KICKOFF.txt`** (see **`HEXCURSE/ONE_PROMPT.md`**). [Headless doc](https://cursor.com/docs/cli/headless).
- **Consumer repos — node bridge only:** fill **`HEXCURSE/NORTH_STAR.md`**, then `node cursor-governance/setup.js --run-hexcurse` (or `--run-hexcurse-raw`) from **that** project root to regenerate PRD, tasks, and **HEXCURSE/DIRECTIVES.md** Queued section.

## Continual learning

- **Procedure & triggers:** [`docs/CONTINUAL_LEARNING.md`](docs/CONTINUAL_LEARNING.md) (RULE 9 in **`mcp-usage.mdc`**).
- **Taxonomy (classify → merge):** [`docs/MEMORY_TAXONOMY.md`](docs/MEMORY_TAXONOMY.md) and **`AGENTS.md`** **Learned Workspace Facts**.
- **Procedural memory (skills):** [`.cursor/skills/README.md`](.cursor/skills/README.md) — promotion queue **`.cursor/hooks/state/skill-promotion-queue.json`** (gitignored).
- **Rolling context:** [`docs/ROLLING_CONTEXT.md`](docs/ROLLING_CONTEXT.md); deterministic append: `node cursor-governance/setup.js --learning-rollup`.
- **Incremental index:** **`.cursor/hooks/state/continual-learning-index.json`** (gitignored).
