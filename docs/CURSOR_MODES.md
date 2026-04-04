# Cursor modes — HexCurse

Use the right Cursor mode for the job so rules and expectations stay aligned.

## Agent (default implementation)

- **Use for:** Writing code, running tests, editing files, executing an approved directive.
- **Load:** `alwaysApply` rules + **AGENTS.md** session start (memory → Taskmaster → DIRECTIVES → repomix → **jcodemunch** index/outline → sequential-thinking → human confirm → branch).
- **MCP map:** **`docs/MCP_COORDINATION.md`** (pack: **`HEXCURSE/docs/MCP_COORDINATION.md`**) — how every tool lines up with **`mcp-usage.mdc`**.
- **Human primes:** Paste **`docs/SESSION_START.md`** (or `@` the paths it lists). **Install-pack repos** use **`HEXCURSE/SESSION_START.md`** (see **`HEXCURSE/PATHS.json`** → **`paths.sessionStart`**).

## Architect / plan (external advisor — not the Cursor repo)

- **Use for:** System design, trade-offs, phased roadmaps, and **writing paste-ready prompts** for Cursor.
- **Where:** A **separate** AI session (not Cursor, or paste-only with **no** `@` repo files). The Architect is driven **only** by what you copy in—start with the fenced block from **`docs/ARCH_PROMPT.md`** (or **`HEXCURSE/docs/ARCH_PROMPT.md`** on pack layouts) plus excerpts you paste (architecture, directives, errors).
- **Output:** Advice plus a **“Next message for Cursor”** handoff so the **implementation** chat can run HexCurse (session start → directive scope) without re-deriving the plan.

## Ask / read-only

- **Use for:** Explaining code, answering questions, exploring the repo without edits.
- **Expectation:** No commits, no Taskmaster state changes, no GitHub PR actions unless the human promotes the chat to an implementation session.

## Headless CLI (`agent -p`)

- **Use for:** Non-interactive or scripted runs with the same Agent tools, rules, and MCP as the editor ([headless](https://cursor.com/docs/cli/headless), [parameters](https://cursor.com/docs/cli/reference/parameters)).
- **HexCurse default model:** **`composer-2`** (optional **`composer-2-fast`**). Kickoff prompt: **`HEXCURSE/HEADLESS_KICKOFF.txt`**; one-liners: **`HEXCURSE/ONE_PROMPT.md`**.

## Quick reference

| Goal              | Mode      | Primary doc                         |
|-------------------|-----------|-------------------------------------|
| Ship a directive  | Agent     | AGENTS.md + docs/SESSION_START.md (pack: HEXCURSE/*)    |
| Ship (headless)   | Agent `agent -p` | HEXCURSE/ONE_PROMPT.md + HEADLESS_KICKOFF.txt |
| Design / roadmap  | Architect (external) | ARCH_PROMPT.md (+ pasted repo excerpts) |
| Learn / explore   | Ask       | (no session-start required)         |

## New-install layout (cursor-governance)

When **`setup.js`** runs in **another** repository, it adds a single **`HEXCURSE/`** folder (see **`HEXCURSE/PATHS.json`**). **This** HexCurse source repo uses **repo root + `docs/`** — same three modes, no nested **`HEXCURSE/`** here.
