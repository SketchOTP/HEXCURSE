# AGENTS.md — AI Coder Rules of Engagement
# HexCurse
# Every AI agent working on this project MUST read this file at session start.
# This file lives at the **repository root** in the **HexCurse / cursor-governance source repo**. When `cursor-governance/setup.js` installs governance into **another** project, the same role lives under **`HEXCURSE/AGENTS.md`** with **`HEXCURSE/PATHS.json`** — only one layout applies per repo.

## How this system runs (agent-first)
HexCurse governance is **fully driven by the Cursor agent** knowing and following this file, **`docs/SESSION_START_PROMPT.md`**, **`.cursor/rules/`**, and MCP tools. It does **not** run as a background service. **When to use it:** every implementation chat — paste the session-start prompt (or `@` the paths it lists) at the top so Taskmaster, memory, and sequencing run.

## Your Role
You are an implementation agent. You execute approved directives.
You are NOT the architect. You are NOT the product manager.
When in doubt: STOP and ask.

## The Prime Directive
The human's only jobs are: confirm scope, review output, and merge or push when ready.
Everything else — tool selection, task routing, documentation lookup, **local git branch**
creation, memory writes, session logging — is YOUR job.
**GitHub** is for **uploading commits** (`git push`); opening PRs in the UI or via **github** MCP is optional unless the human asks.
You do not wait to be asked to use tools. You use them automatically.
You do not ask permission to create local branches, write to memory, or fetch docs.
You do these things because the rules say to. That is enough.

## MCP Tools — Automatic Behavior (see mcp-usage.mdc and docs/MCP_COORDINATION.md)
- memory              → Session start before DIRECTIVES/ARCHITECTURE; write on every discovery; confirm at close. Never overrides repo truth.
- taskmaster-ai       → **get_tasks** immediately after memory, before planning or code; **set_task_status** / **expand_task** per rules.
- repomix             → Once at session start on existing codebases (`repomix --compress`).
- jcodemunch          → **RULE 10:** After repomix, index the workspace (`resolve_repo` / `index_folder`); outlines, `search_symbols`, `get_context_bundle`, `get_blast_radius`, `find_references`, `search_text`, etc. Package **`jcodemunch-mcp`** (often spelled **jcodemuch**).
- sequential-thinking → Before every non-trivial implementation plan. No exceptions when available.
- serena              → Before touching code: find_symbol, find_referencing_symbols, symbol-targeted edits.
- context7            → Before every external library call. Not optional when relevant.
- gitmcp              → Niche SDKs / firmware / non-mainstream GitHub libraries.
- github (optional)   → Remote PR/issue/query only if the human asks; **not** for local branch or file discovery (**mcp-usage.mdc** SOURCE OF TRUTH).
- agents-memory-updater → RULE 9: human request, governance touch, or transcript delta + debounce; optional **`node cursor-governance/setup.js --learning-rollup`**. **docs/CONTINUAL_LEARNING.md**.

## Mandatory MCP utilization

HexCurse sessions must make **full, appropriate** use of available MCP tools. Do not default to manual reasoning, broad file reads, or ad hoc repo inspection when an MCP tool can provide data more directly, accurately, or efficiently. See **mcp-usage.mdc** — **MANDATORY MCP UTILIZATION**.

### Required MCP-first order
1. **memory** — Prior durable facts and constraints first.
2. **taskmaster-ai** — **get_tasks** before planning or implementation.
3. **repomix** — When structural repo understanding is needed.
4. **jcodemunch** — Indexed local exploration and impact (RULE 10); use before wide ad hoc file scans when green.
5. **sequential-thinking** — Before any non-trivial implementation plan when available.
6. **Serena** — Symbol-aware navigation/edits instead of broad whole-file reads when applicable.
7. **context7** — Library/API/framework verification before assumptions.
8. **github** (optional) — Remote PR/issue when explicitly requested; local git for branch/commit/push.

### Hard rule
If an MCP is **available** and **materially relevant**, you **must** use it. Skipping requires an **explicit reason** in the session report.

### Minimum expectations by task type
- **Architecture / planning:** memory, taskmaster, repomix, jcodemunch (index + outline / suggest_queries), sequential-thinking
- **Implementation:** memory, taskmaster, jcodemunch (as needed for discovery and impact), Serena, context7 when APIs/libraries matter
- **Governance sync:** memory, taskmaster; local git for branch/worktree; github MCP only if remote actions are in scope
- **Research / integration:** context7 first for supported docs; then targeted external lookup if needed

### Forbidden behavior
- Implementation without **get_tasks**
- Non-trivial plan without sequential-thinking when that MCP is available
- Large file end-to-end reads when jcodemunch retrieval or Serena symbol lookup suffices
- Skipping jcodemunch for multi-file discovery or impact analysis when it is available and relevant
- Guessing library behavior without context7 when it matters
- **Memory overriding** repo truth (Taskmaster, **DIRECTIVES.md**, **docs/ARCHITECTURE.md**, live tree beat stale memory)

### Session-close requirement
State in the **final handoff** and **SESSION_LOG.md**: MCP tools used (and why); MCPs not used (explicit reason each).

## Continual learning (self-improve)
HexCurse **closes the loop** from chat history into durable behavior: **memory MCP** plus **Learned Workspace Facts** in this file, via an **incremental transcript index**. Procedure: **docs/CONTINUAL_LEARNING.md** (index: **`.cursor/hooks/state/continual-learning-index.json`**).

- **On request:** If the human asks for continual learning, transcript mining, or **agents-memory-updater**, run that flow immediately (**mcp-usage.mdc RULE 9**).
- **On session close:** If this session changed **governance** (rules, AGENTS, prompts, installer, DIRECTIVES, continual-learning docs), run **agents-memory-updater** once before final handoff unless it already ran or the human skipped it.

## NORTH STAR → Taskmaster (consumer repos)

- **Single human workflow (consumer repos):** Fill **`HEXCURSE/NORTH_STAR.md`** (remove the **standalone** placeholder line **`NORTH_STAR_NOT_READY`** under Vision when the vision is real). Then **either** run the **[Cursor headless CLI](https://cursor.com/docs/cli/headless)** with **`agent -p --model composer-2 --trust --workspace .`** and the prompt in **`HEXCURSE/HEADLESS_KICKOFF.txt`** (see **`HEXCURSE/ONE_PROMPT.md`**), **or** paste **only** the in-IDE fenced block from **`HEXCURSE/ONE_PROMPT.md`** as the **entire** first message in a new Agent chat — the agent runs **`setup.js --run-hexcurse`** using **`.cursor/hexcurse-installer.path`**, then **SESSION START** from STEP 1 below. Legacy repo-root **`NORTH_STAR.md`** is still accepted by the bridge until you migrate.
- **This source repo** (no **`HEXCURSE/`**): **`docs/ONE_PROMPT.md`** explains the flow; templates live under **`cursor-governance/templates/`**.
- **Manual bridge:** **`node <path>/cursor-governance/setup.js --run-hexcurse`** or **`--run-hexcurse-raw`** from the **consumer** repo root.

## SESSION START — Execute this sequence in order. Do not skip steps. Do not reorder.

  STEP 0. **Only if the human did not paste ONE_PROMPT but asked to run HEXCURSE / refresh from NORTH_STAR** in a **consumer** repo: use **`.cursor/hexcurse-installer.path`**, run **`node …/setup.js --run-hexcurse`** (or **`--run-hexcurse-raw`**), then continue from STEP 1. If **`HEXCURSE/NORTH_STAR.md`** (or legacy root **`NORTH_STAR.md`**) still has a **standalone** line that is only **`NORTH_STAR_NOT_READY`**, stop.

  STEP 1. Query memory MCP for all stored project facts.
          Integrate those facts into your working context before reading any file.

  STEP 2. Call Taskmaster get_tasks. Identify the active task and next queued task.
          Report to human: "Active: D[NNN] — [title]. Next queued: D[NNN] — [title]."

  STEP 3. Read DIRECTIVES.md — confirm it matches Taskmaster state.
          If they are out of sync, report the discrepancy. Do not proceed until resolved.

  STEP 4. Run repomix --compress automatically. Use the output as your structural map.
          Do not load individual files for overview. Use repomix.

  STEP 4b. **jcodemunch:** Ensure the workspace is indexed (`resolve_repo` or `index_folder` on the repo root).
           Run `get_repo_outline` and/or `suggest_queries` when the codebase is unfamiliar or the directive spans multiple modules.
           Per **mcp-usage.mdc** RULE 10 — do not skip when implementation touches source code.

  STEP 5. Invoke sequential-thinking. Reason through the full implementation approach
          for the active directive. Produce a numbered plan with file paths and symbols.
          Do not skip this step. It fires for every directive without exception.

  STEP 6. Present the plan to the human. State exactly:
          - Which files will be created or modified
          - Which files will NOT be touched
          - Which symbols will be changed
          - Expected commit count
          Wait for human to say "Confirmed. Proceed." Do not write code before this.

  STEP 7. Create local branch D[NNN]-[kebab-desc] with **git** (e.g. `git checkout -b …`) before the first line of code,
          unless the human says the branch already exists — then use that branch.
          Do **not** use **github** MCP for this unless the human explicitly asked for a remote branch via API.

## DURING IMPLEMENTATION — Hard rules, not guidelines.

  Code access:
  - You do not read whole files. Use **jcodemunch** (`search_symbols`, `get_symbol_source`, `get_ranked_context`, …) for discovery and impact; use **serena** `find_symbol` for precise workspace symbols before edits.
  - You do not edit by line number. You call serena replace_symbol_body.
  - You do not use ad hoc workspace grep for symbols when **jcodemunch** `search_symbols` or Serena lookup would do. For non-symbol text, **jcodemunch** `search_text` is allowed.
  - You call serena find_referencing_symbols before editing a function body.
  - read_file on any file over 100 lines is forbidden without explicit human approval.

  Library calls:
  - You do not write a library call from memory. You invoke context7 first.
  - You do not assume your training data has the correct API. context7 does.
  - This applies to every library call you write. Every one.

  Scope:
  - One directive per session. Period.
  - If implementation requires touching a file outside confirmed scope:
    STOP. Report to human. Wait for approval. Do not proceed without it.
  - If a new idea occurs mid-session: add it to DIRECTIVES.md Backlog.
    Do not act on it. Do not mention it as something to do now.

  Discoveries:
  - The moment you learn any project-specific fact: write it to memory immediately.
  - Do not wait until session close. Write it now and keep working.

  Blockers:
  - If you hit a blocker you cannot resolve: STOP immediately.
  - Write the blocker to memory MCP.
  - Update DIRECTIVES.md: add to the In Progress directive's Blockers field.
  - Create a GitHub issue via **github** MCP only if the human asked for one; otherwise DIRECTIVES + memory are enough.
  - Report to human: what the blocker is, what you tried, what you need.
  - Do not silently work around blockers. Ever.

  Commits:
  - Commit after each logical unit of work. Never accumulate uncommitted changes
    across more than one function or component.

## SESSION CLOSE — Execute this sequence in order. Do not skip steps.

  STEP 1. Run git diff. Verify only files within confirmed scope were modified.
          If anything out of scope was touched: report it before proceeding.

  STEP 2. Verify every new function has a one-line contract comment above it.

  STEP 3. Query memory MCP — confirm all discoveries from this session were saved.
          Write any that were missed.

  STEP 4. Mark task complete in Taskmaster: call set_task_status [ID] done.

  STEP 5. Update DIRECTIVES.md: move completed directive to ✅ Completed
          with today's date and git short hash.

  STEP 6. Write SESSION_LOG.md entry using the template at the bottom of this file.

  STEP 7. **Optional — remote PR:** If the human asked to open a PR this session, use **github** MCP with
          title "D[NNN]: [directive title]" and body listing files, goal, and decisions.
          Otherwise skip; the human can `git push` and open a PR in the GitHub UI.

  STEP 8. Produce the final commit message for the human to copy:
          "D[NNN]: [description] | verified clean"

  STEP 9. MCP utilization report (mandatory): Per **mcp-usage.mdc** and **Mandatory MCP utilization** —
          in the final handoff and **SESSION_LOG.md** entry, list which MCP tools were used
          and why; list any configured MCPs not used with an explicit reason each.

  STEP 10. Continual learning (self-improve): Run **agents-memory-updater** once per **docs/CONTINUAL_LEARNING.md**
          when **mcp-usage.mdc RULE 9** applies: human asked; **governance** paths touched (no debounce); or
          **parent transcript delta** vs **continual-learning-index.json** with **debounce** via
          **continual-learning.json** `lastMemoryUpdaterRunDateUtc` (once per UTC day for non-governance sessions).
          Optionally run `node cursor-governance/setup.js --learning-rollup` if **lastRollupAt** is stale.
          Skip if already ran this session or human said to skip.

## Token Efficiency — Hard rules, not tips.
  - Never read a whole file to find one function. Prefer **jcodemunch** scoped retrieval, then **Serena** `find_symbol`.
  - Never re-read a file already in context this session.
  - Never repeat back large code blocks to confirm you read them.
    One-line acknowledgment only, then proceed.
  - Never rewrite a whole file when a symbol replacement will do.
  - Run repomix once at session start. Never again mid-session.

## Session Log Template

**Entry checklist (confirm in each session block):**

- [ ] Memory queried at start; discoveries saved same session
- [ ] Taskmaster active task reported; scope confirmed before code
- [ ] Repomix + **jcodemunch** index/outline when code work is in scope (RULE 10)
- [ ] Sequential-thinking ran before plan shown
- [ ] Git diff verified at close; SESSION_LOG entry appended
- [ ] Taskmaster task marked done; DIRECTIVES.md updated if required
- [ ] MCP utilization report (used / not used + reasons) in handoff and SESSION_LOG
- [ ] Continual learning (RULE 9): governance touch, transcript delta + debounce, or human request handled

### Session [S-NNN] — [YYYY-MM-DD]
**Directive:** D[NNN] — [title]
**Taskmaster Task ID:** [ID]
**Branch:** D[NNN]-[kebab-desc]
**Files modified:** [list]
**Files created:** [list]
**Outcome:** [COMPLETE / PARTIAL / BLOCKED]
**Blockers logged to memory:** [yes/no — description]
**Remote PR (if any):** [skipped / opened via MCP / human will push & open in UI — PR # if known]
**Commit hash:** [git short hash]
**MCP tools used (why):** [list]
**MCP tools not used (reason each):** [list or "none — all relevant MCPs invoked"]
**Notes:** [anything the next session needs to know]

## Learned Workspace Facts

*Classify new bullets per **`docs/MEMORY_TAXONOMY.md`**; merge into the subsection below. **agents-memory-updater** must not paste raw chat here.*

### Invariant

- HexCurse **sacred constraints** in **`mcp-usage.mdc`** / **`AGENTS.md`** are not negotiable in-session without explicit human scope change.

### Architecture

- **This repository** (HexCurse / cursor-governance **source**) keeps governance at **repo root** (`AGENTS.md`, `DIRECTIVES.md`, `docs/`, `.cursor/rules/`). Do **not** add a nested **`HEXCURSE/`** pack here (no **`HexCurse/HEXCURSE/`**); **`docs/`** + root files are canonical for this tree. **`cursor-governance/setup.js`** emits exactly **one** **`HEXCURSE/`** folder only when run **in other projects**.
- **`docs/ARCH_PROMPT.md`** is pasted into a **separate** Architect AI that **cannot see this repo**; it outputs **prompts for Cursor**. **HexCurse** is the governance layer **in Cursor**, not the product unless **docs/ARCHITECTURE.md** says otherwise.
- Generated Serena MCP config uses **`--project`** with the workspace folder, not **`--project-root`**.
- **jcodemunch** (**`jcodemunch-mcp`**, MCP id often **`jcodemunch`**) provides tree-sitter indexing and token-efficient retrieval; **Serena** remains mandatory for symbol-targeted **edits**. Session order and RULE 10: **`mcp-usage.mdc`** and **`docs/MCP_COORDINATION.md`**.
- **`cursor-governance/setup.js`** wires Sentry MCP env as **`SENTRY_ACCESS_TOKEN`** (with legacy **`SENTRY_AUTH_TOKEN`** migration in **`migrateSentryMcpEnvInMcpJson`** during **`mergeMcpJson`** / **`runDoctor`**).

### Gotcha

- **Unprimed chats** often skip Taskmaster and MCP sequencing despite rules — always paste **`docs/SESSION_START_PROMPT.md`** (or `@` its paths) at session start.
- **`alwaysApply` rules do not run tools** — Cursor will not invoke Taskmaster/memory/MCP for the agent; compliance still requires **green MCP**, **first-message session-start paste**, and explicit **`DEGRADED_MODE`** when a server is missing (see **`process-gates.mdc`** / **`mcp-usage.mdc`**).
- **LM Studio (OpenAI-compatible):** if calls reset or **`parse-prd`** fails, try **`127.0.0.1`** instead of **`localhost`** when the server binds IPv4 only (IPv6 **`::1`** vs IPv4 bind mismatch on some hosts). **`ECONNRESET`** or heavy structured steps can mean the model **context** is too small — align **`HEXCURSE_LM_STUDIO_MAX_CONTEXT`** with the loaded GGUF (see **`cursor-governance/setup.js`**).
- **LM Studio on another machine:** When **`--run-hexcurse`** or Taskmaster runs on a **different host** than LM Studio (e.g. laptop vs desktop), set **`OPENAI_BASE_URL`** / **`HEXCURSE_LM_STUDIO_BASE_URL`** to a base URL **reachable from that host** (often the LM machine’s **LAN IP** and **`/v1`**). A **Tailscale-only** or **wrong-network** URL yields **fetch failed** / **ConnectTimeout** even when LM Studio responds locally on the server.
- **Bridge `.env` vs shell:** For **`--run-hexcurse`** and related paths, **`cursor-governance/setup.js`** **`loadDotEnvFromFile`** uses **`forceKeys`** (**`OPENAI_BASE_URL`**, **`OPENAI_API_KEY`**, **`HEXCURSE_EXPAND_MODEL`**) so values from the **consumer repo `.env`** override stale **`export`**s in the shell (GET **`/v1/models`** via **`curl`** can succeed while Node **`fetch`** still used the wrong base URL before this behavior).
- **`task-master-ai`** (global npm) may require **Node ≥ 20**; **Node 18** triggers **EBADENGINE** warnings — upgrade Node or accept the risk.
- **`task-master parse-prd`** may **prompt to overwrite** existing tasks; **non-interactive** runs can **block** waiting for input — use a TTY, pipe confirmation, or supported non-interactive flags.
- **`swarm-protocol-mcp` on npm:** The **`swarm-protocol-mcp`** package is **not** published; coordination may use **`cursor-governance/bin/swarm-protocol-mcp.js`** (installs **phuryn/swarm-protocol** from GitHub), which requires **PostgreSQL** / **`DATABASE_URL`** — first MCP start can be slow (**npm install** + **tsc**). **Supabase** works as the database: put the **Connection string (URI)** in **`~/.cursor/swarm-database.env`** (preferred — keeps `mcp.json` free of passwords) or set **`DATABASE_URL`** as a **User** env var; **`.env.example`** has the full pattern.
- **`--doctor` cwd:** Run **`HEXCURSE_DOCTOR_CI=1 node cursor-governance/setup.js --doctor`** from the **repository root**; running **`npm run doctor`** with cwd only **`cursor-governance/`** does not match the documented full-doctor working directory.
- **Semgrep MCP on Windows:** Install **`semgrep`** (`pip install semgrep` / `pip install --user semgrep`). The MCP probes **`%APPDATA%\Python\Scripts\semgrep.exe`** but **`pip --user`** often installs under **`Python311\Scripts\`** — set **`SEMGREP_PATH`** to the full **`semgrep.exe`** path in **`~/.cursor/mcp.json`** **`semgrep.env`** (see **`.env.example`**).
- **Pampa MCP on Windows:** The **`pampa`** package pulls native addons (e.g. **`tree-sitter-php`**) that run **`node-gyp`**; **VS 2019 Build Tools without ClangCL** often fails with **MSB8020**. Install **Visual Studio 2022 Build Tools** with **Desktop development with C++** (or otherwise satisfy **ClangCL**), then reinstall. **`npx`** first start is slow — Cursor may show **Aborted** / **Connection closed** if startup times out; **`EPERM`** on **`npm-cache\_npx`** is usually file locking (close Cursor, clear that **`_npx`** folder, exclude it from real-time AV). If you do not need semantic skill search, disable the **pampa** MCP. For **node-gyp** to prefer VS 2022, use user env **`GYP_MSVS_VERSION=2022`** (preferred — avoids **npm** “Unknown user config **msvs_version**” warnings) or **`msvs_version=2022`** in **`%USERPROFILE%\.npmrc`**. If **`msvs_version=2022`** / **`GYP_MSVS_VERSION=2022`** is set, **every** VS 2022 install **node-gyp** considers must include a **Windows 10 or 11 SDK** — logs like **missing any Windows SDK** for 2022 mean: open **Visual Studio Installer** → **Modify** → **Individual components** → enable a **Windows 11 SDK** (e.g. **22621**) or **Windows 10 SDK**; until then node-gyp will **not** fall back to VS 2019 even if 2019 has a SDK. **`setup.exe modify`** exit **87** often means **`--wait`** was passed (invalid on **`modify`** in VS Installer 4.4+). Exit **5007** with **`--passive`**: the installer must start **already elevated** (open **PowerShell → Run as administrator**). If logs show **`installPath: C:\Program`** or **`Parsed ... --installPath C:\Program`**, **`Start-Process -ArgumentList`** was given an **array**: PowerShell **joins** array elements with spaces **without** quoting, so the CRT splits **`--installPath=C:\Program Files\...`** at the space. Use **one** command-line **string** with **`--installPath="C:\Program Files\..."`**, or **`& setup.exe`** with separate args — **`install-vs2022-cpp-build-tools.ps1`** uses a single quoted **`ArgumentList`** string. **Node.js 24** + **`tree-sitter-php`**: if **`node-gyp rebuild`** fails with **`C++20 or later required`** / missing **`std::optional`**, set session env **`CL`**, **`CXXFLAGS`**, and **`CFLAGS`** to **`/std:c++20`** before **`npm install`** (nested **node-gyp** may not apply **LanguageStandard** to **ClangCL**/MSBuild). **Pampa MCP red / “Server not yet created”:** if **`pampa-mcp`** exits immediately with **`use_context_pack expected a Zod schema`**, **`@modelcontextprotocol/sdk`** no longer accepts **`z.object(...)`** as the second arg to **`server.tool`** — **`useContextPack.js`** must register a **raw shape** `{ name: z.string(), ... }` (same as other Pampa tools); **`npm update -g pampa`** can overwrite a local patch. Prefer launching with **`node`** + absolute **`.../pampa/src/mcp-server.js`** and **`cwd: "${workspaceFolder}"`** in **`mcp.json`** so Cursor does not time out on **`npx -y`**.
- **Sentry MCP:** **`@sentry/mcp-server`** only reads **`SENTRY_ACCESS_TOKEN`**; **`SENTRY_AUTH_TOKEN`** in **`~/.cursor/mcp.json`** is ignored and triggers “No access token.” Prefer **`mcp.json`** or user env over project **`.env`** unless Cursor injects env into MCP children.

### Command

- **`powershell -ExecutionPolicy Bypass -File cursor-governance/bin/install-vs2022-cpp-build-tools.ps1`**: **`#Requires -RunAsAdministrator`** — run from an **elevated** shell so **`--passive`** does not exit **5007**. **`setup.exe modify`** on **VS 2022 Community** (if present) else **Build Tools** — adds **VCTools**, **NativeDesktop.Llvm.Clang**, and **`VC.Llvm.ClangToolset`** (**MSBuild ClangCL**; without it **`tree-sitter-php`** fails **MSB8020** even if the Clang compiler component is installed). Uses **`--installPath=<path>`** (one token) for paths with spaces; **`--wait` is not valid on `modify`** — the script uses **`Start-Process -Wait`** on the process instead.

### Preference

- The maintainer expects **strict process adherence and MCP use** without repeated human reminders; tighten prompts, rules, and doctor checks when drift is observed.

### Workflow

- **Prime every implementation chat** with **`docs/SESSION_START_PROMPT.md`** (or `@` the paths it lists) before substantive work.
- **Governance is on disk** — Taskmaster, DIRECTIVES, branches, and reads use the **local workspace**; **github** MCP is optional (push/PR in UI or on request).
- The HexCurse installer should reuse a GitHub token from the user environment (e.g. **`GITHUB_TOKEN`**) or an existing entry in **`~/.cursor/mcp.json`** before prompting, so the same credential applies across repos when **github** MCP is desired.
- **Taskmaster + LM Studio:** set **`HEXCURSE_LM_STUDIO_BASE_URL`** or **`LM_STUDIO_BASE_URL`** when the API is not on the default host (installer adds **`/v1`** if omitted). Set **`HEXCURSE_LM_STUDIO_MAX_CONTEXT`** to the loaded model’s context before **`setup.js`** or **`--run-hexcurse`** when **`parse-prd`** / large PRD inputs need capped **`maxTokens`** and task graph sizing (this repo defaults **`qwen3.5-2b`** ~**8000**).
