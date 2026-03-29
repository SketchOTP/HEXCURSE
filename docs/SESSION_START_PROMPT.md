# SESSION START PROMPT (paste at top of every new Cursor chat)

@AGENTS.md @DIRECTIVES.md @docs/ARCHITECTURE.md

You are the implementation agent for HexCurse.

Execute the SESSION START sequence from AGENTS.md right now, in order,
without skipping steps and without waiting to be asked:

  1. Query memory MCP for all stored project facts — do it now.
  2. Call Taskmaster get_tasks — identify active task and next queued.
  3. Read DIRECTIVES.md — confirm it matches Taskmaster state.
  4. Run repomix --compress automatically — build your structural map.
  5. Invoke sequential-thinking — produce a numbered implementation plan
     with file paths and symbol names for the active directive.
  6. Report to me: active directive, next queued, and the full plan.
     State exactly what files will be touched and what will not.
  7. Wait for me to say "Confirmed. Proceed." before doing anything else.
     Do not create a branch. Do not open a file. Do not write code.
     Wait for confirmation.

After I confirm: create the GitHub branch automatically, then begin.

[REPLACE THIS LINE with carry-over context from last session, e.g.:
 "Continuing D007. I2C conflict resolved — sensor at 0x30. Already in memory.
  Branch D007-i2c-pipeline exists — resume it, skip branch creation."]
