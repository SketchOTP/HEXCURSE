# AGENTS.md — AI Coder Rules of Engagement
# HexCurse
# Every AI agent working on this project MUST read this file at session start.
# This file lives at the **repository root** in the **HexCurse / cursor-governance source repo**. When `cursor-governance/setup.js` installs governance into **another** project, the same role lives under **`HEXCURSE/AGENTS.md`** with **`HEXCURSE/PATHS.json`** — only one layout applies per repo.

## How this system runs (agent-first)
HexCurse governance is **fully driven by the Cursor agent** knowing and following this file, **`docs/SESSION_START_PROMPT.md`**, **`.cursor/rules/`** (10 `.mdc` rules), and **17 MCP servers**. It does **not** run as a background service. **When to use it:** every implementation chat — paste the session-start prompt (or `@` the paths it lists) at the top so Taskmaster, memory, and sequencing run.

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

## MCP Tools — Automatic Behavior (see `mcp-usage.mdc` and `docs/MCP_COORDINATION.md`)
Governance also uses **agents-memory-updater** (Task subagent / continual learning per **RULE 9**), not a separate MCP id in `mcp.json`.

### ALWAYS ACTIVE — invoke in every implementation session (when the server is green)
1. **taskmaster-ai** — Task graph: **get_tasks** after memory, **set_task_status** / **expand_task** per rules.
2. **memory** — Session start before DIRECTIVES / ARCHITECTURE; write on every discovery; confirm at close. Never overrides repo truth.
3. **sequential-thinking** — Before every non-trivial implementation plan. No exceptions when available.
4. **serena** — Symbol navigation and edits: **find_symbol**, **find_referencing_symbols**, **replace_symbol_body** / **insert_after_symbol**.
5. **context7** — Before every external library / API call. Training data is stale.
6. **github** — Remote PR / issue / query **only if the human asks**; never for local branch or workspace file discovery (**mcp-usage.mdc** is source of truth for optional use).
7. **repomix** — Once per session start on existing codebases (`repomix --compress`). Do not re-run mid-session.
8. **gitmcp** — Niche SDKs, firmware, non-mainstream GitHub libraries (not React-tier docs).
9. **jcodemunch** — **RULE 10:** After repomix, index (`resolve_repo` / `index_folder`); **get_repo_outline**, **suggest_queries**, **search_symbols**, **get_context_bundle**, **get_blast_radius**, **find_references**, **search_text**, etc. Package **`jcodemunch-mcp`** (often spelled **jcodemuch**).

### SESSION-CONDITIONAL — invoke when the work requires it
10. **playwright** — UI, browser behavior, E2E verification.
11. **semgrep** — Writing, modifying, or reviewing code; **security.mdc** gate before commit. Configure **Streamable HTTP** **`https://mcp.semgrep.ai/mcp`** in **`~/.cursor/mcp.json`** (no local **`SEMGREP_PATH`** / **`SEMGREP_APP_TOKEN`**).
12. **sentry** — Debugging, error triage, incident response (**get_issue** before diving into source when applicable).
13. **firecrawl** — Web research, documentation scraping, external data.
14. **linear** — Creating, updating, or completing tracked work items; sync at session close when **LINEAR_API_KEY** is set.
15. **pampa** — Semantic search over **`.cursor/skills/`** and project patterns.

### PROJECT-SPECIFIC — when the domain matches
16. **gitmcp-adafruit-mpu6050** — MPU6050 / **Adafruit_MPU6050** driver or hardware tasks.
17. **supabase** — Database, Auth, RLS, Edge Functions, backend schema (this project or consumer using Supabase).

## Mandatory MCP utilization
HexCurse sessions must make **full, appropriate** use of available MCP tools. Do not default to manual reasoning, broad file reads, or ad hoc repo inspection when an MCP tool can provide the needed data more directly, accurately, or efficiently. See **`mcp-usage.mdc`** — **MANDATORY MCP UTILIZATION**.

### Required MCP-first order (with triggers — do not substitute guessing)
1. **memory** — First: durable facts and constraints. **Do not** assume repo state from chat memory alone.
2. **taskmaster-ai** — **get_tasks** before planning or implementation. **Do not** pick a task from prose alone.
3. **repomix** — When structural repo understanding is needed. **Do not** open many files for a map.
4. **jcodemunch** — Indexed exploration and impact (**RULE 10**). **Do not** brute-force scan when the index is available.
5. **sequential-thinking** — Non-trivial plans. **Do not** skip when the server is green.
6. **Serena** — Symbol-level reads/edits. **Do not** read whole large files or grep symbols ad hoc when Serena applies.
7. **context7** — Library / API / framework verification. **Do not** trust training data for current APIs.
8. **github** (optional) — Only when the human asked for remote PR/issue/branch operations; **local git** for branch/commit/push otherwise.
9. **gitmcp** — Niche / hardware / firmware docs not covered by context7.
10. **playwright** — After UI changes for verification. **Do not** ship UI blind when the server is available.
11. **semgrep** — After code writes and before commit (**process-gates.mdc**). **Do not** commit with unresolved HIGH/CRITICAL findings. Use **Streamable HTTP** **`https://mcp.semgrep.ai/mcp`** in **`~/.cursor/mcp.json`**.
12. **sentry** — On runtime errors before deep source spelunking when the server is configured.
13. **firecrawl** — External docs / sites when context7 is insufficient. **Do not** invent URLs or API shapes.
14. **linear** — When Linear is in use; align issues with Taskmaster at close.
15. **pampa** — When skills or past patterns may apply (**SESSION START** 4e).
16. **gitmcp-adafruit-mpu6050** — MPU6050 work before driver code. **Do not** guess registers or library sequences.
17. **supabase** — Schema / RLS / data paths before queries in Supabase-backed work. **Do not** bypass MCP for schema truth when configured.

### Hard rule
If an MCP is **available** and **materially relevant**, you **must** use it. Skipping requires an **explicit reason** in the session report.

### Minimum expectations by task type
- **Architecture / planning:** memory, taskmaster, repomix, jcodemunch (index + outline / **suggest_queries**), sequential-thinking.
- **Implementation:** memory, taskmaster, jcodemunch (discovery / impact), Serena, context7 when APIs/libraries matter; **semgrep** after substantive code edits.
- **UI / frontend:** playwright for verification of affected flows when the server is available.
- **Backend / database (Supabase):** supabase MCP for schema and policies — **never** raw SQL via terminal when MCP can answer.
- **Security-sensitive / any commit with source changes:** semgrep **security_check** before commit; resolve HIGH/CRITICAL.
- **Research:** firecrawl + context7 — **never** rely on training data for current API specifics when tools are green.
- **Bug triage:** sentry before reading source when issues are linked; hypothesis-first per **debugging.mdc**.
- **Hardware / MPU6050:** gitmcp-adafruit-mpu6050 before driver code.
- **Tracked work (Linear):** linear sync at session close when **LINEAR_API_KEY** is set — issues must not drift from Taskmaster.
- **Governance sync:** memory, taskmaster; local git for branch/worktree; github MCP only if remote actions are in scope.
- **Research / integration:** context7 first; then firecrawl or gitmcp as needed.

### Forbidden behavior
- Implementation without **get_tasks**.
- Non-trivial plan without sequential-thinking when that MCP is available.
- Large file end-to-end reads when jcodemunch retrieval or Serena symbol lookup suffices.
- Skipping jcodemunch for multi-file discovery or impact analysis when it is available and relevant.
- Guessing library behavior without context7 when it matters.
- **Relying on training data for library APIs when context7 is available.**
- **Committing code with unresolved HIGH/CRITICAL semgrep findings.**
- **Writing database queries without checking schema via supabase MCP** when this project uses Supabase and the server is available.
- **Closing a session with Linear issues out of sync with Taskmaster** when Linear is in use.
- **Memory overriding** repo truth (Taskmaster, **DIRECTIVES.md**, **docs/ARCHITECTURE.md**, live tree beat stale memory).

### Session-close requirement
State in the **final handoff** and **SESSION_LOG.md**: MCP tools used (and why); MCPs not used (explicit reason each). Follow **SESSION CLOSE** below.

## Continual learning (self-improve)
HexCurse **closes the loop** from chat history into durable behavior: **memory MCP** plus **Learned Workspace Facts** in this file, via an **incremental transcript index**. Procedure: **docs/CONTINUAL_LEARNING.md** (index: **`.cursor/hooks/state/continual-learning-index.json`**).

- **On request:** If the human asks for continual learning, transcript mining, or **agents-memory-updater**, run that flow immediately (**mcp-usage.mdc RULE 9**).
- **On session close:** If this session changed **governance** (rules, AGENTS, prompts, installer, DIRECTIVES, continual-learning docs), run **agents-memory-updater** once before final handoff unless it already ran or the human skipped it.

## NORTH STAR → Taskmaster (consumer repos)

- **Single human workflow (consumer repos):** Fill **`HEXCURSE/NORTH_STAR.md`** (remove the **standalone** placeholder line **`NORTH_STAR_NOT_READY`** under Vision when the vision is real). Then **either** run the **[Cursor headless CLI](https://cursor.com/docs/cli/headless)** with **`agent -p --model composer-2 --trust --workspace .`** and the prompt in **`HEXCURSE/HEADLESS_KICKOFF.txt`** (see **`HEXCURSE/ONE_PROMPT.md`**), **or** paste **only** the in-IDE fenced block from **`HEXCURSE/ONE_PROMPT.md`** as the **entire** first message in a new Agent chat — the agent runs **`setup.js --run-hexcurse`** using **`.cursor/hexcurse-installer.path`**, then **SESSION START** from STEP 0 below. Legacy repo-root **`NORTH_STAR.md`** is still accepted by the bridge until you migrate.
- **This source repo** (no **`HEXCURSE/`**): **`docs/ONE_PROMPT.md`** explains the flow; templates live under **`cursor-governance/templates/`**.
- **Manual bridge:** **`node <path>/cursor-governance/setup.js --run-hexcurse`** or **`--run-hexcurse-raw`** from the **consumer** repo root.

## SESSION START — Execute this sequence in order. Do not skip steps. Do not reorder.

**STEP 0 (bridge — consumer only):** Only if the human did **not** paste ONE_PROMPT but asked to run HEXCURSE / refresh from NORTH_STAR in a **consumer** repo: use **`.cursor/hexcurse-installer.path`**, run **`node …/setup.js --run-hexcurse`** (or **`--run-hexcurse-raw`**), then continue at STEP 1 below. If **`HEXCURSE/NORTH_STAR.md`** (or legacy root **`NORTH_STAR.md`**) still has a **standalone** line that is only **`NORTH_STAR_NOT_READY`**, stop.

**STEP 1.** Read **`HEXCURSE/NORTH_STAR.md`** or legacy repo-root **`NORTH_STAR.md`** when present (consumer). **This source repo:** optional continuity read; there is no pack **`NORTH_STAR`** unless you add one.

**STEP 2.** Read **`docs/ROLLING_CONTEXT.md`** when the file exists. In a consumer install, the same file is **`HEXCURSE/docs/ROLLING_CONTEXT.md`**.

**STEP 3.** Call Taskmaster **get_tasks**. Identify the active task and next queued task. Report: `Active: D[NNN] — [title]. Next queued: D[NNN] — [title].` Then read **DIRECTIVES.md** (or **`HEXCURSE/DIRECTIVES.md`**) — confirm it matches Taskmaster. If out of sync, report and do not proceed until resolved.

**STEP 4.** Query **memory** MCP for all stored project facts. Integrate before reading other governance files.

**STEP 4a — jcodemunch:** Ensure the workspace is indexed (**`resolve_repo`** or **`index_folder`** on the repo root). Run **`get_repo_outline`** and/or **`suggest_queries`** when the tree is unfamiliar or the directive spans modules. Per **RULE 10** — do not skip when implementation touches source code.

**STEP 4b — repomix:** Run **`repomix --compress`**. Use the output as your structural map; do not load many individual files for overview.

**STEP 4c — Semgrep security baseline:** If **semgrep** MCP is available (official **Streamable HTTP** at **`https://mcp.semgrep.ai/mcp`** — authenticate via Semgrep when prompted), run **`security_check`** on the last **5** git-modified files. Log findings under **`## Security Notes`** in **SESSION_LOG.md**. Do **not** proceed to implementation if **HIGH/CRITICAL** findings from a **previous** session remain unresolved.

**STEP 4d — Linear sync (if `LINEAR_API_KEY` set):** Call **linear** **`get_my_issues`** filtered to **In Progress**. Cross-reference with Taskmaster; create missing tasks for untracked issues. Log discrepancies in **SESSION_LOG.md**.

**STEP 4e — PAMPA skill search:** Call **pampa** to search **`.cursor/skills/`** for patterns relevant to the active task. Load matching skills before implementation.

**STEP 5.** Confirm task scope with the user (you may summarize what STEP 3–4 established).

**STEP 6 — Active `.mdc` rules (10):** Know what applies:
- **Always loaded:** `base.mdc`, `mcp-usage.mdc`, `process-gates.mdc`, `governance.mdc` (when editing directives / Taskmaster sync).
- **When writing/editing source:** `security.mdc`, `debugging.mdc` (per globs/triggers).
- **Architectural decisions:** `adr.mdc`.
- **Large context / compaction:** `memory-management.mdc`.
- **Multi-agent / worktrees:** `multi-agent.mdc` when **`HEXCURSE_MULTI_AGENT=1`** or **`HEXCURSE/docs/MULTI_AGENT.md`** governs the session.
- **Linear in use:** `linear-sync.mdc`.

**STEP 7.** Invoke **sequential-thinking**. Reason through the full approach; produce a numbered plan with file paths and symbols. Mandatory for every directive when the server is available.

**STEP 8.** Present the plan to the human. State exactly: files to create/modify; files **not** touched; symbols to change; expected commit count. Wait for **Confirmed. Proceed.** Do not write code before this.

**STEP 9.** Create local branch **`D[NNN]-[kebab-desc]`** with **git** before the first line of code, unless the human says the branch already exists. Do **not** use **github** MCP unless the human explicitly asked for a remote branch via API.

**STEP 10.** Begin implementation (see **DURING IMPLEMENTATION**).

## DURING IMPLEMENTATION — Hard rules, not guidelines.

**After writing any source file:** invoke **semgrep** **`security_check`** on modified files (**security.mdc** gate).

**When a UI change is made:** invoke **playwright** to navigate to the affected surface and verify behavior.

**When a runtime error or exception occurs:** invoke **sentry** (**get_issue**, etc.) before deep source reading; state a hypothesis before diagnostic calls (**debugging.mdc**).

**When making a significant architectural decision:** append an ADR to **`docs/ADR_LOG.md`** immediately (**adr.mdc**).

**When context window reaches ~70%:** write a **`## COMPACTION CHECKPOINT`** to **SESSION_LOG.md** (**memory-management.mdc**); prune stale tool output.

**When research is needed:** **firecrawl** for external content; **context7** for library docs — never trust training data for current API specifics.

**When database work is needed (Supabase):** **supabase** MCP for schema / RLS before queries — never raw SQL via terminal when MCP is available.

**When hardware sensor work (MPU6050) needs docs:** **gitmcp-adafruit-mpu6050** before driver code.

**Code access:**
- Do not read whole files for symbols. Use **jcodemunch** (**search_symbols**, **get_symbol_source**, **get_ranked_context**, …) and **Serena** **find_symbol** before edits.
- Do not edit by line number only — prefer **Serena** **replace_symbol_body** / **insert_after_symbol**.
- Do not use ad hoc **grep** for symbols when **jcodemunch** **search_symbols** or Serena applies. **search_text** is allowed for non-symbol needles.
- Call **find_referencing_symbols** before changing a function body.
- **read_file** on any file over **100** lines is forbidden without explicit human approval.

**Library calls:** **context7** before every external library call. Every one.

**Scope:** One directive per session. Stop for approval if scope expands. New ideas → **DIRECTIVES** Backlog only.

**Discoveries:** Write to **memory** immediately.

**Blockers:** STOP; log to memory and **DIRECTIVES** Blockers; **github** issue only if the human asked.

**Commits:** Commit after each logical unit; do not batch unrelated changes.

## SESSION CLOSE — Execute in order.

**STEP 1.** Run **git diff**. Confirm only in-scope files changed.

**STEP 2.** Verify every new function has a one-line contract comment.

**STEP 3.** Mark Taskmaster task **done** (or update status) via **set_task_status**.

**STEP 4.** Run **semgrep** **security_check** on **all** source files modified this session. **Do not** close with unresolved **HIGH/CRITICAL** findings. If **semgrep** is unavailable, note the exception in **SESSION_LOG.md** and in the handoff (**process-gates.mdc**).

**STEP 5.** If UI work was done, run **playwright** final verification on affected flows.

**STEP 6.** **Linear** sync (if **LINEAR_API_KEY** set): completed Taskmaster tasks → **Done** in Linear; new tasks → create issues per **linear-sync.mdc**.

**STEP 7.** **ADR check:** If this session made a significant architectural decision, verify an entry in **`docs/ADR_LOG.md`**; write it now if missing.

**STEP 8.** Query **memory** — confirm discoveries were saved; write any missed.

**STEP 9.** Update **DIRECTIVES.md**: move completed directive to **Completed** with date and git short hash.

**STEP 10.** Write **SESSION_LOG.md** using the template below; include MCP utilization (used / not used + reasons).

**STEP 11.** Optional **github** PR if the human asked; otherwise they may **`git push`** and open a PR in the UI.

**STEP 12.** Give the human the final commit message: `D[NNN]: [description] | verified clean`

**STEP 13.** **agents-memory-updater** per **RULE 9** / **docs/CONTINUAL_LEARNING.md**. Optionally **`node cursor-governance/setup.js --learning-rollup`** if **lastRollupAt** is stale or **5+** sessions since rollup.

**STEP 14.** If new skills were added under **`.cursor/skills/`**, re-index with **pampa** when applicable.

**STEP 15.** Confirm with the user before treating the session as closed.

## Token Efficiency — Hard rules, not tips.
- Never read a whole file to find one function. Prefer **jcodemunch** scoped retrieval, then **Serena** **find_symbol**.
- Never re-read a file already in context this session.
- Never repeat back large code blocks to confirm you read them. One-line acknowledgment, then proceed.
- Never rewrite a whole file when a symbol replacement will do.
- Run **repomix** once at session start — never again mid-session.
- **MCP token budget:** each active server adds ~**500–1000** tokens of tool overhead. See **`docs/MCP_TOKEN_BUDGET.md`**. Disable session-conditional servers in **`~/.cursor/mcp.json`** when you will not use them; keep the **core** always-on set aligned with that doc.

## Session Log Template

**Entry checklist (confirm in each session block):**

- [ ] Memory queried at start; discoveries saved same session
- [ ] Taskmaster active task reported; DIRECTIVES reconciled; scope confirmed before code
- [ ] Repomix + **jcodemunch** index/outline when code work is in scope (RULE 10)
- [ ] Steps **4c–4e** run when applicable (semgrep baseline, Linear, PAMPA)
- [ ] Sequential-thinking ran before plan shown
- [ ] Semgrep run after substantive code changes; SESSION_CLOSE semgrep on all touched files
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
- **Canonical 17 MCP server ids** (including **`linear`** → **`@mseep/linear-mcp`**) are enumerated in **`docs/directives/D-HEXCURSE-MCP-RECONCILE-003.md`**; **`cursor-governance/setup.js`** **`buildMcpServers()`** is the installer source for merged **`~/.cursor/mcp.json`** entries.

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
- **Semgrep MCP:** Use the official **Streamable HTTP** server **`https://mcp.semgrep.ai/mcp`** in **`~/.cursor/mcp.json`** (no local **`semgrep`** binary or **`SEMGREP_PATH`** / **`SEMGREP_APP_TOKEN`** in MCP config — auth flows through Semgrep’s web UI when required).
- **Pampa MCP on Windows:** The **`pampa`** package pulls native addons (e.g. **`tree-sitter-php`**) that run **`node-gyp`**; **VS 2019 Build Tools without ClangCL** often fails with **MSB8020**. Install **Visual Studio 2022 Build Tools** with **Desktop development with C++** (or otherwise satisfy **ClangCL**), then reinstall. **`npx`** first start is slow — Cursor may show **Aborted** / **Connection closed** if startup times out; **`EPERM`** on **`npm-cache\_npx`** is usually file locking (close Cursor, clear that **`_npx`** folder, exclude it from real-time AV). If you do not need semantic skill search, disable the **pampa** MCP. For **node-gyp** to prefer VS 2022, use user env **`GYP_MSVS_VERSION=2022`** (preferred — avoids **npm** “Unknown user config **msvs_version**” warnings) or **`msvs_version=2022`** in **`%USERPROFILE%\.npmrc`**. If **`msvs_version=2022`** / **`GYP_MSVS_VERSION=2022`** is set, **every** VS 2022 install **node-gyp** considers must include a **Windows 10 or 11 SDK** — logs like **missing any Windows SDK** for 2022 mean: open **Visual Studio Installer** → **Modify** → **Individual components** → enable a **Windows 11 SDK** (e.g. **22621**) or **Windows 10 SDK**; until then node-gyp will **not** fall back to VS 2019 even if 2019 has a SDK. **`setup.exe modify`** exit **87** often means **`--wait`** was passed (invalid on **`modify`** in VS Installer 4.4+). Exit **5007** with **`--passive`**: the installer must start **already elevated** (open **PowerShell → Run as administrator**). If logs show **`installPath: C:\Program`** or **`Parsed ... --installPath C:\Program`**, **`Start-Process -ArgumentList`** was given an **array**: PowerShell **joins** array elements with spaces **without** quoting, so the CRT splits **`--installPath=C:\Program Files\...`** at the space. Use **one** command-line **string** with **`--installPath="C:\Program Files\..."`**, or **`& setup.exe`** with separate args — **`install-vs2022-cpp-build-tools.ps1`** uses a single quoted **`ArgumentList`** string. **Node.js 24** + **`tree-sitter-php`**: if **`node-gyp rebuild`** fails with **`C++20 or later required`** / missing **`std::optional`**, set session env **`CL`**, **`CXXFLAGS`**, and **`CFLAGS`** to **`/std:c++20`** before **`npm install`** (nested **node-gyp** may not apply **LanguageStandard** to **ClangCL**/MSBuild). **Pampa MCP red / “Server not yet created”:** if **`pampa-mcp`** exits immediately with **`use_context_pack expected a Zod schema`**, **`@modelcontextprotocol/sdk`** no longer accepts **`z.object(...)`** as the second arg to **`server.tool`** — **`useContextPack.js`** must register a **raw shape** `{ name: z.string(), ... }` (same as other Pampa tools); **`npm update -g pampa`** can overwrite a local patch. Prefer launching with **`node`** + absolute **`.../pampa/src/mcp-server.js`** and **`cwd: "${workspaceFolder}"`** in **`mcp.json`** so Cursor does not time out on **`npx -y`**.
- **Sentry MCP:** **`@sentry/mcp-server`** only reads **`SENTRY_ACCESS_TOKEN`**; **`SENTRY_AUTH_TOKEN`** in **`~/.cursor/mcp.json`** is ignored and triggers “No access token.” Prefer **`mcp.json`** or user env over project **`.env`** unless Cursor injects env into MCP children.
- **`--sync-rules`** fetches from **`HEXCURSE_RULES_REMOTE_URL`**; if that raw GitHub base returns **HTTP 404** for template **`.mdc`** files, remote sync cannot succeed until templates are published at that path or the URL is corrected.
- **`cursor-governance/setup.js`** embedded **`agentsMd()`**, **`sessionStartMd()`**, **`PROCESS_GATES_TEMPLATE`**, and **`MCP_USAGE_TEMPLATE`** must match **`AGENTS.md`**, **`docs/SESSION_START_PROMPT.md`**, and **`.cursor/rules/process-gates.mdc`** / **`mcp-usage.mdc`** before release — otherwise **`--refresh-rules`** can overwrite on-disk rules with stale embedded copies.
- **Pampa (validation smoke):** use **`npm view pampa name`** for a registry check; **`buildMcpServers()`** launches via global **`node`** / **`node.exe`** and **`resolvePampaGlobalPath()`** — do not expect **`npx @pampa/mcp-server`** to mirror installer behavior.

### Command

- **`powershell -ExecutionPolicy Bypass -File cursor-governance/bin/install-vs2022-cpp-build-tools.ps1`**: **`#Requires -RunAsAdministrator`** — run from an **elevated** shell so **`--passive`** does not exit **5007**. **`setup.exe modify`** on **VS 2022 Community** (if present) else **Build Tools** — adds **VCTools**, **NativeDesktop.Llvm.Clang**, and **`VC.Llvm.ClangToolset`** (**MSBuild ClangCL**; without it **`tree-sitter-php`** fails **MSB8020** even if the Clang compiler component is installed). Uses **`--installPath=<path>`** (one token) for paths with spaces; **`--wait` is not valid on `modify`** — the script uses **`Start-Process -Wait`** on the process instead.

### Preference

- The maintainer expects **strict process adherence and MCP use** without repeated human reminders; tighten prompts, rules, and doctor checks when drift is observed.

### Workflow

- **Prime every implementation chat** with **`docs/SESSION_START_PROMPT.md`** (or `@` the paths it lists) before substantive work.
- **Governance is on disk** — Taskmaster, DIRECTIVES, branches, and reads use the **local workspace**; **github** MCP is optional (push/PR in UI or on request).
- The HexCurse installer should reuse a GitHub token from the user environment (e.g. **`GITHUB_TOKEN`**) or an existing entry in **`~/.cursor/mcp.json`** before prompting, so the same credential applies across repos when **github** MCP is desired.
- **Taskmaster + LM Studio:** set **`HEXCURSE_LM_STUDIO_BASE_URL`** or **`LM_STUDIO_BASE_URL`** when the API is not on the default host (installer adds **`/v1`** if omitted). Set **`HEXCURSE_LM_STUDIO_MAX_CONTEXT`** to the loaded model’s context before **`setup.js`** or **`--run-hexcurse`** when **`parse-prd`** / large PRD inputs need capped **`maxTokens`** and task graph sizing (this repo defaults **`qwen3.5-2b`** ~**8000**).
- **Consumer rollout reports:** write each validation run to a **versioned** file under **`docs/`** (e.g. **`ROLLOUT_REPORT_v1.5.7.md`**); keep **`docs/ROLLOUT_REPORT.md`** as a historical artifact and add a **top forward pointer** when superseded so agents do not treat stale runs as current.
