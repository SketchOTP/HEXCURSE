# CURSOR AI CODING SYSTEM — USER GUIDE
# Your complete manual for setting up and running the system.
# Companion file: CURSOR_AGENT_SETUP_PROMPT_V2.md  (that file is for the AI)
# ─────────────────────────────────────────────────────────────────────────────

This repository implements the **HexCurse** stack. Pilot work used the codename
**Hearth**; day-to-day identity is **HexCurse** (`hexcurse`). Follow
`CURSOR_AGENT_SETUP_PROMPT_V2.md` for setup and session prompts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT THIS SYSTEM IS AND WHAT YOUR JOB IS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This system turns Cursor into a governed, self-managing AI coding pipeline.
Once set up, the AI agent handles everything automatically — it knows what
task to work on, which tools to use and when, how to stay in scope, and how
to close out each session cleanly.

YOUR ENTIRE JOB during a coding session is exactly three things:

  1. Paste the Session Start Prompt into a new chat
  2. Confirm the directive and scope when the agent asks
  3. Paste the Session Close command when you're done for the day

That is it. You do not decide which tools to use. You do not manage the task
list. You do not track what's been done. The system does all of that.

The AI knows:
  → When to fetch live library documentation automatically
  → When to search for a symbol instead of reading a whole file
  → When to plan step-by-step before writing code
  → When to create a branch and open a PR
  → What task comes next and in what order
  → What facts to remember between sessions

You just confirm and review. The agent executes.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — ONE-TIME MACHINE SETUP
Do this once. Never again unless you get a new machine.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before you start, make sure you have:

  □ Cursor installed — cursor.com
  □ Node.js 18 or higher — check with: node --version
  □ Python 3.10 or higher — check with: python --version
  □ Git installed — check with: git --version
  □ An Anthropic API key — get one at console.anthropic.com
  □ A GitHub Personal Access Token — github.com → Settings → Developer Settings
    → Personal Access Tokens → Fine-grained → create with repo read/write

─────────────────────────────────────────────────────────────────────────────
STEP 1 — INSTALL THE CLI TOOLS
─────────────────────────────────────────────────────────────────────────────

Open your terminal and run all three:

  npm install -g task-master-ai
  npm install -g repomix
  pip install uv

Verify they worked:

  task-master --version
  repomix --version
  uv --version

All three should print a version number with no errors.
Fix any errors before moving on.

─────────────────────────────────────────────────────────────────────────────
STEP 2 — CREATE YOUR MCP CONFIG FILE
─────────────────────────────────────────────────────────────────────────────

This file tells Cursor which AI tools are available in the background.
You create it once. It lives on your machine, not inside any project.

Location:
  Windows:   C:\Users\[YourName]\.cursor\mcp.json
  Mac/Linux: ~/.cursor/mcp.json

Create that file (or open it if it already exists) and paste in the entire
block below. Replace the two placeholder values with your real keys:

────────────────────────────────────────────────────────────────────────────
{
  "mcpServers": {

    "taskmaster-ai": {
      "command": "npx",
      "args": ["-y", "--package=task-master-ai", "task-master-ai"],
      "env": {
        "ANTHROPIC_API_KEY": "YOUR_ANTHROPIC_API_KEY_HERE"
      }
    },

    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },

    "repomix": {
      "command": "npx",
      "args": ["-y", "repomix", "--mcp"]
    },

    "serena": {
      "command": "uvx",
      "args": [
        "--from", "git+https://github.com/oraios/serena",
        "serena-mcp-server",
        "--project", "${workspaceFolder}"
      ]
    },

    "gitmcp": {
      "url": "https://gitmcp.io/docs"
    },

    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },

    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },

    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_GITHUB_PAT_HERE"
      }
    }

  }
}
────────────────────────────────────────────────────────────────────────────

Save the file.

─────────────────────────────────────────────────────────────────────────────
STEP 3 — PROTECT YOUR KEYS
─────────────────────────────────────────────────────────────────────────────

Your mcp.json contains API keys. Never commit it to a repo.
Add it to your global gitignore right now:

  Mac/Linux:
    echo "~/.cursor/mcp.json" >> ~/.gitignore_global
    git config --global core.excludesfile ~/.gitignore_global

  Windows (PowerShell):
    Add-Content "$env:USERPROFILE\.gitignore_global" "$env:USERPROFILE\.cursor\mcp.json"
    git config --global core.excludesfile "$env:USERPROFILE\.gitignore_global"

─────────────────────────────────────────────────────────────────────────────
STEP 4 — VERIFY EVERYTHING IS CONNECTED
─────────────────────────────────────────────────────────────────────────────

1. Close Cursor completely and reopen it.

2. Open Settings:
     Windows/Linux: Ctrl + Shift + J
     Mac:           Cmd + Shift + J

3. Click the MCP tab on the left.

4. You should see 8 servers, all with a green dot:

   ● taskmaster-ai
   ● context7
   ● repomix
   ● serena
   ● gitmcp
   ● sequential-thinking
   ● memory
   ● github

Do not proceed until all 8 are green. If any show red:
  - Click the red server to read the error message
  - Most fixes: check mcp.json for a missing comma or bracket, or make sure
    the CLI tools from Step 1 installed correctly
  - After fixing: toggle the server off then back on in the MCP tab
  - If still red: close and reopen Cursor entirely

Phase 1 is complete. You never do this again on this machine.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — NEW PROJECT SETUP
Do this once at the start of every new project.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

─────────────────────────────────────────────────────────────────────────────
STEP 5 — PREPARE YOUR PROJECT FOLDER
─────────────────────────────────────────────────────────────────────────────

In your terminal:

  mkdir my-project
  cd my-project
  git init

Or clone an existing repo:

  git clone https://github.com/you/your-repo.git
  cd your-repo

Open the folder in Cursor: File → Open Folder → select your project folder.
Confirm the Explorer panel on the left shows your project folder at the top.

─────────────────────────────────────────────────────────────────────────────
STEP 6 — THINK THROUGH YOUR PROJECT (5–10 minutes)
─────────────────────────────────────────────────────────────────────────────

The agent will ask you 9 questions when you run the setup. Have answers
ready before you start. Write them down or just think them through clearly.
The questions will be:

  1. Project name and one-sentence purpose
  2. Tech stack — languages, frameworks, runtimes, hardware
  3. The 3–5 main modules or subsystems
  4. What is explicitly NOT in scope for this first version
  5. What "done" looks like for the first working version
  6. Any rules the AI must never break
     (examples: "never use cloud", "no global state", "always deterministic")
  7. Your project folder path
  8. External libraries or hardware SDKs you'll definitely use
  9. Any GitHub repos the AI should have live documentation access to

The more specific you are, the better the scaffold the agent produces.
Vague answers lead to vague architecture. Be direct.

─────────────────────────────────────────────────────────────────────────────
STEP 7 — RUN THE PROJECT SETUP PROMPT
─────────────────────────────────────────────────────────────────────────────

1. Open CURSOR_AGENT_SETUP_PROMPT_V2.md in any text editor.

2. Find PART 1 — PROJECT SETUP PROMPT.
   The section is marked with:  ════ PASTE BELOW THIS LINE ════
   Copy everything from that line down to:  ════ END OF PASTE ════

3. Open a brand new chat in Cursor (Ctrl+L or Cmd+L).

4. Paste and press Enter.

5. The agent asks you the 9 questions. Answer all of them completely.
   Do not rush. These answers define everything that follows.

6. The agent builds the entire governance structure automatically:
   all rule files, architecture doc, task files, session log.
   You watch. You don't type code.

7. When the agent asks about the PRD:
     → "Generate from my intake answers" — agent writes and parses it for you
     → "I'll write it myself" — write to .taskmaster/docs/prd.txt then tell
        the agent "Parse the PRD now"

8. At the end the agent prints a verification report. Every item should show ✅.
   Review the generated files in the Explorer. Spot-check that:
     - ARCHITECTURE.md describes your project accurately
     - DIRECTIVES.md shows your first task in the Queued section
     - base.mdc lists your sacred constraints correctly

   If anything is wrong: "Fix [specific thing] in [file name]."
   When everything looks right, move on.

─────────────────────────────────────────────────────────────────────────────
STEP 8 — COMMIT THE SCAFFOLD
─────────────────────────────────────────────────────────────────────────────

Before writing any code, commit what you have:

  git add .
  git commit -m "chore: governance scaffold — MCP and rules files initialized"
  git push

This is your clean baseline. If anything ever breaks badly, you can always
return to this commit.

Phase 2 is complete. You only do this once per project.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 — YOUR DAILY WORKFLOW
Every session, every day, this is all you do.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

─────────────────────────────────────────────────────────────────────────────
STARTING A SESSION — 3 STEPS
─────────────────────────────────────────────────────────────────────────────

STEP A — Open a brand new chat.
  Never reuse yesterday's chat. Context builds up and quality degrades.
  Ctrl+L or Cmd+L opens a new chat.

STEP B — Paste the Session Start Prompt.
  Open CURSOR_AGENT_SETUP_PROMPT_V2.md.
  Find PART 2 — SESSION START PROMPT.
  Copy from  ════ PASTE BELOW THIS LINE ════  to  ════ END OF PASTE ════

  Before pasting, find this line near the bottom:
    [REPLACE THIS LINE with session carry-over context...]

  Replace it with a one or two sentence note about anything relevant from
  the last session. For example:
    "Continuing D007. The I2C conflict from last session was resolved —
     sensor moved to 0x30. Branch D007-i2c-pipeline already exists."

  If this is a completely fresh start with nothing to carry over, just
  delete that line entirely.

  Paste into the chat and press Enter.

STEP C — Confirm the directive.
  The agent runs its full startup checklist automatically, then reports:
  what task is active, what's next in the queue, and the exact scope of
  what it will and won't touch.

  Read the scope carefully. If it looks right, say: "Confirmed. Proceed."
  If anything is off, correct it before saying proceed.
  Once you say proceed, the agent works. Your job is to review.

─────────────────────────────────────────────────────────────────────────────
DURING A SESSION — YOUR ONLY RULES
─────────────────────────────────────────────────────────────────────────────

Review output — don't rewrite it.
  The agent produces code. You read it. If something looks wrong:
  "That's not right — [reason]. Fix it."
  You are here to make decisions, not type code.

Stay on one directive.
  If you think of something new mid-session, say: "Add that to the backlog."
  The agent logs it without acting on it. Do not ask for extras mid-session.
  The system works because scope is controlled.

If something goes wrong — emergency stop.
  "STOP. Do not modify any more files. Show me git diff."
  Read what changed. Tell the agent what to keep and what to revert.

If the agent seems confused or is drifting.
  "STOP. Read AGENTS.md and DIRECTIVES.md fresh. Tell me the current
   directive, its scope, what you've done this session, and what remains."
  Confirm or correct before it continues.

─────────────────────────────────────────────────────────────────────────────
CLOSING A SESSION — 2 STEPS
─────────────────────────────────────────────────────────────────────────────

STEP A — Run the close command.
  When you're done for the day, paste this into the chat:

    "Run the Session Close Checklist from AGENTS.md. Mark this task complete
     in Taskmaster. Update DIRECTIVES.md. Write SESSION_LOG entry for today.
     Open a GitHub PR for this branch. Give me the git commit message."

  The agent handles all of it and gives you a commit message to copy.

STEP B — Commit in your terminal.
  git add .
  git commit -m "[paste the message the agent gave you]"
  git push

Done. Session is closed. Everything is logged, committed, and the agent knows
exactly where to pick up next time.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4 — THE ONLY THINGS YOU MANAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

There are a small number of things only you can decide. The agent handles
everything else, but these require your judgment.

─────────────────────────────────────────────────────────────────────────────
QUEUEING NEW WORK
─────────────────────────────────────────────────────────────────────────────

When you have new work to add, tell the agent at the end of any session:

  "Queue a new directive: [describe what you want built].
   Scope: [which modules]. Priority: [high / medium / low].
   Depends on: [D-number if it needs a previous task done first].
   Do not start it."

The agent adds it to the task queue. It won't be worked on until you confirm
it at a future session start. D-numbers are sequential and never reused.

─────────────────────────────────────────────────────────────────────────────
UPDATING THE ARCHITECTURE
─────────────────────────────────────────────────────────────────────────────

When a significant design decision changes, keep the architecture file accurate:

  "Update docs/ARCHITECTURE.md. The sensor layer now uses polling instead
   of interrupts. Update the System Map and the sensor module contract."

─────────────────────────────────────────────────────────────────────────────
ADDING A NEW SACRED CONSTRAINT
─────────────────────────────────────────────────────────────────────────────

If you discover a rule the AI must always follow that wasn't in your original
setup, add it so it's enforced from the very next session:

  "Add to .cursor/rules/base.mdc under Sacred Constraints: [your rule].
   Also save it to memory. Confirm both were updated."

─────────────────────────────────────────────────────────────────────────────
REVIEWING BEFORE MERGING
─────────────────────────────────────────────────────────────────────────────

The agent opens a PR at the end of every directive. Before you merge it:
  - Skim the diff — confirm only the right files changed
  - If anything looks wrong, reopen a chat and say:
    "There's an issue in the PR for D[NNN]: [describe the problem]."
  - The agent fixes it and updates the PR.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5 — MAINTENANCE AND EDGE CASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

─────────────────────────────────────────────────────────────────────────────
IF AN MCP SERVER GOES RED
─────────────────────────────────────────────────────────────────────────────

1. Open Cursor Settings → MCP tab
2. Click the red server and read the error message
3. Most common fixes:
     - JSON syntax error in mcp.json → find the missing comma or bracket
     - Tool not found → re-run the install command from Step 1
     - API key issue → regenerate the key and update mcp.json
4. After fixing: toggle the server off then back on in the MCP tab
5. Still red after 3 tries: close Cursor completely and reopen it

─────────────────────────────────────────────────────────────────────────────
MOVING TO A NEW MACHINE
─────────────────────────────────────────────────────────────────────────────

On the new machine: complete Phase 1 (Steps 1–4) exactly as written.

Your project files (ARCHITECTURE.md, DIRECTIVES.md, all governance files)
travel with the repo — they come with the git clone automatically.

Your mcp.json is machine-local. Recreate it using Step 2.

The agent's memory is also local. After your first session on the new machine:

  "Read DIRECTIVES.md and SESSION_LOG.md. Re-seed memory with the key
   project facts from all completed sessions."

─────────────────────────────────────────────────────────────────────────────
IF THE AGENT STARTS IGNORING ITS RULES
─────────────────────────────────────────────────────────────────────────────

This happens when a chat session runs too long and context degrades.
The fix is always the same: start a fresh chat with the Session Start Prompt.
Never try to fix drift by arguing with the agent in a long chat. A new chat
re-loads all the rules from scratch and resets the agent cleanly.

This is why one directive per session is a hard rule.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR DAILY CHECKLIST — PRINT THIS AND KEEP IT NEXT TO YOUR KEYBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────────────────────────────────────────────────────────────┐
  │  SESSION START                                                   │
  │                                                                  │
  │  1. Open project in Cursor                                       │
  │  2. Open a BRAND NEW chat (never reuse old chats)               │
  │  3. Edit the carry-over line in the Session Start Prompt        │
  │  4. Paste the Session Start Prompt → press Enter                │
  │  5. Read the agent's status report                              │
  │  6. Confirm the directive and scope                             │
  │  7. Say: "Confirmed. Proceed."                                  │
  │                                                                  │
  ├──────────────────────────────────────────────────────────────────┤
  │  DURING THE SESSION                                              │
  │                                                                  │
  │  • Review output — you don't type code                         │
  │  • Stay on one directive — send new ideas to backlog            │
  │  • Emergency stop: "STOP. Show me git diff."                    │
  │  • Drift fix: "STOP. Read AGENTS.md and DIRECTIVES.md fresh."  │
  │                                                                  │
  ├──────────────────────────────────────────────────────────────────┤
  │  SESSION CLOSE                                                   │
  │                                                                  │
  │  1. Paste: "Run the Session Close Checklist from AGENTS.md.    │
  │             Mark this task complete in Taskmaster.              │
  │             Update DIRECTIVES.md. Write SESSION_LOG entry.      │
  │             Open a GitHub PR. Give me the git commit message."  │
  │                                                                  │
  │  2. In terminal:  git add .                                     │
  │                   git commit -m "[agent's message]"             │
  │                   git push                                       │
  │                                                                  │
  │  3. Close the chat                                              │
  └──────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE MAP — WHERE EVERYTHING LIVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  YOUR MACHINE — global, never in any repo, never committed
  ──────────────────────────────────────────────────────────
  ~/.cursor/mcp.json              MCP server config + API keys
                                  ⚠ NEVER COMMIT THIS FILE

  EVERY PROJECT REPO — committed to git, travels with the project
  ──────────────────────────────────────────────────────────────────
  .cursor/rules/base.mdc          Sacred constraints + global code rules
  .cursor/rules/mcp-usage.mdc     When/how the agent uses each tool (auto)
  .cursor/rules/[domain].mdc      Language/domain-specific rules
  .taskmaster/docs/prd.txt        Product requirements document
  .taskmaster/tasks/tasks.json    Machine-readable task graph
  .serena/memories/               Agent's code index (auto-managed)
  docs/ARCHITECTURE.md            System design + module map
  DIRECTIVES.md                   Human-readable task chain
  AGENTS.md                       AI rules of engagement
  SESSION_LOG.md                  Audit trail — one entry per session

  THESE TWO FILES — store anywhere, not project-specific
  ──────────────────────────────────────────────────────────────────
  CURSOR_AGENT_SETUP_PROMPT_V2.md    The prompts (for the AI)
  CURSOR_SYSTEM_USER_GUIDE.md        This file (for you)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END OF USER GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━