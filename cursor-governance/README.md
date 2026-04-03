# cursor-governance

## Quick start — add HexCurse to **any** repo (one command, then Cursor)

1. **Prereqs (once per machine):** Node.js + npm, Git, and usually Python (installer uses it for `uv` / Serena). Cursor must be installed separately.
2. In a terminal, **`cd` to the target project root** (the repo you want governed — empty or existing).
3. Run **one** of:
   - **`npx cursor-governance`** — after the package is on npm, or  
   - **`node <path-to>/cursor-governance/setup.js`** — from a clone of the HexCurse repo (this folder).
4. **Interactive (default):** answer the prompts — you will be asked **new project vs existing codebase**. **Existing codebase** runs **`npx repomix --compress`** (no Cursor MCP inside the CLI), then uses **your chosen model provider** (same credentials as Taskmaster) to draft **`NORTH_STAR.md`** and to fill PRD-derived fields; you skip greenfield questions (project name defaults to the folder name). **Faster:** **`node setup.js --quick --preset=lmstudio`** (or `anthropic` / `openai`) — set **`HEXCURSE_REPO_KIND=existing`** to run the same repomix + draft path non-interactively; optional **`HEXCURSE_HUMAN_FOCUS`** for a one-line goal. Quick mode still requires **`GITHUB_TOKEN`** (or token in **`~/.cursor/mcp.json`**) and a reachable LLM for **`parse-prd`** / the draft step (LM Studio default **`http://100.80.17.40:1234/v1`** — override with **`HEXCURSE_LM_STUDIO_BASE_URL`**, **`LM_STUDIO_BASE_URL`**, or **`OPENAI_BASE_URL`** if yours differs; `/v1` is added if omitted). Override fields with env vars: **`HEXCURSE_PROJECT_NAME`**, **`HEXCURSE_PURPOSE`**, **`HEXCURSE_REPO_SNAPSHOT_MAX_CHARS`** (default **120000** — caps text sent to the installer LLM), **`HEXCURSE_LM_STUDIO_MODEL`** (default **`qwen3.5-2b`**), **`HEXCURSE_LM_STUDIO_MAX_CONTEXT`** (default **8000** when unset for Taskmaster caps), etc. (`node setup.js --help`).
5. The script writes **`HEXCURSE/`** (including **`NORTH_STAR.md`**, **`CURSOR.md`**, **`AGENTS.md`**, **`docs/`** — all governance under one folder), **`.cursor/rules/`**, **`.taskmaster/`**, root **`AGENTS.md`** (pointer into the pack), **`HEXCURSE/ONE_PROMPT.md`**, **`HEXCURSE/HEADLESS_KICKOFF.txt`** (prompt for [Cursor headless CLI](https://cursor.com/docs/cli/headless) with **`agent -p --model composer-2`**), **`.cursor/hexcurse-installer.path`** (gitignored path to **`setup.js`**), aligns **Taskmaster** models to your provider (so the first **`parse-prd`** does not default to missing Anthropic/Perplexity keys), writes **`.env`** for LM Studio when missing, merges **`~/.cursor/mcp.json`**, and seeds a **placeholder `tasks.json`** only if **`parse-prd`** still fails.
6. **Restart Cursor** and open that project folder.

### After install — you only do two things

1. **New project:** fill **`HEXCURSE/NORTH_STAR.md`** (remove the **standalone** placeholder line **`NORTH_STAR_NOT_READY`** when your vision is written). **Existing codebase path:** that file is usually already drafted — review it, then use Cursor MCPs (**memory**, **repomix**, **Serena**, etc.) to refine reality on disk (the installer cannot call Cursor MCPs itself).
2. **Either** run the **[Cursor headless CLI](https://cursor.com/docs/cli/headless)** from repo root (`agent -p --model composer-2 --trust --workspace .` with **`HEXCURSE/HEADLESS_KICKOFF.txt`** — see **`HEXCURSE/ONE_PROMPT.md`** for bash/PowerShell), **or** open **`HEXCURSE/ONE_PROMPT.md`**, copy **only** the **in-IDE fenced** block, paste it as the **entire first message** in a **new Agent** chat. The agent runs **`node …/setup.js --run-hexcurse`** using **`.cursor/hexcurse-installer.path`**, then full session start.

**Manual bridge (no Cursor Agent UI):** **`node <path-to>/cursor-governance/setup.js --run-hexcurse`** (or **`--run-hexcurse-raw`**) from repo root, then paste **`HEXCURSE/SESSION_START.md`** in a new chat (or use headless **`agent`** with **`HEADLESS_KICKOFF.txt`**).

**Daily work** (no NORTH_STAR change): paste **`HEXCURSE/SESSION_START.md`** as message 1 as before.

That’s it for setup: **no second installer**. Optional: copy **`.cursor/rules/process-gates.mdc`** into Cursor **User / Project** rules for stricter compliance.

**Honest limits:** The script cannot launch Cursor, sign you into third parties, or guarantee every MCP is green — it **prepares** config and files. If something is red under **Settings → MCP**, fix it once (token, path, or network); run **`node cursor-governance/setup.js --doctor`** from the project root to verify layout.

---

**Usage:** In your project root, run `npx cursor-governance` (after publishing), or `node /path/to/cursor-governance/setup.js` from this package clone.

**Non-interactive / CI:** Prefer **`node setup.js --quick --preset=lmstudio`** when you can set env vars. Use **`HEXCURSE_REPO_KIND=existing`** for the repomix-backed NORTH_STAR draft. Alternatively pipe answers: one line per prompt, e.g. `Get-Content answers.txt | node setup.js` (Windows) or `node setup.js < answers.txt`. Piped stdin is buffered in full so all prompts receive answers reliably on Windows. **Piped order change:** after provider credentials and optional GitHub token, the next line is **1 = new project** or **2 = existing codebase**; for **2**, then optional focus line (may be empty), then sacred constraints.

- **`node setup.js --help`** — CLI usage
- **`node setup.js --version`** — package version (for support / upgrades)
- **`node setup.js --doctor`** — from a **target repo root**: checks `HEXCURSE/` or legacy layout, `.cursor/rules`, `~/.cursor/mcp.json`, `task-master` on PATH
- **`node setup.js --refresh-rules`** — from a **target repo root**: overwrites `mcp-usage.mdc` and rebuilds `base.mdc` from bundled templates + `AGENTS.md` / `ARCHITECTURE.md` (and existing sacred bullets); mirrors into `HEXCURSE/rules/` when that folder exists
- **`node setup.js --run-hexcurse`** / **`--run-hexcurse-raw`** — **NORTH_STAR.md** → PRD → **`parse-prd`** → DIRECTIVES **Queued** sync (see above)

---

Installs global CLIs (`task-master-ai`, `repomix`, `uv`), merges `~/.cursor/mcp.json` with nine MCP servers (includes **jcodemunch** / `jcodemunch-mcp` via `uvx`), writes governance files into the **current working directory**, runs `task-master init` and `parse-prd`, and optionally creates an initial git commit.

**Requirements:** Node.js, npm, Git, Python (for `pip install uv` / Serena’s `uvx`).

**Prompts:** Model provider (LM Studio / Anthropic / OpenAI / Other) and matching credentials, GitHub token (if not reused from env), **new vs existing codebase**, then either greenfield fields (name, purpose, stack, modules, sacred, out-of-scope, DOD) or **existing path** (optional focus, sacred) plus automatic **repomix** + **NORTH_STAR** draft.

**GitHub PAT (skip re-entry across repos):** If `GITHUB_PERSONAL_ACCESS_TOKEN` or `GITHUB_TOKEN` is set in the environment, or `github.env.GITHUB_PERSONAL_ACCESS_TOKEN` already exists in `~/.cursor/mcp.json`, the installer **reuses** that token and does **not** prompt. Set one of those env vars in your shell profile for the same behavior on every new machine session.

Existing governance files and existing MCP server entries are **never overwritten** (skipped / preserved).

**Install layout:** Governance files are written under **`HEXCURSE/`** (see `HEXCURSE/PATHS.json`); Cursor rules are mirrored under `.cursor/rules/`; root **`AGENTS.md`** is usually a **pointer** into the pack (this **HexCurse** source repo instead keeps the **full** `AGENTS.md` at root — see roadmap row “This repo”). **Architect prompt:** **`HEXCURSE/docs/ARCH_PROMPT.md`** (from **`templates/ARCH_PROMPT.md`**) for planning-only Cursor chats.

**Continual learning:** seeds **`.cursor/hooks/state/continual-learning-index.json`** and **`continual-learning.json`** (gitignored dir), and adds **`HEXCURSE/docs/CONTINUAL_LEARNING.md`**. Installed **mcp-usage.mdc** includes **RULE 9**: run **agents-memory-updater** when asked and **after sessions that change governance** (self-improve loop).

**MCP coordination:** **`HEXCURSE/docs/MCP_COORDINATION.md`** — maps every MCP to **mcp-usage.mdc** rules, session order, and close reporting (same file ships from **`templates/MCP_COORDINATION.md`**).

---

## Fresh repo — nothing from another project is copied in

| Scope | What happens |
|--------|----------------|
| **This repository only** | All generated governance content is under **`HEXCURSE/`** (NORTH_STAR, CURSOR quick-start, AGENTS, DIRECTIVES, SESSION_LOG, docs/, rules templates, ONE_PROMPT), plus **`.cursor/rules/`** mirror, **`.taskmaster/`**, **`.serena/memories/.gitkeep`**, and root **`AGENTS.md`** pointer. Written under **`process.cwd()`**. No reads from other project folders. |
| **Your user account (shared)** | **`~/.cursor/mcp.json`** is **merged** (add missing MCP servers; existing entries are kept). **`GITHUB_PERSONAL_ACCESS_TOKEN`** may be **reused** from env or that file. **Global npm packages** (`task-master-ai`, `repomix`, `uv`) are user-wide. |
| **Not installed** | The installer does **not** copy another repo’s `tasks.json`, PRD body, or `HEXCURSE/` tree from elsewhere — only what it generates here. |

So a **new empty repo** gets a **clean governance scaffold** for **that** project name and PRD; it does not inherit another repo’s task list or docs unless you paste them yourself.

---

## Security & hardening notes

- **`~/.cursor/mcp.json`** may contain API keys and PATs. After each write on macOS/Linux the installer sets file mode **600** (owner read/write only). Windows ACLs are unchanged; keep your user profile protected.
- **Supply chain:** On Linux/macOS, if `pip3 install uv` fails, the installer runs `curl … | sh` from Astral’s install script — same trust model as upstream `uv` docs. Use only on networks you trust.
- **Shell execution:** Subprocesses use `shell: true` for portability; command strings are fixed or tightly controlled (no user-controlled shell metacharacters in `npm`/`git`/`task-master` invocations).
- **`npm test`** runs **syntax checks only** — not the interactive installer (avoids accidental full runs in CI).
- **`npm run test:hexcurse`** — pack path helpers and learning rollup integration.
- **`npm run test:north-star`** — mock OpenAI-compatible server; verifies **existing-repo NORTH_STAR** auto-draft (`generateNorthStarFromExistingRepo`, same LLM path as **`HEXCURSE_REPO_KIND=existing`** / interactive “existing codebase”).

### npm package contents (`npm pack` / `npx`)

The published tarball includes only what the installer needs at runtime:

| Path | Role |
|------|------|
| **`setup.js`** | Full CLI: install, **`--doctor`**, **`--run-hexcurse`**, **`--quick`**, etc. |
| **`bin/cursor-governance.js`** | **`npx cursor-governance`** entry (runs **`setup.js`**) |
| **`templates/`** | All governance markdown and **`.mdc`** templates copied into target repos |
| **`README.md`**, **`CHANGELOG.md`**, **`LICENSE`**, **`INSTALL.md`** | Docs, license, and **machine/network/LM Studio** prerequisites (read **`INSTALL.md`** before debugging **`fetch failed`**) |

**Not** published: **`test/`**, **`test-input.js`**, **`node_modules`** (dependencies install on **`npm install`**). **`prepublishOnly`** runs **`npm run test:all`** before **`npm publish`** so broken builds do not ship. **`engines.node`** is **>=20** to align with **`task-master-ai`**.

**Consumer install** still writes **`HEXCURSE/`**, rules, Taskmaster seeds, **`.cursor/hooks/state/`** (continual learning + **skill-promotion-queue.json**), **`.cursor/hexcurse-installer.path`** (gitignored absolute path to this package’s **`setup.js`**), and merges **`.gitignore`** lines for those paths.

---

## Roadmap (what “best ever” still wants)

These are directions, not promises — pick what matches your goals:

| Area | Idea |
|------|------|
| **Upgrade path** | **`setup.js --refresh-rules`** (shipped) — refresh `mcp-usage.mdc` + `base.mdc` from the package; optional future `cursor-governance upgrade` for semver bumps. |
| **Dry run** | `--dry-run` listing files that would be written/skipped (no MCP merge, no globals). |
| **Pinning** | Optional `mcp.json` / npx args with explicit package versions for air-gapped or high-compliance teams. |
| **Health check** | **`setup.js --doctor`** (shipped) — layout, MCP entries, `task-master` CLI; `PATHS.json` when `HEXCURSE/` exists. |
| **Cursor Rules sync** | **`--refresh-rules`** writes both `.cursor/rules` and `HEXCURSE/rules/` when present. |
| **Telemetry** | Opt-in anonymous “install succeeded” — only if you want usage data; default off. |
| **Templates** | Optional “flavors” (e.g. firmware vs web) swapping `base.mdc` snippets without forking the whole installer. |
| **This repo** | The **HexCurse / cursor-governance** source tree uses **repo root + `docs/`** (no nested **`HEXCURSE/`** here). **`setup.js`** writes a single **`HEXCURSE/`** pack in **other** projects with **all** governed artifacts inside it (consumers); legacy repo-root **`NORTH_STAR.md`** / **`CURSOR.md`** are no longer created on new installs. |

**Reality check:** “Best ever” is mostly **consistency** (agents follow rules), **fast feedback** (doctor, clear errors), and **low ceremony** (token reuse, one folder, `PATHS.json`) — you are already most of the way there; the table above is polish and scale.
