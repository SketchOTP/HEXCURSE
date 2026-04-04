# DIRECTIVE: HexCurse Governance Documentation Audit & Full Rewrite

**Directive ID:** D-HEXCURSE-DOCS-AUDIT-004  
**Priority:** Critical  
**Depends on:** D-HEXCURSE-EXPANSION-001, D-HEXCURSE-MCP-RECONCILE-003 (v1.5.7 canonical state)  
**Scope:** All governance documents in `N:\HexCurse` — root files, `docs/`, `.cursor/rules/`, `cursor-governance/templates/`, `agentsMd()` and related content generators in `setup.js`  
**Definition of Done:** Every governance document reflects the full 17-server / 10-rule / v1.5.x world. An agent reading any single document can identify every tool available, when to invoke it, and what session phase governs it. `npm run test:all` passes. `--doctor` passes. Version bumped to `1.5.8`. All changes committed and pushed to `SketchOTP/HEXCURSE` `main`.

---

## PRIME DIRECTIVE

The HexCurse installer (v1.5.7) is correct. The `.mdc` rules are installed correctly. The MCP servers are wired correctly. What is broken is the **human- and agent-readable governance layer** — the documents that tell an agent *when* to use each tool, *how* to sequence them, and *what* the session ritual looks like in the 17-server world.

Every document in this directive was written before the expansion. They describe a 9-server world with 4 rules. An agent following them today will ignore Playwright, Semgrep, Sentry, Firecrawl, Linear, PAMPA, Supabase, and 6 of the 10 governance rules in every session.

Your job is to make every document accurate, integrated, and internally consistent. Do not invent new policy — derive everything from the confirmed canonical state:

- **17 servers:** per D-HEXCURSE-MCP-RECONCILE-003 CONFIRMED CANONICAL SERVER LIST  
- **10 rules:** `base`, `mcp-usage`, `process-gates`, `governance`, `security`, `adr`, `memory-management`, `debugging`, `multi-agent`, `linear-sync`  
- **Session phases:** SESSION START → DURING IMPLEMENTATION → SESSION CLOSE  
- **Source of truth for generator functions:** `cursor-governance/setup.js`

Read this entire directive before modifying any file.

---

## SECTION 1 — Housekeeping (do first, before any content changes)

### 1.1 — Move directive files out of root

```bash
mkdir docs\directives
Move-Item D-HEXCURSE-EXPANSION-001.md docs\directives\
Move-Item D-HEXCURSE-CONSUMER-ROLLOUT-002.md docs\directives\
Move-Item D-HEXCURSE-MCP-RECONCILE-003.md docs\directives\
```

Update `.gitignore` — directives should not be ignored. Confirm they are tracked:

```bash
git add docs\directives\
git status
```

### 1.2 — Copy four missing docs into source `docs/`

These files exist in `cursor-governance/templates/` but were never written to the source repo's `docs/` folder. Copy them now:

```bash
Copy-Item cursor-governance\templates\MCP_TOKEN_BUDGET.md docs\MCP_TOKEN_BUDGET.md
Copy-Item cursor-governance\templates\MULTI_AGENT.md docs\MULTI_AGENT.md
```

Create stubs for the two log files (these are append-only runtime files, not templates):

```bash
# docs\ADR_LOG.md
@"
# Architecture Decision Log — HexCurse

This file is append-only. Do not edit or delete past entries.
Governed by ``adr.mdc`` — entries are written automatically by the AI agent.

---

<!-- ADR entries will appear below, newest last -->
"@ | Set-Content docs\ADR_LOG.md

# docs\AGENT_HANDOFFS.md
@"
# Agent Handoffs — HexCurse

Append-only log of cross-agent task handoffs in multi-agent sessions.
Governed by ``multi-agent.mdc``.

---

<!-- Handoff entries appended here -->
"@ | Set-Content docs\AGENT_HANDOFFS.md
```

### 1.3 — Clean up root noise

```bash
# repomix-output.xml is gitignored — confirm and remove if present
Remove-Item repomix-output.xml -ErrorAction SilentlyContinue
```

**Commit checkpoint:**
```bash
git add .
git commit -m "chore: move directives to docs/directives/, add missing v1.5.x docs to source"
```

---

## SECTION 2 — `AGENTS.md` Full Rewrite

**File:** `N:\HexCurse\AGENTS.md`  
**Also update:** `agentsMd()` function in `cursor-governance/setup.js` (the installed version must match)

`AGENTS.md` is the most important file in the system. Every agent reads it before every session. It must be completely accurate for the 17-server / 10-rule world.

### 2.1 — Structure requirement

The rewritten `AGENTS.md` must contain all of the following sections in this order. Do not remove any existing section — expand and correct them.

**Section: How this system runs** — unchanged conceptually, update server count to 17 and rule count to 10.

**Section: Your role** — unchanged.

**Section: The prime directive** — unchanged.

**Section: MCP tools — automatic behavior** — rewrite to cover all 17 servers grouped by function:

```
ALWAYS ACTIVE (invoke in every session):
1. taskmaster-ai — task management, all implementation work
2. memory — persistent cross-session knowledge storage
3. sequential-thinking — complex multi-step reasoning
4. serena — semantic code navigation and symbol lookup
5. context7 — live library documentation (never use training data for APIs)
6. github — repository operations, PR management, code search
7. repomix — codebase compression for context loading
8. gitmcp — git history, blame, commit context
9. jcodemunch — code analysis and transformation

SESSION-CONDITIONAL (invoke when the work requires it):
10. playwright — any task involving UI, browser behavior, or E2E verification
11. semgrep — any task involving writing, modifying, or reviewing code
12. sentry — any task involving debugging, error triage, or incident response
13. firecrawl — any task requiring web research, documentation scraping, or external data
14. linear — any task that creates, modifies, or completes tracked work items
15. pampa — any task requiring semantic search of project skills or past patterns

PROJECT-SPECIFIC (always available, invoke for relevant domains):
16. gitmcp-adafruit-mpu6050 — hardware tasks involving MPU6050 sensor library
17. supabase — any database, auth, RLS, Edge Function, or backend schema work
```

**Section: Mandatory MCP utilization order** — rewrite for all 17 servers with explicit trigger conditions. Format: numbered list, each entry has the server name, trigger condition, and what NOT to do instead.

**Section: Hard rule** — unchanged.

**Section: Minimum expectations by task type** — expand to cover:
- UI/frontend tasks: must invoke playwright for verification
- Backend/database tasks: must invoke supabase MCP, never raw SQL via terminal
- Security-sensitive tasks: must invoke semgrep before any commit
- Research tasks: must invoke firecrawl + context7, never rely on training data
- Bug triage: must invoke sentry before reading source
- Hardware tasks: must invoke gitmcp-adafruit-mpu6050 before writing driver code
- Any task creating tracked work: must sync with linear at session close

**Section: Forbidden behavior** — add:
- Relying on training data for library APIs when context7 is available
- Committing code with unresolved HIGH/CRITICAL semgrep findings
- Writing database queries without checking schema via supabase MCP
- Closing a session with Linear issues out of sync with Taskmaster

**Section: Session-close requirement** — unchanged structure, update step references.

**Section: Continual learning** — unchanged.

**Section: NORTH STAR → Taskmaster** — unchanged.

**Section: SESSION START** — rewrite steps 0–7 with full expansion:

```
STEP 0 — Read NORTH_STAR.md
STEP 1 — Read ROLLING_CONTEXT.md
STEP 2 — Load Taskmaster context (task-master list, current task)
STEP 3 — Load memory MCP (retrieve project memories)
STEP 4a — jcodemunch: analyze codebase structure
STEP 4b — repomix: compress snapshot if context is stale
STEP 4c — Semgrep security baseline:
  If semgrep MCP is available, run security_check on the last 5 git-modified files.
  Log findings in SESSION_LOG.md under ## Security Notes.
  Do not proceed to implementation if HIGH/CRITICAL unresolved findings exist
  from a previous session.
STEP 4d — Linear sync (if LINEAR_API_KEY set):
  Call linear MCP get_my_issues filtered to In Progress.
  Cross-reference with Taskmaster tasks. Create missing tasks for untracked Linear issues.
  Log discrepancies in SESSION_LOG.md.
STEP 4e — PAMPA skill search:
  Call pampa to search .cursor/skills/ for patterns relevant to today's task.
  Load any matching skills before starting implementation.
STEP 5 — Confirm task scope with user
STEP 6 — Load relevant .mdc rules:
  Always loaded: base.mdc, mcp-usage.mdc, process-gates.mdc
  Load if writing code: security.mdc, debugging.mdc
  Load if making architectural decisions: adr.mdc
  Load if context is growing large: memory-management.mdc
  Load if multi-agent session: multi-agent.mdc
  Load if Linear is in use: linear-sync.mdc
STEP 7 — Begin implementation
```

**Section: DURING IMPLEMENTATION** — rewrite with explicit mid-session tool invocations:

```
After writing any source file:
  → invoke semgrep security_check on modified files (security.mdc gate)

When a UI change is made:
  → invoke playwright to navigate to affected page and verify behavior

When a runtime error or exception occurs:
  → invoke sentry MCP get_issue before reading source code
  → state hypothesis before any diagnostic tool call (debugging.mdc)

When making a significant architectural decision:
  → write ADR entry to docs/ADR_LOG.md immediately (adr.mdc)

When context window reaches ~70%:
  → write COMPACTION CHECKPOINT to SESSION_LOG.md (memory-management.mdc)
  → prune stale tool output from context

When research is needed:
  → invoke firecrawl for external content
  → invoke context7 for library documentation
  → never rely on training data for current API specifics

When database work is needed:
  → invoke supabase MCP for schema inspection before writing queries
  → never run raw SQL via terminal when MCP is available

When hardware sensor work is needed:
  → invoke gitmcp-adafruit-mpu6050 for current library docs and examples
```

**Section: SESSION CLOSE** — rewrite all 10 steps:

```
STEP 1 — Mark Taskmaster task done or update status
STEP 2 — Run semgrep security_check on all files modified this session
         Block close if HIGH/CRITICAL findings are unresolved
STEP 3 — If UI work was done, run playwright final verification
STEP 4 — Sync Linear issues:
         Any completed Taskmaster task → mark Linear issue Done
         Any new Taskmaster task → create Linear issue
STEP 5 — ADR check:
         Did this session make any significant architectural decision?
         If yes, verify ADR entry exists in docs/ADR_LOG.md. Write it now if not.
STEP 6 — Update memory MCP with key decisions, patterns, and file changes
STEP 7 — Write SESSION_LOG.md entry using the template below
STEP 8 — Run learning rollup if 5+ sessions since last rollup:
         node cursor-governance/setup.js --learning-rollup
STEP 9 — If skills were developed, add to .cursor/skills/ and re-index with PAMPA
STEP 10 — Confirm with user before closing
```

**Section: Token efficiency** — add note about MCP token budget:
Reference `docs/MCP_TOKEN_BUDGET.md`. Disable non-essential servers for sessions
where they will not be used. Core 9 servers are always-on. Session-conditional
servers should be disabled in `~/.cursor/mcp.json` when not needed.

**Section: Session log template** — unchanged format, update example to reference new steps.

### 2.2 — Sync `agentsMd()` in `setup.js`

After rewriting `AGENTS.md`, update the `agentsMd()` function in `cursor-governance/setup.js` so that the installed `HEXCURSE/AGENTS.md` in consumer repos matches the source repo content exactly.

This is the most important sync in this directive. The generator function must produce identical content to the source `AGENTS.md`. Do not leave them diverged.

**Commit checkpoint:**
```bash
git add AGENTS.md cursor-governance/setup.js
git commit -m "feat: AGENTS.md full rewrite for 17-server 10-rule world + sync agentsMd()"
```

---

## SECTION 3 — `docs/SESSION_START.md` Rewrite

**File:** `N:\HexCurse\docs\SESSION_START.md`  
**Also update:** `sessionStartMd()` in `cursor-governance/setup.js`

This is the standalone document agents paste at the start of a session. It must be self-contained — an agent with only this document should know exactly what to do.

### 3.1 — Required content

Rewrite to include:

**Header:** Project name, date, current task from Taskmaster.

**STEP 0–2:** Read NORTH_STAR, ROLLING_CONTEXT, Taskmaster task list. (unchanged)

**STEP 3:** Load memory MCP. Retrieve memories tagged with current task domain. (unchanged concept, ensure memory server is named)

**STEP 4a–4e:** Exact text from AGENTS.md SESSION START steps 4a through 4e. These must be identical — SESSION_START.md is a consumer-facing copy of the ritual, not a summary.

**STEP 5:** Active rules notice — list all 10 `.mdc` files by name and describe when each activates:
```
Always active:
  base.mdc — project constraints and sacred rules
  mcp-usage.mdc — MCP tool usage protocol (17 servers)
  process-gates.mdc — process boundary checklist (now includes Semgrep gate)

Auto-attached when editing source files:
  security.mdc — Semgrep scan required after every code write
  debugging.mdc — hypothesis-first debugging protocol

Agent-requested (invoke manually when relevant):
  adr.mdc — write Architecture Decision Records
  memory-management.mdc — context pruning and compaction checkpoints
  multi-agent.mdc — worktree coordination (only in --multi-agent sessions)
  linear-sync.mdc — Linear ↔ Taskmaster sync
  governance.mdc — full governance reference
```

**STEP 6:** Task scope confirmation. (unchanged)

**STEP 7:** Begin. (unchanged)

### 3.2 — Sync `sessionStartMd()` in `setup.js`

After rewriting the file, update `sessionStartMd()` to match.

**Commit checkpoint:**
```bash
git add docs\SESSION_START.md cursor-governance/setup.js
git commit -m "feat: SESSION_START.md rewrite with all steps 4a-4e and 10-rule notice"
```

---

## SECTION 4 — `docs/MCP_COORDINATION.md` Rewrite

**File:** `N:\HexCurse\docs\MCP_COORDINATION.md`  
**Also update:** The bundled template in `cursor-governance/templates/MCP_COORDINATION.md`

The current file describes the original 9 servers. Rewrite it for all 17.

### 4.1 — Required structure

**Section: Server inventory** — full 17-server table matching D-HEXCURSE-MCP-RECONCILE-003, with columns: Server ID, Kind (stdio/URL), Launch, Always Active, Primary Use.

**Section: Invocation order within a session** — explicit ordered list of when each server should be called relative to session phases. Example structure:

```
SESSION START (invoke in this order):
1. memory — retrieve cross-session context
2. taskmaster-ai — load current task
3. repomix — compress snapshot if stale
4. serena — index codebase symbols
5. jcodemunch — structural analysis
6. semgrep — security baseline on last 5 modified files
7. linear — sync In Progress issues (if LINEAR_API_KEY set)
8. pampa — search skills for relevant patterns

DURING IMPLEMENTATION (invoke on trigger):
- context7 — triggered by: any library API question
- playwright — triggered by: any UI change
- sentry — triggered by: any runtime error
- firecrawl — triggered by: any research need
- supabase — triggered by: any database operation
- github — triggered by: PR creation, code search, issue management
- gitmcp — triggered by: git history questions, blame, commit context
- gitmcp-adafruit-mpu6050 — triggered by: MPU6050 sensor work
- sequential-thinking — triggered by: complex multi-step problems

SESSION CLOSE (invoke in this order):
1. semgrep — final security scan on all modified files
2. playwright — final UI verification (if UI work done)
3. linear — sync completed/new tasks
4. memory — store key decisions and patterns
5. taskmaster-ai — mark task status
```

**Section: Coordination patterns** — pairs and combinations that work together:

```
Bug triage:           sentry → github (code search) → semgrep (scan) → playwright (verify fix)
Research → implement: firecrawl + context7 → serena (find insertion point) → semgrep (scan result)
Database feature:     supabase (schema) → serena (existing patterns) → semgrep (scan) → supabase (verify)
Hardware driver:      gitmcp-adafruit-mpu6050 (docs) → serena (find driver pattern) → semgrep (scan)
PR review:            github (fetch diff) → semgrep (scan diff) → playwright (E2E verify)
Multi-agent task:     taskmaster-ai (claim) → swarm-protocol (lock) → serena (navigate) → github (PR)
```

**Section: DEGRADED_MODE** — rewrite for 17 servers:

```
DEGRADED_MODE activates when fewer than 9 of the 17 servers are responsive.

Essential (session cannot proceed without these):
  taskmaster-ai, memory, github, serena, context7

Important (degrade gracefully if unavailable):
  sequential-thinking, repomix, gitmcp, jcodemunch, semgrep

Optional (session continues normally if unavailable):
  playwright, sentry, firecrawl, linear, pampa,
  gitmcp-adafruit-mpu6050, supabase

In DEGRADED_MODE:
  - Log which servers are unavailable in SESSION_LOG.md
  - Do not attempt to invoke unavailable servers
  - Increase manual verification steps to compensate for missing automated tools
  - Do not commit code without semgrep scan unless semgrep is explicitly unavailable
    (in which case, note the exception in SESSION_LOG.md)
```

**Section: Token budget** — reference `docs/MCP_TOKEN_BUDGET.md`. Include the table inline.

**Commit checkpoint:**
```bash
git add docs\MCP_COORDINATION.md cursor-governance\templates\MCP_COORDINATION.md
git commit -m "feat: MCP_COORDINATION.md full rewrite for 17 servers with invocation order and coordination patterns"
```

---

## SECTION 5 — `CURSOR.md` Update

**File:** `N:\HexCurse\CURSOR.md`  
**Also update:** `cursorPackMd()` in `cursor-governance/setup.js`

### 5.1 — Required additions

Add a section **Active Governance Rules** that lists all 10 `.mdc` files with their trigger conditions (same content as SESSION_START.md STEP 5 — keep these identical).

Add a section **MCP Quick Reference** — single-line descriptions of all 17 servers, grouped as Always Active / Session-Conditional / Project-Specific.

Add a section **New in v1.5.x** — summarize the expansion:
- 6 new MCP servers added: playwright, semgrep, sentry, firecrawl, linear, pampa
- 2 new project-specific servers: gitmcp-adafruit-mpu6050, supabase
- 6 new governance rules: security, adr, memory-management, debugging, multi-agent, linear-sync
- `--multi-agent` mode for parallel worktree sessions
- `--sync-rules` for remote rule updates

**Commit checkpoint:**
```bash
git add CURSOR.md cursor-governance/setup.js
git commit -m "feat: CURSOR.md add 10-rule reference, 17-server quick ref, v1.5.x summary"
```

---

## SECTION 6 — `process-gates.mdc` Update

**File:** `N:\HexCurse\.cursor\rules\process-gates.mdc`  
**Also update:** `PROCESS_GATES_TEMPLATE` string in `cursor-governance/setup.js`

### 6.1 — Add Semgrep gate

The current process-gates.mdc is a short checklist. Add the following gate explicitly:

```
## Gate: Pre-Commit Security (semgrep)

Before any git commit involving source code changes:

1. Invoke semgrep MCP security_check on all modified source files.
2. If HIGH or CRITICAL findings: do not commit. Fix first.
3. If MEDIUM findings: commit is permitted, but log findings in SESSION_LOG.md.
4. If semgrep is unavailable: note the exception in SESSION_LOG.md and proceed.

This gate is mandatory. It cannot be skipped for "small" changes.
```

### 6.2 — Add ADR gate

```
## Gate: Architectural Decision (adr)

Before implementing any significant architectural change:

1. Write an ADR entry to docs/ADR_LOG.md using the format in adr.mdc.
2. The ADR must be written BEFORE implementation begins, not after.
3. What counts as architectural: new dependency, API contract change,
   data model change, new MCP server, module boundary change.
```

### 6.3 — Add session-close gate reference

```
## Gate: Session Close Checklist

Before ending any session, confirm:
- [ ] Taskmaster task status updated
- [ ] Semgrep final scan run and findings resolved or logged
- [ ] Linear issues synced (if LINEAR_API_KEY set)
- [ ] ADR written for any architectural decisions made
- [ ] SESSION_LOG.md entry written
- [ ] Memory MCP updated with key learnings
```

**Commit checkpoint:**
```bash
git add .cursor\rules\process-gates.mdc cursor-governance/setup.js
git commit -m "feat: process-gates.mdc add semgrep gate, ADR gate, session-close checklist"
```

---

## SECTION 7 — `mcp-usage.mdc` Update

**File:** `N:\HexCurse\.cursor\rules\mcp-usage.mdc`  
**Also update:** `MCP_USAGE_TEMPLATE` string in `cursor-governance/setup.js`

### 7.1 — Update DEGRADED_MODE section

Replace the existing DEGRADED_MODE content with the rewritten version from Section 4 of this directive (the 17-server essential/important/optional classification).

### 7.2 — Update MCP invocation order

The existing ordered list runs to RULE 10 (jcodemunch) and RULE 11 (gitmcp-adafruit-mpu6050) and RULE 12 (supabase). Ensure all 12 rules are present and the descriptions accurately reflect the trigger conditions from Section 4 (DURING IMPLEMENTATION triggers).

### 7.3 — Add token budget notice

At the top of the file, after the frontmatter, add:

```
> Token budget: Each active server adds ~500–1000 tokens of tool overhead.
> See docs/MCP_TOKEN_BUDGET.md for the 17-server budget table and
> guidance on which servers to disable for specific session types.
```

**Commit checkpoint:**
```bash
git add .cursor\rules\mcp-usage.mdc cursor-governance/setup.js
git commit -m "feat: mcp-usage.mdc update DEGRADED_MODE for 17 servers + token budget notice"
```

---

## SECTION 8 — Bundled Templates Update

**Directory:** `cursor-governance/templates/`

These files are written to consumer repos during install. They must reflect the v1.5.x world.

### 8.1 — `ONE_PROMPT.md` template

`cursor-governance/templates/ONE_PROMPT.md` is the one-paste kickoff prompt for a consumer repo. Verify it contains:

- Reference to all 17 MCP servers (or pointer to `HEXCURSE/docs/MCP_COORDINATION.md`)
- SESSION START steps 0–7 including 4a–4e
- Reference to all 10 `.mdc` rules
- The `--sync-rules` command for keeping rules fresh
- The `--multi-agent` command for parallel sessions

If any of the above are missing, add them. Do not remove existing content — expand it.

### 8.2 — `HEADLESS_KICKOFF.txt` template

`cursor-governance/templates/HEADLESS_KICKOFF.txt` is the headless agent kickoff. Verify it instructs the headless agent to:

- Load Taskmaster context first
- Run the semgrep security baseline (step 4c)
- Run Linear sync (step 4d) if `LINEAR_API_KEY` is set
- Search PAMPA for relevant skills (step 4e)
- Reference `HEXCURSE/AGENTS.md` as the authoritative ritual document

### 8.3 — `NORTH_STAR.md` template

Verify `cursor-governance/templates/NORTH_STAR.md` has `{{PROJECT_NAME}}` replacement and has not been accidentally replaced with HexCurse-specific content during the expansion work.

### 8.4 — `CONTINUAL_LEARNING.pack.md` template

Add a section noting that PAMPA semantic indexing should be run after any new skill is added to `.cursor/skills/`:

```markdown
## Skill Indexing

After adding a new skill file to `.cursor/skills/`, run PAMPA indexing
so the skill becomes semantically searchable in future sessions:

```bash
node cursor-governance/setup.js --doctor  # will warn if PAMPA index is stale
```

Or manually trigger via the PAMPA MCP server inside a session.
```

**Commit checkpoint:**
```bash
git add cursor-governance\templates\
git commit -m "feat: update bundled templates for v1.5.x — ONE_PROMPT, HEADLESS_KICKOFF, CONTINUAL_LEARNING"
```

---

## SECTION 9 — `docs/ARCHITECTURE.md` Update

**File:** `N:\HexCurse\docs\ARCHITECTURE.md`

Add or update the MCP server table to show all 17 servers. Add a row for each new server with columns: Server, Kind, Primary Use, Session Phase.

Add a section **Governance Rules** listing all 10 `.mdc` files with their `alwaysApply` setting and trigger conditions.

Add a section **v1.5.x Expansion** summarizing what was added in the expansion directives (D-001 through D-003) for future maintainers.

**Commit checkpoint:**
```bash
git add docs\ARCHITECTURE.md
git commit -m "docs: ARCHITECTURE.md update MCP table to 17 servers, add rules section, v1.5.x history"
```

---

## SECTION 10 — `docs/QUICK_COMMAND_REFERENCE.md` Update

**File:** `N:\HexCurse\docs\QUICK_COMMAND_REFERENCE.md`

Add the following commands that did not exist before v1.5.x:

```markdown
## New in v1.5.x

### Sync rules from remote
node cursor-governance/setup.js --sync-rules
# Fetches latest .mdc rules from SketchOTP/HEXCURSE main branch
# Requires: HEXCURSE_RULES_REMOTE_URL env var

### Sync rules dry-run (preview only)
node cursor-governance/setup.js --sync-rules --dry-run

### Enable multi-agent mode
node cursor-governance/setup.js --multi-agent
# Creates worktree scaffold, enables swarm-protocol MCP, writes MULTI_AGENT.md

### Re-index skills with PAMPA
# Run inside a session via PAMPA MCP, or trigger doctor to check index state:
node cursor-governance/setup.js --doctor
```

**Commit checkpoint:**
```bash
git add docs\QUICK_COMMAND_REFERENCE.md
git commit -m "docs: QUICK_COMMAND_REFERENCE.md add v1.5.x commands"
```

---

## SECTION 11 — `docs/PROJECT_OVERVIEW.md` Update

**File:** `N:\HexCurse\docs\PROJECT_OVERVIEW.md`

This is the onboarding reference. Update the following tables and sections:

### 11.1 — Version table at top

Change installer version to `1.5.8` (after this directive completes).

### 11.2 — Section 6: `buildMcpServers` table

Replace the 9-server table with the full 17-server table from D-HEXCURSE-MCP-RECONCILE-003.

### 11.3 — Section 10: Embedded rule templates

Update to list all 10 `.mdc` templates: add `security`, `adr`, `memory-management`, `debugging`, `multi-agent`, `linear-sync` with their trigger conditions.

### 11.4 — Section 11: Cursor rules table

Add the 6 new rules with their `alwaysApply` and `globs` values.

### 11.5 — Section 4: CLI modes table

Add `--multi-agent` and `--sync-rules` rows.

### 11.6 — Section 23: `main()` install sequence

Add the four new `writeFileMaybeSkip` calls from D-HEXCURSE-EXPANSION-001 Section 4 that wrote the new docs.

### 11.7 — New Section: Directive history

Add a section listing the directives that have shaped the codebase:

```markdown
## 33. Directive history

| Directive | Summary | Version |
|-----------|---------|---------|
| D-HEXCURSE-EXPANSION-001 | 6 new MCPs, 6 new rules, multi-agent, sync-rules, CI workflows | 1.5.0 |
| D-HEXCURSE-CONSUMER-ROLLOUT-002 | Consumer rollout validation, 6-phase test suite | 1.5.0 |
| D-HEXCURSE-MCP-RECONCILE-003 | Canonical 17-server reconciliation, pampa/linear/semgrep fixes | 1.5.7 |
| D-HEXCURSE-DOCS-AUDIT-004 | Full governance doc rewrite for 17-server 10-rule world | 1.5.8 |
```

**Commit checkpoint:**
```bash
git add docs\PROJECT_OVERVIEW.md
git commit -m "docs: PROJECT_OVERVIEW.md update to v1.5.8 — 17 servers, 10 rules, directive history"
```

---

## SECTION 12 — `npm run test:all` Regression Check

After all content changes, run the full test suite to confirm nothing in `setup.js` was broken by the content generator updates:

```bash
cd N:\HexCurse\cursor-governance
npm run test:all
```

All 13 tests must pass. If any fail, fix before proceeding.

Also run doctor:

```bash
cd N:\HexCurse
$env:HEXCURSE_DOCTOR_CI='1'; node cursor-governance/setup.js --doctor
```

Zero bad entries required.

---

## SECTION 13 — Version Bump and Changelog

### 13.1 — Version bump

In `cursor-governance/package.json`, change version from `1.5.7` to `1.5.8`.

### 13.2 — Changelog entry

Prepend to `cursor-governance/CHANGELOG.md`:

```markdown
## [1.5.8] — {TODAY'S DATE}

### Changed
- `AGENTS.md` — complete rewrite for 17-server / 10-rule world; SESSION START
  steps 4a–4e; full DURING IMPLEMENTATION tool triggers; SESSION CLOSE all 10 steps;
  expanded Forbidden behavior; MCP utilization order for all 17 servers
- `docs/SESSION_START.md` — rewrite with all steps 4a–4e and 10-rule
  activation notice
- `docs/MCP_COORDINATION.md` — full rewrite; 17-server table; invocation order
  by session phase; 6 coordination patterns; DEGRADED_MODE for 17 servers;
  token budget section
- `CURSOR.md` — added 10-rule reference, 17-server quick ref, v1.5.x summary
- `.cursor/rules/process-gates.mdc` — added Semgrep gate, ADR gate,
  session-close checklist
- `.cursor/rules/mcp-usage.mdc` — DEGRADED_MODE rewritten for 17 servers,
  token budget notice added
- `docs/ARCHITECTURE.md` — 17-server MCP table, rules section, v1.5.x history
- `docs/QUICK_COMMAND_REFERENCE.md` — v1.5.x commands added
- `docs/PROJECT_OVERVIEW.md` — updated to v1.5.8, 17-server table, directive
  history section
- `cursor-governance/templates/` — ONE_PROMPT, HEADLESS_KICKOFF,
  CONTINUAL_LEARNING updated for v1.5.x

### Added
- `docs/MCP_TOKEN_BUDGET.md` — copied to source repo
- `docs/MULTI_AGENT.md` — copied to source repo
- `docs/ADR_LOG.md` — stub added to source repo
- `docs/AGENT_HANDOFFS.md` — stub added to source repo
- `docs/directives/` — directive files moved from root
- `agentsMd()` sync — installed AGENTS.md now matches source exactly
- `sessionStartMd()` sync — installed SESSION_START.md matches source
```

**Commit checkpoint:**
```bash
git add cursor-governance/package.json cursor-governance/CHANGELOG.md
git commit -m "chore: bump to 1.5.8 — governance docs audit complete"
```

---

## IMPLEMENTATION ORDER (strict)

| Step | Section | Commit message |
|------|---------|---------------|
| 1 | 1.1–1.3 Housekeeping | `chore: move directives to docs/directives/, add missing v1.5.x docs to source` |
| 2 | 2 AGENTS.md + agentsMd() | `feat: AGENTS.md full rewrite for 17-server 10-rule world + sync agentsMd()` |
| 3 | 3 SESSION_START.md + sessionStartMd() | `feat: SESSION_START.md rewrite with all steps 4a-4e and 10-rule notice` |
| 4 | 4 MCP_COORDINATION.md | `feat: MCP_COORDINATION.md full rewrite for 17 servers with invocation order and coordination patterns` |
| 5 | 5 CURSOR.md + cursorPackMd() | `feat: CURSOR.md add 10-rule reference, 17-server quick ref, v1.5.x summary` |
| 6 | 6 process-gates.mdc + PROCESS_GATES_TEMPLATE | `feat: process-gates.mdc add semgrep gate, ADR gate, session-close checklist` |
| 7 | 7 mcp-usage.mdc + MCP_USAGE_TEMPLATE | `feat: mcp-usage.mdc update DEGRADED_MODE for 17 servers + token budget notice` |
| 8 | 8 Bundled templates | `feat: update bundled templates for v1.5.x — ONE_PROMPT, HEADLESS_KICKOFF, CONTINUAL_LEARNING` |
| 9 | 9 ARCHITECTURE.md | `docs: ARCHITECTURE.md update MCP table to 17 servers, add rules section, v1.5.x history` |
| 10 | 10 QUICK_COMMAND_REFERENCE.md | `docs: QUICK_COMMAND_REFERENCE.md add v1.5.x commands` |
| 11 | 11 PROJECT_OVERVIEW.md | `docs: PROJECT_OVERVIEW.md update to v1.5.8 — 17 servers, 10 rules, directive history` |
| 12 | 12 Test suite regression | (no commit — fix any failures before step 13) |
| 13 | 13 Version + changelog | `chore: bump to 1.5.8 — governance docs audit complete` |
| Final | Push all | `git push && git push --tags` then tag `v1.5.8` |

Run after every step:
```bash
cd N:\HexCurse\cursor-governance && npm run test:all && cd ..
$env:HEXCURSE_DOCTOR_CI='1'; node cursor-governance/setup.js --doctor
```

---

## FORBIDDEN ACTIONS

- Do not invent new policy. All governance content must derive from confirmed canonical state (17 servers per D-003, 10 rules per D-001).
- Do not remove any existing section from any document — only expand and correct.
- Do not let `agentsMd()`, `sessionStartMd()`, `cursorPackMd()` diverge from their corresponding source files. They must produce identical content.
- Do not modify any test file unless a generator function change breaks an existing test.
- Do not commit with unchecked `npm run test:all` output.
- Do not merge to `main` until all 13 steps complete and doctor shows zero bad entries.
- Do not leave `process-gates.mdc` and `mcp-usage.mdc` updated on disk without also updating their template strings in `setup.js` — they will be overwritten on the next `--refresh-rules`.

---

## DEFINITION OF DONE CHECKLIST

- [ ] `docs/directives/` contains all three prior directive files
- [ ] `docs/MCP_TOKEN_BUDGET.md`, `MULTI_AGENT.md`, `ADR_LOG.md`, `AGENT_HANDOFFS.md` present in source `docs/`
- [ ] `AGENTS.md` references all 17 servers with trigger conditions and all 10 rules with load conditions
- [ ] `docs/SESSION_START.md` contains steps 4a–4e and 10-rule activation notice
- [ ] `docs/MCP_COORDINATION.md` contains 17-server table, invocation order, coordination patterns, DEGRADED_MODE
- [ ] `CURSOR.md` references all 10 rules and all 17 servers
- [ ] `process-gates.mdc` contains Semgrep gate, ADR gate, session-close checklist
- [ ] `mcp-usage.mdc` DEGRADED_MODE covers all 17 servers
- [ ] All 6 bundled templates updated in `cursor-governance/templates/`
- [ ] `agentsMd()`, `sessionStartMd()`, `cursorPackMd()` in sync with source files
- [ ] `PROCESS_GATES_TEMPLATE` and `MCP_USAGE_TEMPLATE` in sync with `.cursor/rules/` files
- [ ] `npm run test:all` passes (13 tests)
- [ ] `--doctor` zero bad entries
- [ ] Version is `1.5.8`
- [ ] All commits pushed to `SketchOTP/HEXCURSE`
- [ ] `main` branch updated via merge or push
- [ ] `v1.5.8` tag created and pushed

---

*End of Directive D-HEXCURSE-DOCS-AUDIT-004. This directive is complete when every checkbox above is checked.*