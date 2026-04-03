# DIRECTIVE: HexCurse v1.5.0 Consumer Rollout Validation

**Directive ID:** D-HEXCURSE-CONSUMER-ROLLOUT-002  
**Priority:** Critical  
**Depends on:** D-HEXCURSE-EXPANSION-001 fully merged and tagged as v1.5.0  
**Scope:** Fresh consumer repo install, 15-server MCP validation, `--sync-rules` live test, dual-worktree `--multi-agent` stress test  
**Definition of Done:** All 6 validation phases pass with zero `bad` doctor entries, all 15 MCP servers show green in Cursor, `--multi-agent` completes a real parallel task split with no file conflicts, and a signed-off `ROLLOUT_REPORT.md` is committed to `N:\HexCurse\docs\`.

---

## PRIME DIRECTIVE

You are stress-testing the v1.5.0 HexCurse installer against a real consumer repository — not the source repo. Every test in this directive must be run against the **consumer target**, never against `N:\HexCurse` itself. You will create, instrument, validate, and tear down test environments. You will not modify `cursor-governance/setup.js` except to fix genuine bugs discovered during testing — and every such fix must be accompanied by a regression test before being committed.

Read this entire directive before running a single command.

---

## ENVIRONMENT SETUP (do once, before any phase)

### E.1 — Confirm v1.5.0 source is clean

From `N:\HexCurse`:

```bash
git status                          # must be clean
git log --oneline -5                # confirm final commit is present
node cursor-governance/setup.js --version   # must print 1.5.0
HEXCURSE_DOCTOR_CI=1 node cursor-governance/setup.js --doctor   # must be zero bad entries
cd cursor-governance && npm run test:all    # must pass
cd ..
```

Do not proceed if any of these fail.

### E.2 — Create the consumer test directory

```bash
# Windows
mkdir N:\HexCurse-Consumer-Test
cd N:\HexCurse-Consumer-Test
git init
echo "# Consumer Test Repo" > README.md
git add . && git commit -m "init: blank consumer repo"
```

This directory is your consumer target for all phases below. Call it `$CONSUMER` in your mental model. Every install command runs from here unless stated otherwise.

### E.3 — Set required environment variables

Create `N:\HexCurse-Consumer-Test\.env.test` (not committed):

```
GITHUB_PERSONAL_ACCESS_TOKEN=<your real token>
SEMGREP_APP_TOKEN=<your token or leave blank for community rules>
SENTRY_ACCESS_TOKEN=<Sentry User Auth Token from sentry.io/settings/account/api/auth-tokens — or leave blank and run `npx @sentry/mcp-server auth login` once>
FIRECRAWL_API_KEY=<your token or leave blank>
LINEAR_API_KEY=<your token or leave blank>
HEXCURSE_RULES_REMOTE_URL=https://raw.githubusercontent.com/YOUR_ORG/hexcurse/main/cursor-governance/templates/
HEXCURSE_PROJECT_NAME=ConsumerTest
HEXCURSE_PURPOSE=Validate HexCurse v1.5.0 installer across all new features
HEXCURSE_STACK=Node.js, TypeScript
HEXCURSE_MODULES=installer, mcp, rules, ci
HEXCURSE_SACRED=No production data in test fixtures
HEXCURSE_OUT_OF_SCOPE=UI, deployment
HEXCURSE_DOD=All doctor checks pass, all MCP servers green, sync-rules resolves
```

Load these into your shell before each phase:

```bash
# Windows PowerShell
Get-Content N:\HexCurse-Consumer-Test\.env.test | ForEach-Object {
  if ($_ -match '^([^#][^=]+)=(.*)$') {
    [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
  }
}
```

---

## PHASE 1 — Fresh Install Validation

**Goal:** Confirm the v1.5.0 installer runs cleanly on a blank repo, produces all expected artifacts, and passes doctor with zero bad entries.

### 1.1 — Run quick install

From `N:\HexCurse-Consumer-Test`:

```bash
node N:\HexCurse\cursor-governance\setup.js --quick --preset=other
```

Pass the following via env (already set in E.3):
- `HEXCURSE_PROJECT_NAME`, `HEXCURSE_PURPOSE`, `HEXCURSE_STACK`, `HEXCURSE_MODULES`, `HEXCURSE_SACRED`, `HEXCURSE_OUT_OF_SCOPE`, `HEXCURSE_DOD`
- `GITHUB_PERSONAL_ACCESS_TOKEN`

### 1.2 — Artifact checklist

Verify every file below exists. Record PRESENT / ABSENT for each in your running `ROLLOUT_REPORT.md`:

**Core pack:**
- [ ] `HEXCURSE/AGENTS.md`
- [ ] `HEXCURSE/DIRECTIVES.md`
- [ ] `HEXCURSE/NORTH_STAR.md`
- [ ] `HEXCURSE/SESSION_LOG.md`
- [ ] `HEXCURSE/SESSION_START.md`
- [ ] `HEXCURSE/CURSOR.md`
- [ ] `HEXCURSE/ONE_PROMPT.md`
- [ ] `HEXCURSE/HEADLESS_KICKOFF.txt`
- [ ] `HEXCURSE/PATHS.json`
- [ ] `HEXCURSE/README.md`

**New v1.5.0 docs:**
- [ ] `HEXCURSE/docs/MCP_TOKEN_BUDGET.md`
- [ ] `HEXCURSE/docs/MULTI_AGENT.md`
- [ ] `HEXCURSE/docs/ADR_LOG.md`
- [ ] `HEXCURSE/docs/AGENT_HANDOFFS.md`

**Legacy docs:**
- [ ] `HEXCURSE/docs/ARCHITECTURE.md`
- [ ] `HEXCURSE/docs/ARCH_PROMPT.md`
- [ ] `HEXCURSE/docs/CONTINUAL_LEARNING.md`
- [ ] `HEXCURSE/docs/MCP_COORDINATION.md`
- [ ] `HEXCURSE/docs/MEMORY_TAXONOMY.md`
- [ ] `HEXCURSE/docs/ROLLING_CONTEXT.md`
- [ ] `HEXCURSE/docs/GOVERNANCE_PARITY.md`

**Rules — original 4:**
- [ ] `.cursor/rules/base.mdc`
- [ ] `.cursor/rules/mcp-usage.mdc`
- [ ] `.cursor/rules/process-gates.mdc`
- [ ] `.cursor/rules/governance.mdc`

**Rules — new 6:**
- [ ] `.cursor/rules/security.mdc`
- [ ] `.cursor/rules/adr.mdc`
- [ ] `.cursor/rules/memory-management.mdc`
- [ ] `.cursor/rules/debugging.mdc`
- [ ] `.cursor/rules/multi-agent.mdc`
- [ ] `.cursor/rules/linear-sync.mdc`

**Canonical copies:**
- [ ] `HEXCURSE/rules/security.mdc`
- [ ] `HEXCURSE/rules/adr.mdc`
- [ ] `HEXCURSE/rules/memory-management.mdc`
- [ ] `HEXCURSE/rules/debugging.mdc`
- [ ] `HEXCURSE/rules/multi-agent.mdc`
- [ ] `HEXCURSE/rules/linear-sync.mdc`

**Infrastructure:**
- [ ] `.cursor/skills/README.md`
- [ ] `.cursor/skills/_TEMPLATE_SKILL.md`
- [ ] `.cursor/hooks/state/continual-learning.json`
- [ ] `.cursor/hooks/state/continual-learning-index.json`
- [ ] `.cursor/hooks/state/skill-promotion-queue.json`
- [ ] `.cursor/hexcurse-installer.path`
- [ ] `.taskmaster/docs/prd.txt`
- [ ] `AGENTS.md` (root pointer)

### 1.3 — PATHS.json schema validation

```bash
node -e "
const p = require('./HEXCURSE/PATHS.json');
const required = [
  'agents','directives','architecture','sessionLog','northStar',
  'securityMdcCanonical','securityMdcActive',
  'adrMdcCanonical','adrMdcActive',
  'memoryMgmtMdcCanonical','memoryMgmtMdcActive',
  'debuggingMdcCanonical','debuggingMdcActive',
  'multiAgentMdcCanonical','multiAgentMdcActive',
  'linearSyncMdcCanonical','linearSyncMdcActive',
  'mcpTokenBudget','multiAgentDoc','adrLog','agentHandoffs'
];
const missing = required.filter(k => !p.paths[k]);
if (missing.length) { console.error('MISSING PATHS:', missing); process.exit(1); }
console.log('PATHS.json schema OK —', Object.keys(p.paths).length, 'keys');
"
```

Must print `PATHS.json schema OK` with at least 45 keys. Record the count.

### 1.4 — Doctor clean pass

```bash
HEXCURSE_DOCTOR_CI=1 node N:\HexCurse\cursor-governance\setup.js --doctor
```

**Required outcome:** Zero `bad` entries. Record the exact count of `warn` and `ok` entries in `ROLLOUT_REPORT.md`. Any `bad` entry is a blocking bug — fix in source before continuing.

### 1.5 — Idempotency test

Run the installer a **second time** on the same directory:

```bash
node N:\HexCurse\cursor-governance\setup.js --quick --preset=other
```

Verify:
- All `writeFileMaybeSkip` targets log `⚠ SKIP (exists)` — no files overwritten.
- `ONE_PROMPT.md` and `HEADLESS_KICKOFF.txt` are overwritten (expected — they always refresh).
- Doctor still passes with zero bad entries after second run.
- MCP server entries in `~/.cursor/mcp.json` were not duplicated (`kept` counter incremented for all 15 existing entries).

**Commit checkpoint:**
```bash
git add . && git commit -m "test(phase1): fresh install + idempotency validated"
```

---

## PHASE 2 — MCP Server Verification (All 15)

**Goal:** Confirm all 15 MCP server entries are correctly written to `~/.cursor/mcp.json` with valid structure, and that the 6 new servers launch without errors.

### 2.1 — `~/.cursor/mcp.json` structural validation

```bash
node -e "
const fs = require('fs');
const os = require('os');
const path = require('path');
const mcp = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.cursor', 'mcp.json'), 'utf8'));
const servers = Object.keys(mcp.mcpServers);
const required = [
  'taskmaster-ai','context7','repomix','jcodemunch','serena',
  'gitmcp','sequential-thinking','memory','github',
  'playwright','semgrep','sentry','firecrawl','linear','pampa'
];
const missing = required.filter(s => !servers.includes(s));
const extra = servers.filter(s => !required.includes(s));
if (missing.length) console.error('MISSING servers:', missing);
if (extra.length)   console.log('Extra servers (OK):', extra);
if (!missing.length) console.log('All 15 required servers present');
required.forEach(s => {
  const e = mcp.mcpServers[s];
  if (!e) return;
  const hasCmd = e.command || e.url;
  if (!hasCmd) console.error(s + ': missing command or url');
});
"
```

Record full server list in `ROLLOUT_REPORT.md`.

### 2.2 — Launch test for each new server

For each of the six new servers, run the launch command manually and verify it starts without error:

```bash
# Playwright — expects no output, just exits cleanly with --help
npx -y @playwright/mcp --help

# Semgrep
uvx semgrep-mcp --help

# Sentry (will print help or require token — both are acceptable)
npx -y @sentry/mcp-server@latest --help

# Firecrawl
npx -y firecrawl-mcp --help

# Linear
npx -y @linear/mcp-server --help

# PAMPA
npx -y @pampa/mcp-server --help
```

For each: record EXIT CODE (0 = pass, anything else = investigate). A missing package (npm 404) is a **blocking bug** — the package name in `buildMcpServers` must be corrected in source.

### 2.3 — Token budget warning presence

Run the installer in a fresh subdirectory and capture stdout:

```bash
node N:\HexCurse\cursor-governance\setup.js --quick --preset=other 2>&1 | grep -i "token budget"
```

Must return at least one line containing "Token Budget" or "token budget". If absent, the `printSummary()` warning from Section 1.7 of the directive was not implemented — fix before continuing.

### 2.4 — Optional: Cursor MCP green-light check

Open the consumer test directory in Cursor. Navigate to Settings → Tools & Integrations → MCP. Screenshot or note which of the 15 servers show green status. Record any red servers in `ROLLOUT_REPORT.md` with the error message shown.

**Note:** Servers requiring API keys (sentry, firecrawl, linear, semgrep) may show yellow/red if keys are not set — this is expected behavior, not a bug. Record as `warn` not `bad`.

**Commit checkpoint:**
```bash
git add . && git commit -m "test(phase2): MCP server structural validation complete"
```

---

## PHASE 3 — New Rules Validation

**Goal:** Confirm all 10 `.mdc` files are syntactically correct, have valid frontmatter, and contain the verbatim content from the directive.

### 3.1 — Frontmatter validation

```bash
node -e "
const fs = require('fs');
const path = require('path');
const rulesDir = '.cursor/rules';
const files = fs.readdirSync(rulesDir).filter(f => f.endsWith('.mdc'));
let allOk = true;
files.forEach(f => {
  const content = fs.readFileSync(path.join(rulesDir, f), 'utf8');
  if (!content.startsWith('---')) {
    console.error('MISSING frontmatter:', f); allOk = false; return;
  }
  const end = content.indexOf('---', 3);
  if (end === -1) {
    console.error('UNCLOSED frontmatter:', f); allOk = false; return;
  }
  const fm = content.slice(3, end);
  if (!fm.includes('description:')) {
    console.error('MISSING description:', f); allOk = false;
  }
  console.log('OK:', f);
});
if (allOk) console.log('All', files.length, '.mdc files have valid frontmatter');
"
```

Must show `OK` for all 10 files.

### 3.2 — Content spot-checks

For each new rule, verify these specific strings are present in `.cursor/rules/`:

| File | Must contain |
|------|-------------|
| `security.mdc` | `semgrep` MCP tool `security_check` |
| `adr.mdc` | `ADR-{SEQUENCE}` |
| `memory-management.mdc` | `COMPACTION CHECKPOINT` |
| `debugging.mdc` | `Hypothesis-First` |
| `multi-agent.mdc` | `swarm-protocol` |
| `linear-sync.mdc` | `get_my_issues` |

```bash
node -e "
const fs = require('fs');
const checks = {
  'security.mdc':          'security_check',
  'adr.mdc':               'ADR-{SEQUENCE}',
  'memory-management.mdc': 'COMPACTION CHECKPOINT',
  'debugging.mdc':         'Hypothesis-First',
  'multi-agent.mdc':       'swarm-protocol',
  'linear-sync.mdc':       'get_my_issues',
};
let allOk = true;
Object.entries(checks).forEach(([file, needle]) => {
  const content = fs.readFileSync('.cursor/rules/' + file, 'utf8');
  if (!content.includes(needle)) {
    console.error('MISSING in', file + ':', needle); allOk = false;
  } else {
    console.log('OK:', file, '—', needle);
  }
});
if (allOk) console.log('All rule content spot-checks passed');
"
```

### 3.3 — Canonical vs active parity

Verify that `HEXCURSE/rules/*.mdc` and `.cursor/rules/*.mdc` are byte-for-byte identical for each of the 10 rules:

```bash
node -e "
const fs = require('fs');
const rules = [
  'base.mdc','mcp-usage.mdc','process-gates.mdc','governance.mdc',
  'security.mdc','adr.mdc','memory-management.mdc',
  'debugging.mdc','multi-agent.mdc','linear-sync.mdc'
];
let allOk = true;
rules.forEach(r => {
  const canonical = fs.readFileSync('HEXCURSE/rules/' + r, 'utf8');
  const active    = fs.readFileSync('.cursor/rules/' + r, 'utf8');
  if (canonical !== active) {
    console.error('PARITY MISMATCH:', r); allOk = false;
  } else {
    console.log('OK:', r);
  }
});
if (allOk) console.log('All 10 rules match between HEXCURSE/rules and .cursor/rules');
"
```

**Commit checkpoint:**
```bash
git add . && git commit -m "test(phase3): all 10 .mdc rules validated"
```

---

## PHASE 4 — `--sync-rules` Live Test

**Goal:** Confirm `--sync-rules` fetches rules from the real GitHub raw URL, detects up-to-date files correctly, and updates stale files correctly.

### 4.1 — Prerequisite

`HEXCURSE_RULES_REMOTE_URL` must point to a live GitHub raw base URL where the 10 `.mdc` template files are accessible. If the repo is not yet public, skip to 4.5 (offline dry-run only) and mark this phase as `PARTIAL`.

### 4.2 — Dry-run mode

```bash
HEXCURSE_RULES_REMOTE_URL=<your url> \
node N:\HexCurse\cursor-governance\setup.js --sync-rules --dry-run
```

Expected output: Each of the 10 rules shows either `✓ UP TO DATE` or `~ WOULD UPDATE`. No errors. Record the output verbatim in `ROLLOUT_REPORT.md`.

### 4.3 — Live sync (up-to-date files)

```bash
HEXCURSE_RULES_REMOTE_URL=<your url> \
node N:\HexCurse\cursor-governance\setup.js --sync-rules
```

Because the rules were just installed, all 10 should show `✓ UP TO DATE`. If any show `↑ UPDATED`, record which ones and why (hash mismatch is expected if the remote has diverged — this is correct behavior, not a bug).

### 4.4 — Stale file detection test

Corrupt one rule artificially, then re-run sync:

```bash
# Corrupt security.mdc
echo "# CORRUPTED" > .cursor/rules/security.mdc

# Run sync
HEXCURSE_RULES_REMOTE_URL=<your url> \
node N:\HexCurse\cursor-governance\setup.js --sync-rules
```

Expected: `security.mdc` shows `↑ UPDATED`. Verify the file content was restored to the remote version.

### 4.5 — Offline / no-URL graceful failure

```bash
node N:\HexCurse\cursor-governance\setup.js --sync-rules
```

Without `HEXCURSE_RULES_REMOTE_URL` set, the command must:
- Print a clear error message explaining the variable is required.
- Exit with code 1.
- Not modify any files.
- Not crash with an unhandled exception.

### 4.6 — `continual-learning.json` timestamp update

After a successful sync, verify `lastSyncAt` was written:

```bash
node -e "
const s = require('./.cursor/hooks/state/continual-learning.json');
if (!s.lastSyncAt) { console.error('lastSyncAt not written'); process.exit(1); }
console.log('lastSyncAt:', s.lastSyncAt);
"
```

**Commit checkpoint:**
```bash
git add . && git commit -m "test(phase4): --sync-rules live test complete"
```

---

## PHASE 5 — `--multi-agent` Mode Stress Test

**Goal:** Run a real two-agent parallel task split using git worktrees, swarm-protocol coordination, and HexCurse governance rules. Verify file conflict prevention and structured handoffs work correctly.

### 5.1 — Enable multi-agent mode

From `N:\HexCurse-Consumer-Test`:

```bash
node N:\HexCurse\cursor-governance\setup.js --multi-agent
```

Verify:
- `HEXCURSE_MULTI_AGENT=1` appended to `.env`
- `HEXCURSE/docs/MULTI_AGENT.md` exists
- `HEXCURSE/docs/AGENT_HANDOFFS.md` exists (stub)
- `.cursor/rules/multi-agent.mdc` exists
- `swarm-protocol` added to `~/.cursor/mcp.json`
- Doctor still passes with zero bad entries

### 5.2 — Create two worktrees

```bash
git worktree add ..\worktree-agent-a hexcurse/agent/agent-a/task-001
git worktree add ..\worktree-agent-b hexcurse/agent/agent-b/task-002
```

Verify both worktrees are on separate branches:

```bash
git worktree list
```

Must show three entries: main, agent-a branch, agent-b branch.

### 5.3 — Define two non-conflicting tasks

Create a simple test task split. These tasks must not touch the same files:

**Task 001 (Agent A):**  
Create `src/utils/formatter.ts` — a TypeScript string formatting utility with three exported functions: `capitalize()`, `truncate()`, and `slugify()`. Each function must have a JSDoc comment. No other files modified.

**Task 002 (Agent B):**  
Create `src/utils/validator.ts` — a TypeScript input validation utility with three exported functions: `isEmail()`, `isUrl()`, and `isEmpty()`. Each function must have a JSDoc comment. No other files modified.

Write these as Taskmaster tasks:

```bash
# From main consumer dir
task-master add-task --title "Create formatter utility" \
  --description "Create src/utils/formatter.ts with capitalize, truncate, slugify" \
  --priority high

task-master add-task --title "Create validator utility" \
  --description "Create src/utils/validator.ts with isEmail, isUrl, isEmpty" \
  --priority high
```

Record the task IDs assigned (e.g. Task 1 and Task 2).

### 5.4 — Simulate Agent A

From `N:\worktree-agent-a`:

```bash
cd N:\worktree-agent-a
mkdir -p src\utils
```

Create `src/utils/formatter.ts` with this content:

```typescript
/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncates a string to maxLength, appending ellipsis if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Converts a string to a URL-safe slug.
 */
export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}
```

Write the handoff entry to the **main repo's** `HEXCURSE/docs/AGENT_HANDOFFS.md` (cross-worktree write):

```bash
node -e "
const fs = require('fs');
const entry = \`
### Handoff — Task 001 — Agent agent-a — \${new Date().toISOString()}
**Completed:** Created src/utils/formatter.ts with capitalize, truncate, slugify
**Files modified:** src/utils/formatter.ts
**Tests added:** none
**Blocked on:** nothing
**Next agent should:** implement validator.ts independently
---
\`;
fs.appendFileSync('N:\\HexCurse-Consumer-Test\\HEXCURSE\\docs\\AGENT_HANDOFFS.md', entry);
console.log('Handoff written');
"
```

Commit from Agent A's worktree:

```bash
git add src/utils/formatter.ts
git commit -m "feat(task-001): implement formatter utility — agent-a"
```

### 5.5 — Simulate Agent B

From `N:\worktree-agent-b`:

```bash
cd N:\worktree-agent-b
mkdir -p src\utils
```

Create `src/utils/validator.ts`:

```typescript
/**
 * Returns true if the string is a valid email address.
 */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Returns true if the string is a valid URL.
 */
export function isUrl(value: string): boolean {
  try { new URL(value); return true; } catch { return false; }
}

/**
 * Returns true if the value is null, undefined, or an empty string.
 */
export function isEmpty(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}
```

Write handoff:

```bash
node -e "
const fs = require('fs');
const entry = \`
### Handoff — Task 002 — Agent agent-b — \${new Date().toISOString()}
**Completed:** Created src/utils/validator.ts with isEmail, isUrl, isEmpty
**Files modified:** src/utils/validator.ts
**Tests added:** none
**Blocked on:** nothing
**Next agent should:** create index.ts barrel exporting both utilities
---
\`;
fs.appendFileSync('N:\\HexCurse-Consumer-Test\\HEXCURSE\\docs\\AGENT_HANDOFFS.md', entry);
console.log('Handoff written');
"
```

Commit from Agent B's worktree:

```bash
git add src/utils/validator.ts
git commit -m "feat(task-002): implement validator utility — agent-b"
```

### 5.6 — Conflict detection test

Now attempt to simulate a conflict. From Agent A's worktree, try to write to the same file Agent B owns:

```bash
cd N:\worktree-agent-a
echo "// conflict test" >> src/utils/validator.ts
```

Verify that if `swarm-protocol` MCP is active, calling `swarm_check_conflicts` for `src/utils/validator.ts` returns a conflict signal. If the MCP is not running in this test session, simulate the check manually by verifying that both worktrees have diverged on `src/utils/validator.ts` and git would produce a merge conflict — then document this in `ROLLOUT_REPORT.md` as a governance gap to resolve.

Revert the conflict:

```bash
git checkout src/utils/validator.ts
```

### 5.7 — Orchestrator merge

From the main consumer directory `N:\HexCurse-Consumer-Test`, merge both worktree branches in dependency order:

```bash
cd N:\HexCurse-Consumer-Test

# Merge Agent A first
git merge hexcurse/agent/agent-a/task-001 --no-ff \
  -m "merge(task-001): formatter utility from agent-a"

# Merge Agent B
git merge hexcurse/agent/agent-b/task-002 --no-ff \
  -m "merge(task-002): validator utility from agent-b"
```

Verify no merge conflicts. Both `src/utils/formatter.ts` and `src/utils/validator.ts` must be present in the main branch.

### 5.8 — Cleanup worktrees

```bash
git worktree remove ..\worktree-agent-a
git worktree remove ..\worktree-agent-b
git branch -d hexcurse/agent/agent-a/task-001
git branch -d hexcurse/agent/agent-b/task-002
```

### 5.9 — Final doctor after multi-agent test

```bash
HEXCURSE_DOCTOR_CI=1 node N:\HexCurse\cursor-governance\setup.js --doctor
```

Must still pass with zero bad entries.

**Commit checkpoint:**
```bash
git add . && git commit -m "test(phase5): dual-worktree multi-agent stress test complete"
```

---

## PHASE 6 — `--refresh-rules` Full Coverage Test

**Goal:** Confirm `--refresh-rules` now correctly refreshes all 10 `.mdc` files, preserves Sacred Constraints in `base.mdc`, and does not corrupt canonical copies.

### 6.1 — Corrupt all 10 rules

```bash
node -e "
const fs = require('fs');
const rules = [
  'base.mdc','mcp-usage.mdc','process-gates.mdc','governance.mdc',
  'security.mdc','adr.mdc','memory-management.mdc',
  'debugging.mdc','multi-agent.mdc','linear-sync.mdc'
];
rules.forEach(r => {
  fs.writeFileSync('.cursor/rules/' + r, '# CORRUPTED\n');
});
console.log('All 10 rules corrupted for test');
"
```

### 6.2 — Add a Sacred Constraint to `base.mdc` before corrupting

Before running the corruption above, add a custom sacred constraint to `HEXCURSE/rules/base.mdc`:

```bash
node -e "
const fs = require('fs');
const content = fs.readFileSync('HEXCURSE/rules/base.mdc', 'utf8');
const updated = content + '\n- No TypeScript any types in production code\n';
fs.writeFileSync('HEXCURSE/rules/base.mdc', updated);
console.log('Sacred constraint added');
"
```

### 6.3 — Run `--refresh-rules`

```bash
node N:\HexCurse\cursor-governance\setup.js --refresh-rules
```

### 6.4 — Verify all 10 rules restored

```bash
node -e "
const fs = require('fs');
const rules = [
  'base.mdc','mcp-usage.mdc','process-gates.mdc','governance.mdc',
  'security.mdc','adr.mdc','memory-management.mdc',
  'debugging.mdc','multi-agent.mdc','linear-sync.mdc'
];
let allOk = true;
rules.forEach(r => {
  const content = fs.readFileSync('.cursor/rules/' + r, 'utf8');
  if (content.trim() === '# CORRUPTED') {
    console.error('NOT RESTORED:', r); allOk = false;
  } else {
    console.log('OK:', r);
  }
});
if (allOk) console.log('All 10 rules restored by --refresh-rules');
"
```

### 6.5 — Verify Sacred Constraint preserved in `base.mdc`

```bash
node -e "
const fs = require('fs');
const content = fs.readFileSync('.cursor/rules/base.mdc', 'utf8');
if (content.includes('No TypeScript any types')) {
  console.log('OK: Sacred Constraint preserved');
} else {
  console.error('FAILED: Sacred Constraint was lost during --refresh-rules');
  process.exit(1);
}
"
```

**Commit checkpoint:**
```bash
git add . && git commit -m "test(phase6): --refresh-rules covers all 10 rules with sacred constraint preservation"
```

---

## PHASE 7 — Bug Fix Protocol (if any bugs found)

If any phase above uncovered a genuine bug in `cursor-governance/setup.js`, follow this protocol before committing the fix:

### 7.1 — Write a failing test first

Add a test case to `cursor-governance/test/hexcurse-pack.test.js` that reproduces the bug. Run `npm run test:all` and confirm it fails.

### 7.2 — Fix the source

Make the minimal change to `cursor-governance/setup.js` to fix the bug.

### 7.3 — Confirm test passes

```bash
cd N:\HexCurse\cursor-governance && npm run test:all
```

### 7.4 — Re-run doctor on source repo

```bash
cd N:\HexCurse
HEXCURSE_DOCTOR_CI=1 node cursor-governance/setup.js --doctor
```

### 7.5 — Commit with a `fix:` prefix

```bash
git add . && git commit -m "fix: <description of bug found during consumer rollout>"
```

### 7.6 — Bump patch version

If any bugs are fixed, bump `cursor-governance/package.json` version from `1.5.0` to `1.5.1` and update `CHANGELOG.md` with a `### Fixed` section listing each bug. Commit: `chore: bump to 1.5.1 — rollout hotfixes`.

---

## ROLLOUT REPORT

Throughout all phases, maintain `N:\HexCurse\docs\ROLLOUT_REPORT.md`. This file is your sign-off document. Use this exact structure:

```markdown
# HexCurse v1.5.0 Consumer Rollout Report

**Date:** {date}
**Tester:** {your name or agent ID}
**Source repo:** N:\HexCurse @ v1.5.0
**Consumer repo:** N:\HexCurse-Consumer-Test

## Phase 1 — Fresh Install
- Artifact checklist: {X}/47 present
- PATHS.json key count: {N}
- Doctor result: {bad: 0, warn: N, ok: N}
- Idempotency: PASS / FAIL
- Notes: ...

## Phase 2 — MCP Servers
- Servers present: {list}
- Server launch results: {per-server pass/fail}
- Token budget warning: PRESENT / ABSENT
- Cursor green-light count: {N}/15
- Notes: ...

## Phase 3 — Rules Validation
- Frontmatter valid: {10/10}
- Content spot-checks: PASS / FAIL (list failures)
- Canonical parity: PASS / FAIL
- Notes: ...

## Phase 4 — --sync-rules
- Status: FULL / PARTIAL / SKIP
- Dry-run output: {paste}
- Stale detection: PASS / FAIL
- Graceful failure: PASS / FAIL
- lastSyncAt written: PASS / FAIL
- Notes: ...

## Phase 5 — Multi-Agent
- Worktrees created: PASS / FAIL
- Agent A commit: PASS / FAIL
- Agent B commit: PASS / FAIL
- Handoffs written: PASS / FAIL
- Conflict detection: PASS / SIMULATED / FAIL
- Clean merge: PASS / FAIL
- Post-test doctor: PASS / FAIL
- Notes: ...

## Phase 6 — --refresh-rules
- All 10 rules restored: PASS / FAIL
- Sacred Constraint preserved: PASS / FAIL
- Notes: ...

## Bugs Found
| Bug | Phase | Fix commit | Regression test |
|-----|-------|-----------|----------------|
| ... | ... | ... | ... |

## Final Version
cursor-governance: {1.5.0 or 1.5.1}

## Sign-off
- [ ] Zero bad doctor entries on consumer repo
- [ ] All 15 MCP servers structurally valid
- [ ] All 10 .mdc rules valid and content-verified
- [ ] --sync-rules tested (FULL or documented as PARTIAL)
- [ ] --multi-agent dual-worktree test passed
- [ ] --refresh-rules restores all 10 rules with sacred constraint preservation
- [ ] ROLLOUT_REPORT.md committed to N:\HexCurse\docs\
- [ ] Any bugs fixed with regression tests
- [ ] Version bumped to 1.5.1 if hotfixes were required

**Status: READY FOR PRODUCTION / NEEDS FIXES**
```

---

## FINAL COMMITS (in order)

```
test(phase1): fresh install + idempotency validated
test(phase2): MCP server structural validation complete
test(phase3): all 10 .mdc rules validated
test(phase4): --sync-rules live test complete
test(phase5): dual-worktree multi-agent stress test complete
test(phase6): --refresh-rules covers all 10 rules with sacred constraint preservation
fix: <one commit per bug, if any>
chore: bump to 1.5.1 (if hotfixes were required)
docs: ROLLOUT_REPORT.md — v1.5.0 consumer rollout sign-off
```

---

## FORBIDDEN ACTIONS

- Do not run any phase against `N:\HexCurse` (the source repo). All installs and tests run against `N:\HexCurse-Consumer-Test`.
- Do not modify `setup.js` without first writing a failing test that demonstrates the bug.
- Do not mark any phase PASS if it has an unresolved `bad` doctor entry.
- Do not delete the consumer test repo until `ROLLOUT_REPORT.md` is committed to the source repo.
- Do not skip Phase 5 (multi-agent) — it is the primary validation of the most complex new feature.
- Do not commit `ROLLOUT_REPORT.md` with any unchecked sign-off boxes.

---

*End of Directive D-HEXCURSE-CONSUMER-ROLLOUT-002. This directive is complete when ROLLOUT_REPORT.md is signed off and committed to `N:\HexCurse\docs\`.*