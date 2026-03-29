# Memory MCP — Seed facts for HexCurse

After enabling the **memory** MCP in Cursor, ask the agent to run `write_memory` (or use the Memory tool) with the following facts so sessions start with shared context:

1. `Project name: HexCurse`
2. `Sacred constraints: No secrets in repo; never bypass mcp-usage/AGENTS rules; one directive per session; no new dependencies without approval; application stack TBD until human confirms.`
3. `Tech stack summary: Cursor + Taskmaster + MCP; Taskmaster CLI uses LM Studio (localhost:1234/v1) with model qwen3.5-4b, not Anthropic; app stack TBD.`
4. `Out of scope: Production ops until in directive; replacing Taskmaster with ad-hoc tracking; storing credentials in git.`
5. `Repo root: N:\HexCurse (Windows); use relative paths in docs for portability.`
6. `GitHub MCP: ensure GITHUB_PERSONAL_ACCESS_TOKEN is set in ~/.cursor/mcp.json env, not in the repo.`

Confirm each stored entry in session per `CURSOR_AGENT_SETUP_PROMPT_V2.md` STEP 8.
