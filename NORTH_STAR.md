# NORTH STAR — HexCurse

## What we are building

HexCurse is an npm installer package that stamps a self-evolving AI governance
layer into any Cursor-based repository. It wires up MCP servers, session rituals,
structured memory, and continual learning so that every AI coding session is more
accurate than the last — with less token waste, less repetition, and less human
correction over time. The installer runs once; the system improves forever.

## Who we are building it for

Solo developers who vibe-code with AI inside Cursor. People who want the AI to
actually remember what it learned last session, follow the project's rules without
being reminded, use the right tools automatically, and get measurably better at
working in their specific repo over time — without the developer having to manage
any of that manually.

## Success in 90 days

A solo developer installs HexCurse into a new repo in under five minutes and
immediately has 17 MCP servers coordinated, 10 governance rules active, and a
structured session ritual running. After 10 sessions in that repo, the system
has accumulated skills, logged decisions, and the agent is visibly more accurate
and token-efficient than session one — because it is drawing on its own memory
and skill library rather than starting cold every time. The installer itself
continues to improve: `--sync-rules` pulls governance improvements automatically,
and `--refresh-rules` keeps the active rules current without a reinstall.
The loop is: install once, govern always, learn forever.

## Technology stack

- **Runtime:** Node.js — the installer is a CLI that runs entirely from the
  terminal inside Cursor's integrated shell
- **IDE:** Cursor — exclusively. All governance, all session rituals, all MCP
  coordination runs through Cursor's agent mode and MCP layer
- **MCP servers:** 17 servers configured at install time, coordinated by
  governance rules, active inside every Cursor session
- **LLM:** Whatever the user has configured — LM Studio locally, Anthropic API,
  OpenAI, or any OpenAI-compatible endpoint. HexCurse is LLM-agnostic
- **Memory:** MCP memory server (local) + `.cursor/skills/` flat files +
  PAMPA semantic indexing
- **Distribution:** npm package (`cursor-governance`) — install globally,
  run once per repo
- **Storage:** File-based only — no database, no backend, no cloud dependency
  for core functionality

## Sacred Constraints

- Must run entirely inside Cursor using Cursor's native agent mode and MCP layer —
  no external orchestration tools, no separate terminals required for governance
- No cloud dependency for core functionality — the governance system must work
  fully with a local LLM (LM Studio) and no internet access except for MCP
  servers the user explicitly enables
- The system must get measurably better over time in each repo it is installed in —
  if it is not learning and accumulating skills, it is broken
- Token efficiency is a first-class constraint — every governance addition must
  justify its token cost or it does not ship
- One install, permanent governance — the installer runs once and the system
  self-maintains via `--sync-rules`, `--refresh-rules`, and `--learning-rollup`
- The developer must never be required to manually manage MCP configuration,
  rule files, or session state — HexCurse owns all of that

## Out of scope for v1.x

- Non-Cursor IDEs (VS Code, Windsurf, JetBrains, etc.)
- SaaS backend or cloud-hosted governance
- Multi-user or team features — this is a solo developer tool
- GUI or dashboard — CLI and Cursor only
- Custom MCP server development — HexCurse coordinates existing servers,
  it does not build new ones
- Fine-tuning or training models — HexCurse improves agent behavior through
  governance and memory, not model modification

## Definition of Done — first release

- [ ] `npm install -g cursor-governance` works on a clean machine
- [ ] `cursor-governance` run in any repo installs all 17 MCP servers,
      10 governance rules, and full session ritual docs in under 5 minutes
- [ ] An agent following the SESSION START ritual invokes the right MCP tools
      automatically without user prompting
- [ ] After 5 sessions, `.cursor/skills/` contains at least one promoted skill
      from the continual learning system
- [ ] `--learning-rollup` produces a meaningful ROLLING_CONTEXT.md that an
      agent in session 10 can use to avoid repeating mistakes from session 1
- [ ] `--sync-rules` pulls updated governance rules from the published repo
      without breaking any Sacred Constraints
- [ ] Token usage per session is measurably lower in session 10 than session 1
      in the same repo (fewer redundant tool calls, better context targeting)
- [ ] `--doctor` catches any governance drift and tells the developer exactly
      what to fix

## Current state

The installer (v1.5.9) works correctly. 17 MCP servers are wired and confirmed
green. 10 governance rules are installed. The session ritual docs are accurate
and fully updated. The continual learning infrastructure (SESSION_LOG,
ROLLING_CONTEXT, skill promotion queue, PAMPA indexing) exists and is installed.

What does not yet exist: proof that the learning loop actually works across
real sessions. The skills directory is empty. The rolling context has no real
entries. The PAMPA index has nothing to search. The system is correctly wired
but has not yet been run long enough in a real repo to demonstrate the
self-improving loop that is the entire point.

The next phase is running real sessions, generating real skills, and measuring
whether token efficiency and accuracy actually improve over time.

---
*Last updated: 2026-04-03*  
*Status: Human-approved — task graph rebuilt from prd.txt (agent-curated; `parse-prd` skipped when LLM endpoint unavailable)*  
*Task graph: `.taskmaster/tasks/tasks.json` and `docs/TASK_GRAPH_SNAPSHOT.md`*
