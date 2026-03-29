# Quick command reference — single-line prompts

## Task management

**What's next?**
> Ask Taskmaster what the next unblocked task is. Report the task ID, title, description, and dependencies. Do not start it yet.

**Project status**
> Read DIRECTIVES.md and ask Taskmaster for task list. Give me: completed count, in-progress task, next 3 queued with priorities. One paragraph.

**Queue a new directive**
> Add to DIRECTIVES.md Queued section: D[NNN]: [description]. Scope: [files/modules]. Priority: [HIGH/MED/LOW]. Depends on: D[NNN]. Also add to Taskmaster with: task-master add-task --title '[title]' --description '[desc]'. Do not start it.

**Start a directive (plan first)**
> Start D[NNN]. First invoke sequential-thinking to plan the implementation step by step. Output the plan as a numbered list with file paths and symbol names. Wait for my approval before touching any files. Create GitHub branch D[NNN]-[kebab-desc] via github MCP.

**Break a directive into subtasks**
> Use Taskmaster expand_task on task [ID] to generate subtasks. Show me the subtask list. I will approve before we begin.

**Close a session**
> Run the Session Close Checklist from AGENTS.md. Mark task [ID] complete in Taskmaster: set_task_status done. Update DIRECTIVES.md. Write SESSION_LOG entry S-[NNN]. Open a GitHub PR for branch D[NNN]-[desc] via github MCP. Give me the git commit message.

## Context and documentation

**Live docs for a library**
> How do I [do X] with [library name]? use context7

**GitHub dependency docs**
> Show me the API for [repo/library] via gitmcp. I need to understand [specific feature/function].

**Codebase snapshot**
> Run repomix --compress in the project root. Then summarize the top-level module structure from the output. Do not start implementing yet.

**Find a symbol**
> Use Serena find_symbol to locate [function/class name]. Show me its definition and line number. Do not read the full file.

**Find callers**
> Use Serena find_referencing_symbols for [function name]. List every file and line that calls it.

## Memory

**Save a fact**
> Write to memory MCP: '[fact to remember]'. Confirm it was saved.

**Recall facts**
> Read memory MCP for anything related to [topic/component]. Summarize what's stored before we proceed.

**Audit memory**
> Read all entries from memory MCP and list them. I want to audit what the agent knows about this project.

## GitHub

**Create a branch**
> Create a GitHub branch named D[NNN]-[kebab-desc] via github MCP. Confirm branch was created before proceeding.

**Open a PR**
> Open a GitHub PR via github MCP for branch D[NNN]-[desc]. Title: 'D[NNN]: [directive title]'. Body: list the files changed and the directive goal.

**Blocker issue**
> Create a GitHub issue via github MCP titled '[blocker description]'. Label it 'blocker'. Link it to the current PR. Then log the same blocker to memory MCP.

## Emergency

**Stop and verify scope**
> STOP. Do not modify any more files. Run git diff and show me everything changed this session. I will tell you what to keep and what to revert.

**Re-index Serena**
> My files changed outside of Serena. Restart the Serena language server to re-index. Confirm restart before proceeding.

**Add sacred constraint**
> Add this to .cursor/rules/base.mdc under Sacred Constraints: '[constraint]'. Also write it to memory MCP. Confirm both were saved.

**Reset context**
> STOP all work. Read AGENTS.md, DIRECTIVES.md, and ARCHITECTURE.md fresh. Check memory MCP. Then report: current directive, its scope, what you've done so far this session, and what remains. Wait for my confirmation before continuing.
