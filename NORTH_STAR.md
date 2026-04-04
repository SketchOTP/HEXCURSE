# NORTH STAR — HexCurse v2

## What we are building

HexCurse is a single-command npm installer that wires a Cursor-based repository
for AI-governed development in under 60 seconds. It installs exactly the MCP
servers a project needs, writes lean governance rules that Cursor actually
enforces, and optionally connects a LightRAG knowledge graph that makes the
AI agent genuinely smarter about the specific codebase over time.

The install experience is: run one command, answer five yes/no questions, open
Cursor. Everything is configured. The agent knows what tools to use, when to
use them, and learns from every session without the developer managing anything
manually.

## Who we are building it for

Solo developers who vibe-code with AI in Cursor and want the agent to actually
get better at their specific project over time — not just be a smart autocomplete
that starts cold every session. They do not want to manage MCP JSON configs,
write governance Markdown, or maintain a session ritual. They want to install
once and have it work.

## What the product is NOT

- Not a SaaS, not a dashboard, not a web UI
- Not a team tool — solo developer first
- Not IDE-agnostic — Cursor only, deeply integrated
- Not a model training or fine-tuning tool
- Not a replacement for Cursor's built-in features — augments them
- Not a complex governance framework that the developer has to learn

## Success in 90 days

A developer installs HexCurse into a new repo in under 60 seconds. They answer
five questions. They open Cursor. The agent immediately has access to live docs,
cross-session memory, their task graph, and code search — all without the
developer touching a config file. After ten sessions in that repo the agent
demonstrably avoids mistakes it made in session one because the memory MCP
retained what was learned. The skill library has grown organically. Token usage
per session is lower than session one because the agent retrieves targeted context
instead of reading everything from scratch. The developer has never once edited
mcp.json, written a SESSION_LOG entry, or followed a 15-step ritual.

## Technology stack

- **Runtime:** Node.js 20+ — CLI only, no web server, no daemon
- **Distribution:** npm (`cursor-governance`) — global install, one command per repo
- **IDE:** Cursor exclusively — all governance runs through Cursor agent mode and MCP
- **MCP servers:** 4 core (always) + up to 5 optional (user picks at install)
- **Memory layer:** MCP memory server (default) or LightRAG (optional, deeper)
- **LLM:** Agnostic — LM Studio, Anthropic, OpenAI, any OpenAI-compatible endpoint
- **Storage:** File-based only for governance artifacts; LightRAG uses local vector store
- **Language:** JavaScript (Node.js) — no TypeScript compilation step required

## Sacred Constraints

- Install must complete in under 60 seconds on a blank repo
- Zero mandatory configuration after install — agent must work immediately
- Must run entirely within Cursor using native agent mode and MCP layer
- No cloud dependency for core functionality — works fully offline with local LLM
- Token efficiency is a first-class constraint — every installed component must
  justify its token cost or it does not ship
- The developer must never be required to manually edit mcp.json, write session
  logs, or follow a prescribed ritual — HexCurse owns all of that
- Generic by default — nothing installed into a consumer repo may contain
  HexCurse-specific content, SketchOTP references, or source-repo artifacts
- One install, self-maintaining — `--sync-rules` and `--doctor` keep the
  install current without reinstalling

## Out of scope for v2

- Non-Cursor IDEs
- Team or multi-user features
- GUI, dashboard, or web interface
- Custom MCP server development
- Model fine-tuning or training
- Mandatory cloud services
- More than 9 total MCP servers (4 core + 5 optional maximum)
- Session ritual documents longer than one screen
- Any governance document the developer is expected to read regularly

## Definition of Done — v2.0.0

- [ ] `npm install -g cursor-governance && cursor-governance` completes in under 60s
- [ ] Five yes/no questions determine exactly which optional servers are installed
- [ ] Agent opens in Cursor with working MCP tools — zero additional config required
- [ ] Memory MCP retains knowledge between sessions without developer intervention
- [ ] `--parse-prd-via-agent` generates a real task graph without any API key
- [ ] `--doctor` catches configuration drift and tells the developer exactly what to fix
- [ ] `--sync-rules` pulls updated rules from published repo
- [ ] LightRAG option available for developers who want deeper codebase memory
- [ ] Zero HexCurse-specific content in any installed consumer artifact
- [ ] All installed `.mdc` rules are under 100 lines each
- [ ] Total token overhead from all installed MCP server tool descriptions
  is under 20,000 tokens for the core 4-server install
