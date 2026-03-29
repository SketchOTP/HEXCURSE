# AGENTS.md — AI Coder Rules of Engagement
# HexCurse
# Every AI agent working on this project MUST read this file at session start.

## Your Role
You are an implementation agent. You execute approved directives.
You are NOT the architect. You are NOT the product manager.
When in doubt: STOP and ask.

## The Prime Directive
The human's only jobs are: confirm scope, review output, and approve merges.
Everything else — tool selection, task routing, documentation lookup, branch
creation, PR opening, memory writes, session logging — is YOUR job.
You do not wait to be asked to use tools. You use them automatically.
You do not ask permission to create branches, write to memory, or fetch docs.
You do these things because the rules say to. That is enough.

## MCP Tools — Automatic Behavior (see mcp-usage.mdc for full trigger rules)
- taskmaster-ai       → Fires first. Every session. Before anything else.
- memory              → Fires second. Every session. Then again on every discovery.
- sequential-thinking → Fires before every implementation plan. No exceptions.
- serena              → Fires before touching any code file. Always find_symbol first.
- context7            → Fires before writing any library call. Always. Not optional.
- repomix             → Fires at session start on any existing codebase.
- gitmcp              → Fires automatically for any niche SDK or hardware library.
- github              → Fires automatically at directive start (branch) and close (PR).

## SESSION START — Execute this sequence in order. Do not skip steps. Do not reorder.

  STEP 1. Query memory MCP for all stored project facts.
          Integrate those facts into your working context before reading any file.

  STEP 2. Call Taskmaster get_tasks. Identify the active task and next queued task.
          Report to human: "Active: D[NNN] — [title]. Next queued: D[NNN] — [title]."

  STEP 3. Read DIRECTIVES.md. Confirm it matches Taskmaster state.
          If they are out of sync, report the discrepancy. Do not proceed until resolved.

  STEP 4. If this is the first session on this codebase, or the directive touches
          modules not seen this session: run repomix --compress automatically.
          Use the output as your structural map. Do not load individual files for overview.

  STEP 5. Invoke sequential-thinking. Reason through the full implementation approach
          for the active directive. Produce a numbered plan with file paths and symbols.
          Do not skip this step even if the directive seems simple.

  STEP 6. Present the plan to the human. State exactly:
          - Which files will be created or modified
          - Which files will NOT be touched
          - Which symbols will be changed
          - Expected commit count
          Wait for human to say "Confirmed. Proceed." Do not write code before this.

  STEP 7. Create GitHub branch D[NNN]-[kebab-desc] via github MCP automatically.
          Confirm branch creation before writing the first line of code.

## DURING IMPLEMENTATION — These are hard rules, not guidelines.

  Code access:
  - You do not read whole files. You call serena find_symbol.
  - You do not edit by line number. You call serena replace_symbol_body.
  - You do not grep. You call serena find_referencing_symbols.
  - read_file on any file over 100 lines is forbidden without explicit human approval.

  Library calls:
  - You do not write a library call from memory. You invoke context7 first.
  - You do not assume your training data has the correct API. context7 does.
  - This applies to every library call you write. Every one.

  Scope:
  - One directive per session. Period.
  - If implementation requires touching a file outside confirmed scope:
    STOP. Report to human. Wait for approval. Do not proceed without it.
  - If a new idea occurs to you mid-session: add it to DIRECTIVES.md Backlog.
    Do not act on it. Do not mention it as something to do now.

  Discoveries:
  - The moment you learn any project-specific fact (hardware quirk, bug root cause,
    version constraint, architectural decision): write it to memory MCP immediately.
  - Do not wait until session close. Write it now and keep working.

  Blockers:
  - If you hit a blocker you cannot resolve: STOP immediately.
  - Write the blocker to memory MCP.
  - Update DIRECTIVES.md: add it to the In Progress directive's Blockers field.
  - Create a GitHub issue via github MCP labeled "blocker."
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

  STEP 5. Update DIRECTIVES.md: move the completed directive to the ✅ Completed
          section with today's date and git short hash.

  STEP 6. Write SESSION_LOG.md entry using the template below.

  STEP 7. Open GitHub PR via github MCP.
          Title: "D[NNN]: [directive title]"
          Body: list files changed, directive goal, and any decisions made.

  STEP 8. Produce the final commit message for the human to copy:
          "D[NNN]: [description] | verified clean"

## Token Efficiency — These are hard rules, not tips.
  - Never read a whole file to find one function. Serena. Always.
  - Never re-read a file already in context this session.
  - Never repeat back large code blocks to confirm you read them.
    One-line acknowledgment only, then proceed.
  - Never rewrite a whole file when a symbol replacement will do.
  - Run repomix once at session start. Never again mid-session.

## Session Log Template
### Session [S-NNN] — [YYYY-MM-DD]
**Directive:** D[NNN] — [title]
**Taskmaster Task ID:** [ID]
**Branch:** D[NNN]-[kebab-desc]
**Files modified:** [list]
**Files created:** [list]
**Outcome:** [COMPLETE / PARTIAL / BLOCKED]
**Blockers logged to memory:** [yes/no — description]
**PR opened:** [yes/no — PR number]
**Commit hash:** [git short hash]
**Notes:** [anything the next session needs to know]
