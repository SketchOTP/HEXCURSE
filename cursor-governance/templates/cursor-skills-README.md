# Cursor Agent Skills — HexCurse

Procedural memory lives here as **repeatable playbooks**. **Commit** skill folders so the whole team benefits.

## When to add a skill vs memory-only

| Use **memory MCP** + **AGENTS.md Learned Workspace Facts** | Add a **`.cursor/skills/.../SKILL.md`** |
|-------------------------------------------------------------|----------------------------------------|
| One-line fact, preference, or warning | Multi-step procedure used again and again |
| Fits one taxonomy bucket (**HEXCURSE/docs/MEMORY_TAXONOMY.md** or **docs/MEMORY_TAXONOMY.md**) | Needs headings, ordered steps, or “when to run” |
| Same correction seen 1–2 times | Same **lessonKey** seen **≥3** times (see **skill-promotion-queue.json**) |

## Layout

```
.cursor/skills/
├── README.md
└── <kebab-topic>/
    └── SKILL.md
```

- **Folder name:** `kebab-case`.
- **SKILL.md:** YAML front matter (`name`, `description`) + **When to use**, **Steps**, **Links** (`path::symbol`).

## Promotion

**`.cursor/hooks/state/skill-promotion-queue.json`** — **agents-memory-updater** increments **count** per **lessonKey**; at **count >= 3**, add **SKILL.md** per **HEXCURSE/docs/CONTINUAL_LEARNING.md**.
