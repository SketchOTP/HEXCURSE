# DIRECTIVE: HexCurse v1.5.x Governance & MCP Expansion

**Directive ID:** D-HEXCURSE-EXPANSION-001  
**Primary release:** cursor-governance **v1.5.0** — follow-on **v1.5.1–v1.5.7** completed fixes and the 17-server canon (see D-HEXCURSE-MCP-RECONCILE-003).

This file restores archival directive content from **`cursor-governance/CHANGELOG.md`** and **`cursor-governance/setup.js`** only. It does not invent policy beyond those sources.

---

## v1.5.0 — Expansion baseline (CHANGELOG [1.5.0])

### Added (verbatim themes from CHANGELOG)

- **6 new MCP servers:** `playwright`, `semgrep`, `sentry`, `firecrawl`, `linear`, `pampa`
- **6 new `.mdc` governance rules:** `security.mdc`, `adr.mdc`, `memory-management.mdc`, `debugging.mdc`, `multi-agent.mdc`, `linear-sync.mdc`
- **`--multi-agent` CLI mode** — git worktree + swarm-protocol orchestration scaffold (revised in later patches; see v1.5.5–v1.5.6)
- **`--sync-rules` CLI mode** — fetch latest rules from HexCurse GitHub source (**v1.5.3** requires explicit `HEXCURSE_RULES_REMOTE_URL`)
- **New bundled templates:** `MCP_TOKEN_BUDGET.md`, `MULTI_AGENT.md`, `ADR_LOG.md`, `AGENT_HANDOFFS.md`
- **Hierarchical `AGENTS.md` support** — monorepo subpackage agent instructions
- **PAMPA semantic skill indexing** — `.cursor/skills/` semantically searchable
- **PR Review CI workflow** — Semgrep + doctor + rules-freshness
- **Auto-update CI workflow** — opens PRs when new version published
- **ADR automation** — per `adr.mdc`
- **Linear ↔ Taskmaster** — `linear-sync.mdc` + Linear MCP
- **MCP token budget warning** in `printSummary()` and `MCP_TOKEN_BUDGET.md`
- **Extended SESSION START** steps 4c (Semgrep baseline) and 4d (Linear sync)
- **Extended SESSION CLOSE** step 8b (ADR verification)

### Changed

- `PATHS.json` schema extended (backward-compatible keys)
- `runDoctor()` extended with additional checks
- **`--refresh-rules`** refreshes all **10** `.mdc` files (was 4)
- `agentsMd()` updated with new SESSION START / CLOSE steps

### Security (per CHANGELOG)

- Semgrep MCP integration with mandatory HIGH/CRITICAL blocking gate
- PR-level Semgrep CI scan with inline comment reporting

---

## v1.5.1–v1.5.7 — Integration fixes (CHANGELOG summaries)

| Version | Themes |
|---------|--------|
| 1.5.1 | `--quick --preset=other` no longer errors |
| 1.5.2 | **Linear** → `@mseep/linear-mcp`; **Pampa** → `pampa` package / `npx --package=pampa`; tests for npm targets |
| 1.5.3 | **`--sync-rules`** requires `HEXCURSE_RULES_REMOTE_URL`; `lastSyncAt` only on full success |
| 1.5.4 | Sacred CSV extraction includes trailing `-` bullets in `base.mdc` |
| 1.5.5 | **`--multi-agent`** removes non-existent `swarm-protocol-mcp` npx; worktrees + `MULTI_AGENT.md` guidance |
| 1.5.6 | **`bin/swarm-protocol-mcp.js`** launcher for phuryn/swarm-protocol |
| 1.5.7 | **17-server canon:** `gitmcp-adafruit-mpu6050`, `supabase`; linear/semgrep/pampa fixes; `buildMcpServers` key order; RULE 11–12 in templates |

---

*End of D-HEXCURSE-EXPANSION-001 (repository-derived archival).*
