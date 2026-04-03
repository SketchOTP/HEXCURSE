# MCP Server Status — 2026-04-03

Agent session check after migrating **semgrep** to official Streamable HTTP (`https://mcp.semgrep.ai/mcp`). Restart Cursor to pick up `~/.cursor/mcp.json` changes.

| Server | Status | Notes |
|--------|--------|-------|
| taskmaster-ai | green | |
| context7 | green | |
| repomix | green | |
| serena | green | |
| gitmcp | green | |
| gitmcp-adafruit-mpu6050 | green | |
| sequential-thinking | green | |
| memory | green | |
| github | green | |
| jcodemunch | green | |
| playwright | green | |
| semgrep | green | Updated to mcp.semgrep.ai Streamable HTTP |
| sentry | green | |
| firecrawl | green | |
| linear | green | |
| pampa | green | |
| supabase | green | |

If any server shows yellow/red after restart, treat as **ENVIRONMENT ISSUE** (missing API key or local tool) unless `mcp.json` is clearly wrong (**BUG**).
