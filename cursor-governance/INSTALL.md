# Installing HexCurse (`cursor-governance`) — requirements & gotchas

Everything below is **outside** the npm tarball (your machine, network, LM Studio). The package ships **`setup.js`**, **`bin/`**, and **`templates/`** only.

## Runtime prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | **≥ 20** recommended. **`task-master-ai`** and **`repomix`** declare `engines: >=20`; Node 18 may install with warnings and odd failures. |
| **Git** | Used for optional auto-commit after install. |
| **Python / `uv`** | Optional; installer tries to install **`uv`** for Serena. On Debian/Ubuntu, **`curl`** and **`pipx install uv`** avoid PEP 668 issues. |
| **Global CLIs** | Installer runs **`npm install -g task-master-ai repomix`** (may prompt for `sudo`). |

## OpenAI-compatible API (LM Studio, etc.)

After install, the **target repo** should have a **`.env`** at the repo root with:

```env
OPENAI_API_KEY=lm-studio
OPENAI_BASE_URL=http://<host>:1234/v1
```

- **`<host>`** must be reachable **from the machine that runs `task-master` and `--run-hexcurse`**.  
  - Same PC as LM Studio → **`127.0.0.1`**.  
  - Another machine on LAN → **that PC’s LAN IPv4** (e.g. `192.168.x.x`), **not** `127.0.0.1` on the client.  
  - Tailscale → use the **Tailscale IP** only if **every** machine that calls the API runs Tailscale and can ping that IP.
- **Stale shell `OPENAI_*`:** The bridge forces **`OPENAI_BASE_URL`** / **`OPENAI_API_KEY`** from **`.env`** for **`--run-hexcurse`** (since **1.4.3**). Prefer a correct **`.env`** over exported vars.
- **`--run-hexcurse` AI expand:** Long requests use **`AbortSignal.timeout`** (default **180s**, override **`HEXCURSE_LLM_FETCH_MS`**). **`HEXCURSE_DEBUG_BRIDGE=1`** logs the POST URL.
- **Existing-repo NORTH_STAR draft:** Huge repomix output can exceed a **4k-context** model. Raise LM Studio context, or cap snapshot: **`HEXCURSE_REPO_SNAPSHOT_MAX_CHARS`** (e.g. `15000`) before install.

## Quick verify (target repo)

```bash
curl -sS -m 10 "http://<host>:1234/v1/models"
# or
node -e "fetch('http://<host>:1234/v1/models').then(r=>r.text()).then(console.log)"
```

## What the installer writes (summary)

**`HEXCURSE/`** pack, **`.cursor/rules/`**, **Taskmaster** under **`.taskmaster/`**, **`.cursor/hooks/state/`** (continual learning + skill promotion queue), **`.cursor/hexcurse-installer.path`** (gitignored path to this package’s **`setup.js`**), optional **`.env`**, **`~/.cursor/mcp.json`** merge, **`.gitignore`** lines.

## Package contents

See **README.md** → *npm package contents*. Tests and dev-only files are **not** in the published tarball; **`prepublishOnly`** runs **`npm run test:all`** before **`npm publish`**.
