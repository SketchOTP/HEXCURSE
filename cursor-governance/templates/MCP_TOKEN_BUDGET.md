# MCP Token Budget — HexCurse

HexCurse now installs **17 servers**. Each active MCP server adds approximately 500–1,000 tokens of tool description overhead to every agent request, before any actual work begins.

## HexCurse Default Server Load

| Server | Always needed | When to disable |
|--------|--------------|-----------------|
| taskmaster-ai | ✅ Yes | Never |
| memory | ✅ Yes | Never |
| sequential-thinking | ✅ Yes | Never |
| github | ✅ Yes | Never |
| context7 | ✅ Yes | Never |
| serena | ✅ Yes | Never |
| repomix | ✅ Yes | Never |
| gitmcp | ✅ Yes | Never |
| jcodemunch | ✅ Yes | Never |
| gitmcp-adafruit-mpu6050 | Project-specific | Non-hardware sessions |
| supabase | When using Supabase backend | Frontend-only / offline sessions |
| playwright | When doing UI work | Backend-only sessions |
| semgrep | When writing code | Read-only sessions (remote HTTP — lower overhead than stdio) |
| sentry | When debugging errors | Greenfield sessions |
| firecrawl | When researching | Air-gapped / offline sessions |
| linear | When using Linear | Teams not on Linear |
| pampa | When searching skills | First-install sessions |

## How to disable a server for a session

In `~/.cursor/mcp.json`, set `"disabled": true` on any server entry:

```json
"playwright": {
  "command": "npx",
  "args": ["-y", "@playwright/mcp"],
  "disabled": true
}
```

Re-enable by removing the key or setting `"disabled": false`.

## Rule of thumb
Five or fewer active servers is optimal for most sessions. Activate project-specific servers (Playwright, Sentry, Linear) only for sessions where you will actually use them.
