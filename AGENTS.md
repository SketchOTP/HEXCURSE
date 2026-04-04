# Agents — HexCurse

Governed **Cursor** workspace. Rules in **`.cursor/rules/`** load automatically; this file is the human-facing contract. Paste **`docs/SESSION_START.md`** first each chat (**this source repo**). Consumer installs: **`HEXCURSE/PATHS.json`** → **`paths.sessionStart`** (typically **`HEXCURSE/SESSION_START.md`**).

## Project context

**Purpose:** This workspace ships **HEXCURSE** (the **`cursor-governance/`** npm installer: **`setup.js`**, templates, MCP merge, doctor, tests) and governance docs. Application code for consumer projects lives in those repos, not here. **`docs/PROJECT_OVERVIEW.md`** is the machinery source of truth; **`NORTH_STAR.md`** is authoritative for product intent.

**Stack:** **Node.js** — **HEXCURSE** installer package under **`cursor-governance/`**; **Cursor**; **Taskmaster**; MCP servers per **`~/.cursor/mcp.json`**. Full table: **`docs/ARCHITECTURE.md`**.

**Sacred constraints**

- Never commit secrets, API keys, or tokens; use `.env` (gitignored) and machine-level MCP env only.
- Never bypass or weaken alwaysApply MCP rules in `mcp-usage.mdc` / `AGENTS.md`.
- One directive per session; if scope must change, stop and get explicit human confirmation.
- Do not install dependencies or add frameworks without stating why and waiting for approval.
- Application architecture and primary language choice remain TBD until the human confirms — do not assume a stack.

## Session start (3 steps)

1. **Memory** — Query **memory** MCP for stored facts before other governance reads.
2. **Taskmaster** — Call **get_tasks**; align with **DIRECTIVES** / **`HEXCURSE/DIRECTIVES.md`** when present.
3. **Skills** — Search **`.cursor/skills/`**; use **pampa** (or equivalent) when configured for semantic skill lookup.

## MCP usage (summary)

The open workspace on disk is the source of truth — not remote Git alone.

1. **memory** — Session start and whenever you learn something durable.
2. **taskmaster-ai** — **get_tasks** before planning or code; **set_task_status** when work completes.
3. **repomix** — **`--compress`** once per session on existing trees.
4. **jcodemunch** — Index the repo; use **search_symbols**, **find_references**, **get_context_bundle** for multi-file work.
5. **sequential-thinking** — Before non-trivial implementation plans.
6. **Serena** — **find_symbol**, **find_referencing_symbols**, **replace_symbol_body** for edits (no huge **read_file** without approval).
7. **context7** — Before every new or changed external library / API call.
8. **github** — Only when the human asked for PR, issue, or remote queries; use local git for branches.

After substantive edits, run **semgrep** **security_check** on touched sources before commit. Use **playwright** after UI changes when available. Use **supabase** for schema when this project uses Supabase. Use other configured MCPs when relevant; if you skip one, say why in the handoff.

If a required tool is missing or red, announce **DEGRADED_MODE** with the server id and what you will not assume. Full triggers live in **`mcp-usage.mdc`**.

## Session close (3 steps)

1. **Tasks** — Update Taskmaster (**set_task_status**, expand/split tasks if needed).
2. **Memory** — Write durable discoveries to **memory** MCP.
3. **Skills** — Promote repeatable patterns into **`.cursor/skills/`** when your project’s criteria are met.

## Learned Workspace Facts

Sourced from transcript mining (**RULE 9**); see **`docs/MEMORY_TAXONOMY.md`**. Subsections match memory buckets; no secrets.

### Architecture

- **`--parse-prd-via-agent`** (`cursor-governance/setup.js` in this repo — `runParsePrdViaAgent` / `applyAgentResponse`): emits the PRD→tasks prompt and validates agent JSON locally; **no outbound HTTP or LLM** from Node in that mode. **`--dry-run`** must not write **`.taskmaster/tasks/tasks.json`** or **`.taskmaster/agent-parse-prompt.txt`**.
- Interactive install v2: **`promptUser()`** asks a short fixed sequence (project, purpose, GitHub token reuse, optional MCPs); **`applyTaskmasterProviderFromEnvironment(answers)`** fills Taskmaster MCP env from **`ANTHROPIC_*` / `OPENAI_*`** after prompts — not from in-installer provider credential questions.

### Gotcha

- If **`OPENAI_BASE_URL`** / Taskmaster’s LLM is unreachable, **`task-master parse-prd`** and **`setup.js --run-hexcurse`** fail; rebuild **`.taskmaster/tasks/tasks.json`** from **`NORTH_STAR.md`** + **`.taskmaster/docs/prd.txt`** (see **`.env.example`**, **`docs/ARCHITECTURE.md`**).
- Optional **PAMPA** **`npx`** indexing during install can hit **EPERM** on Windows npm cache; **`--learning-rollup`** and other state can still be validated without a successful PAMPA index.
- **`installNpmGlobalPackage`** (`setup.js`): **no `sudo` on Windows**; on Unix, **`sudo npm install -g`** falls back to **`npm install -g --prefix ~/.npm-global`** when sudo fails.

### Workflow

- Directive **memory seeding** (e.g. omnibus Phase 2): use **memory** MCP inside a governed Cursor session — not as a substitute from a shell-only script.

## Forbidden

- Committing secrets, API keys, or tokens.
- Weakening or bypassing **`.cursor/rules/`** or **`mcp-usage.mdc`**.
- Expanding scope after confirmation without explicit human OK.
- Shipping library calls from memory when **context7** is available — verify first.

## Commits

Format: `D[NNN]: description | status`
