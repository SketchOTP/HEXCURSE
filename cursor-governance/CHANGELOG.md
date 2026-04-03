# Changelog

All notable changes to **HEXCURSE** (npm package **`cursor-governance`**) are documented here.

## [2.0.2] — 2026-04-03

### Added

- **`--refresh-governance`** and **`HEXCURSE_REFRESH_GOVERNANCE=1`**: overwrite existing **`HEXCURSE/*`** and mirrored **`.cursor/rules`** on reinstall. Interactive TTY installs prompt once when the pack already exists (default **No**).

### Changed

- **PRD → tasks** during install: default **`HEXCURSE_PARSE_PRD=cursor`** runs Cursor headless **`agent -p`** with **`composer-1.5`** (override with **`HEXCURSE_CURSOR_AGENT_MODEL`**) so **task-master** does not call OpenAI/Anthropic for parse-prd. Fallback: **`task-master parse-prd`** only for **`lmstudio`** preset if Cursor agent fails, or when **`HEXCURSE_PARSE_PRD=taskmaster`**. **`HEXCURSE_PARSE_PRD=skip`** skips generation. Task-master parse-prd runs with **`CI=1`** to reduce interactive prompts.

## [2.0.1] — 2026-04-03

### Changed

- User-facing installer branding: **HEXCURSE** (banner, `--help`, doctor strings, `PATHS.json` installer metadata). Npm package name stays **`cursor-governance`** for registry continuity; **`hexcurse`** added as an additional **`bin`** alias (same entry as **`cursor-governance`**).

## [1.6.1] — 2026-04-03

### Fixed

- `semgrep` MCP updated from deprecated uvx/stdio to Streamable HTTP endpoint `https://mcp.semgrep.ai/mcp` (#6)
- Windows PowerShell: ConPTY detection for doctor + test hook (#14)
- Linux: pampa path resolution (`mcp-server.js` / `src/mcp-server.js`), sudo fallback for npm global install (#15)
- setup.js parity: bundled templates match source `AGENTS.md`, `SESSION_START.md`, and `.mdc` files (#9)

### Changed

- **`buildMcpServers()`** (v2): **4 core** MCPs (github, context7, memory, taskmaster-ai) + **5 optional** picks at install (playwright, semgrep streamable-http, supabase, lightrag, custom). Merge still **adds-only** — never removes existing **`~/.cursor/mcp.json`** keys.
- Session-start pack: **`SESSION_START_PROMPT.pack.md`** → **`SESSION_START.md`**; install writes **`HEXCURSE/SESSION_START.md`**; **`PATHS.json`** key **`sessionStartPrompt`** → **`sessionStart`**. Legacy **`SESSION_START_PROMPT.md`** paths still satisfy **`--doctor`**.

### Added

- `docs/MCP_STATUS.md` — live status of all 17 MCP servers
- `docs/SESSION_RITUAL_AUDIT.md` — governed session audit results
- `docs/CONTINUAL_LEARNING_VALIDATION.md` — continual learning loop proof
- `docs/SKILL_PROMOTION_GUIDE.md` — skill promotion criteria and PAMPA cadence
- `docs/TOKEN_EFFICIENCY_PROTOCOL.md` — token measurement and trending protocol
- Memory MCP seeded with project facts, constraints, servers, rules (#5)
- `isWindowsConPTY()` helper + test (#14)
- `SESSION_LOG.md` template fields for token estimates, tool calls, context efficiency (#12)
- `AGENTS.md` SESSION CLOSE **STEP 14** — explicit four-criteria skill promotion checklist (#11)

## [1.6.0] — 2026-04-03

### Added
- `--parse-prd-via-agent` CLI mode — generates Taskmaster tasks.json from PRD using the Cursor agent's own LLM context; no outbound API call required from setup.js itself. Supports `--prd`, `--out`, `--dry-run`, and `--apply` flags.
- `buildAgentParsePrompt()` — structured prompt generator with full Taskmaster JSON schema, generation rules, and self-verification instructions
- `validateTaskmasterSchema()` — validates agent JSON response against Taskmaster schema before writing tasks.json; catches missing fields, bad types, invalid dependency references, self-dependencies
- `applyAgentResponse()` — reads agent response file, strips markdown fences, validates schema, writes tasks.json
- `tryClipboardCopy()` — best-effort clipboard copy on Windows, macOS, Linux
- `--doctor` check: warns when tasks.json is empty or contains only placeholder stub
- `main.hexcurseAgentParseHooks` export for unit testing
- 4 new test cases in hexcurse-pack.test.js covering schema validation, stub detection, prompt content, and markdown fence stripping
- `PATHS.json` manifest key `agentParsePromptCache` — prompt also saved to `.taskmaster/agent-parse-prompt.txt` when not `--dry-run`

### Fixed
- New users no longer blocked on LM Studio or API key configuration just to generate their initial task graph

## [1.5.9] — 2026-04-03

### Added
- `NORTH_STAR.md` — confirmed product definition (human-approved); footer links task graph snapshot
- `.taskmaster/docs/prd.txt` — PRD derived from NORTH_STAR (installer, learning loop, token efficiency)
- `docs/TASK_GRAPH_SNAPSHOT.md` — Taskmaster task graph at D-HEXCURSE-PRODUCT-STACK-005 (agent-curated when `parse-prd` has no LLM)

### Changed
- `docs/ARCHITECTURE.md` — product stack confirmed from NORTH_STAR; LLM-offline task graph path documented
- `.env.example` — note on rebuilding `tasks.json` without a live OpenAI-compatible endpoint
- `.taskmaster/tasks/tasks.json` — 15 tasks aligned with product (installer, rituals, continual learning, measurement, D014/D015)

### Fixed
- Taskmaster **#3** — LLM / fallback documentation (done)
- Taskmaster **#4** — task graph rebuilt (done; agent equivalent to `parse-prd`)
- Taskmaster **#8** — ARCHITECTURE product stack (done)

## [1.5.8] — 2026-04-02

### Changed

- `AGENTS.md` — complete rewrite for 17-server / 10-rule world; SESSION START steps **4a–4e**; DURING IMPLEMENTATION tool triggers; SESSION CLOSE expanded; **Forbidden** / **Mandatory order** aligned with **`mcp-usage.mdc`**
- `docs/SESSION_START_PROMPT.md` — rewrite with steps **4a–4e** and 10-rule activation notice (file later renamed to **`SESSION_START.md`**)
- `docs/MCP_COORDINATION.md` — full rewrite; 17-server table; invocation order by session phase; coordination patterns; **DEGRADED_MODE** tiers; token budget section
- `CURSOR.md` — 10-rule reference, 17-server quick ref, **New in v1.5.x**
- `.cursor/rules/process-gates.mdc` — Semgrep pre-commit gate, ADR gate, session-close checklist (**`PROCESS_GATES_TEMPLATE`** in **`setup.js`**)
- `.cursor/rules/mcp-usage.mdc` — **DEGRADED_MODE** 17-server tiers, token budget notice, MCP order **1–17**, RULE **11–12**, expanded minimum expectations (**`MCP_USAGE_TEMPLATE`**)
- `docs/ARCHITECTURE.md` — 17-server MCP coverage, rules table, **v1.5.x** maintainer summary
- `docs/QUICK_COMMAND_REFERENCE.md` — **v1.5.x** CLI commands (**`--sync-rules`**, **`--multi-agent`**, PAMPA / doctor)
- `docs/PROJECT_OVERVIEW.md` — **§6** 17-server **`buildMcpServers`** table, **§10–11** templates/rules, **§23** install writes, **§25** merge count, **§33** directive history; installer version **1.5.8**
- `cursor-governance/templates/` — **`ONE_PROMPT.md`**, **`HEADLESS_KICKOFF.txt`**, **`CONTINUAL_LEARNING.pack.md`**, **`MCP_COORDINATION.md`** updated for **v1.5.x**
- **`agentsMd()`**, **`sessionStartMd()`**, **`cursorPackMd()`** — synced with source markdown

### Added

- `cursor-governance/scripts/patch-agentsMd-from-root.mjs` — rebuild **`agentsMd()`** from root **`AGENTS.md`** with **`HEXCURSE/`** path mapping

## [1.5.7] — 2026-04-03

### Fixed

- `linear` MCP: corrected package name from `@linear/mcp-server` to `@mseep/linear-mcp` (canonical merge; was already fixed in 1.5.2 — reconciliation confirms `buildMcpServers`)
- `semgrep` MCP: added missing `SEMGREP_PATH` env var to server entry (always present, may be empty string)
- `pampa` MCP: replaced `npx` launch with global `node` / `node.exe` + `resolvePampaGlobalPath()` (multi-strategy: `npm root -g`, `which`/`where` prefix, conventional fallback) and `cwd: ${workspaceFolder}`; install summary warns when resolved script is missing

### Added

- `gitmcp-adafruit-mpu6050` URL MCP server (Adafruit MPU6050 hardware library docs)
- `supabase` URL MCP server (`SUPABASE_PROJECT_REF` env override; default `dpivknupklbxjbrcntes`)
- `SEMGREP_PATH` env var documented in semgrep server entry
- `SUPABASE_PROJECT_REF` in `buildMcpServers` and `PATHS.json` (`supabaseProjectRef`)
- Doctor checks for all canonical servers including `gitmcp-adafruit-mpu6050` and `supabase` (warn-only, non-blocking in CI)
- `MCP_USAGE_TEMPLATE` RULE 11 (gitmcp-adafruit-mpu6050) and RULE 12 (supabase)
- `agentsMd` mandatory MCP list entries 11 and 12 for the new servers
- `MCP_TOKEN_BUDGET.md` updated to 17-server table

### Changed

- `buildMcpServers()` key order matches canonical 17-server list (taskmaster-ai through supabase)
- Server count references updated from 15 → 17 in `printSummary` and token budget template

## [1.5.6] — 2026-04-03

### Fixed

- **swarm-protocol MCP:** Added **`bin/swarm-protocol-mcp.js`** — installs **[phuryn/swarm-protocol](https://github.com/phuryn/swarm-protocol)** from GitHub into `~/.cursor/hexcurse-cache/swarm-protocol`, runs **`tsc`**, then starts **`dist/index.js`**. `--multi-agent` writes **`node`** + launcher path plus **`DATABASE_URL`** (defaults to local Postgres per upstream). The npm name **`swarm-protocol-mcp`** was never published; this replaces that broken `npx` target.

## [1.5.5] — 2026-04-03

### Fixed

- **`--multi-agent` / swarm MCP:** Stopped adding **`swarm-protocol-mcp`** to `~/.cursor/mcp.json` (package **does not exist** on npm). `--multi-agent` now **removes** stale entries that used `swarm-protocol-mcp` and prints guidance to use git worktrees + `MULTI_AGENT.md` instead.

## [1.5.4] — 2026-04-02

### Fixed

- **`--refresh-rules` / sacred merge:** `extractSacredCsvFromBaseMdc` now also picks up **trailing `-` bullets** after the last section (matches common “append a sacred line to `HEXCURSE/rules/base.mdc`” workflows). Regression: `testExtractSacredIncludesTrailingBullets` in `test/hexcurse-pack.test.js`.

## [1.5.3] — 2026-04-02

### Fixed

- **`--sync-rules`:** Requires explicit **`HEXCURSE_RULES_REMOTE_URL`** (removed implicit `YOUR_ORG/...` placeholder that caused silent 404s). Writes **`lastSyncAt`** only when every rule fetch succeeds; exits **1** if any fetch fails. Regression: `testSyncRulesRequiresRemoteUrl` in `test/hexcurse-pack.test.js`.

## [1.5.2] — 2026-04-02

### Fixed

- **MCP `linear` / `pampa` npm targets:** Replaced non-existent `@linear/mcp-server` and `@pampa/mcp-server` with **`@mseep/linear-mcp`** and **`pampa`** (`pampa-mcp` via `npx --package=pampa`). PAMPA skill-index probe uses `npm view pampa version` instead of a broken `--version` call. Regression: `testMcpNpmPackagesLinearAndPampaExist` in `test/hexcurse-pack.test.js`.

## [1.5.1] — 2026-04-02

### Fixed

- **`--quick --preset=other`:** Quick install no longer exits with an error; preset `other` skips Taskmaster model alignment (same behavior as interactive “Other” provider). Regression test in `test/hexcurse-pack.test.js`.

## [1.5.0] — 2026-04-02

### Added

- **6 new MCP servers:** `playwright`, `semgrep`, `sentry`, `firecrawl`, `linear`, `pampa`
- **6 new `.mdc` governance rules:** `security.mdc`, `adr.mdc`, `memory-management.mdc`, `debugging.mdc`, `multi-agent.mdc`, `linear-sync.mdc`
- **`--multi-agent` CLI mode** — git worktree + swarm-protocol orchestration scaffold
- **`--sync-rules` CLI mode** — fetch latest rules from HexCurse GitHub source
- **New bundled templates:** `MCP_TOKEN_BUDGET.md`, `MULTI_AGENT.md`, `ADR_LOG.md`, `AGENT_HANDOFFS.md`
- **Hierarchical `AGENTS.md` support** — monorepo subpackage agent instructions
- **PAMPA semantic skill indexing** — `.cursor/skills/` is now semantically searchable
- **PR Review CI workflow** — `hexcurse-pr-review.yml` with Semgrep + doctor + rules-freshness jobs
- **Auto-update CI workflow** — `hexcurse-rules-update.yml` opens PRs when new version is published
- **ADR automation** — agent writes Architecture Decision Records automatically per `adr.mdc`
- **Linear ↔ Taskmaster bidirectional sync** — `linear-sync.mdc` + Linear MCP
- **MCP token budget warning** in `printSummary()` and `MCP_TOKEN_BUDGET.md`
- **Extended SESSION START** steps 4c (Semgrep baseline) and 4d (Linear sync)
- **Extended SESSION CLOSE** step 8b (ADR verification)

### Changed

- `PATHS.json` schema extended with 16 new keys (all backward-compatible)
- `runDoctor()` extended with 12 new checks
- `--refresh-rules` now refreshes all 10 `.mdc` files (was 4)
- `agentsMd()` updated with new SESSION START / CLOSE steps

### Security

- Semgrep MCP integration with mandatory HIGH/CRITICAL blocking gate
- PR-level Semgrep CI scan with inline comment reporting

## [1.4.9] — 2026-04-01

### Changed

- **Disk-first governance:** **`mcp-usage.mdc`** / **`AGENTS.md`** / **`MCP_COORDINATION.md`** — **SOURCE OF TRUTH** is the **workspace on disk**; **github** MCP is **optional** (remote PR/issue only). Local branches via **`git`**; **`--doctor`** treats missing **github** MCP as a **warning** (not blocking) on dev machines.
- **Embedded templates** in **`setup.js`** and **`templates/MCP_COORDINATION.md`**, **`templates/GOVERNANCE_PARITY.md`** aligned with the above.

## [1.4.8] — 2026-04-01

### Added

- **`GOVERNANCE_PARITY.md`** appendix: lightweight **AGENTS.md** SESSION START / CLOSE step table (MCP vs CLI vs human).
- **`--doctor` (consumer only):** when **`HEXCURSE/`** exists and **`cursor-governance/templates/`** is available next to **`setup.js`**, prints **template file count**, **SHA-256 fingerprint** (first 16 hex chars of full hash) of the template tree, and **`HEXCURSE/docs/`** file count for drift checks after install or **`--refresh-rules`**.

## [1.4.7] — 2026-04-01

### Added

- **`templates/GOVERNANCE_PARITY.md`** — on install, written to **`HEXCURSE/docs/GOVERNANCE_PARITY.md`**; **`PATHS.json`** includes **`governanceParity`**.
- **`--doctor`**: lists **`.cursor/rules`** `*.mdc` files, **layout** (source vs consumer pack), **`docs/GOVERNANCE_PARITY.md`** check.

### Changed

- **`--doctor` CI mode:** when **`CI=true`**, **`GITHUB_ACTIONS=true`**, or **`HEXCURSE_DOCTOR_CI=1`**, missing **`~/.cursor/mcp.json`**, parse errors, missing **github** / **taskmaster-ai** entries, and missing **`task-master`** on PATH are **warnings** (not blocking), so GitHub Actions can pass without a developer machine profile.

## [1.4.6] — 2026-03-30

### Added

- **`templates/HEADLESS_KICKOFF.txt`** and **`HEXCURSE/HEADLESS_KICKOFF.txt`** on install — plain-text prompt for **[Cursor headless CLI](https://cursor.com/docs/cli/headless)** with **`agent -p --model composer-2`** (default; optional **`composer-2-fast`**), **`--trust`**, **`--workspace`** ([parameters](https://cursor.com/docs/cli/reference/parameters)).
- **`HEXCURSE/PATHS.json`**: **`headlessKickoffPrompt`**, **`cursorHeadlessModelDefault`** (`composer-2`).

### Changed

- **`ONE_PROMPT.md`** template documents **headless** and **in-IDE Agent** kickoff; **`CURSOR.md`**, **`CURSOR_MODES.md`**, **`AGENTS.md`**, and **`README`** aligned.

## [1.4.5] — 2026-03-31

### Added

- **`INSTALL.md`** shipped in the npm tarball: Node **≥20**, LM Studio / **`.env`** / LAN vs Tailscale, **`--run-hexcurse`** env vars (**`HEXCURSE_DEBUG_BRIDGE`**, **`HEXCURSE_LLM_FETCH_MS`**), **`HEXCURSE_REPO_SNAPSHOT_MAX_CHARS`**, curl sanity checks, and what the installer writes.

### Changed

- **`package.json` `engines.node`:** **`>=20`** (matches **`task-master-ai`** / **`repomix`**). **`files`** includes **`INSTALL.md`**.

## [1.4.4] — 2026-03-31

### Fixed

- **`--run-hexcurse` AI expand:** **`fetch`** errors now include **resolved endpoint**, **model**, optional **cause**, and hints for **missing `.env`** vs wrong **`OPENAI_BASE_URL`**. Default **`AbortSignal.timeout(180000)`** (override with **`HEXCURSE_LLM_FETCH_MS`**) for slow local LLMs. **`HEXCURSE_DEBUG_BRIDGE=1`** logs the POST URL before the request.

## [1.4.3] — 2026-03-31

### Fixed

- **`--run-hexcurse` / AI expand:** Repo **`.env`** **`OPENAI_BASE_URL`** / **`OPENAI_API_KEY`** now **override** stale shell exports for the bridge (via **`loadDotEnvFromFile(..., { forceKeys })`**). Previously a leftover **`OPENAI_BASE_URL`** (e.g. Tailscale **`100.80.…`**) in the environment could block **`.env`** from applying and caused **`fetch failed`** even when **`curl`** to the LAN LM Studio URL worked.

## [1.4.2] — 2026-03-31

### Added

- **npm package:** explicit **`files`** whitelist (`bin/`, **`templates/`**, **`setup.js`**, docs, **`LICENSE`**) so the published tarball is lean and complete; tests and dev-only files are not shipped.
- **`prepublishOnly`:** runs **`npm run test:all`** before **`npm publish`**.
- **`LICENSE`** (MIT) in the package root.

### Changed

- **`--doctor`** on the **HexCurse governance source** tree (private **`package.json`** name **`hexcurse`**, no **`HEXCURSE/`** pack): seeds **`.cursor/hooks/state/skill-promotion-queue.json`** and **`.cursor/hexcurse-installer.path`** when missing; treats repo-root **`NORTH_STAR.md`** / **`CURSOR.md`** as expected (no false “legacy” warnings).

## [1.4.1] — 2026-03-31

### Fixed

- **NORTH_STAR gate:** **`isNorthStarSubstantive`** treats **`NORTH_STAR_NOT_READY`** as “not ready” only when it appears as a **whole line**, not when mentioned in template instructions (avoids false rejects).
- **Bridge / install:** **`task-master parse-prd`** is invoked with **`--force`** so non-TTY runs (Cursor Agent terminal) do not hang on “overwrite existing tasks?”.

### Changed

- **`NORTH_STAR.md`** / **`ONE_PROMPT.md`** templates: clarify standalone-placeholder wording for humans and agents.

## [1.4.0] — 2026-03-31

### Added

- **\`HEXCURSE/ONE_PROMPT.md\`**: single copy-paste block for Cursor — runs **\`--run-hexcurse\`** (via terminal) then full SESSION START. Regenerated on every install.
- **\`.cursor/hexcurse-installer.path\`** (gitignored): absolute path to this package’s **\`setup.js\`** so agents do not guess paths.
- **\`templates/ONE_PROMPT.md\`**, **\`PATHS.json\`**: **\`oneShotPrompt\`**, **\`installerPathFile\`**.

### Changed

- **\`NORTH_STAR.md\`** template and **CURSOR** / **SESSION_START** / **HEXCURSE README** templates center the **NORTH_STAR + ONE_PROMPT** flow.

## [1.3.0] — 2026-03-31

### Added

- **`NORTH_STAR.md`** template at repo root on install (**`templates/NORTH_STAR.md`**); **`PATHS.json`** key **`northStar`**.
- **`--run-hexcurse`** / **`--run-hexcurse-raw`**: expand **NORTH_STAR.md** → **`.taskmaster/docs/prd.txt`** (OpenAI-compatible chat, same model/URL as Taskmaster main unless **`HEXCURSE_EXPAND_MODEL`** set), run **`task-master parse-prd`**, sync **`HEXCURSE/DIRECTIVES.md`** **`## 📋 Queued`** from **`tasks.json`**. Skips DIRECTIVES sync if no **`HEXCURSE/`** pack (e.g. HexCurse source repo).
- **AGENTS.md** / **SESSION_START.md** templates: **run HEXCURSE** / STEP 0 bridge instructions; session start **`@NORTH_STAR.md`**.
- **`--doctor`**: optional note when **`NORTH_STAR.md`** is missing.

## [1.2.3] — 2026-03-30

### Added

- **`HEXCURSE/docs/ARCH_PROMPT.md`** — Shipped from **`cursor-governance/templates/ARCH_PROMPT.md`** (Architect onboarding; paths use **`HEXCURSE/`** prefix). **`PATHS.json`** gains **`archPrompt`**. **HEXCURSE/README.md** table lists the Architect doc.

## [1.2.2] — 2026-03-30

### Fixed

- **Piped / non-TTY stdin** (e.g. `type answers.txt | node setup.js` on Windows): read all prompt answers in one buffer first instead of opening readline per question — avoids dropped lines and broken prompts after the first answer.

## [1.2.1] — 2026-03-30

### Changed

- **Continual learning as self-improve:** **mcp-usage.mdc** template gains **RULE 9** — run **agents-memory-updater** on explicit request and **automatically at session close** when governance/agent-behavior paths changed; application-only sessions run only if the human asked.
- **AGENTS.md** / **base.mdc** templates: continual learning elevated from “optional” to **self-improve** loop; **SESSION CLOSE STEP 9**; MCP list includes **agents-memory-updater**; session log checklist includes RULE 9.
- **CONTINUAL_LEARNING.md** template: **Self-improvement loop** section.

## [1.2.0] — 2026-03-30

### Added

- **Continual learning** is part of the default install: seeds **`.cursor/hooks/state/continual-learning-index.json`** (empty `files` map) and **`continual-learning.json`** (null-safe hook state), adds **`.cursor/hooks/state/`** to **`.gitignore`** when missing, writes **`HEXCURSE/docs/CONTINUAL_LEARNING.md`** (agents-memory-updater workflow, incremental mtime rules, exclusions).
- **`PATHS.json`** entries: `continualLearningGuide`, `continualLearningIndex`, `continualLearningHookState`.
- **HEXCURSE/README.md**, **CURSOR.md**, and **AGENTS.md** templates reference continual learning.
- **`--doctor`**: warns when the continual-learning index file is missing.

## [1.1.0] — 2026-03-29

### Added

- **`--doctor`** — Run from a repository root to verify governance layout (`HEXCURSE/` or legacy), `.cursor/rules`, Taskmaster state hints, `~/.cursor/mcp.json` (including `github` and `taskmaster-ai` servers), and `task-master` on PATH.
- **`--refresh-rules`** — Refresh `mcp-usage.mdc` and rebuild `base.mdc` from installer templates plus project `AGENTS.md` and `ARCHITECTURE.md` (Purpose / Tech Stack / Out of Scope); preserve sacred bullets from the previous `base.mdc` when present. Writes `.cursor/rules/` and `HEXCURSE/rules/` when the pack folder exists.
- **`CURSOR.md`** (repo root) and **`HEXCURSE/docs/CURSOR_MODES.md`** — Written on new installs; quick-start and Agent vs Architect vs Ask guidance.
- **Session log template** — Checklist block and fuller example entry in generated `HEXCURSE/SESSION_LOG.md`.
- **`base.mdc` template** — “Session priming” bullet: ask once if the human skipped session-start before planning or implementing.

### Fixed

- **CLI wrapper** (`bin/cursor-governance.js`) — Honors `process.exitCode` so `--doctor` can exit non-zero when checks fail.

## [1.0.0] — prior

Initial published installer: interactive governance scaffold, MCP merge, global CLI hints, `HEXCURSE/` single-folder layout, `PATHS.json`, root `AGENTS.md` pointer.
