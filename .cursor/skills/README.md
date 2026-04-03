# Cursor Agent Skills — HexCurse

Procedural memory lives here as **repeatable playbooks** (Hermes-style “skills,” Cursor-native). **Commit** skill folders so the whole team benefits.

## When to add a skill vs memory-only

| Use **memory MCP** + **`AGENTS.md` Learned Workspace Facts** | Add a **`.cursor/skills/.../SKILL.md`** |
|-------------------------------------------------------------|----------------------------------------|
| One-line fact, preference, or warning | Multi-step procedure used again and again |
| Fits one taxonomy bucket ([`docs/MEMORY_TAXONOMY.md`](../../docs/MEMORY_TAXONOMY.md)) | Needs headings, ordered steps, or “when to run” |
| Same correction seen 1–2 times | Same **lessonKey** seen **≥3** times (see **skill-promotion-queue.json**) |

## Layout

```
.cursor/skills/
├── README.md                 # this file
├── supabase-postgres-best-practices/   # from `npx skills add supabase/agent-skills --agent cursor …`
└── <kebab-topic>/
    └── SKILL.md              # required entry point for Cursor skills
```

- **Folder name:** `kebab-case`, short (e.g. `refresh-governance-rules`, `i2c-bringup-checklist`).
- **SKILL.md:** Standard Cursor skill shape — YAML front matter (`name`, `description`) + Markdown body with **When to use**, **Steps**, **Links** (`path::symbol` to code).

## Promotion from continual learning

**`.cursor/hooks/state/skill-promotion-queue.json`** (gitignored) holds:

```json
{
  "version": 1,
  "candidates": {
    "normalized-lesson-key": {
      "count": 3,
      "lastUpdatedUtc": "2026-03-30T12:00:00.000Z",
      "proposedTitle": "Run cursor-governance doctor",
      "paths": ["cursor-governance/setup.js"]
    }
  }
}
```

**agents-memory-updater** (or the implementation agent per **`docs/CONTINUAL_LEARNING.md`**) increments **`count`** when the same normalized lesson appears across transcripts. When **`count >= 3`**, create **`SKILL.md`** under a new **`kebab`** folder (or merge into an existing skill if the topic matches), then reset or archive that candidate.

## Editing standards

- Keep skills **short**; link to **`docs/`** and code with **`path::symbol`**.
- Do not duplicate **`mcp-usage.mdc`** — skills are **how we do X in this repo**, not global MCP law.
