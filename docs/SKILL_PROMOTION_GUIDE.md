# Skill Promotion Guide — HexCurse

## What qualifies for promotion to `.cursor/skills/`

A pattern is ready for promotion when **all** of the following are true:

1. It was used successfully in at least **2** sessions.
2. It is **non-trivial** — not something any developer would know without context.
3. It is **repo-specific** or **domain-specific** — not generic programming knowledge.
4. It saved **meaningful time** or **prevented a mistake**.

## When to promote (SESSION CLOSE trigger)

During **SESSION CLOSE STEP 14** in **`AGENTS.md`** (before PAMPA re-index), ask:

> Did I discover or apply a pattern this session that meets the criteria above?

If **yes** → add or update **`SKILL.md`** under **`.cursor/skills/{skill-name}/`** before closing (see **Promotion format**). Complete **STEP 9** (DIRECTIVES) and other close steps in order; skill files and **STEP 14** are the promotion + index hook.

## Promotion format

Create a directory under **`.cursor/skills/{skill-name}/`**
containing **`SKILL.md`** (preferred; some flows use `skill.md`) with this structure:

- `# Skill: {Name}`
- `## Context` — when to apply this skill
- `## Pattern` — the reusable approach
- `## Example` — concrete code or commands
- `## Anti-patterns` — what not to do
- `## Promoted from` — session and task reference

## PAMPA re-index cadence

After promoting any skill, PAMPA should cover **`.cursor/skills/`**:

- The **pampa** MCP server often re-indexes when it starts with **`cwd`** set to **`workspaceFolder`**.
- To force re-index: restart the **pampa** MCP server in Cursor settings.
- **Doctor** warns if **`.cursor/skills/`** has many files but PAMPA is misconfigured.

## Skill lifecycle

**promoted** → **active** (PAMPA indexed) → **reviewed** (after ~5 uses) → **archived** (if no longer relevant)

Archive by moving to **`.cursor/skills/_archived/{skill-name}/`**.
