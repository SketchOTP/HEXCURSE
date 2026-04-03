# DIRECTIVE: HexCurse MCP Server Reconciliation — Canonical 17

**Directive ID:** D-HEXCURSE-MCP-RECONCILE-003  
**Status:** Merged — cursor-governance **v1.5.7**  
**Authoritative implementation:** `buildMcpServers()` in `cursor-governance/setup.js` (JavaScript object **insertion order** is the canonical merge order into `~/.cursor/mcp.json`).

This file restores archival directive content from **repository truth** only (`setup.js` + `cursor-governance/CHANGELOG.md`). It does not add policy beyond what those sources state.

---

## CONFIRMED CANONICAL SERVER LIST (17)

| # | Server ID | Kind | Launch / URL | Environment (from `buildMcpServers`) |
|---|-----------|------|--------------|----------------------------------------|
| 1 | `taskmaster-ai` | stdio | `npx -y --package=task-master-ai task-master-ai` | Spread of `taskmasterEnv` |
| 2 | `context7` | stdio | `npx -y @upstash/context7-mcp` | — |
| 3 | `repomix` | stdio | `npx -y repomix --mcp` | — |
| 4 | `serena` | stdio | `uvx --from git+https://github.com/oraios/serena serena-mcp-server --project ${workspaceFolder}` | — |
| 5 | `gitmcp` | URL | `https://gitmcp.io/docs` | — |
| 6 | `gitmcp-adafruit-mpu6050` | URL | `https://gitmcp.io/adafruit/Adafruit_MPU6050` | — |
| 7 | `sequential-thinking` | stdio | `npx -y @modelcontextprotocol/server-sequential-thinking` | — |
| 8 | `memory` | stdio | `npx -y @modelcontextprotocol/server-memory` | — |
| 9 | `github` | stdio | `npx -y @modelcontextprotocol/server-github` | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| 10 | `jcodemunch` | stdio | `uvx jcodemunch-mcp` | — |
| 11 | `playwright` | stdio | `npx -y @playwright/mcp` | — |
| 12 | `semgrep` | stdio | `uvx semgrep-mcp` | `SEMGREP_PATH`, `SEMGREP_APP_TOKEN` |
| 13 | `sentry` | stdio | `npx -y @sentry/mcp-server@latest` | `SENTRY_ACCESS_TOKEN` (with legacy `SENTRY_AUTH_TOKEN` migration in `migrateSentryMcpEnvInMcpJson`) |
| 14 | `firecrawl` | stdio | `npx -y firecrawl-mcp` | `FIRECRAWL_API_KEY` |
| 15 | `linear` | stdio | `npx -y @mseep/linear-mcp` | `LINEAR_API_KEY` |
| 16 | `pampa` | stdio | `node` / `node.exe` + `resolvePampaGlobalPath()` | `cwd: ${workspaceFolder}` |
| 17 | `supabase` | URL | `https://mcp.supabase.com/mcp?project_ref=<ref>` | `project_ref` from `process.env.SUPABASE_PROJECT_REF` or code default |

---

## Reconciliation notes (CHANGELOG [1.5.7])

From `cursor-governance/CHANGELOG.md` **[1.5.7]** — Fixed / added / changed items that define this reconciliation:

- **`linear`:** package **`@mseep/linear-mcp`** (canonical merge; not `@linear/mcp-server`).
- **`semgrep`:** `SEMGREP_PATH` present on server env (may be empty string).
- **`pampa`:** `npx` launch replaced with global **`node` / `node.exe`** + `resolvePampaGlobalPath()` and `cwd: ${workspaceFolder}`.
- **Added URL MCPs:** `gitmcp-adafruit-mpu6050`, `supabase` (with `SUPABASE_PROJECT_REF` / `PATHS.json` `supabaseProjectRef`).
- **Doctor / summaries:** extended checks and **15 → 17** server count in token budget / `printSummary`.
- **`mcp-usage` / `agentsMd`:** RULE 11 (Adafruit MPU6050), RULE 12 (Supabase).

---

*End of D-HEXCURSE-MCP-RECONCILE-003 (repository-derived archival).*
