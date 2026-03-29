# ARCHITECTURE — HexCurse

## Purpose
HexCurse is a project workspace that uses Cursor agent governance, Taskmaster orchestration, and MCP-backed tooling so implementation work stays scoped, documented, and traceable. The repository currently centers on governance artifacts and guides; the executable product’s shape and stack are **TBD — confirm before implementing**.

## Tech Stack
| Layer | Technology | Reason |
|-------|-----------|--------|
| Editor / agent host | Cursor | Primary IDE and MCP client |
| Task graph | Taskmaster (`task-master` CLI, `.taskmaster/`) | Dependency-aware directive chain |
| Taskmaster LLM | LM Studio → `qwen3.5-4b` at `http://localhost:1234/v1` | Local inference; OpenAI-compatible `.env` (`OPENAI_API_KEY` + `OPENAI_BASE_URL`). No Anthropic/Perplexity required for this project. |
| Docs | Markdown | Human-readable architecture, directives, logs |
| VCS | Git | History, branches, PRs (via GitHub MCP when remote exists) |
| Code intelligence | Serena MCP | Symbol-level navigation when source tree exists |
| Snapshot | Repomix | Compressed repo overview for large codebases |
| Application runtime | TBD — confirm before implementing | Not yet selected |

## System Map
```
Human (scope / review / merge)
        │
        ▼
Cursor Agent ◄──► MCP: Taskmaster, memory, sequential-thinking, Serena,
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
├── docs/                # ARCHITECTURE, prompts, references
├── AGENTS.md            # Session rules of engagement
├── DIRECTIVES.md        # Human-readable directive log
├── SESSION_LOG.md       # Append-only session audit
├── CURSOR_*.md          # User + agent setup guides
└── (future src/)        # TBD — confirm before implementing
```

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
| Dependency | Documentation MCP |
|------------|-------------------|
| LM Studio (local LLM server) | Not MCP — must match `.taskmaster/config.json` `modelId` + `baseURL` |
| Taskmaster / task-master-ai | taskmaster-ai MCP + CLI `--help` |
| General libraries (once chosen) | context7 |
| Niche GitHub SDKs / firmware (when used) | gitmcp (per-repo URL entries) |
| Public GitHub API / PRs | github MCP |
| Repo-wide structure | repomix |

## Out of Scope
- Production deployment and operations until explicitly in scope.
- Committing secrets or tokens to the repo.
- Choosing the application framework/language without human confirmation.

## Definition of Done
For the first governed working version of this workspace: governance directory structure exists; `.cursor/rules` (base, mcp-usage, domain rules) populated; `docs/ARCHITECTURE.md`, `AGENTS.md`, `DIRECTIVES.md`, `SESSION_LOG.md` present; Taskmaster initialized with a parsed PRD and `tasks.json` generated; setup session recorded in `SESSION_LOG.md`.
