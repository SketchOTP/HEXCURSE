# Multi-Agent Mode — HexCurse

This document governs sessions where multiple AI agents work on this repository in parallel using git worktrees.

## Prerequisites
- `swarm-protocol` MCP server installed and running
- `HEXCURSE_MULTI_AGENT=1` set in `.env`
- Each agent assigned a unique `AGENT_ID` (e.g. `agent-a`, `agent-b`)

## Worktree Setup
Each agent works in an isolated git worktree:
```bash
git worktree add ../worktree-agent-a hexcurse/agent/agent-a/task-001
git worktree add ../worktree-agent-b hexcurse/agent/agent-b/task-002
```

## Orchestrator Role
The human (or a designated primary agent) acts as orchestrator:
1. Assigns tasks from Taskmaster to agent worktrees
2. Reviews PRs from each agent
3. Resolves conflicts between parallel branches
4. Merges completed work in dependency order

## Merge Order
Tasks with dependencies must be merged in dependency order. Check `DIRECTIVES.md` for dependency chains before merging.

## Prohibited in Multi-Agent Mode
- Two agents modifying the same file simultaneously
- Any agent force-pushing to `main`
- Any agent merging its own PR without orchestrator approval

## Handoff Log
All agent handoffs are recorded in `HEXCURSE/docs/AGENT_HANDOFFS.md` (append-only).
