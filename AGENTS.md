# Agents — HexCurse

Governed **Cursor** workspace. Rules in **`.cursor/rules/`** load automatically; this file is the human-facing contract. Paste **`docs/SESSION_START_PROMPT.md`** first each chat (**this source repo**). Consumer installs: session-start path is under **`HEXCURSE/PATHS.json`** (**`paths.sessionStart`**).

## Project context

**Purpose:** This workspace ships the **`cursor-governance`** npm installer (**`setup.js`**, templates, MCP merge, doctor, tests) and governance docs. Application code for consumer projects lives in those repos, not here. **`docs/PROJECT_OVERVIEW.md`** is the machinery source of truth; **`NORTH_STAR.md`** is authoritative for product intent.

**Stack:** **Node.js** — **`cursor-governance`** package; **Cursor**; **Taskmaster**; MCP servers per **`~/.cursor/mcp.json`**. Full table: **`docs/ARCHITECTURE.md`**.

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

## Forbidden

- Committing secrets, API keys, or tokens.
- Weakening or bypassing **`.cursor/rules/`** or **`mcp-usage.mdc`**.
- Expanding scope after confirmation without explicit human OK.
- Shipping library calls from memory when **context7** is available — verify first.

## Commits

Format: `D[NNN]: description | status`
