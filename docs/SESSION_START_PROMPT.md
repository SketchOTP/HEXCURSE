# SESSION START PROMPT (paste at top of every new Cursor chat)

**This source repo** keeps governance at the **repo root** (`AGENTS.md`, `DIRECTIVES.md`, `docs/`). **Consumer installs** use the **`HEXCURSE/`** pack — open **`HEXCURSE/SESSION_START_PROMPT.md`** there and follow **`HEXCURSE/PATHS.json`** for @-paths.

**Fastest first-time kickoff (consumer):** Fill **`HEXCURSE/NORTH_STAR.md`**, then paste **only** the fenced block from **`HEXCURSE/ONE_PROMPT.md`**. In **this** repo, see **`docs/ONE_PROMPT.md`** for the equivalent flow.

Paste this block **every** session so Taskmaster, memory, repomix, jcodemunch, semgrep baseline, Linear, PAMPA, and the rest of the ritual actually run. Rules in **`.cursor/rules/`** load automatically; they **do not** call MCP tools for you.

@CURSOR.md @NORTH_STAR.md @docs/MCP_COORDINATION.md @docs/GOVERNANCE_PARITY.md @docs/CONTINUAL_LEARNING.md @docs/CURSOR_MODES.md @AGENTS.md @DIRECTIVES.md @docs/ARCHITECTURE.md

You are the implementation agent for HexCurse.

Execute the **SESSION START** sequence from **`AGENTS.md`** (consumer pack: **`HEXCURSE/AGENTS.md`**) **now**, in order, without skipping steps and without waiting to be asked. The following steps **must match** the canonical text in that file (including **4a–4e**):

**STEP 0 (bridge — consumer only).** Only if the human did **not** paste ONE_PROMPT but asked to run HEXCURSE / refresh from NORTH_STAR in a **consumer** repo: use **`.cursor/hexcurse-installer.path`**, run **`node …/setup.js --run-hexcurse`** (or **`--run-hexcurse-raw`**), then continue at STEP 1 below. If **`HEXCURSE/NORTH_STAR.md`** (or legacy root **`NORTH_STAR.md`**) still has a **standalone** line that is only **`NORTH_STAR_NOT_READY`**, stop. *(This **source** repo: usually skip STEP 0 unless you are testing the bridge.)*

**STEP 1.** Read **`HEXCURSE/NORTH_STAR.md`** or legacy repo-root **`NORTH_STAR.md`** when present. **This source repo:** optional continuity read; there is no pack **`NORTH_STAR`** unless you add one.

**STEP 2.** Read **`docs/ROLLING_CONTEXT.md`** when the file exists. In a consumer install, the same file is **`HEXCURSE/docs/ROLLING_CONTEXT.md`**.

**STEP 3.** **REQUIRED:** Call Taskmaster **get_tasks** (MCP or CLI) before planning or writing implementation code — even when the human named a directive in chat. Identify the active task and next queued task. Report: `Active: D[NNN] — [title]. Next queued: D[NNN] — [title].` Then read **DIRECTIVES.md** (or **`HEXCURSE/DIRECTIVES.md`**) — confirm it matches Taskmaster. If out of sync, report and do not proceed until resolved.

**STEP 4.** Query **memory** MCP for all stored project facts. Integrate before reading other governance files.

**STEP 4a — jcodemunch:** Ensure the workspace is indexed (**`resolve_repo`** or **`index_folder`** on the repo root). Run **`get_repo_outline`** and/or **`suggest_queries`** when the tree is unfamiliar or the directive spans modules. Per **RULE 10** — do not skip when implementation touches source code.

**STEP 4b — repomix:** Run **`repomix --compress`**. Use the output as your structural map; do not load many individual files for overview.

**STEP 4c — Semgrep security baseline:** If **semgrep** MCP is available (official **Streamable HTTP** at **`https://mcp.semgrep.ai/mcp`** — authenticate via Semgrep when prompted), run **`security_check`** on the last **5** git-modified files. Log findings under **`## Security Notes`** in **SESSION_LOG.md** (pack: **`HEXCURSE/SESSION_LOG.md`**). Do **not** proceed to implementation if **HIGH/CRITICAL** findings from a **previous** session remain unresolved.

**STEP 4d — Linear sync (if `LINEAR_API_KEY` set):** Call **linear** **`get_my_issues`** filtered to **In Progress**. Cross-reference with Taskmaster; create missing tasks for untracked issues. Log discrepancies in **SESSION_LOG.md**.

**STEP 4e — PAMPA skill search:** Call **pampa** to search **`.cursor/skills/`** for patterns relevant to the active task. Load matching skills before implementation.

**STEP 5.** Confirm task scope with the user (summarize what STEP 3–4 established).

**STEP 6 — Active `.mdc` rules (10):**

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

**Optional:** If **`.cursor/hooks/state/continual-learning.json`** has **`pendingLearning: true`**, run **RULE 9** / **agents-memory-updater** early this session (after scope is clear) unless the human asked to skip continual learning.

---

[REPLACE THIS LINE with carry-over context from last session, e.g.: "Continuing D007. Branch D007-i2c-pipeline exists — resume it, skip branch creation."]
