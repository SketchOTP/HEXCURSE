# PROJECT OVERVIEW — HEXCURSE (single source of truth, code-derived)

This document is the **onboarding and handoff reference** for anyone taking over **HEXCURSE** (installer code under **`cursor-governance/`**). Every technical claim below is tied to **files in this repository** (primarily **`cursor-governance/setup.js`**). It does **not** invent product features: the **application runtime** is **TBD** until humans confirm (see **`docs/ARCHITECTURE.md`**).

| Item | Value |
|------|--------|
| **Product name** | HEXCURSE (CLI **`hexcurse`**; npm package **`cursor-governance`**) |
| **Installer version** | from `cursor-governance/package.json` |
| **Root npm package** | `hexcurse` (`package.json`, `private: true`) |
| **Authoritative implementation** | `cursor-governance/setup.js` (~3.6k lines) |

**Maintenance contract:** When **`setup.js`**, install outputs, or repo layout rules change, **update this file** in the same change set.

---

## 1. What you are looking at

### 1.1 Two different “products” in one tree

1. **HEXCURSE governance system** — Markdown rules, Cursor **`.mdc`** rules, Taskmaster, MCP coordination docs, session rituals. **Lives in this repo** at root + **`docs/`** + **`.cursor/rules/`** (source layout).
2. **HEXCURSE installer** — Node CLI (npm **`cursor-governance`**, command **`hexcurse`**) that **writes** the governance pack into **another** repo’s working directory (or a fresh folder). **Implementation:** **`cursor-governance/setup.js`**.

### 1.2 Source repo fingerprint (this repository)

**`isHexcurseGovernanceSourceRepo(cwd)`** in **`setup.js`** returns **true** only when **all** hold:

- **`package.json`** exists and parses to **`name === 'hexcurse'`** and **`private === true`**.
- **`HEXCURSE/`** directory **does not** exist at `cwd`.
- **`cursor-governance/setup.js`** exists.

If someone runs the **full interactive install** from this repo root, **`writeGovernanceRules`** / **`writeFileMaybeSkip`** can **create `HEXCURSE/``**, which makes **`isHexcurseGovernanceSourceRepo`** become **false**. The maintained layout for **this** repo is **no `HEXCURSE/`** pack; use **`--doctor`**, **`--refresh-rules`**, **`--run-hexcurse*`**, **`--learning-rollup`** without mutating that invariant unless you intend to convert the repo.

---

## 2. Repository layouts

### 2.1 Constant

- **`HEXCURSE_ROOT`** = **`'HEXCURSE'`** (string literal at top of **`setup.js`**).

### 2.2 Consumer layout (typical install target)

- Single folder **`HEXCURSE/`** holds the pack: **`AGENTS.md`**, **`DIRECTIVES.md`**, **`PATHS.json`**, **`NORTH_STAR.md`**, **`SESSION_START.md`**, **`SESSION_LOG.md`**, **`CURSOR.md`**, **`ONE_PROMPT.md`**, **`HEADLESS_KICKOFF.txt`**, **`README.md`**, **`docs/*.md`**, **`rules/*.mdc`** (canonical copy).
- **`.cursor/rules/`** receives the **same** `.mdc` content as **`HEXCURSE/rules/`** when those files are first written.
- Repo root **`AGENTS.md`** is a **pointer** to **`HEXCURSE/AGENTS.md`** (from **`rootAgentsPointerMd()`**).

### 2.3 Path resolution helpers (exported for tests)

**`module.exports = main`** plus **`main.hexcursePaths`** (`setup.js` end):

| Export | Behavior |
|--------|----------|
| **`pathNorthStarPack(cwd)`** | `path.join(cwd, 'HEXCURSE', 'NORTH_STAR.md')` |
| **`resolveNorthStarPathForRead(cwd)`** | Prefers pack file if it exists; else legacy **`NORTH_STAR.md`** at repo root; returns **`{ path, legacy }`**. |
| **`resolveSessionLogForRollup(cwd)`** | Prefers **`HEXCURSE/SESSION_LOG.md`** if present; else root **`SESSION_LOG.md`**. |
| **`resolveRollingContextPathForRollup(cwd)`** | Prefers existing **`HEXCURSE/docs/ROLLING_CONTEXT.md`**, then existing **`docs/ROLLING_CONTEXT.md`**, else if **`HEXCURSE/`** exists targets pack path, else legacy **`docs/`** path. |

**`main.hexcurseInstallTestHooks.generateNorthStarFromExistingRepo`** — exposed for **`north-star-existing-repo.test.js`**.

---

## 3. `PATHS.json` schema (`pathsManifestObject`)

Written to **`HEXCURSE/PATHS.json`** on install (skip if exists). **`schema`: `hexcurse-paths-v1`**, **`version`: 1**, optional **`installer`** block with name/version/generatedAt.

**`paths`** keys (all string paths relative to repo root unless noted):

| Key | Points to |
|-----|-----------|
| `agents` | `HEXCURSE/AGENTS.md` |
| `directives` | `HEXCURSE/DIRECTIVES.md` |
| `architecture` | `HEXCURSE/docs/ARCHITECTURE.md` |
| `archPrompt` | `HEXCURSE/docs/ARCH_PROMPT.md` |
| `sessionStart` | `HEXCURSE/SESSION_START.md` |
| `sessionLog` | `HEXCURSE/SESSION_LOG.md` |
| `pathsManifest` | `HEXCURSE/PATHS.json` |
| `packReadme` | `HEXCURSE/README.md` |
| `rulesCanonicalDir` | `HEXCURSE/rules` |
| `baseMdcCanonical` | `HEXCURSE/rules/base.mdc` |
| `mcpUsageMdcCanonical` | `HEXCURSE/rules/mcp-usage.mdc` |
| `governanceMdcCanonical` | `HEXCURSE/rules/governance.mdc` |
| `rulesCursorDir` | `.cursor/rules` |
| `baseMdcActive` | `.cursor/rules/base.mdc` |
| `mcpUsageMdcActive` | `.cursor/rules/mcp-usage.mdc` |
| `governanceMdcActive` | `.cursor/rules/governance.mdc` |
| `taskmasterRoot` | `.taskmaster` |
| `prd` | `.taskmaster/docs/prd.txt` |
| `serenaMemories` | `.serena/memories` |
| `rootAgentsPointer` | `AGENTS.md` |
| `continualLearningGuide` | `HEXCURSE/docs/CONTINUAL_LEARNING.md` |
| `mcpCoordination` | `HEXCURSE/docs/MCP_COORDINATION.md` |
| `governanceParity` | `HEXCURSE/docs/GOVERNANCE_PARITY.md` |
| `memoryTaxonomy` | `HEXCURSE/docs/MEMORY_TAXONOMY.md` |
| `continualLearningIndex` | `.cursor/hooks/state/continual-learning-index.json` |
| `continualLearningHookState` | `.cursor/hooks/state/continual-learning.json` |
| `skillPromotionQueue` | `.cursor/hooks/state/skill-promotion-queue.json` |
| `cursorSkillsDir` | `.cursor/skills` |
| `rollingContext` | `HEXCURSE/docs/ROLLING_CONTEXT.md` |
| `northStar` | `HEXCURSE/NORTH_STAR.md` |
| `cursorQuickStart` | `HEXCURSE/CURSOR.md` |
| `oneShotPrompt` | `HEXCURSE/ONE_PROMPT.md` |
| `headlessKickoffPrompt` | `HEXCURSE/HEADLESS_KICKOFF.txt` |
| `cursorHeadlessModelDefault` | `composer-2` |
| `installerPathFile` | `.cursor/hexcurse-installer.path` |

---

## 4. CLI (`node cursor-governance/setup.js` or `cursor-governance` via global bin)

### 4.1 Entry points

- **`cursor-governance/bin/cursor-governance.js`**: `require('../setup.js')` → **`Promise.resolve(run()).then(...)`** where **`run`** is **`main`**.
- **`setup.js`**: **`if (require.main === module) { main().catch(...) }`**.

### 4.2 Modes (`parseSetupArgv`)

| Mode | Flags |
|------|--------|
| `help` | `--help`, `-h` |
| `version` | `--version`, `-v` |
| `doctor` | `--doctor` |
| `refresh-rules` | `--refresh-rules` |
| `learning-rollup` | `--learning-rollup` + optional **`--sessions=N`** (**`parseLearningRollupSessions`**: default **5**, clamped **[1, 50]**) |
| `preflight-cursor-agent` | `--preflight-cursor-agent` |
| `run-hexcurse-raw` | **`--run-hexcurse-raw`** (checked **before** `run-hexcurse`) |
| `run-hexcurse` | `--run-hexcurse` |
| `multi-agent` | `--multi-agent` — worktree scaffold, **`.env`** **`HEXCURSE_MULTI_AGENT=1`**, **`MULTI_AGENT.md`**, extra rule writes |
| `sync-rules` | `--sync-rules` (+ optional **`--dry-run`**) — fetch remote `.mdc` from **`HEXCURSE_RULES_REMOTE_URL`** |
| `install` | default |

Full env documentation for operators: **`printCliHelp()`** in **`setup.js`** (too long to duplicate verbatim here; read the function).

---

## 5. Install path (`main()` → install)

### 5.1 Prerequisites (`checkPrerequisites`)

- **`node --version`**, **`npm --version`**, **`git --version`** — **`checkCommand`**; failure **`process.exit(1)`**.
- Python + pip: **`findPython`**, **`findPip`**. If missing: **warn** only; **`pythonPipAvailableForUv = false`**.
- If both found: **`pythonPipAvailableForUv = true`**.

### 5.2 Global tooling (`installGlobals`)

- **`task-master-ai`** and **`repomix`**: **`npm install -g`** (Windows without `sudo`; Unix/macOS uses **`sudo npm install -g`** per **`installNpmGlobalPackage`**).
- **`uv`**: if **`pythonPipAvailableForUv`**, Windows tries **`py -3 -m pip install uv`**, then **`python -m pip install uv`**, etc.; non-Windows tries **`pip3 install uv`** then **`curl ... astral.sh/uv/install.sh`**. Failure: warn (Serena uses **`uvx`**).

### 5.3 Answers

- **Interactive:** **`promptUser()`** — **`readline`** unless **`!stdinIsTTY()`**, then **`readPipedStdinLines`** + **`createBufferedPrompts`** (line-buffered answers; documented for Windows ConPTY).
- **Quick:** **`argvHasQuick`** (`--quick` / `-q`) + **`parsePresetFromArgv`** → **`buildQuickInstallAnswers`**.

**`buildQuickInstallAnswers` requirements:**

- **`resolveGithubTokenFromUserEnvironment()`** must return a token (`GITHUB_PERSONAL_ACCESS_TOKEN`, **`GITHUB_TOKEN`**, or **`~/.cursor/mcp.json`** → **`mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN`**); else **`process.exit(1)`**.
- **`--preset=other`** is **rejected** for quick install (**exit 1**).
- **`HEXCURSE_PROJECT_NAME`**, **`HEXCURSE_PURPOSE`**, **`HEXCURSE_STACK`**, **`HEXCURSE_MODULES`**, **`HEXCURSE_SACRED`**, **`HEXCURSE_OUT_OF_SCOPE`**, **`HEXCURSE_DOD`** — defaults documented in **`buildQuickInstallAnswers`** source.
- **`HEXCURSE_REPO_KIND=existing`**: **`enrichExistingRepoQuick`** runs **`runRepomixCompressSnapshot`** + **`generateNorthStarFromExistingRepo`**.

### 5.4 MCP merge (`mergeMcpJson`)

- Path: **`~/.cursor/mcp.json`**.
- Parse failure: **backup** to **`mcp.json.backup.<timestamp>`**, start fresh **`{ mcpServers: {} }`**.
- For each server from **`buildMcpServers`**: if key exists, **increment `kept`** and **do not overwrite**.
- Write pretty JSON + trailing newline; **`chmod 0o600`** on non-Windows.

### 5.5 Governance rules (`writeGovernanceRules`)

For each of **`base.mdc`** (**`baseMdc()`**), **`mcp-usage.mdc`** (**`MCP_USAGE_TEMPLATE`**), **`process-gates.mdc`** (**`PROCESS_GATES_TEMPLATE`**), **`governance.mdc`** (**`readBundledGovernanceMdc()`**), **`security.mdc`**, **`adr.mdc`**, **`memory-management.mdc`**, **`debugging.mdc`**, **`multi-agent.mdc`**, **`linear-sync.mdc`**:

- If **`HEXCURSE/rules/<basename>`** already exists → **skip both** pack and **`.cursor/rules`** copies (both paths pushed to **`skipped`**).
- Else write **`HEXCURSE/rules/...`** and **`.cursor/rules/...`** (directories ensured).

**`--refresh-rules` differs:** always overwrites **`.cursor/rules`** (and **`HEXCURSE/rules`** if pack folder exists); **`base.mdc`** rebuilt from **`AGENTS.md` / `ARCHITECTURE.md`** + preserved **Sacred Constraints** from previous **`base.mdc`**.

### 5.6 Skip-if-exists file writes (`writeFileMaybeSkip`)

Install uses **`writeFileMaybeSkip`** for pack files, hooks, skills, **`.taskmaster/docs/prd.txt`**, etc. — **if file exists, skip** (log **`⚠ SKIP (exists)`**). **`HEXCURSE/ONE_PROMPT.md`** and **`HEXCURSE/HEADLESS_KICKOFF.txt`** are **not** in this batch; they are always rewritten at the end (**§23**).

**Exact order:** **§23** (`main()` install sequence).

### 5.7 `.gitignore` (`appendGitignoreLines`)

Installer **appends** these lines if missing (exact match per line):

- `repomix-output.xml`
- `.taskmaster/tasks/tasks.json`
- `.serena/project.local.yml`
- `.cursor/hooks/state/`
- `.cursor/hexcurse-installer.path`
- `.env`

**This repo’s committed `.gitignore`** also includes **`node_modules`**, editor/OS noise, **`.cursor/hooks/state/`**, **`.cursor/hexcurse-installer.path`**, **`repomix-output.xml`**, **`.serena/project.local.yml`**, **`.scratch-*`** — read **`.gitignore`** on disk for the full set.

### 5.8 Taskmaster after file writes

1. **`task-master init --yes`** — **`runCmd`**; failure warns, continues.
2. **`writeLmStudioDotEnvIfMissing`** — only **`lmstudio`** provider; writes **`OPENAI_API_KEY=lm-studio`** + **`OPENAI_BASE_URL`** if **`.env`** missing.
3. **`configureTaskmasterModelsForInstall`** — **`task-master models`** CLI:
   - **lmstudio:** **`--set-main|fallback|research`** with **`HEXCURSE_LM_STUDIO_MODEL` or default `qwen3.5-2b`** and **`resolvedLmStudioApiBaseUrl`**.
   - **anthropic:** fixed model IDs **`claude-sonnet-4-20250514`**, **`claude-3-7-sonnet-20250219`**.
   - **openai:** **`gpt-4o`**, **`gpt-4o-mini`**.
   - **other:** skip with log.
4. **`patchTaskmasterConfigForLmStudioContext`** — only **`lmstudio`**; reads **`HEXCURSE_LM_STUDIO_MAX_CONTEXT`** or **`DEFAULT_LM_STUDIO_MAX_CONTEXT` (8000)**; **`maxTokens`** per role = **`floor(ctx * 0.35)`** clamped **[256, 8192]**; adjusts **`global.defaultNumTasks`** / **`defaultSubtasks`** for **`ctx <= 4096`**, **`ctx <= 10240`**, etc.
5. **`task-master parse-prd --force "<prdRel>"`** with **`taskmasterChildEnv(answers)`**; failure warns with LM Studio / context tips.
6. **`seedPlaceholderTasksJsonIfMissing`** — if **`.taskmaster/tasks/tasks.json`** missing, writes stub **`master.tasks`** array with one placeholder task.

### 5.9 Post-install

- **`writeInstallerPathFile`** — **`.cursor/hexcurse-installer.path`** contains absolute path to **`setup.js`**.
- **`writeOnePromptFile`**, **`writeHeadlessKickoffFile`** — overwrite **`HEXCURSE/ONE_PROMPT.md`** and **`HEXCURSE/HEADLESS_KICKOFF.txt`**.
- **`tryGitCommit`** — **`git init`** if needed, **`git add .`**, **`git commit -m "chore: HEXCURSE scaffold"`** (failure non-fatal).
- **`printSummary`**.

---

## 6. `buildMcpServers` (exact server list — 17 entries, insertion order)

| Server id | `command` / `url` | Notes |
|-----------|-------------------|--------|
| `taskmaster-ai` | `npx -y --package=task-master-ai task-master-ai` | **`env`: spread `taskmasterEnv`** |
| `context7` | `npx -y @upstash/context7-mcp` | |
| `repomix` | `npx -y repomix --mcp` | |
| `serena` | `uvx` from **`git+https://github.com/oraios/serena`** … **`--project ${workspaceFolder}`** | |
| `gitmcp` | **`url`:** `https://gitmcp.io/docs` | |
| `gitmcp-adafruit-mpu6050` | **`url`:** `https://gitmcp.io/adafruit/Adafruit_MPU6050` | |
| `sequential-thinking` | `npx -y @modelcontextprotocol/server-sequential-thinking` | |
| `memory` | `npx -y @modelcontextprotocol/server-memory` | |
| `github` | `npx -y @modelcontextprotocol/server-github` | **`GITHUB_PERSONAL_ACCESS_TOKEN`** in **`env`** |
| `jcodemunch` | `uvx` + `jcodemunch-mcp` | |
| `playwright` | `npx -y @playwright/mcp` | |
| `semgrep` | `uvx` + `semgrep-mcp` | **`SEMGREP_PATH`**, **`SEMGREP_APP_TOKEN`** |
| `sentry` | `npx -y @sentry/mcp-server@latest` | **`SENTRY_ACCESS_TOKEN`** (legacy **`SENTRY_AUTH_TOKEN`** migration in **`mergeMcpJson`**) |
| `firecrawl` | `npx -y firecrawl-mcp` | **`FIRECRAWL_API_KEY`** |
| `linear` | `npx -y @mseep/linear-mcp` | **`LINEAR_API_KEY`** |
| `pampa` | **`node`/`node.exe`** + **`resolvePampaGlobalPath()`** | **`cwd`: `${workspaceFolder}`** |
| `supabase` | **`url`:** `https://mcp.supabase.com/mcp?project_ref=…` | Default ref from **`SUPABASE_PROJECT_REF`** or code fallback |

Archival directive: **`docs/directives/D-HEXCURSE-MCP-RECONCILE-003.md`**.

---

## 7. NORTH_STAR bridge

### 7.1 `runNorthStarBridge(cwd, { raw })`

1. **`loadDotEnvFromFile(cwd, { forceKeys: ['OPENAI_BASE_URL', 'OPENAI_API_KEY', 'HEXCURSE_EXPAND_MODEL'] })`**
2. **`writeInstallerPathFile(cwd)`**
3. Read north star via **`resolveNorthStarPathForRead`**; warn if legacy root file.
4. **`isNorthStarSubstantive`**: fails on standalone **`NORTH_STAR_NOT_READY`** line, short text, boilerplate phrases (`replace this entire document`, etc.).
5. Require **`.taskmaster/`**.
6. Write **`.taskmaster/docs/prd.txt`**: **`buildPrdFromNorthStarRaw`** or **`expandNorthStarToPrdMarkdown`** ( **`fetch`** OpenAI-compatible **`/chat/completions`**, **`AbortSignal.timeout(HEXCURSE_LLM_FETCH_MS || 180000)`**, default model **`gpt-4o-mini`** if not from config/env).
7. **`HEXCURSE_PREFLIGHT_CURSOR_AGENT=1`** → **`assertCursorAgentCliAuthenticated`** (`agent status`).
8. **`task-master parse-prd --force`** with **`taskmasterChildEnvForBridge`** ( **`loadDotEnvFromFile`** with **`forceKeys` OPENAI_*** ; default **`OPENAI_API_KEY`** **`lm-studio`** if empty).
9. **`syncDirectivesQueuedFromTasks`** only if **`HEXCURSE/`** exists.

### 7.2 `syncDirectivesQueuedFromTasks`

- Reads **`HEXCURSE/DIRECTIVES.md`**, **`.taskmaster/tasks/tasks.json`**.
- Tasks array: **`tasksData.master.tasks`** or **`tasksData.tasks`**.
- Sort by numeric id; format lines **`- D###: title | Priority: … | Depends on: …`**.
- Replaces body between **`## 📋 Queued`** and the next **`## `** heading.

### 7.3 Bridge and install-time LLM tuning (`setup.js`)

| Variable | Used by | Default / notes |
|----------|---------|-----------------|
| **`HEXCURSE_EXPAND_MODEL`** | **`expandNorthStarToPrdMarkdown`** | Falls back to **`.taskmaster/config.json`** **`models.main.modelId`**, then **`gpt-4o-mini`**. |
| **`HEXCURSE_LLM_FETCH_MS`** | **`expandNorthStarToPrdMarkdown`** **`fetch`** **`AbortSignal.timeout`** | **`180000`**. |
| **`HEXCURSE_DEBUG_BRIDGE`** | Logs expand endpoint when **`1`**. | |
| **`HEXCURSE_REPO_SNAPSHOT_MAX_CHARS`** | **`runRepomixCompressSnapshot`** truncation | **`120000`**. |
| **`HEXCURSE_INSTALL_MODEL`** | **`installTimeLlmComplete`** (Anthropic path) | **`claude-sonnet-4-20250514`**. |

**`runRepomixCompressSnapshot`** command string: **`npx -y repomix --compress --stdout --quiet --style markdown .`** (on failure → **`collectFallbackRepoSnapshot`**).

---

## 8. Learning rollup (`runLearningRollup`)

- Split **`SESSION_LOG.md`** on **`/^### Session /m`**; take last **N** blocks; append section **`## Raw session index — <ISO>`** to rolling context file.
- Idempotency: if **`continual-learning.json`** **`lastRollupSessionKey`** equals newest session header, **skip append** (log dim message).
- State file: **`.cursor/hooks/state/continual-learning.json`** — set **`lastRollupAt`**, **`lastRollupSessionKey`**, **`sessionsSinceRollup: 0`**, preserve/merge **`version`**.

---

## 9. Doctor (`runDoctor`)

- First: **`ensureHexcurseSourceRepoDoctorArtifacts`** on source repo — create **`skill-promotion-queue.json`** and **`.cursor/hexcurse-installer.path`** if absent.
- **`isDoctorCiRelaxed`**: **`CI`**, **`GITHUB_ACTIONS`**, or **`HEXCURSE_DOCTOR_CI=1`** → **`taskmaster-ai`** / **`~/.cursor/mcp.json`** / **`task-master` PATH** issues become **warnings** not **blocking**.

Checks (abridged; see **`runDoctor`** for full list): **`HEXCURSE/PATHS.json`** schema, session prompts, **`AGENTS.md`**, **`mcp-usage.mdc`**, **`governance.mdc`**, continual-learning files, taxonomy, rolling context, skills dir, **`tasks.json`**, **`NORTH_STAR`**, **`ONE_PROMPT`**, **`HEADLESS_KICKOFF`**, **`mcp.json`** (**github** optional, **jcodemunch** recommended, **taskmaster-ai** required unless CI), **`task-master --version`**, template fingerprint vs **`HEXCURSE/docs`** when pack exists.

**Exit:** **`process.exitCode = 1`** if any **`bad`** entries.

---

## 10. Embedded rule templates in `setup.js`

**`MCP_USAGE_TEMPLATE`** and **`PROCESS_GATES_TEMPLATE`** are **large string literals** in **`setup.js`**. **`MCP_USAGE_TEMPLATE`** defines RULE **1–12** (through **jcodemunch**, **gitmcp-adafruit-mpu6050**, **supabase**), expanded **DEGRADED_MODE** (17-server tiers), token-budget notice, and MCP order **1–17**. **`PROCESS_GATES_TEMPLATE`** defines numbered gates **1–9** plus **Semgrep pre-commit**, **ADR**, and **session-close checklist** sections.

**Live repo rules:** **`.cursor/rules/*.mdc`** may match these after **`--refresh-rules`** or manual edits. **Binding behavior** is whatever is on disk in the workspace; **installer refresh** overwrites from templates.

---

## 11. Cursor rules in this repo (frontmatter from files)

| File | `alwaysApply` | `globs` / notes |
|------|----------------|-----------------|
| **`base.mdc`** | `true` | Global project + sacred constraints |
| **`mcp-usage.mdc`** | `true` | MCP automation (RULE 1–12, **DEGRADED_MODE**) |
| **`process-gates.mdc`** | `true` | Checklist + Semgrep / ADR / session-close gates |
| **`governance.mdc`** | `false` | `AGENTS.md`, `DIRECTIVES.md`, `SESSION_LOG.md`, `HEXCURSE/...`, `.cursor/rules/**/*.mdc`, `HEXCURSE/rules/**/*.mdc`, `.cursor/skills/**/*.md` |
| **`security.mdc`** | `false` | Globs on source — Semgrep after writes |
| **`adr.mdc`** | `false` | Globs on architecture paths — ADR append-only |
| **`memory-management.mdc`** | `true` | Context pruning, compaction checkpoints |
| **`debugging.mdc`** | `false` | Globs on code — hypothesis-first debugging |
| **`multi-agent.mdc`** | `false` | `HEXCURSE/docs/MULTI_AGENT.md`, `.swarm/**` |
| **`linear-sync.mdc`** | `false` | Taskmaster + Linear sync globs |
| **`markdown.mdc`** | `false` | `**/*.md` — doc style, append-only **`SESSION_LOG`**, no secrets in docs |

---

## 12. Bundled templates (`cursor-governance/templates/`)

Exact files (11): **`ARCH_PROMPT.md`**, **`CONTINUAL_LEARNING.pack.md`**, **`cursor-skills-README.md`**, **`GOVERNANCE_PARITY.md`**, **`governance.mdc`**, **`HEADLESS_KICKOFF.txt`**, **`MEMORY_TAXONOMY.md`**, **`MCP_COORDINATION.md`**, **`NORTH_STAR.md`**, **`ONE_PROMPT.md`**, **`_TEMPLATE_SKILL.md`**.

**`{{PROJECT_NAME}}`** replaced in **`GOVERNANCE_PARITY.md`**, **`NORTH_STAR.md`**, **`ONE_PROMPT.md`**, **`HEADLESS_KICKOFF.txt`**, **`CONTINUAL_LEARNING.pack.md`**.

---

## 13. Root & package scripts

**Root `package.json`:**

| Script | Command |
|--------|---------|
| `test` | `npm --prefix cursor-governance run test` |
| `test:hexcurse` | `npm --prefix cursor-governance run test:hexcurse` |
| `test:north-star` | `npm --prefix cursor-governance run test:north-star` |
| `test:all` | `npm --prefix cursor-governance run test:all` |
| `doctor` | `node cursor-governance/setup.js --doctor` |
| `preflight:cursor-agent` | `node cursor-governance/setup.js --preflight-cursor-agent` |
| `ci` | `npm run test:all && npm run doctor` |

**`cursor-governance/package.json`:**

| Script | Command |
|--------|---------|
| `test` | `node --check setup.js && node --check bin/cursor-governance.js` |
| `test:hexcurse` | `node test/hexcurse-pack.test.js` |
| `test:north-star` | `node test/north-star-existing-repo.test.js` |
| `test:all` | `npm run test` + both test files |
| `prepublishOnly` | `npm run test:all` |

---

## 14. Automated tests (behavior locked by code)

### 14.1 `test/hexcurse-pack.test.js`

- Imports **`main.hexcursePaths`**.
- Tests: **`pathNorthStarPack`**, **`resolveNorthStarPathForRead`** (pack-only, legacy-only, pack-prefers), **`resolveSessionLogForRollup`**, **`resolveRollingContextPathForRollup`** (hex dir exists, prefers hex file), **integration:** **`execFileSync(node, [setup.js, '--learning-rollup', '--sessions=2'])`** appends session block to **`HEXCURSE/docs/ROLLING_CONTEXT.md`**.

### 14.2 `test/north-star-existing-repo.test.js`

- Mock HTTP server **`POST /v1/chat/completions`** returns fixture markdown.
- Calls **`generateNorthStarFromExistingRepo`** with **`installTimeLlmComplete`** path (OpenAI-compatible).

---

## 15. CI

**`.github/workflows/hexcurse-doctor.yml`**

- **Ubuntu**, **Node 20**.
- **`node cursor-governance/setup.js --doctor`** from repo root.
- **`cd cursor-governance && npm ci && npm run test:all`**.

---

## 16. Continual-learning seed JSON (from `setup.js`)

- **`continualLearningIndexSeedJson`**: `{ "version": 1, "files": {} }`
- **`continualLearningHookStateSeedJson`**: **`version`: 2**, fields **`lastRunAtMs`**, **`turnsSinceLastRun`**, **`lastTranscriptMtimeMs`**, **`lastProcessedGenerationId`**, **`trialStartedAtMs`**, **`lastRollupAt`**, **`lastRollupSessionKey`**, **`sessionsSinceRollup`**, **`lastMemoryUpdaterRunDateUtc`**, **`pendingLearning`** (see RULE 9 text in **`MCP_USAGE_TEMPLATE`**).
- **`skillPromotionQueueSeedJson`**: `{ "version": 1, "candidates": {} }`

Human workflow: **`docs/CONTINUAL_LEARNING.md`**, **`docs/MEMORY_TAXONOMY.md`**.

---

## 17. `.env.example` (repo root)

Documents **`OPENAI_API_KEY`**, **`OPENAI_BASE_URL`** for LM Studio, optional **`HEXCURSE_LM_STUDIO_MAX_CONTEXT`**, **`HEXCURSE_LM_STUDIO_BASE_URL`**, **`HEXCURSE_PREFLIGHT_CURSOR_AGENT`**, and commented cloud keys. **Not** loaded by Node unless copied to **`.env`** (installer may create **`.env`** for LM Studio).

---

## 18. `docs/` index (first heading only)

| File | Title |
|------|--------|
| **`ARCHITECTURE.md`** | ARCHITECTURE — HexCurse |
| **`ARCH_PROMPT.md`** | ARCH_PROMPT — External AI Architect |
| **`CONTINUAL_LEARNING.md`** | Continual learning — HexCurse |
| **`CURSOR_MODES.md`** | Cursor modes — HexCurse |
| **`GOVERNANCE_PARITY.md`** | Governance parity — HexCurse |
| **`MCP_COORDINATION.md`** | MCP & tool coordination — HexCurse |
| **`MEMORY_SEED.md`** | Memory MCP — Seed facts |
| **`MEMORY_TAXONOMY.md`** | Memory taxonomy — HexCurse |
| **`ONE_PROMPT.md`** | ONE_PROMPT flow (consumer repos) |
| **`PROJECT_OVERVIEW.md`** | This file |
| **`QUICK_COMMAND_REFERENCE.md`** | Quick command reference |
| **`ROLLING_CONTEXT.md`** | Rolling context — HexCurse |
| **`SESSION_START.md`** | Session-start paste (one screen) |

---

## 19. Default LM Studio constants (code)

| Name | Value |
|------|--------|
| **`DEFAULT_LM_STUDIO_BASE_URL`** | `http://100.80.17.40:1234/v1` |
| **`DEFAULT_LM_STUDIO_MAX_CONTEXT`** | `8000` |

**`normalizeLmStudioV1BaseUrl`**: trims trailing slashes; appends **`/v1`** if missing.

---

## 20. Taskmaster state in this repo

- **`.taskmaster/config.json`** — actual **`models`**, **`global`** as committed (LM Studio URLs and **`qwen3.5-2b`** in this workspace snapshot).
- **`.taskmaster/tasks/tasks.json`** — machine task graph; **`DIRECTIVES.md`** at repo root is the human mirror for **this** layout.
- **`.taskmaster/docs/prd.txt`** — PRD source for **`parse-prd`**.

---

## 21. Relationship to `docs/ARCHITECTURE.md`

- **`ARCHITECTURE.md`**: short system summary, MCP table, **Definition of Done**, **TBD** product notes.
- **`PROJECT_OVERVIEW.md`**: **full machinery** — installer, paths, CLI, tests, CI, seeds, MCP merge.

---

## 22. Changelog and install notes

- **`cursor-governance/CHANGELOG.md`** — version history of the installer package.
- **`cursor-governance/INSTALL.md`** — human-facing install notes (read alongside **`cursor-governance/README.md`**).

---

## 23. `main()` install sequence (exact order)

After **`mergeMcpJson`**, **`main()`** performs the following in order:

1. **`writeGovernanceRules`** ×10: **`base.mdc`**, **`mcp-usage.mdc`**, **`process-gates.mdc`**, **`governance.mdc`**, **`security.mdc`**, **`adr.mdc`**, **`memory-management.mdc`**, **`debugging.mdc`**, **`multi-agent.mdc`**, **`linear-sync.mdc`** (templates in **`setup.js`** or bundled reads per function).
2. **`writeFileMaybeSkip`** in this order:
   - **`HEXCURSE/PATHS.json`**
   - **`HEXCURSE/README.md`** (**`hexcurseReadmeMd`**)
   - **`HEXCURSE/AGENTS.md`**
   - **`HEXCURSE/DIRECTIVES.md`**
   - **`HEXCURSE/docs/ARCHITECTURE.md`**
   - **`HEXCURSE/docs/GOVERNANCE_PARITY.md`**
   - **`HEXCURSE/SESSION_LOG.md`**
   - **`.taskmaster/docs/prd.txt`** (**`prdTxt`** — may include existing-repo lead note)
   - **`.serena/memories/.gitkeep`**
   - **`HEXCURSE/SESSION_START.md`**
   - **`AGENTS.md`** at repo root (**`rootAgentsPointerMd`**)
   - **`HEXCURSE/NORTH_STAR.md`** (draft from **`northStarDraftMd`** or **`readBundledNorthStarTemplate`**)
   - **`HEXCURSE/CURSOR.md`**
   - **`HEXCURSE/docs/CURSOR_MODES.md`**
   - **`HEXCURSE/docs/ARCH_PROMPT.md`**
   - **`HEXCURSE/docs/CONTINUAL_LEARNING.md`** (**`continualLearningMd`** = **`readContinualLearningPackTemplate`** + project name replace)
   - **`HEXCURSE/docs/MCP_COORDINATION.md`**
   - **`HEXCURSE/docs/MCP_TOKEN_BUDGET.md`** (**`mcpTokenBudgetMd()`**)
   - **`HEXCURSE/docs/MULTI_AGENT.md`** (**`multiAgentMd()`**)
   - **`HEXCURSE/docs/ADR_LOG.md`** (**`adrLogStubMd()`**)
   - **`HEXCURSE/docs/AGENT_HANDOFFS.md`** (**`agentHandoffsStubMd()`**)
   - **`.cursor/hooks/state/continual-learning-index.json`**
   - **`.cursor/hooks/state/continual-learning.json`**
   - **`.cursor/hooks/state/skill-promotion-queue.json`**
   - **`HEXCURSE/docs/MEMORY_TAXONOMY.md`**
   - **`HEXCURSE/docs/ROLLING_CONTEXT.md`** (**`rollingContextStubMd`**)
   - **`.cursor/skills/README.md`**
   - **`.cursor/skills/_TEMPLATE_SKILL.md`**
3. **`appendGitignoreLines`**
4. **`task-master init --yes`**
5. **`writeLmStudioDotEnvIfMissing`** (LM Studio provider only)
6. **`configureTaskmasterModelsForInstall`**
7. **`patchTaskmasterConfigForLmStudioContext`** (LM Studio only)
8. **`task-master parse-prd --force ".taskmaster/docs/prd.txt"`** with **`taskmasterChildEnv(answers)`**
9. **`seedPlaceholderTasksJsonIfMissing`**
10. **`writeInstallerPathFile`**, **`writeOnePromptFile`**, **`writeHeadlessKickoffFile`** — always **`writeFile`** (**not** **`writeFileMaybeSkip`**): **`HEXCURSE/ONE_PROMPT.md`** and **`HEXCURSE/HEADLESS_KICKOFF.txt`** are refreshed every install so the one-paste / headless flows match the bundled templates.
11. **`tryGitCommit`**
12. **`printSummary`**

---

## 24. Interactive `promptUser()` flow

Uses **`ask`**, **`choose`**, **`askRequired`** ( **`readline`**; non-TTY uses **`readPipedStdinLines`** + **`createBufferedPrompts`**).

| Step | What is asked |
|------|----------------|
| 1 | **Provider:** LM Studio / Anthropic / OpenAI / Other → **`providerKeyFromLabel`** |
| 2 | **LM Studio:** base URL (default **`lmStudioBaseUrlFromEnv`**, **`normalizeLmStudioV1BaseUrl`**) → **`OPENAI_*`** env for Taskmaster MCP |
| 2 | **Anthropic:** key must start **`sk-ant-`** |
| 2 | **OpenAI:** key must start **`sk-`** |
| 2 | **Other:** arbitrary base URL + API key |
| 3 | **GitHub token:** reuse via **`resolveGithubTokenFromUserEnvironment`** or prompt (>10 chars) |
| 4 | **Repo kind:** new vs existing |
| **New** | **`projectName`**, **`purpose`**, **`stack`**, **`modules`**, **`sacred`** (default *no cloud…*), **`outOfScope`**, **`dod`** |
| **Existing** | Folder name = **`projectName`**; optional **`humanFocus`**; **`sacred`** (default *no secrets…*); **`runRepomixCompressSnapshot`**; **`generateNorthStarFromExistingRepo`** → draft **`northStarMd`** + extracted **`purpose`/`stack`/`modules`/`outOfScope`/`dod`** (on failure: template fallback + placeholder strings) |

---

## 25. MCP merge vs documentation-only servers

**`buildMcpJson` → `mergeMcpJson`** merges all **17** entries from **`buildMcpServers`** (see **§6**): **`taskmaster-ai`**, **`context7`**, **`repomix`**, **`serena`**, **`gitmcp`**, **`gitmcp-adafruit-mpu6050`**, **`sequential-thinking`**, **`memory`**, **`github`**, **`jcodemunch`**, **`playwright`**, **`semgrep`**, **`sentry`**, **`firecrawl`**, **`linear`**, **`pampa`**, **`supabase`**.

**`agents-memory-updater`** is **required in ritual text** (**`AGENTS.md`**, **`mcp-usage.mdc`**, **`CURSOR.md`**, **`cursorPackMd`**) but is **not** added by **`mergeMcpJson`**. Operators configure it as a **Cursor Task subagent** (or other local wiring) per **`docs/CONTINUAL_LEARNING.md`**.

---

## 26. `setup.js` function index (grouped)

**Path / env:** **`pathNorthStarPack`**, **`resolveNorthStarPathForRead`**, **`resolveSessionLogForRollup`**, **`resolveRollingContextPathForRollup`**, **`normalizeLmStudioV1BaseUrl`**, **`lmStudioBaseUrlFromEnv`**, **`resolvedLmStudioApiBaseUrl`**, **`loadDotEnvFromFile`**, **`taskmasterChildEnv`**, **`taskmasterChildEnvForBridge`**.

**Package / templates:** **`readInstallerPackageJson`**, **`readBundledArchPromptTemplate`**, **`readBundledMcpCoordinationTemplate`**, **`readBundledMemoryTaxonomyTemplate`**, **`readBundledGovernanceParityTemplate`**, **`readBundledCursorSkillsReadmeTemplate`**, **`readBundledGovernanceMdc`**, **`readBundledTemplateSkillMd`**, **`readBundledNorthStarTemplate`**, **`readBundledOnePromptTemplate`**, **`readBundledHeadlessKickoffTemplate`**, **`readContinualLearningPackTemplate`**.

**Fingerprint / doctor helpers:** **`countFilesRecursive`**, **`fingerprintTemplateDirectory`**, **`isHexcurseGovernanceSourceRepo`**, **`ensureHexcurseSourceRepoDoctorArtifacts`**, **`isDoctorCiRelaxed`**.

**Rollup / state seeds:** **`runLearningRollup`**, **`parseLearningRollupSessions`**, **`continualLearningIndexSeedJson`**, **`continualLearningHookStateSeedJson`**, **`skillPromotionQueueSeedJson`**.

**North star / PRD / directives:** **`isNorthStarSubstantive`**, **`buildPrdFromNorthStarRaw`**, **`expandNorthStarToPrdMarkdown`**, **`runNorthStarBridge`**, **`syncDirectivesQueuedFromTasks`**, **`stripNorthStarNotReadySentinel`**, **`extractNorthStarPurposeForInstaller`**, **`installTimeLlmComplete`**, **`generateNorthStarFromExistingRepo`**, **`enrichExistingRepoQuick`**, **`collectFallbackRepoSnapshot`**, **`runRepomixCompressSnapshot`**, **`writeInstallerPathFile`**, **`writeOnePromptFile`**, **`writeHeadlessKickoffFile`**.

**Markdown extraction / refresh:** **`extractMarkdownSection`**, **`extractSacredCsvFromBaseMdc`**, **`extractProjectNameFromAgents`**, **`runRefreshRules`**.

**Doctor / CLI / cursor agent:** **`runDoctor`**, **`parseSetupArgv`**, **`printCliHelp`**, **`assertCursorAgentCliAuthenticated`**, **`maybePreflightCursorAgentBeforeTaskmasterParsePrd`**.

**LLM helpers:** **`extractOpenAiMessageText`**.

**Content generators (install):** **`formatConstraintBullets`**, **`baseMdc`**, **`agentsMd`**, **`directivesMd`**, **`architectureMd`**, **`sessionLogMd`**, **`cursorPackMd`**, **`cursorModesMd`**, **`continualLearningMd`**, **`prdTxt`**, **`sessionStartMd`**, **`hexcurseReadmeMd`**, **`rootAgentsPointerMd`**, **`rollingContextStubMd`**.

**MCP / prompts:** **`buildMcpServers`**, **`mergeMcpJson`**, **`resolveGithubTokenFromUserEnvironment`**, **`providerKeyFromLabel`**, **`stdinIsTTY`**, **`ask`**, **`choose`**, **`askRequired`**, **`readPipedStdinLines`**, **`createBufferedPrompts`**, **`promptUser`**.

**Paths manifest:** **`pathsManifestObject`**.

**IO / install mechanics:** **`writeGovernanceRules`**, **`writeFileMaybeSkip`**, **`appendGitignoreLines`**, **`runCmd`**, **`writeLmStudioDotEnvIfMissing`**, **`configureTaskmasterModelsForInstall`**, **`patchTaskmasterConfigForLmStudioContext`**, **`seedPlaceholderTasksJsonIfMissing`**, **`parsePresetFromArgv`**, **`argvHasQuick`**, **`buildQuickInstallAnswers`**, **`tryGitCommit`**, **`printSummary`**, **`main`**.

**Prerequisites / globals:** **`printHeader`**, **`checkCommand`**, **`findPython`**, **`findPip`**, **`checkPrerequisites`**, **`commandOnPath`**, **`installNpmGlobalPackage`**, **`installGlobals`**.

---

## 27. Pack `AGENTS.md` section outline (installed copy)

The **`agentsMd()`** string mirrors root **`AGENTS.md`** (with **`HEXCURSE/`** path prefixes): **How this system runs** (17 servers / 10 rules), **Your role**, **The prime directive**, **MCP tools** (always-on / session-conditional / project-specific), **Mandatory MCP utilization** (order **1–17**), **Hard rule**, **Minimum expectations** (UI, Supabase, semgrep, firecrawl, sentry, Linear, etc.), **Forbidden behavior**, **Session-close requirement**, **Continual learning**, **NORTH STAR → Taskmaster**, **SESSION START** (STEP 0 bridge + steps **1–10** including **4a–4e**), **DURING IMPLEMENTATION**, **SESSION CLOSE** (15 steps), **Token efficiency** + **MCP_TOKEN_BUDGET** pointer, **Session log template**, **Learned Workspace Facts** subsections.

---

## 28. Repository artifact inventory (this tree)

Use this as a checklist of **everything that commonly exists** in the HexCurse **source** repo (paths vary slightly in consumer installs under **`HEXCURSE/`**).

| Area | Paths |
|------|--------|
| **Root** | **`package.json`**, **`AGENTS.md`**, **`DIRECTIVES.md`**, **`SESSION_LOG.md`**, **`NORTH_STAR.md`** (legacy bridge file), **`CURSOR.md`**, **`CURSOR_SYSTEM_USER_GUIDE.md`** (long human manual), **`.env.example`**, **`repomix-output.xml`** (local repomix output; gitignored) |
| **`.cursor/`** | **`rules/*.mdc`** (**`base`**, **`mcp-usage`**, **`process-gates`**, **`governance`**, **`security`**, **`adr`**, **`memory-management`**, **`debugging`**, **`multi-agent`**, **`linear-sync`**, **`markdown`**), **`skills/README.md`**, **`skills/_TEMPLATE_SKILL.md`**, **`hooks/state/*`** (gitignored when present) |
| **`.github/`** | **`workflows/hexcurse-doctor.yml`** |
| **`.serena/`** | **`project.yml`**, **`project.local.yml`** (often gitignored), **`memories/`** |
| **`.taskmaster/`** | **`config.json`**, **`state.json`**, **`docs/prd.txt`**, **`tasks/tasks.json`**, **`templates/example_prd*.txt`** |
| **`cursor-governance/`** | **`setup.js`**, **`bin/cursor-governance.js`**, **`package.json`**, **`package-lock.json`**, **`README.md`**, **`CHANGELOG.md`**, **`INSTALL.md`**, **`LICENSE`**, **`templates/*`**, **`test/*.js`**, **`test-input.js`** |
| **`docs/`** | All governance markdown including **`PROJECT_OVERVIEW.md`**, **`PART0_MCP_TEMPLATE.json`** (reference MCP JSON sample) |
| **Scratch / CI fixtures** | **`.tmp-doctor-consumer/`** (example consumer tree; not part of normal workflow) |

---

## 29. Reference and legacy files (not produced by install)

| File | Role |
|------|------|
| **`docs/PART0_MCP_TEMPLATE.json`** | Example **`~/.cursor/mcp.json`** fragment for Taskmaster + friends; may differ from live **`buildMcpServers`** (e.g. older Serena **`--project-root`** — **HexCurse `AGENTS.md` / installer use `--project`**). |
| **`CURSOR_SYSTEM_USER_GUIDE.md`** | Extended end-user manual; complements **`AGENTS.md`** / **`SESSION_START.md`**. |
| **Root `NORTH_STAR.md`** | Legacy location; **`resolveNorthStarPathForRead`** prefers **`HEXCURSE/NORTH_STAR.md`** when present. |
| **`cursor-governance/test-input.js`** | **`readline`** smoke test (**`npm run smoke:readline`** in **`cursor-governance`**). |

---

## 30. Serena (`.serena/project.yml`)

Committed baseline: **`project_name: "HexCurse"`**, **`languages: [typescript]`**, **`encoding: utf-8`**, **`ignore_all_files_in_gitignore: true`**. Full file documents optional LSP backend, excluded tools, memory patterns, etc. **Local overrides:** **`.serena/project.local.yml`** (gitignored by installer **`appendGitignoreLines`**).

---

## 31. `cursor-governance` npm package surface

- **`bin`:** **`cursor-governance`** → **`bin/cursor-governance.js`**
- **`files`:** **`bin/`**, **`templates/`**, **`setup.js`**, **`README.md`**, **`CHANGELOG.md`**, **`LICENSE`**, **`INSTALL.md`** (tests are **not** published)
- **`engines.node`:** **`>=20`**
- **Extra scripts:** **`smoke:readline`**, **`pack:check`** (**`npm pack --dry-run`**)

---

## 32. Source repo vs consumer: doc layout

| Layout | Canonical agent rules |
|--------|------------------------|
| **This repo (source)** | Root **`AGENTS.md`** is **full** content; **`docs/`** holds prompts and coordination **without** a **`HEXCURSE/`** folder. |
| **Consumer (after install)** | Root **`AGENTS.md`** points at **`HEXCURSE/AGENTS.md`**; pack lives under **`HEXCURSE/`** as in **`PATHS.json`**. |

**`docs/ONE_PROMPT.md`** at repo root (source) documents the one-shot flow for repos that use **`HEXCURSE/`** after install; it is **not** in the **`writeFileMaybeSkip`** list — the installer writes **`HEXCURSE/ONE_PROMPT.md`** via **`writeOnePromptFile`** from **`readBundledOnePromptTemplate`**.

---

## 33. Directive history

| Directive | Summary | Version |
|-----------|---------|---------|
| D-HEXCURSE-EXPANSION-001 | Six new MCPs, six new rules, multi-agent, sync-rules, CI workflows | 1.5.0 |
| D-HEXCURSE-CONSUMER-ROLLOUT-002 | Consumer rollout validation, six-phase test suite | 1.5.0 |
| D-HEXCURSE-MCP-RECONCILE-003 | Canonical 17-server reconciliation; linear / pampa / semgrep fixes | 1.5.7 |
| D-HEXCURSE-DOCS-AUDIT-004 | Full governance doc + generator alignment for 17-server / 10-rule world | 1.5.8 |

---

*End of PROJECT OVERVIEW. For line-level behavior, read **`cursor-governance/setup.js`**; for agent session ritual, read **`AGENTS.md`** and **`docs/SESSION_START.md`**.*
