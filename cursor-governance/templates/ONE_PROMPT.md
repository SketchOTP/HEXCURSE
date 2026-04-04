# ONE PROMPT — run all of HexCurse from **NORTH_STAR.md**

**You do two things only:**

1. Fill **`HEXCURSE/NORTH_STAR.md`** (same folder as this file — replace the boilerplate with your real product idea).
2. Kick off HexCurse using **either** [Cursor headless CLI](https://cursor.com/docs/cli/headless) **(Composer 2)** **or** an **in-IDE Agent** chat (below).

Default model for headless: **`composer-2`** ([Composer 2](https://cursor.com/docs/models/cursor-composer-2); see [CLI parameters](https://cursor.com/docs/cli/reference/parameters)). For lower latency (higher per-token cost), use **`composer-2-fast`** instead.

---

## Option A — Cursor headless CLI (scripts / automation)

**Prerequisites:** [Install Cursor CLI](https://cursor.com/docs/cli/installation.md). For non-interactive use, set **`CURSOR_API_KEY`** (see [CLI authentication](https://cursor.com/docs/cli/reference/authentication.md)).

From the **repository root**, save the **“Paste this block only”** body (below) as plain text (e.g. `kickoff.txt`) — same steps as the in-IDE block, without `@` mentions if your CLI does not resolve them.

**macOS / Linux (bash):**

```bash
export CURSOR_API_KEY=your_key_here   # if required
agent -p --model composer-2 --trust --workspace "$(pwd)" "$(tr -d '\r' < kickoff.txt)"
```

**Windows (PowerShell):**

```powershell
$env:CURSOR_API_KEY = "your_key_here"   # if required
agent -p --model composer-2 --trust --workspace $PWD (Get-Content -Raw .\kickoff.txt)
```

- **`-p` / `--print`** — non-interactive “headless” mode ([headless doc](https://cursor.com/docs/cli/headless)).
- **`--model composer-2`** — Cursor’s agentic coding model tuned for tool use (swap to **`composer-2-fast`** if you prefer).
- **`--trust`** — trust the workspace without prompting (required for unattended runs per [parameters](https://cursor.com/docs/cli/reference/parameters)).
- **`--workspace`** — repo root; keep it aligned with where **`node …/setup.js`** should run.

The CLI loads **`.cursor/rules/`** and respects **`~/.cursor/mcp.json`** like the editor ([Using Agent in CLI](https://cursor.com/docs/cli/using)).

---

## Option B — In-IDE Agent (interactive)

Open a **new Cursor Agent** chat with this repo as the workspace. Paste **everything inside the fence below** as your **entire first message** (then send). Do not split across messages.

---

### Paste this block only (first message)

```
@HEXCURSE/NORTH_STAR.md @HEXCURSE/CURSOR.md @HEXCURSE/AGENTS.md @HEXCURSE/PATHS.json @HEXCURSE/SESSION_START.md

HEXCURSE full kickoff — I finished HEXCURSE/NORTH_STAR.md.

A) Bridge (run in terminal from repository root — required unless I say I already ran it this session)
   1. Read `.cursor/hexcurse-installer.path` — first line must be the absolute path to cursor-governance `setup.js` on this machine.
   2. If that file is missing or empty: ask me once for the absolute path to `setup.js`, then create `.cursor/hexcurse-installer.path` containing only that path (one line).
   3. Run: node "<path>" --parse-prd-via-agent
      (On Windows PowerShell, use the path as a single argument; escape if needed.)
   4. If the command fails: show me the output, suggest fixing `.env` / LM Studio / `OPENAI_BASE_URL`, and stop. Do not pretend tasks exist.

B) After A succeeds (or I explicitly said bridge already ran this session)
   Run the full SESSION START sequence from HEXCURSE/AGENTS.md in order — including STEP 4a–4e (jcodemunch index, repomix --compress, semgrep baseline on last 5 modified files when semgrep is green, Linear sync if LINEAR_API_KEY set, PAMPA skill search), then scope confirm, active rules notice, sequential-thinking, plan, wait for my "Confirmed. Proceed.", then local git branch. Follow **mcp-usage.mdc** for MCP order. Do not skip steps. Do not write code before I confirm.
   Refresh rules when needed: node "<path-to-setup.js>" --sync-rules (requires HEXCURSE_RULES_REMOTE_URL). Multi-agent: node "<path-to-setup.js>" --multi-agent.

C) If **HEXCURSE/NORTH_STAR.md** (or legacy repo-root **NORTH_STAR.md**) still has a line that is **only** the placeholder **`NORTH_STAR_NOT_READY`** (standalone line under Vision), or is clearly empty, stop — tell me to fill the vision and remove/replace that line — do not run the bridge. (Mentioning the marker in prose does not count.)
```

---

## What this runs

| Step | What happens |
|------|----------------|
| **A** | AI-expands **NORTH_STAR** → **`.taskmaster/docs/prd.txt`**, **`task-master parse-prd`**, syncs **`HEXCURSE/DIRECTIVES.md`** **`## 📋 Queued`**. |
| **B** | Normal HexCurse session start so the first directive is planned with MCP discipline. |

**No AI for the bridge?** Run in terminal yourself: `node "<path-to>/setup.js" --parse-prd-via-agent` then paste **HEXCURSE/SESSION_START.md** in a new chat (or use headless with the same kickoff body after editing step A manually).

**Project:** {{PROJECT_NAME}}
