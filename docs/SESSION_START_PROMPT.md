# SESSION START PROMPT (paste at top of every new Cursor chat)

# **Fastest kickoff in consumer repos:** fill **`HEXCURSE/NORTH_STAR.md`**, then paste **only** the fenced block from **`HEXCURSE/ONE_PROMPT.md`** (see **`docs/ONE_PROMPT.md`**). Use **`HEXCURSE/SESSION_START_PROMPT.md`** there for @-paths. **This** file is for **ongoing** sessions in **this** source repo (root layout).

# This block **makes the agent aware** of the workflow — paste it every session so Taskmaster, memory, and MCP rituals run. (Rules in `.cursor/rules/` load automatically; they do not replace this sequence.)

@CURSOR.md @NORTH_STAR.md @docs/MCP_COORDINATION.md @docs/GOVERNANCE_PARITY.md @docs/CONTINUAL_LEARNING.md @docs/CURSOR_MODES.md @AGENTS.md @DIRECTIVES.md @docs/ARCHITECTURE.md

You are the implementation agent for HexCurse.

Execute the SESSION START sequence from AGENTS.md right now, in order,
without skipping steps and without waiting to be asked:

  0. If I used **HEXCURSE/ONE_PROMPT.md** (consumer repo): follow that file’s bridge + SESSION START instructions. If I asked **run HEXCURSE** without ONE_PROMPT and the repo has **`HEXCURSE/`**: use **`.cursor/hexcurse-installer.path`** then **`node … --run-hexcurse`**. (This **source** repo: no **`HEXCURSE/`** pack — bridge only for testing.)
  1. Query memory MCP for all stored project facts — do it now.
  2. Call Taskmaster get_tasks — identify active task and next queued.
  3. Read DIRECTIVES.md — confirm it matches Taskmaster state.
  4. Run repomix --compress automatically — build your structural map.
  4b. **jcodemunch** — `resolve_repo` / `index_folder` on this workspace root; `get_repo_outline` and/or `suggest_queries` as needed (**mcp-usage.mdc** RULE 10).
  5. Invoke sequential-thinking — produce a numbered implementation plan
     with file paths and symbol names for the active directive.
  6. Report to me: active directive, next queued, and the full plan.
     State exactly what files will be touched and what will not.
  7. Wait for me to say "Confirmed. Proceed." before doing anything else.
     Do not create a branch. Do not open a file. Do not write code.
     Wait for confirmation.

**Optional:** If **`.cursor/hooks/state/continual-learning.json`** has **`pendingLearning: true`**, run the **RULE 9** / **agents-memory-updater** pass early this session (after scope is clear) unless the human asked to skip continual learning.

After I confirm: create the **local git** branch (e.g. `git checkout -b D[NNN]-…`), then begin. **github** MCP is not required — use **disk** paths for all reads.

**Other repos:** If this project was installed with `cursor-governance` and has a **`HEXCURSE/`** pack, use **`HEXCURSE/SESSION_START_PROMPT.md`** from that repo instead (see **`HEXCURSE/PATHS.json`**).

[REPLACE THIS LINE with carry-over context from last session, e.g.:
 "Continuing D007. I2C conflict resolved — sensor at 0x30. Already in memory.
  Branch D007-i2c-pipeline exists — resume it, skip branch creation."]
