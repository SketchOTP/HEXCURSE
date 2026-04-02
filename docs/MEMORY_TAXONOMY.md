# Memory taxonomy — HexCurse

Classify every durable fact so **memory MCP**, **Learned Workspace Facts** in **`AGENTS.md`**, and **skill promotion** stay mergeable and retrievable. Do **not** paste raw chat into **`AGENTS.md`**.

## Buckets (fixed)

| Bucket | One-line contract | Use for |
|--------|-------------------|---------|
| **invariant** | Must stay true for correct behavior | Sacred rules, data contracts, “never break X” |
| **gotcha** | Non-obvious failure or footgun | Bugs that recur, env quirks, misleading APIs |
| **command** | Exact invocation humans/agents reuse | CLI one-liners, doctor/rollup commands |
| **architecture** | Where things live and how they connect | Modules, dirs, data flow (tie to **path::symbol**) |
| **preference** | Human/style choice (not objectively right) | Tone, commit style tweaks, tool preferences |
| **workflow** | Ordered ritual for this repo | Session start, PR flow, release steps |

## Memory MCP tag convention

Prefix every stored line so tools and humans can filter:

- `[hexcurse:invariant] …`
- `[hexcurse:gotcha] …`
- `[hexcurse:command] …`
- `[hexcurse:architecture] …`
- `[hexcurse:preference] …`
- `[hexcurse:workflow] …`

Optional suffix for codebase grounding: ` | path::symbol` e.g. `cursor-governance/setup.js::parseSetupArgv`.

## Learned Workspace Facts (`AGENTS.md`)

Under **`## Learned Workspace Facts`**, use **subheadings** matching buckets:

```markdown
### Invariant
- …

### Gotcha
- …

### Command
- …

### Architecture
- …

### Preference
- …

### Workflow
- …
```

**Merge rule:** Append or refine bullets **inside the matching subsection** only. Dedupe by normalized text (same meaning → one bullet).

## agents-memory-updater flow

1. **Classify** each candidate fact into exactly one bucket.
2. **Dedupe** against existing memory entries and **`AGENTS.md`** subsection.
3. **Merge** — update memory MCP and **`AGENTS.md`** subsections; never dump unlabeled paragraphs.
4. **Ground** architecture/gotcha/invariant: confirm **`path::symbol`** with **Serena** `find_symbol` or verify path exists before persisting.

## Related

- [`docs/CONTINUAL_LEARNING.md`](CONTINUAL_LEARNING.md)
- [`docs/MCP_COORDINATION.md`](MCP_COORDINATION.md)
