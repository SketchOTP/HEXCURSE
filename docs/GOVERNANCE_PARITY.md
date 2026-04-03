# Governance parity — HexCurse

This document states **what governance claims** versus **what is automated**, so humans and agents do not confuse Cursor rules with running infrastructure.

## Binding vs aspirational

| Source | Role |
|--------|------|
| **`.cursor/rules/*.mdc`** (especially `mcp-usage.mdc`, `process-gates.mdc`) | **Binding** text for the agent in Cursor. |
| **`AGENTS.md`** | Session ritual and close checklist; procedural contract. |
| **`docs/MCP_COORDINATION.md`** | Human-readable map; if it disagrees with `.mdc` rules, **rules win**. |

## What does *not* run by itself

- **MCP tools** (memory, Taskmaster, jcodemunch, Serena, etc.) are **not** invoked by the filesystem or `alwaysApply` rules. The agent must call them; the human must keep MCP servers **green** in Cursor.
- **Session start** (`docs/SESSION_START_PROMPT.md`) must be **pasted** (or `@` files) so the agent runs memory → Taskmaster → repomix → **jcodemunch** index/outline → sequential-thinking in order.
- **Taskmaster** (`task-master` CLI) uses **HTTP** LLM providers (e.g. LM Studio via `OPENAI_*`). It is **not** the same process as [Cursor headless](https://cursor.com/docs/cli/headless) (`agent -p`).
- **`HEXCURSE_PREFLIGHT_CURSOR_AGENT=1`** only runs **`agent status`** before `parse-prd` in the north-star bridge; it does not replace Taskmaster’s LLM endpoint.

## What *is* automated in-repo

- **`cursor-governance/setup.js`**: install, `--doctor`, `--refresh-rules`, `--learning-rollup`, `--run-hexcurse*`, `--preflight-cursor-agent`.
- **GitHub Actions** (if configured): tests + doctor in **CI mode** (machine-local MCP / `task-master` checks are non-blocking on generic runners).

## Continual learning (RULE 9)

Runs when the human asks, when governance paths change at close, or when transcript index + debounce allow it—per **`docs/CONTINUAL_LEARNING.md`**. It does **not** run on every chat automatically.

## Appendix — AGENTS.md steps vs automation (lightweight parity)

Only **loading** `.cursor/rules/*.mdc` is automatic when Cursor opens a chat; **nothing in the SESSION START / CLOSE sequences runs without the agent or human.** This table matches **`AGENTS.md`** (source repo paths; pack repos use **`HEXCURSE/`** prefixes).

| Step | MCP? | CLI / local tool? | Human / agent action? |
|------|------|-------------------|-------------------------|
| **SESSION START** | | | |
| 0 — ONE_PROMPT / `--run-hexcurse` | — | Yes (`node …/setup.js`) | Human runs bridge or pastes ONE_PROMPT |
| 1 — Memory | Yes (memory) | — | Agent must query |
| 2 — `get_tasks` | Yes (taskmaster-ai) | — | Agent must call |
| 3 — DIRECTIVES vs Taskmaster | — | — | Agent reads files; resolve drift if any |
| 4 — repomix | Yes (repomix MCP) or CLI | Yes (`repomix --compress`) | Agent runs per rules |
| 4b — jcodemunch | Yes (jcodemunch MCP) | — | `resolve_repo` / `index_folder` + outline per RULE 10 |
| 5 — Plan | Yes (sequential-thinking) | — | Agent must invoke |
| 6 — Plan approval | — | — | Human: **Confirmed. Proceed.** |
| 7 — Branch | — | Yes (`git checkout -b` or existing) | Agent uses **local git**; **github** MCP not required |
| **SESSION CLOSE** | | | |
| 1 — `git diff` | — | Yes (git) | Agent |
| 2 — Contract comments | — | — | Agent verifies |
| 3 — Memory confirm | Yes (memory) | — | Agent |
| 4 — `set_task_status` | Yes (taskmaster-ai) | — | Agent |
| 5 — DIRECTIVES update | — | — | Agent edits |
| 6 — SESSION_LOG | — | — | Agent appends |
| 7 — PR (optional) | Only if human asked | — | Else human **`git push`** + UI; **github** MCP optional |
| 8 — Commit message | — | — | Agent gives text to human |
| 9 — MCP utilization report | — | — | Agent documents |
| 10 — RULE 9 / continual learning | Yes (agents-memory-updater Task) | Optional (`setup.js --learning-rollup`) | Per **CONTINUAL_LEARNING.md** |

**Doctor (consumer):** With **`HEXCURSE/`** present and **`cursor-governance`** next to **`setup.js`**, **`--doctor`** prints a **template fingerprint** (hash of installer `templates/`) and a **file count** under **`HEXCURSE/docs/`** for quick drift checks after install or **`--refresh-rules`**.

## Installer template parity (v1.6.1+)

- **`cursor-governance/templates/AGENTS.md`** mirrors the repository root **`AGENTS.md`**. At install time, **`agentsMd()`** swaps the second-line title **`# HexCurse`** for the target project name.
- **`cursor-governance/templates/SESSION_START_PROMPT.pack.md`** is emitted as **`HEXCURSE/SESSION_START_PROMPT.md`**. It tracks **`docs/SESSION_START_PROMPT.md`** (session ritual text) with **`@HEXCURSE/…`** paths and **`{{PROJECT_NAME}}`** for the one-line agent role. When you change ritual steps or semgrep wording, update **both** files (or regenerate the pack from `docs/` with the same transforms the installer uses).

## Related

- **`docs/ARCHITECTURE.md`** — system map and stack.
- **`docs/MCP_COORDINATION.md`** — MCP stack table and session timeline.
