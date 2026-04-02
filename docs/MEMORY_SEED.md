# Memory MCP — Seed facts for HexCurse

After enabling the **memory** MCP in Cursor, ask the agent to run `write_memory` (or use the Memory tool) with the following facts so sessions start with shared context:

1. `Project name: HexCurse`
2. `Sacred constraints: No secrets in repo; never bypass mcp-usage/AGENTS rules; one directive per session; no new dependencies without approval; application stack TBD until human confirms.`
3. `Tech stack summary: Cursor + Taskmaster + MCP; Taskmaster CLI uses LM Studio (http://100.80.17.40:1234/v1) with model qwen3.5-2b (~8k context), not Anthropic; app stack TBD.`
4. `Out of scope: Production ops until in directive; replacing Taskmaster with ad-hoc tracking; storing credentials in git.`
5. `Repository: use this repo’s root as cwd; keep portable relative paths in docs (no machine-specific absolute paths in memory).`
6. `GitHub MCP: ensure GITHUB_PERSONAL_ACCESS_TOKEN is set in ~/.cursor/mcp.json env, not in the repo.`
7. `Cursor User/Project rules: mirror bullets from .cursor/rules/process-gates.mdc (Taskmaster before work, sequential-thinking before non-trivial plans, context7 before library calls; announce DEGRADED_MODE when a required MCP is missing).`
8. `Continual learning: mcp-usage.mdc RULE 9 + docs/CONTINUAL_LEARNING.md when governance changes or human asks for transcript mining.`
9. `MCP coordination: use every relevant MCP (memory → taskmaster → repomix → sequential-thinking → Serena → context7 → gitmcp when niche → github → agents-memory-updater when RULE 9 applies); see docs/MCP_COORDINATION.md; report used/unused MCPs at session close.`
10. `Memory taxonomy: use buckets from docs/MEMORY_TAXONOMY.md — prefix memory writes with [hexcurse:invariant|gotcha|command|architecture|preference|workflow]; merge Learned Workspace Facts into AGENTS.md subsections, not raw chat.`
11. `Codebase grounding: for architecture/gotcha/invariant, attach path::symbol (e.g. cursor-governance/setup.js::runDoctor) after Serena find_symbol or path check.`

Confirm each stored entry in session per **`AGENTS.md`** session-close checklist (legacy multi-step prompt archived at **`docs/archive/CURSOR_AGENT_SETUP_PROMPT_V2.md`**).
