# ARCHITECTURE — HexCurse

## Purpose
HexCurse is a project workspace that uses Cursor agent governance, Taskmaster orchestration, and MCP-backed tooling so implementation work stays scoped, documented, and traceable. The repository currently centers on governance artifacts and guides; the executable product’s shape and stack are **TBD — confirm before implementing**.

**Single source of truth (machinery):** **`docs/PROJECT_OVERVIEW.md`** — exhaustive, code-derived description of **cursor-governance** (`setup.js`), installer outputs, CLI modes, MCP merge, tests, and CI. This **`ARCHITECTURE.md`** stays the shorter system summary and product/TBD notes.

## Tech Stack
| Layer | Technology | Reason |
|-------|-----------|--------|
| Editor / agent host | Cursor | Primary IDE and MCP client |
| Task graph | Taskmaster (`task-master` CLI, `.taskmaster/`) | Dependency-aware directive chain |
| Taskmaster LLM | LM Studio → `qwen3.5-2b` (~8k ctx) at `http://100.80.17.40:1234/v1` | OpenAI-compatible `.env` (`OPENAI_API_KEY` + `OPENAI_BASE_URL`); `maxTokens` ~2800; set **`HEXCURSE_LM_STUDIO_MAX_CONTEXT=8000`** on fresh installs. |
| Docs | Markdown | Human-readable architecture, directives, logs |
| VCS | Git | History, branches, PRs (via GitHub MCP when remote exists) |
| Code intelligence | Serena MCP | Symbol-level navigation and edits when source tree exists |
| Indexed exploration | jcodemunch MCP (`jcodemunch-mcp`) | Tree-sitter index, outlines, ranked retrieval, references, blast radius — local workspace |
| Snapshot | Repomix | Compressed repo overview for large codebases |
| Application runtime | TBD — confirm before implementing | Not yet selected |

## System Map
```
Human (scope / review / merge)
        │
        ▼
Cursor Agent ◄──► MCP: Taskmaster, memory, sequential-thinking, jcodemunch, Serena,
        │              context7, repomix, gitmcp, GitHub
        ▼
Repo files: AGENTS.md, DIRECTIVES.md, docs/*, .cursor/rules/*, .taskmaster/*
        │
        ▼
[Future] Application source tree — TBD
```

## Directory Structure
```
HexCurse/
├── .cursor/rules/       # Cursor rules (base, MCP, domain)
├── .taskmaster/         # PRD, tasks.json, Taskmaster config/state
├── .serena/memories/    # Serena persistent memories (auto)
├── cursor-governance/   # Installer package (setup.js --doctor / --refresh-rules)
├── docs/                # ARCHITECTURE, MCP_COORDINATION, CONTINUAL_LEARNING, prompts, CURSOR_MODES
├── AGENTS.md            # Session rules of engagement
├── DIRECTIVES.md        # Human-readable directive log
├── SESSION_LOG.md       # Append-only session audit
├── CURSOR.md            # Quick-start: session prompt, doctor, modes
└── (future src/)        # TBD — confirm before implementing
```

**Other repositories** that run **`cursor-governance/setup.js`** get a single top-level **`HEXCURSE/`** folder (pack copy of prompts, **`PATHS.json`**, optional **`rules/`** mirror). That layout is for **consumers**, not required in **this** source tree.

## Module Contracts
| Module | Owns | Never touches | Public interface |
|--------|------|---------------|------------------|
| Governance (`.cursor/rules`, `AGENTS.md`) | Agent behavior constraints | Application business logic | Rules files + AGENTS |
| Directives (`DIRECTIVES.md` + Taskmaster) | Task status mirror | Unauthorized scope expansion | Sections: Completed / In Progress / Queued / Backlog |
| Documentation (`docs/`) | Architecture, prompts | Secrets | Markdown only |
| Session audit (`SESSION_LOG.md`) | Per-session outcomes | Past entries (immutable) | Append-only template |

## Key Design Decisions
- **DECISION:** Taskmaster `tasks.json` is machine source of truth; `DIRECTIVES.md` is the human-readable mirror. **REASON:** Reduces ambiguity for agents and humans. **ALTERNATIVES REJECTED:** Solely manual `DIRECTIVES.md` without structured dependencies.
- **DECISION:** MCP behaviors are mandatory per `mcp-usage.mdc`. **REASON:** Consistency across sessions. **ALTERNATIVES REJECTED:** Optional tool use (“when convenient”).

## External Dependencies & MCP Coverage
| Dependency | Tooling |
|------------|---------|
| Durable workspace facts | **memory** MCP (session start, discoveries, close); never overrides Taskmaster / DIRECTIVES / ARCHITECTURE |
| Task graph | **taskmaster-ai** MCP + **`task-master`** CLI; after memory each session |
| Plans / reasoning | **sequential-thinking** MCP before non-trivial implementation plans |
| Local indexed exploration / impact | **jcodemunch** MCP (RULE 10; package `jcodemunch-mcp`) |
| Code navigation / edits | **Serena** MCP (symbol-first; see `mcp-usage.mdc` RULE 4) |
| Library & API docs | **context7** MCP before writing external library calls |
| LM Studio (local LLM server) | Not MCP — must match `.taskmaster/config.json` `modelId` + `baseURL` |
| Taskmaster CLI operations | taskmaster-ai MCP + CLI `--help` |
| Niche GitHub SDKs / firmware (when used) | **gitmcp** (per-repo URL entries) |
| Public GitHub API / PRs (optional) | **github** MCP — remote PR/issue only; local **git** for branch / push |
| Repo-wide structure | **repomix** CLI (`repomix --compress` once per session start) |
| Transcript → memory / AGENTS | **agents-memory-updater** (subagent) per **RULE 9** and **`docs/CONTINUAL_LEARNING.md`** |

Single coordination map: **`docs/MCP_COORDINATION.md`**.

**Governance parity (what rules claim vs what runs automatically):** **`docs/GOVERNANCE_PARITY.md`** (install pack: **`HEXCURSE/docs/GOVERNANCE_PARITY.md`**).

## Out of Scope
- Production deployment and operations until explicitly in scope.
- Committing secrets or tokens to the repo.
- Choosing the application framework/language without human confirmation.

## Definition of Done
For the first governed working version of this workspace: governance directory structure exists; `.cursor/rules` (base, mcp-usage, domain rules) populated; `docs/ARCHITECTURE.md`, `AGENTS.md`, `DIRECTIVES.md`, `SESSION_LOG.md` present; Taskmaster initialized with a parsed PRD and `tasks.json` generated; setup session recorded in `SESSION_LOG.md`.
