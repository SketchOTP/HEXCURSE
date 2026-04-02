# ONE_PROMPT flow (consumer repos)

Installed projects get **`HEXCURSE/ONE_PROMPT.md`**. It documents **two** ways to kick off HexCurse after **`HEXCURSE/NORTH_STAR.md`** is filled:

1. **[Cursor headless CLI](https://cursor.com/docs/cli/headless)** — `agent -p --model composer-2 --trust --workspace .` with the plain-text prompt **`HEXCURSE/HEADLESS_KICKOFF.txt`** (bash/PowerShell one-liners are in **`HEXCURSE/ONE_PROMPT.md`**). See [CLI parameters](https://cursor.com/docs/cli/reference/parameters) and [Composer 2](https://cursor.com/docs/models/cursor-composer-2).
2. **In-IDE Agent** — paste the fenced block so the agent runs **`setup.js --run-hexcurse`** (path from **`.cursor/hexcurse-installer.path`**) and full SESSION START from **`HEXCURSE/AGENTS.md`**.

**Human steps:** fill **`HEXCURSE/NORTH_STAR.md`** (remove the standalone placeholder line **`NORTH_STAR_NOT_READY`** under Vision when ready) → run headless **or** paste the in-IDE block.

**This HexCurse source tree** has no **`HEXCURSE/`** folder; templates live under **`cursor-governance/templates/`** (`ONE_PROMPT.md`, `HEADLESS_KICKOFF.txt`).

**Legacy:** repos installed before this layout may still have **`NORTH_STAR.md`** at repo root — **`--run-hexcurse`** accepts it but you should move content to **`HEXCURSE/NORTH_STAR.md`**.
