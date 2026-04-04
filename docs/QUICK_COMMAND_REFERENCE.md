# Quick command reference — single-line prompts

**This HexCurse source repo:** Session start lives in **`docs/SESSION_START.md`**. **Full MCP stack map:** **`docs/MCP_COORDINATION.md`**. For stronger agent compliance, duplicate **`.cursor/rules/process-gates.mdc`** into Cursor **User / Project** rules and announce **`DEGRADED_MODE`** when an MCP is unavailable (see **`CURSOR.md`**).

## Task management

**What's next?**
> Ask Taskmaster what the next unblocked task is. Report the task ID, title, description, and dependencies. Do not start it yet.

**Project status**
> Read DIRECTIVES.md and ask Taskmaster for task list. Give me: completed count, in-progress task, next 3 queued with priorities. One paragraph.

**Queue a new directive**
> Add to DIRECTIVES.md Queued section: D[NNN]: [description]. Scope: [files/modules]. Priority: [HIGH/MED/LOW]. Depends on: D[NNN]. Also add to Taskmaster with: task-master add-task --title '[title]' --description '[desc]'. Do not start it.

**Start a directive (plan first)**
> Start D[NNN]. First invoke sequential-thinking to plan the implementation step by step. Output the plan as a numbered list with file paths and symbol names. Wait for my approval before touching any files. Create local branch D[NNN]-[kebab-desc] with git. Read all paths from the workspace on disk — not GitHub.

**Break a directive into subtasks**
> Use Taskmaster expand_task on task [ID] to generate subtasks. Show me the subtask list. I will approve before we begin.

**Close a session**
> Run the Session Close Checklist from AGENTS.md. Mark task [ID] complete in Taskmaster: set_task_status done. Update DIRECTIVES.md. Write SESSION_LOG entry S-[NNN]. Give me the git commit message. (Optional: open a PR via github MCP only if I ask; otherwise I will git push and open the PR in the UI.)

## Context and documentation

**Live docs for a library**
> How do I [do X] with [library name]? use context7

**GitHub dependency docs**
> Show me the API for [repo/library] via gitmcp. I need to understand [specific feature/function].

**Continual learning / transcript mining**
> Run agents-memory-updater (or Task subagent) per docs/CONTINUAL_LEARNING.md and mcp-usage.mdc RULE 9. Use the incremental index; parent transcripts only.

**Codebase snapshot**
> Run repomix --compress in the project root. Then summarize the top-level module structure from the output. Do not start implementing yet.

**Find a symbol**
> Use Serena find_symbol to locate [function/class name]. Show me its definition and line number. Do not read the full file.

**Find callers**
> Use Serena find_referencing_symbols for [function name]. List every file and line that calls it.

## Memory

### Seed memory MCP with project facts

Run inside a Cursor session — invoke the **memory** MCP directly (e.g. `create_entities` / project facts), not from a headless shell:

- Paste or follow the structured bullets in **`docs/MEMORY_SEED.md`**, or ask the agent: *Store the HexCurse project facts from MEMORY_SEED.md in memory using entity types project, server, rule, and ritual.*

**Save a fact**
> Write to memory MCP: '[fact to remember]'. Confirm it was saved.

**Recall facts**
> Read memory MCP for anything related to [topic/component]. Summarize what's stored before we proceed.

**Audit memory**
> Read all entries from memory MCP and list them. I want to audit what the agent knows about this project.

## Git (local + optional GitHub MCP)

**Create a branch (default)**
> Create local branch D[NNN]-[kebab-desc] with `git checkout -b …`. Confirm before proceeding. Governance uses the **disk** tree — not the GitHub API.

**Open a PR (optional — if you want MCP to do it)**
> Open a GitHub PR via github MCP for branch D[NNN]-[desc]. Title: 'D[NNN]: [directive title]'. Body: list the files changed and the directive goal. Otherwise: I will `git push` and open the PR in the browser.

**Blocker issue (optional)**
> Log the blocker to memory MCP and DIRECTIVES.md. If I want a GitHub issue: create one via github MCP titled '[blocker description]', label 'blocker', link to PR if applicable.

## Emergency

**Stop and verify scope**
> STOP. Do not modify any more files. Run git diff and show me everything changed this session. I will tell you what to keep and what to revert.

**Re-index Serena**
> My files changed outside of Serena. Restart the Serena language server to re-index. Confirm restart before proceeding.

**Add sacred constraint**
> Add this to .cursor/rules/base.mdc under Sacred Constraints: '[constraint]'. Also write it to memory MCP. Confirm both were saved.

**Reset context**
> STOP all work. Read AGENTS.md, DIRECTIVES.md, and docs/ARCHITECTURE.md fresh. Check memory MCP. Then report: current directive, its scope, what you've done so far this session, and what remains. Wait for my confirmation before continuing.

## New in v1.5.x

### Sync rules from remote
```bash
node cursor-governance/setup.js --sync-rules
```
Fetches latest `.mdc` rules from the configured remote (requires **`HEXCURSE_RULES_REMOTE_URL`**).

### Sync rules dry-run (preview only)
```bash
node cursor-governance/setup.js --sync-rules --dry-run
```

### Enable multi-agent mode
```bash
node cursor-governance/setup.js --multi-agent
```
Creates worktree scaffold, enables swarm-protocol MCP wiring where applicable, writes **`docs/MULTI_AGENT.md`** (pack: **`HEXCURSE/docs/MULTI_AGENT.md`**).

### Re-index skills with PAMPA
Run inside a session via the **pampa** MCP, or run doctor from repo root to surface index health:
```bash
HEXCURSE_DOCTOR_CI=1 node cursor-governance/setup.js --doctor
```
