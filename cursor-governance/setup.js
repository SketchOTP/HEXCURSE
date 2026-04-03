'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { execSync, execFileSync } = require('child_process');
const chalk = require('chalk');
const crypto = require('crypto');
const readline = require('readline');

/** Single-folder governance pack root (relative to repository root). */
const HEXCURSE_ROOT = 'HEXCURSE';

/** Default LM Studio OpenAI-compatible API base (Tailscale/LAN; override via env). */
const DEFAULT_LM_STUDIO_BASE_URL = 'http://100.80.17.40:1234/v1';

/** When HEXCURSE_LM_STUDIO_MAX_CONTEXT is unset, assume this context for Taskmaster caps (qwen3.5-2b class). */
const DEFAULT_LM_STUDIO_MAX_CONTEXT = 8000;

/** Canonical pack path for NORTH_STAR on new installs. */
function pathNorthStarPack(cwd) {
  return path.join(cwd, HEXCURSE_ROOT, 'NORTH_STAR.md');
}

/** Prefer HEXCURSE/NORTH_STAR.md; fall back to legacy repo-root NORTH_STAR.md. */
function resolveNorthStarPathForRead(cwd) {
  const pack = pathNorthStarPack(cwd);
  const legacy = path.join(cwd, 'NORTH_STAR.md');
  if (fs.existsSync(pack)) return { path: pack, legacy: false };
  if (fs.existsSync(legacy)) return { path: legacy, legacy: true };
  return { path: pack, legacy: false };
}

function resolveSessionLogForRollup(cwd) {
  const hex = path.join(cwd, HEXCURSE_ROOT, 'SESSION_LOG.md');
  const root = path.join(cwd, 'SESSION_LOG.md');
  if (fs.existsSync(hex)) return hex;
  return root;
}

/** Prefer HEXCURSE/docs/ROLLING_CONTEXT.md when pack exists or file already there; else legacy docs/. */
function resolveRollingContextPathForRollup(cwd) {
  const hexRoll = path.join(cwd, HEXCURSE_ROOT, 'docs', 'ROLLING_CONTEXT.md');
  const rootRoll = path.join(cwd, 'docs', 'ROLLING_CONTEXT.md');
  if (fs.existsSync(hexRoll)) return hexRoll;
  if (fs.existsSync(rootRoll)) return rootRoll;
  if (fs.existsSync(path.join(cwd, HEXCURSE_ROOT))) return hexRoll;
  return rootRoll;
}

/** Normalize LM Studio OpenAI-compatible base URL to end with /v1. */
function normalizeLmStudioV1BaseUrl(raw) {
  const u = String(raw || '').trim().replace(/\/+$/, '');
  if (!u) return DEFAULT_LM_STUDIO_BASE_URL;
  return u.endsWith('/v1') ? u : `${u}/v1`;
}

/** Prefer HEXCURSE_LM_STUDIO_BASE_URL, then LM_STUDIO_BASE_URL; default Tailscale host in DEFAULT_LM_STUDIO_BASE_URL. */
function lmStudioBaseUrlFromEnv() {
  const raw = String(
    process.env.HEXCURSE_LM_STUDIO_BASE_URL || process.env.LM_STUDIO_BASE_URL || ''
  ).trim();
  return raw ? normalizeLmStudioV1BaseUrl(raw) : DEFAULT_LM_STUDIO_BASE_URL;
}

/** Resolved LM Studio URL: interactive/quick answers override env. */
function resolvedLmStudioApiBaseUrl(answers) {
  const te = answers.taskmasterEnv || {};
  const fromAnswers = String(te.OPENAI_BASE_URL || '').trim();
  if (fromAnswers) return normalizeLmStudioV1BaseUrl(fromAnswers);
  return lmStudioBaseUrlFromEnv();
}

/** Loads package.json next to this script (works when cwd is not the package dir). */
function readInstallerPackageJson() {
  try {
    const p = path.join(__dirname, 'package.json');
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return { name: 'cursor-governance', version: 'unknown' };
  }
}

/** Bundled Architect prompt (HEXCURSE path prefixes) for HEXCURSE/docs/ARCH_PROMPT.md. */
function readBundledArchPromptTemplate() {
  return fs.readFileSync(path.join(__dirname, 'templates', 'ARCH_PROMPT.md'), 'utf8');
}

/** Bundled MCP coordination doc for HEXCURSE/docs/MCP_COORDINATION.md on install. */
function readBundledMcpCoordinationTemplate() {
  return fs.readFileSync(path.join(__dirname, 'templates', 'MCP_COORDINATION.md'), 'utf8');
}

/** Bundled MCP token budget doc for HEXCURSE/docs/MCP_TOKEN_BUDGET.md on install. */
function readBundledMcpTokenBudgetTemplate() {
  return fs.readFileSync(path.join(__dirname, 'templates', 'MCP_TOKEN_BUDGET.md'), 'utf8');
}

/** Bundled multi-agent doc for HEXCURSE/docs/MULTI_AGENT.md on install. */
function readBundledMultiAgentTemplate() {
  return fs.readFileSync(path.join(__dirname, 'templates', 'MULTI_AGENT.md'), 'utf8');
}

/** Returns MCP_TOKEN_BUDGET.md body for HEXCURSE/docs/. */
function mcpTokenBudgetMd() {
  return readBundledMcpTokenBudgetTemplate();
}

/** Returns MULTI_AGENT.md body for HEXCURSE/docs/. */
function multiAgentMd() {
  return readBundledMultiAgentTemplate();
}

/** Returns ADR_LOG.md stub with {{PROJECT_NAME}} replaced. */
function adrLogStubMd(projectName) {
  const raw = fs.readFileSync(path.join(__dirname, 'templates', 'ADR_LOG.md'), 'utf8');
  return raw.replace(/\{\{PROJECT_NAME\}\}/g, String(projectName || 'Project').trim());
}

/** Returns minimal AGENT_HANDOFFS.md stub (append-only handoff log). */
function agentHandoffsStubMd() {
  return `<!-- Handoff entries appended here -->
`;
}

/** Memory taxonomy for HEXCURSE/docs and docs/. */
function readBundledMemoryTaxonomyTemplate() {
  return fs.readFileSync(path.join(__dirname, 'templates', 'MEMORY_TAXONOMY.md'), 'utf8');
}

/** GOVERNANCE_PARITY.md for HEXCURSE/docs on install (parity: rules vs automation). */
function readBundledGovernanceParityTemplate(projectName) {
  const raw = fs.readFileSync(path.join(__dirname, 'templates', 'GOVERNANCE_PARITY.md'), 'utf8');
  return raw.replace(/\{\{PROJECT_NAME\}\}/g, String(projectName || 'Project').trim());
}

/** Recursively count files under dir (optional filter(path) → boolean). */
function countFilesRecursive(dir, filterFn) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (!filterFn || filterFn(p)) n += 1;
    }
  };
  walk(dir);
  return n;
}

/** Stable SHA-256 of all files under templatesRoot (sorted relative paths + contents). */
function fingerprintTemplateDirectory(templatesRoot) {
  const relPaths = [];
  const walk = (d, base) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p, base);
      else relPaths.push(path.relative(base, p).replace(/\\/g, '/'));
    }
  };
  walk(templatesRoot, templatesRoot);
  relPaths.sort();
  const h = crypto.createHash('sha256');
  for (const rel of relPaths) {
    const full = path.join(templatesRoot, rel);
    const buf = fs.readFileSync(full);
    h.update(rel);
    h.update('\0');
    h.update(buf);
  }
  return { fileCount: relPaths.length, fingerprintHex: h.digest('hex') };
}

/** README for .cursor/skills on install. */
function readBundledCursorSkillsReadmeTemplate() {
  return fs.readFileSync(path.join(__dirname, 'templates', 'cursor-skills-README.md'), 'utf8');
}

/** governance.mdc (globs include .cursor/skills) — HEXCURSE/rules + .cursor/rules on install / refresh. */
function readBundledGovernanceMdc() {
  return fs.readFileSync(path.join(__dirname, 'templates', 'governance.mdc'), 'utf8');
}

/** Starter skill file for .cursor/skills/_TEMPLATE_SKILL.md (skip if exists). */
function readBundledTemplateSkillMd() {
  return fs.readFileSync(path.join(__dirname, 'templates', '_TEMPLATE_SKILL.md'), 'utf8');
}

/** HEXCURSE/NORTH_STAR.md template (skip on install if file exists). */
function readBundledNorthStarTemplate(projectName) {
  return fs
    .readFileSync(path.join(__dirname, 'templates', 'NORTH_STAR.md'), 'utf8')
    .replace(/\{\{PROJECT_NAME\}\}/g, String(projectName || 'Project').trim());
}

/** HEXCURSE/ONE_PROMPT.md — single Cursor message after NORTH_STAR is filled. */
function readBundledOnePromptTemplate(projectName) {
  return fs
    .readFileSync(path.join(__dirname, 'templates', 'ONE_PROMPT.md'), 'utf8')
    .replace(/\{\{PROJECT_NAME\}\}/g, String(projectName || 'Project').trim());
}

/** HEXCURSE/HEADLESS_KICKOFF.txt — plain prompt for `agent -p --model composer-2` (Cursor headless CLI). */
function readBundledHeadlessKickoffTemplate(projectName) {
  return fs
    .readFileSync(path.join(__dirname, 'templates', 'HEADLESS_KICKOFF.txt'), 'utf8')
    .replace(/\{\{PROJECT_NAME\}\}/g, String(projectName || 'Project').trim());
}

/** Pack continual-learning doc with {{PROJECT_NAME}} replaced. */
function readContinualLearningPackTemplate(projectName) {
  return fs
    .readFileSync(path.join(__dirname, 'templates', 'CONTINUAL_LEARNING.pack.md'), 'utf8')
    .replace(/\{\{PROJECT_NAME\}\}/g, projectName);
}

/** Stub HEXCURSE/docs/ROLLING_CONTEXT.md for new installs (pack-local). */
function rollingContextStubMd(projectName) {
  return `# Rolling context — ${projectName}

Long-horizon consolidation. **LLM** summaries go in dated sections. **Deterministic** excerpts: \`node cursor-governance/setup.js --learning-rollup\`.

See **HEXCURSE/docs/CONTINUAL_LEARNING.md**. State: **\`.cursor/hooks/state/continual-learning.json\`**.

---

## Summaries and rollups

*(No entries yet.)*
`;
}

function printCliHelp() {
  console.log(`
cursor-governance — HexCurse installer (writes into the current working directory)

  node setup.js [options]
  cursor-governance [options]   (if installed globally)

Options:
  --help, -h          Show this message
  --version, -v       Print package version and exit
  --doctor            Verify governance layout, PATHS.json, task-master, ~/.cursor/mcp.json (from repo root)
  --refresh-rules     Rewrite all 10 .mdc rules (mcp-usage, process-gates, base, governance, security, adr, memory-management, debugging, multi-agent, linear-sync; uses AGENTS.md + ARCHITECTURE.md for base)
  --multi-agent       Enable parallel agent orchestration via git worktrees and swarm-protocol MCP
  --sync-rules        Fetch latest governance rules from the HexCurse GitHub source and update .cursor/rules/ (optional --dry-run)
  --learning-rollup   Append last N SESSION_LOG blocks to HEXCURSE/docs/ROLLING_CONTEXT.md (or legacy docs/ path; no LLM; optional --sessions=5)
  --run-hexcurse      NORTH_STAR bridge: AI-expand HEXCURSE/NORTH_STAR.md (legacy repo-root file still accepted) → .taskmaster/docs/prd.txt, parse-prd, sync DIRECTIVES Queued
  --run-hexcurse-raw  Same bridge but no AI (north star pasted as PRD body); still parse-prd + DIRECTIVES sync
  --preflight-cursor-agent  Run \`agent status\` only; exit 0 if Cursor CLI is authenticated (see HEXCURSE_PREFLIGHT_CURSOR_AGENT)
  --parse-prd-via-agent   Generate tasks.json from PRD using the Cursor agent's
                          own LLM — no outbound API call required from setup.js.
                          Prints a structured prompt to stdout for pasting into
                          the Cursor agent chat, then parses the agent response.

    --prd=<path>          PRD file to read (default: .taskmaster/docs/prd.txt)
    --out=<path>          tasks.json output path (default: .taskmaster/tasks/tasks.json)
    --dry-run             Print prompt and schema only, do not write tasks.json
    --apply=<path>        Read agent JSON response from file and write to tasks.json

  --quick, -q         Non-interactive install (requires GitHub token in env or ~/.cursor/mcp.json)
  --preset=<name>     With --quick: lmstudio | anthropic | openai (default lmstudio). Or set HEXCURSE_PRESET.

  Quick install env (all optional except tokens for your preset):
  HEXCURSE_PROJECT_NAME, HEXCURSE_PURPOSE, HEXCURSE_STACK, HEXCURSE_MODULES,
  HEXCURSE_OUT_OF_SCOPE, HEXCURSE_DOD, HEXCURSE_SACRED,
  HEXCURSE_REPO_KIND=existing — pack repo with repomix (npx) and draft NORTH_STAR + PRD fields via your model before writing files,
  HEXCURSE_HUMAN_FOCUS — optional one-line goal when HEXCURSE_REPO_KIND=existing,
  HEXCURSE_REPO_SNAPSHOT_MAX_CHARS — cap repomix text for the installer LLM (default 120000),
  HEXCURSE_INSTALL_MODEL — override model id for the existing-repo NORTH_STAR draft only,
  HEXCURSE_LM_STUDIO_MODEL (default qwen3.5-2b),
  HEXCURSE_LM_STUDIO_BASE_URL or LM_STUDIO_BASE_URL (optional /v1 suffix; normalized),
  OPENAI_BASE_URL for --quick --preset=lmstudio if the HEXCURSE/LM_STUDIO vars are unset,
  HEXCURSE_LM_STUDIO_MAX_CONTEXT (e.g. 4096 or 8000; default 8000 when unset) — caps Taskmaster maxTokens + default task counts to fit loaded context,
  HEXCURSE_EXPAND_MODEL — optional override for --run-hexcurse AI step (else Taskmaster main modelId),
  HEXCURSE_SKIP_AI_EXPAND=1 — treat --run-hexcurse like --run-hexcurse-raw,
  HEXCURSE_PREFLIGHT_CURSOR_AGENT=1 — before task-master parse-prd in --run-hexcurse*, require successful \`agent status\` (after \`agent login\`; see Cursor CLI auth + headless docs),
  HEXCURSE_DOCTOR_CI=1 — with \`setup.js --doctor\`, treat missing ~/.cursor/mcp.json and missing task-master CLI as warnings (for CI); same as CI=true or GITHUB_ACTIONS=true,
  ANTHROPIC_API_KEY or OPENAI_API_KEY for anthropic / openai presets.

  Piped stdin (interactive): one line per prompt. After provider credentials and optional GitHub token,
  the next line chooses repo kind (1 = new project, 2 = existing codebase). New project: same follow-up
  lines as before. Existing: optional focus line (may be empty), then sacred constraints line.

Run from your target repository root with no flags to start the interactive install.
`);
}

/** Returns 'install' | 'help' | 'version' | 'doctor' | 'refresh-rules' | 'multi-agent' | 'sync-rules' | 'learning-rollup' | 'run-hexcurse' | 'run-hexcurse-raw' | 'preflight-cursor-agent' | 'parse-prd-via-agent'. */
function parseSetupArgv(argv) {
  const flags = new Set(argv.slice(2).filter((a) => a.startsWith('-')));
  if (flags.has('--help') || flags.has('-h')) return 'help';
  if (flags.has('--version') || flags.has('-v')) return 'version';
  if (flags.has('--doctor')) return 'doctor';
  if (flags.has('--refresh-rules')) return 'refresh-rules';
  if (flags.has('--multi-agent')) return 'multi-agent';
  if (flags.has('--sync-rules')) return 'sync-rules';
  if (flags.has('--learning-rollup')) return 'learning-rollup';
  if (flags.has('--preflight-cursor-agent')) return 'preflight-cursor-agent';
  if (flags.has('--parse-prd-via-agent')) return 'parse-prd-via-agent';
  if (flags.has('--run-hexcurse-raw')) return 'run-hexcurse-raw';
  if (flags.has('--run-hexcurse')) return 'run-hexcurse';
  return 'install';
}

/** Parse --prd, --out, --dry-run, --apply for --parse-prd-via-agent mode. */
function parseParsePrdViaAgentArgv(argv) {
  const args = { prd: null, out: null, 'dry-run': false, apply: null };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') args['dry-run'] = true;
    else if (a.startsWith('--prd=')) args.prd = a.slice('--prd='.length);
    else if (a.startsWith('--out=')) args.out = a.slice('--out='.length);
    else if (a.startsWith('--apply=')) args.apply = a.slice('--apply='.length);
  }
  return args;
}

/** True when argv includes --dry-run (for --sync-rules). */
function argvHasDryRun(argv) {
  return argv.slice(2).some((a) => a === '--dry-run');
}

/** Validates agent-produced JSON before writing Taskmaster tasks.json. */
function validateTaskmasterSchema(parsed) {
  const errors = [];

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, errors: ['Root must be a JSON object'] };
  }
  if (!parsed.master || !Array.isArray(parsed.master.tasks)) {
    return { ok: false, errors: ['Must have master.tasks array'] };
  }

  const tasks = parsed.master.tasks;
  if (tasks.length < 5) {
    errors.push(`Only ${tasks.length} tasks — expected at least 5`);
  }

  const ids = new Set();
  tasks.forEach((t, i) => {
    const prefix = `Task[${i}]`;
    if (typeof t.id !== 'number') errors.push(`${prefix}: id must be integer, got ${typeof t.id}`);
    if (!t.title || typeof t.title !== 'string') errors.push(`${prefix}: missing title`);
    if (!t.description || typeof t.description !== 'string') errors.push(`${prefix}: missing description`);
    if (!t.details || typeof t.details !== 'string') errors.push(`${prefix}: missing details`);
    if (!t.testStrategy || typeof t.testStrategy !== 'string') errors.push(`${prefix}: missing testStrategy`);
    if (!t.status) errors.push(`${prefix}: missing status`);
    if (!['high', 'medium', 'low'].includes(t.priority)) {
      errors.push(`${prefix}: invalid priority '${t.priority}'`);
    }
    if (!Array.isArray(t.dependencies)) errors.push(`${prefix}: dependencies must be array`);
    if (!Array.isArray(t.subtasks)) errors.push(`${prefix}: subtasks must be array`);
    ids.add(t.id);
  });

  tasks.forEach((t) => {
    (t.dependencies || []).forEach((dep) => {
      if (!ids.has(dep)) {
        errors.push(`Task #${t.id}: dependency ${dep} references non-existent task`);
      }
      if (dep === t.id) {
        errors.push(`Task #${t.id}: task depends on itself`);
      }
    });
  });

  return { ok: errors.length === 0, errors };
}

/** Builds the self-contained prompt for the Cursor agent to emit tasks JSON. */
function buildAgentParsePrompt(prdContent, outPath) {
  return `
You are parsing a Product Requirements Document into a Taskmaster task graph.
Read the PRD below and produce a JSON task list in the exact schema specified.

## PRD

${prdContent}

## Output schema

Respond with ONLY a valid JSON object — no markdown fences, no preamble, no explanation.
The JSON must exactly match this schema:

{
  "master": {
    "tasks": [
      {
        "id": <integer starting at 1>,
        "title": "<concise task title, max 60 chars>",
        "description": "<one sentence describing what this task delivers>",
        "details": "<2-4 sentences of implementation guidance>",
        "testStrategy": "<how to verify this task is complete>",
        "status": "pending",
        "dependencies": [<array of integer task ids this task depends on>],
        "priority": "<high | medium | low>",
        "subtasks": []
      }
    ]
  }
}

## Rules for task generation

1. Produce between 10 and 20 tasks. Too few means the PRD is not broken down enough.
2. Tasks must cover the full scope of the PRD — do not skip phases or features.
3. Dependencies must form a valid DAG — no circular dependencies.
4. The first task must have no dependencies (it is always the foundation task).
5. Priority rules:
   - high: blocking other tasks, customer-facing, or on the critical path
   - medium: important but not blocking
   - low: nice-to-have, polish, or future-phase
6. id values must be sequential integers starting at 1.
7. Do not include tasks that are already done — this is a fresh task graph.
8. testStrategy must be concrete and specific, not "test it works."
9. Respond with ONLY the JSON object. No other text before or after.

## Verification

After generating the JSON, verify internally:
- All dependency ids reference valid task ids in the list
- No task depends on itself
- The JSON is valid (no trailing commas, no unquoted strings)
- id values are integers not strings
- All required fields are present on every task

If verification fails, fix the JSON before responding.
`.trim();
}

/** Best-effort clipboard copy; never throws. */
function tryClipboardCopy(text) {
  try {
    if (process.platform === 'win32') {
      execFileSync('clip', { input: text, encoding: 'utf8' });
      console.log('✓ Prompt copied to clipboard (Windows clip)\n');
    } else if (process.platform === 'darwin') {
      execSync('pbcopy', { input: text });
      console.log('✓ Prompt copied to clipboard (pbcopy)\n');
    } else {
      try {
        execSync('xclip -selection clipboard', { input: text });
        console.log('✓ Prompt copied to clipboard (xclip)\n');
      } catch {
        try {
          execSync('xsel --clipboard --input', { input: text });
          console.log('✓ Prompt copied to clipboard (xsel)\n');
        } catch {
          /* clipboard unavailable */
        }
      }
    }
  } catch {
    /* Clipboard not available — the printed prompt is sufficient */
  }
}

/** Prints the agent prompt and optional clipboard copy; never writes files when dryRun. */
function printAgentParsePrompt(prompt, outPath, dryRun) {
  console.log('\n' + '═'.repeat(70));
  console.log('  HexCurse — Parse PRD via Agent');
  console.log('═'.repeat(70));
  console.log('\nStep 1: Copy everything between the dashes and paste it into');
  console.log('        the Cursor agent chat (or any LLM chat interface).\n');
  console.log('─'.repeat(70));
  console.log(prompt);
  console.log('─'.repeat(70));
  console.log('\nStep 2: When the agent responds with JSON, save the response to');
  console.log('        a file (e.g. agent-response.json), then run:\n');
  console.log(`        node cursor-governance/setup.js --parse-prd-via-agent \\`);
  console.log(`          --apply=agent-response.json --out="${outPath}"\n`);
  console.log('Step 3: Verify with: task-master list\n');

  if (dryRun) {
    console.log('(dry-run: no files written)\n');
    return;
  }

  tryClipboardCopy(prompt);
}

/** Reads agent JSON from file, validates, writes tasks.json (unless dryRun). */
async function applyAgentResponse(applyPath, outPath, dryRun) {
  if (!fs.existsSync(applyPath)) {
    console.error(`✗ Response file not found: ${applyPath}`);
    process.exit(1);
  }

  let raw = fs.readFileSync(applyPath, 'utf8').trim();
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error('✗ Response is not valid JSON:', e.message);
    console.error('  Check the file for markdown fences or extra text and try again.');
    process.exit(1);
  }

  const validation = validateTaskmasterSchema(parsed);
  if (!validation.ok) {
    console.error('✗ Schema validation failed:');
    validation.errors.forEach((e) => console.error('  -', e));
    console.error('\n  Fix the JSON and re-run with --apply=<path>');
    process.exit(1);
  }

  const tasks = parsed.master.tasks;
  console.log(`✓ Parsed ${tasks.length} tasks from agent response`);
  tasks.forEach((t) => console.log(`  #${t.id} [${t.priority}] ${t.title}`));

  if (dryRun) {
    console.log('\n(dry-run: tasks.json not written)\n');
    return;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
  console.log(`\n✓ Written to: ${outPath}`);
  console.log('  Run: task-master list\n');
}

/** Generate Taskmaster tasks from PRD via Cursor agent (no outbound LLM from setup.js). */
async function runParsePrdViaAgent(cwd, args) {
  const prdPath = args.prd || path.join(cwd, '.taskmaster', 'docs', 'prd.txt');
  const outPath = args.out || path.join(cwd, '.taskmaster', 'tasks', 'tasks.json');
  const dryRun = args['dry-run'] || false;
  const applyPath = args.apply || null;

  if (!fs.existsSync(prdPath)) {
    console.error(`✗ PRD not found at: ${prdPath}`);
    console.error('  Run the installer first, or specify --prd=<path>');
    process.exit(1);
  }
  const prdContent = fs.readFileSync(prdPath, 'utf8').trim();
  if (prdContent.length < 100) {
    console.error(`✗ PRD at ${prdPath} appears to be a stub (${prdContent.length} chars)`);
    console.error('  Write a substantive PRD before running --parse-prd-via-agent');
    process.exit(1);
  }

  if (applyPath) {
    return applyAgentResponse(applyPath, outPath, dryRun);
  }

  const prompt = buildAgentParsePrompt(prdContent, outPath);
  printAgentParsePrompt(prompt, outPath, dryRun);
  if (!dryRun) {
    const cachePath = path.join(cwd, '.taskmaster', 'agent-parse-prompt.txt');
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, prompt, 'utf8');
    console.log(`✓ Prompt also saved to: ${cachePath}\n`);
  }
}

/** Parse --sessions=N from argv (default 5). */
function parseLearningRollupSessions(argv) {
  for (const a of argv.slice(2)) {
    if (a.startsWith('--sessions=')) {
      const n = parseInt(a.slice('--sessions='.length), 10);
      if (Number.isFinite(n)) return Math.min(Math.max(n, 1), 50);
    }
  }
  return 5;
}

/**
 * Deterministic rollup: last N ### Session blocks from HEXCURSE/SESSION_LOG.md (or legacy root SESSION_LOG.md) → rolling context path from resolveRollingContextPathForRollup.
 * Updates continual-learning.json lastRollupAt / lastRollupSessionKey when present.
 */
function runLearningRollup(cwd, sessionCount) {
  const n = sessionCount;
  const sessionLogPath = resolveSessionLogForRollup(cwd);
  const rollingPath = resolveRollingContextPathForRollup(cwd);
  const statePath = path.join(cwd, '.cursor', 'hooks', 'state', 'continual-learning.json');

  if (!fs.existsSync(sessionLogPath)) {
    console.error(
      chalk.red('SESSION_LOG not found (expected HEXCURSE/SESSION_LOG.md or legacy SESSION_LOG.md at repo root).')
    );
    process.exitCode = 1;
    return;
  }

  const md = fs.readFileSync(sessionLogPath, 'utf8');
  const parts = md.split(/^### Session /m);
  const preamble = parts[0];
  const blocks = parts.slice(1).map((p) => `### Session ${p}`);
  const chosen = blocks.slice(-n);
  if (chosen.length === 0) {
    console.log(chalk.yellow('No ### Session blocks found in SESSION_LOG.md'));
    return;
  }

  const newestHeader = chosen[chosen.length - 1].split(/\r?\n/)[0].trim();

  let state = {};
  if (fs.existsSync(statePath)) {
    try {
      state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch (e) {
      state = {};
    }
  }
  if (state.lastRollupSessionKey === newestHeader) {
    console.log(chalk.dim('Rollup already recorded for this newest session; skipping append.'));
    return;
  }

  const iso = new Date().toISOString();
  const appendix = `\n\n## Raw session index — ${iso}\n\n_(Last ${chosen.length} session block(s) from SESSION_LOG — deterministic rollup, no LLM.)_\n\n${chosen.join('')}\n`;

  fs.ensureDirSync(path.dirname(rollingPath));
  if (!fs.existsSync(rollingPath)) {
    fs.writeFileSync(
      rollingPath,
      `# Rolling context\n\nAppend-only consolidation. See **HEXCURSE/docs/CONTINUAL_LEARNING.md**.\n${appendix}`,
      'utf8'
    );
  } else {
    fs.appendFileSync(rollingPath, appendix, 'utf8');
  }

  state.version = state.version || 1;
  state.lastRollupAt = iso;
  state.lastRollupSessionKey = newestHeader;
  state.sessionsSinceRollup = 0;

  fs.ensureDirSync(path.dirname(statePath));
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

  console.log(chalk.green('✓ Appended rollup to'), path.relative(cwd, rollingPath));
  console.log(chalk.dim(`  State updated: ${path.relative(cwd, statePath)}`));
}

/** Extracts markdown body under ## {heading} until the next ## heading. */
function extractMarkdownSection(md, heading) {
  const re = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im');
  const m = md.match(re);
  if (!m) return '';
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const next = rest.match(/^##\s+/m);
  const block = next ? rest.slice(0, next.index) : rest;
  return block.trim();
}

/** Pulls sacred-constraint lines from an existing base.mdc for --refresh-rules. */
function extractSacredCsvFromBaseMdc(text) {
  const parts = [];
  const seen = new Set();
  const push = (s) => {
    const t = String(s || '').trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    parts.push(t);
  };
  const i = text.indexOf('## Sacred Constraints');
  if (i >= 0) {
    const j = text.indexOf('\n## ', i + 5);
    const end = j >= 0 ? j : text.length;
    const block = text.slice(i, end);
    for (const line of block.split(/\r?\n/)) {
      const u = line.trim();
      if (u.startsWith('- ')) push(u.slice(2).trim());
    }
  }
  /** Custom bullets appended after the last markdown heading (directive / human pattern). */
  const lines = text.split(/\r?\n/);
  let k = lines.length - 1;
  while (k >= 0 && !lines[k].trim()) k--;
  while (k >= 0) {
    const u = lines[k].trim();
    if (u.startsWith('- ')) {
      push(u.slice(2).trim());
      k--;
      continue;
    }
    break;
  }
  return parts.length ? parts.join('\n') : null;
}

/** Resolves project name from AGENTS.md front matter lines. */
function extractProjectNameFromAgents(md) {
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^#\s*(.+)$/);
    if (!m) continue;
    const t = m[1].trim();
    if (/^AGENTS\.md/i.test(t)) continue;
    return t.replace(/\s*[—–-]\s*.*/, '').trim() || 'Project';
  }
  return 'Project';
}

/**
 * Merge repo-root .env into process.env.
 * By default only sets keys that are unset or empty (shell exports win).
 * opts.forceKeys: array of env var names to always take from .env when that line exists
 * (stops stale OPENAI_BASE_URL in the shell from breaking --run-hexcurse on another machine).
 */
function loadDotEnvFromFile(cwd, opts) {
  const p = path.join(cwd, '.env');
  if (!fs.existsSync(p)) return;
  const force = opts && opts.forceKeys ? new Set(opts.forceKeys.map((k) => String(k).trim())) : null;
  const raw = fs.readFileSync(p, 'utf8');
  for (const line of raw.split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const eq = s.indexOf('=');
    if (eq <= 0) continue;
    const key = s.slice(0, eq).trim();
    let val = s.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    const forced = force && force.has(key);
    if (forced || process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = val;
    }
  }
}

/** Normalize chat/completions message content to a string. */
function extractOpenAiMessageText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => {
        if (typeof p === 'string') return p;
        if (p && typeof p === 'object') return p.text || p.content || '';
        return '';
      })
      .join('');
  }
  return '';
}

/** True if NORTH_STAR.md has enough real content (not the empty template). */
function isNorthStarSubstantive(text) {
  /* Only a whole line that is exactly the sentinel counts — not mentions in instructions (same file). */
  if (/^\s*NORTH_STAR_NOT_READY\s*$/im.test(text)) return false;
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length < 120) return false;
  const lower = t.toLowerCase();
  if (lower.includes('replace this entire document')) return false;
  if (lower.includes('delete everything below')) return false;
  if (lower.includes('replace everything below the line')) return false;
  return true;
}

/** Child env for task-master CLI during NORTH_STAR bridge (LM Studio / OpenAI from .env). */
function taskmasterChildEnvForBridge(cwd) {
  loadDotEnvFromFile(cwd, { forceKeys: ['OPENAI_BASE_URL', 'OPENAI_API_KEY'] });
  const env = { ...process.env };
  if (!env.OPENAI_API_KEY) env.OPENAI_API_KEY = 'lm-studio';
  if (!env.OPENAI_BASE_URL) env.OPENAI_BASE_URL = lmStudioBaseUrlFromEnv();
  return env;
}

/** True when doctor should not fail CI for machine-local deps (~/.cursor/mcp.json, task-master on PATH). */
function isDoctorCiRelaxed() {
  return (
    process.env.CI === 'true' ||
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.HEXCURSE_DOCTOR_CI === '1'
  );
}

/** Require Cursor CLI login so `agent status` succeeds (browser flow: `agent login`). */
function assertCursorAgentCliAuthenticated() {
  try {
    execSync('agent status', { stdio: 'pipe', encoding: 'utf8' });
  } catch {
    console.error(chalk.red('Cursor CLI preflight failed: `agent status` did not succeed.'));
    console.error(chalk.dim('Log in with: agent login'));
    console.error(chalk.dim('Authentication: https://cursor.com/docs/cli/reference/authentication.md'));
    console.error(chalk.dim('Headless CLI: https://cursor.com/docs/cli/headless'));
    console.error(
      chalk.dim(
        'task-master still uses OPENAI_* / .taskmaster/config.json for LLM HTTP calls; this step only verifies Cursor CLI auth.'
      )
    );
    process.exit(1);
  }
}

/** When HEXCURSE_PREFLIGHT_CURSOR_AGENT=1, require Cursor CLI auth before task-master parse-prd (NORTH_STAR bridge). */
function maybePreflightCursorAgentBeforeTaskmasterParsePrd() {
  if (process.env.HEXCURSE_PREFLIGHT_CURSOR_AGENT !== '1') return;
  console.log(chalk.dim('HEXCURSE_PREFLIGHT_CURSOR_AGENT=1: checking Cursor CLI (`agent status`) …'));
  assertCursorAgentCliAuthenticated();
  console.log(chalk.green('✓'), 'Cursor CLI authenticated');
}

/** Wrap north star as PRD markdown without calling an LLM. */
function buildPrdFromNorthStarRaw(northStarText) {
  return `# PRD (from NORTH_STAR)

The following is the project north star, used as the PRD body for Taskmaster. Refine **HEXCURSE/NORTH_STAR.md** (or legacy repo-root **NORTH_STAR.md**) or edit this file after generation if needed.

---

${northStarText.trim()}

---

## Notes
Generated by cursor-governance **--run-hexcurse-raw** (no AI expansion).
`;
}

/**
 * Call OpenAI-compatible chat/completions to expand NORTH_STAR into Taskmaster-friendly PRD markdown.
 */
async function expandNorthStarToPrdMarkdown(cwd, northStarText) {
  loadDotEnvFromFile(cwd, {
    forceKeys: ['OPENAI_BASE_URL', 'OPENAI_API_KEY', 'HEXCURSE_EXPAND_MODEL'],
  });
  const cfgPath = path.join(cwd, '.taskmaster', 'config.json');
  let model = String(process.env.HEXCURSE_EXPAND_MODEL || '').trim();
  let baseURL = String(process.env.OPENAI_BASE_URL || '').trim();
  let apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (fs.existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      const m = cfg.models && cfg.models.main;
      if (m && typeof m === 'object') {
        if (!model && m.modelId) model = String(m.modelId).trim();
        if (!baseURL && m.baseURL) baseURL = String(m.baseURL).trim();
      }
    } catch (_) {
      /* ignore */
    }
  }
  if (!model) model = 'gpt-4o-mini';
  const normalizedBase = normalizeLmStudioV1BaseUrl(baseURL || lmStudioBaseUrlFromEnv());
  if (!apiKey) apiKey = 'lm-studio';
  const endpoint = `${normalizedBase.replace(/\/$/, '')}/chat/completions`;
  if (process.env.HEXCURSE_DEBUG_BRIDGE === '1') {
    console.log(
      chalk.dim(
        `Bridge expand: POST ${endpoint} model=${model} (OPENAI_BASE_URL from ${baseURL ? '.env or shell' : 'fallback'})`
      )
    );
  }
  const system = `You convert a project "north star" document into a Taskmaster-friendly product requirements document.

Output **Markdown only** (no code fences). Use this structure:
# PRD — <concise title>
## Purpose
## Tech Stack
## Key Modules or Features
## User Stories
## Constraints
## Out of Scope
## Definition of Done
## Implementation Phases (numbered; note dependencies between phases)

Rules: expand the human's intent into actionable detail; do not invent secrets or API keys; preserve non-negotiables and named technologies from the source; if unknown use TBD with a one-line note.`;
  const fetchMs = Number(process.env.HEXCURSE_LLM_FETCH_MS || 180000);
  const signal =
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(fetchMs)
      : undefined;
  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: northStarText },
        ],
      }),
    });
  } catch (err) {
    const c = err && err.cause;
    const causeStr = c ? (c.message || String(c)) : '';
    const envPath = path.join(cwd, '.env');
    const envHint = fs.existsSync(envPath)
      ? `Found ${path.relative(cwd, envPath)} — ensure OPENAI_BASE_URL=http://<pc-lan-ip>:1234/v1 matches curl.`
      : `No .env at repo root — create one with OPENAI_BASE_URL=http://192.168.x.x:1234/v1 or set .taskmaster/config.json main.baseURL.`;
    throw new Error(
      `${err.message || String(err)} @ ${endpoint} (model ${model}). ${causeStr ? `Cause: ${causeStr}. ` : ''}${envHint}`
    );
  }
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 600)}`);
  }
  const data = await res.json();
  const rawContent = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';
  const out = extractOpenAiMessageText(rawContent);
  if (!out || out.trim().length < 200) {
    throw new Error('Model returned empty or very short PRD; use --run-hexcurse-raw or check model/output.');
  }
  return `${out.trim()}\n\n## Notes\nGenerated by cursor-governance **--run-hexcurse** from north star (AI expanded).\n`;
}

/** When repomix is missing or fails, collect a small deterministic snapshot for the LLM. */
function collectFallbackRepoSnapshot(cwd) {
  const parts = [];
  try {
    parts.push(`## Top-level entries\n${fs.readdirSync(cwd).sort().join('\n')}`);
  } catch (e) {
    parts.push('## Top-level entries\n(unreadable)');
  }
  for (const name of ['README.md', 'readme.md', 'package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod']) {
    const p = path.join(cwd, name);
    if (fs.existsSync(p)) {
      try {
        let t = fs.readFileSync(p, 'utf8');
        if (t.length > 14000) t = `${t.slice(0, 14000)}\n\n[... truncated ...]\n`;
        parts.push(`\n## ${name}\n${t}`);
      } catch (_) {
        /* skip */
      }
    }
  }
  return `${parts.join('\n\n')}\n`;
}

/**
 * Run repomix via npx so this works before installGlobals adds a global binary.
 * Caps size so small local models can still process the follow-up LLM step.
 */
function runRepomixCompressSnapshot(cwd) {
  const maxChars = parseInt(process.env.HEXCURSE_REPO_SNAPSHOT_MAX_CHARS || '120000', 10);
  const cmd =
    'npx -y repomix --compress --stdout --quiet --style markdown .';
  try {
    const out = execSync(cmd, {
      cwd,
      shell: true,
      encoding: 'utf8',
      maxBuffer: 80 * 1024 * 1024,
    });
    const s = String(out || '');
    if (s.length > maxChars) {
      return `${s.slice(0, maxChars)}\n\n---\n_(Snapshot truncated to ${maxChars} characters for installer LLM. Refine **HEXCURSE/NORTH_STAR.md** in Cursor with the repomix MCP.)_\n`;
    }
    return s;
  } catch (e) {
    console.warn(
      chalk.yellow('⚠ repomix failed — using README/package manifests only.'),
      chalk.dim(e.message || String(e))
    );
    return collectFallbackRepoSnapshot(cwd);
  }
}

/** Remove the template sentinel if the model echoed it (keeps NORTH_STAR substantive). */
function stripNorthStarNotReadySentinel(md) {
  return String(md || '').replace(/^\s*NORTH_STAR_NOT_READY\s*$/gim, '_(Inferred — replace with a concrete product vision.)_');
}

function extractNorthStarPurposeForInstaller(md, humanFocus, projectName) {
  const v = extractMarkdownSection(md, 'Vision').trim();
  if (humanFocus) return `${humanFocus} — ${v.slice(0, 400)}`.trim().slice(0, 600);
  if (v) return v.slice(0, 600);
  return `Existing codebase (${projectName}); details in HEXCURSE/NORTH_STAR.md`;
}

/**
 * LLM call for install-time only (OpenAI-compatible or Anthropic). Uses the same credentials as Taskmaster setup.
 */
async function installTimeLlmComplete(answers, system, user) {
  const { provider, taskmasterEnv } = answers;
  const userText = String(user || '');
  if (provider === 'anthropic') {
    const apiKey = String(taskmasterEnv.ANTHROPIC_API_KEY || '').trim();
    if (!apiKey) throw new Error('Anthropic API key missing');
    const model = String(process.env.HEXCURSE_INSTALL_MODEL || 'claude-sonnet-4-20250514').trim();
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        temperature: 0.2,
        system,
        messages: [{ role: 'user', content: userText }],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Anthropic HTTP ${res.status}: ${t.slice(0, 500)}`);
    }
    const data = await res.json();
    const block = data.content && data.content[0];
    return block && block.type === 'text' ? block.text : '';
  }
  const apiKey = String(
    taskmasterEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY || 'lm-studio'
  ).trim();
  let baseURL = String(taskmasterEnv.OPENAI_BASE_URL || '').trim();
  if (!baseURL) {
    baseURL = provider === 'openai' ? 'https://api.openai.com/v1' : lmStudioBaseUrlFromEnv();
  }
  baseURL = normalizeLmStudioV1BaseUrl(baseURL);
  let model = String(process.env.HEXCURSE_INSTALL_MODEL || '').trim();
  if (!model) {
    if (provider === 'lmstudio') {
      model = String(process.env.HEXCURSE_LM_STUDIO_MODEL || 'qwen3.5-2b').trim();
    } else {
      model = 'gpt-4o-mini';
    }
  }
  const endpoint = `${baseURL.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText },
      ],
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 600)}`);
  }
  const data = await res.json();
  const rawContent = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';
  return extractOpenAiMessageText(rawContent);
}

/**
 * Draft NORTH_STAR.md from a repomix snapshot plus optional human focus; returns fields for PRD/base.mdc.
 */
async function generateNorthStarFromExistingRepo({
  provider,
  taskmasterEnv,
  snapshot,
  humanFocus,
  projectName,
}) {
  const system = `You document an existing software repository for HexCurse governance.
Output Markdown only. Do not wrap the full document in a fenced code block.
First heading must be exactly: # North Star

Required ## headings (in this order):
## Vision
## Inferred stack
## Key modules and layout
## Suggested first tasks for Taskmaster
## Out of scope
## Definition of done
## Notes

Rules:
- Mark guesses as (inferred) or TBD.
- Never output a line containing only the text NORTH_STAR_NOT_READY.
- Do not invent secrets, keys, or credentials.
- Under **Suggested first tasks for Taskmaster**, output a numbered list (onboarding, tests, CI, risky areas) specific to this repo.
- If the snapshot says it was truncated, acknowledge it under Notes.`;
  const user = [
    humanFocus ? `Human-provided focus: ${humanFocus}\n\n` : '',
    `Project folder name: ${projectName}\n\n`,
    '--- REPOSITORY SNAPSHOT (repomix or fallback) ---\n\n',
    snapshot,
  ].join('');

  const raw = await installTimeLlmComplete({ provider, taskmasterEnv }, system, user);
  let md = stripNorthStarNotReadySentinel(String(raw || '').trim());
  if (md.length < 200) throw new Error('Model returned empty or very short NORTH_STAR');
  if (!/^#\s+North\s+Star/im.test(md)) {
    md = `# North Star\n\n${md}`;
  }
  if (!/\*\*Project:\*\*/i.test(md)) {
    md = md.replace(/^(#\s+North\s+Star[^\n]*\n)/im, `$1\n**Project:** ${projectName}\n\n`);
  }
  const purpose = extractNorthStarPurposeForInstaller(md, humanFocus, projectName);
  const stack =
    extractMarkdownSection(md, 'Inferred stack').trim() || 'See HEXCURSE/NORTH_STAR.md — Inferred stack';
  const modules =
    extractMarkdownSection(md, 'Key modules and layout').trim() ||
    'See HEXCURSE/NORTH_STAR.md — Key modules and layout';
  const outOfScope = extractMarkdownSection(md, 'Out of scope').trim() || 'TBD — confirm with human';
  const dod = extractMarkdownSection(md, 'Definition of done').trim() || 'Taskmaster reflects onboarding tasks for this repo';
  return {
    northStarMd: `${md.trim()}\n`,
    purpose: purpose.slice(0, 600),
    stack: stack.slice(0, 1200),
    modules: modules.slice(0, 1200),
    outOfScope: outOfScope.slice(0, 800),
    dod: dod.slice(0, 800),
  };
}

/** Quick install: HEXCURSE_REPO_KIND=existing — repomix + LLM draft before files are written. */
async function enrichExistingRepoQuick(cwd, answers) {
  console.log(
    chalk.bold('\nExisting codebase mode'),
    chalk.dim('(HEXCURSE_REPO_KIND=existing) — repomix snapshot + NORTH_STAR draft…')
  );
  const snapshot = runRepomixCompressSnapshot(cwd);
  console.log(chalk.dim(`Snapshot length: ${snapshot.length} characters`));
  const humanFocus = String(process.env.HEXCURSE_HUMAN_FOCUS || '').trim();
  const projectName = answers.projectName;
  try {
    const draft = await generateNorthStarFromExistingRepo({
      provider: answers.provider,
      taskmasterEnv: answers.taskmasterEnv,
      snapshot,
      humanFocus,
      projectName,
    });
    answers.purpose = draft.purpose;
    answers.stack = draft.stack;
    answers.modules = draft.modules;
    answers.outOfScope = draft.outOfScope;
    answers.dod = draft.dod;
    answers.northStarDraftMd = draft.northStarMd;
    answers.repoKind = 'existing';
    console.log(chalk.green('✓'), 'Drafted NORTH_STAR.md from repository snapshot');
  } catch (e) {
    console.error(chalk.red('NORTH_STAR auto-draft failed:'), e.message);
    console.log(
      chalk.yellow('Continuing with template NORTH_STAR and env/default PRD fields — fill NORTH_STAR.md manually.')
    );
    answers.repoKind = 'existing';
    answers.northStarDraftMd = null;
  }
}

/** Rewrite HEXCURSE/DIRECTIVES.md ## 📋 Queued from Taskmaster tasks.json. */
function syncDirectivesQueuedFromTasks(cwd) {
  const directivesPath = path.join(cwd, HEXCURSE_ROOT, 'DIRECTIVES.md');
  if (!fs.existsSync(directivesPath)) {
    console.warn(chalk.yellow('⚠'), 'HEXCURSE/DIRECTIVES.md missing — skip Queued sync');
    return;
  }
  const tasksPath = path.join(cwd, '.taskmaster', 'tasks', 'tasks.json');
  if (!fs.existsSync(tasksPath)) {
    console.warn(chalk.yellow('⚠'), '.taskmaster/tasks/tasks.json missing — skip Queued sync');
    return;
  }
  let tasksData;
  try {
    tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
  } catch (e) {
    console.warn(chalk.yellow('⚠'), 'tasks.json parse error — skip Queued sync');
    return;
  }
  const tasks = (tasksData.master && tasksData.master.tasks) || tasksData.tasks || [];
  if (!Array.isArray(tasks) || tasks.length === 0) {
    console.warn(chalk.yellow('⚠'), 'No tasks in tasks.json — skip Queued sync');
    return;
  }
  const sorted = [...tasks].sort((a, b) => {
    const na = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
    return na - nb;
  });
  const lines = sorted.map((t) => {
    const idNum = String(t.id).replace(/\D/g, '') || String(t.id);
    const d = `D${idNum.padStart(3, '0')}`;
    const deps =
      Array.isArray(t.dependencies) && t.dependencies.length ? t.dependencies.join(', ') : 'none';
    const pri = t.priority || 'medium';
    const title = String(t.title || 'Task').trim();
    return `- ${d}: ${title} | Priority: ${pri} | Depends on: ${deps}`;
  });
  const queuedBody = `\n\n${lines.join('\n')}\n\n`;
  let md = fs.readFileSync(directivesPath, 'utf8');
  const marker = '## 📋 Queued';
  const idx = md.indexOf(marker);
  if (idx === -1) {
    console.warn(chalk.yellow('⚠'), 'DIRECTIVES.md has no ## 📋 Queued — skip sync');
    return;
  }
  const afterMarker = md.slice(idx + marker.length);
  const nextSection = afterMarker.search(/\n## /);
  const rest = nextSection === -1 ? '' : afterMarker.slice(nextSection);
  md = md.slice(0, idx + marker.length) + queuedBody + rest;
  fs.writeFileSync(directivesPath, md, 'utf8');
  console.log(chalk.green('✓'), 'Synced HEXCURSE/DIRECTIVES.md ## 📋 Queued from Taskmaster tasks.json');
}

/** Writes gitignored absolute path to this package's setup.js so agents can run --run-hexcurse. */
async function writeInstallerPathFile(cwd) {
  const self = path.resolve(__dirname, 'setup.js');
  const rel = path.join('.cursor', 'hexcurse-installer.path');
  const full = path.join(cwd, rel);
  try {
    await fs.ensureDir(path.dirname(full));
    await fs.writeFile(full, `${self}\n`, 'utf8');
    console.log(chalk.green('✓'), 'Wrote', rel, chalk.dim('(absolute path to cursor-governance setup.js)'));
  } catch (e) {
    console.warn(chalk.yellow('⚠'), 'Could not write', rel, e.message);
  }
}

/** Overwrite HEXCURSE/ONE_PROMPT.md so the single-paste flow stays current with the installer. */
async function writeOnePromptFile(cwd, projectName) {
  const rel = path.join(HEXCURSE_ROOT, 'ONE_PROMPT.md');
  const full = path.join(cwd, rel);
  await fs.ensureDir(path.dirname(full));
  await fs.writeFile(full, readBundledOnePromptTemplate(projectName), 'utf8');
  console.log(chalk.green('✓ Wrote'), rel, chalk.dim('— paste this after filling HEXCURSE/NORTH_STAR.md'));
}

/** Overwrite HEXCURSE/HEADLESS_KICKOFF.txt for Cursor headless CLI (`agent -p --model composer-2`). */
async function writeHeadlessKickoffFile(cwd, projectName) {
  const rel = path.join(HEXCURSE_ROOT, 'HEADLESS_KICKOFF.txt');
  const full = path.join(cwd, rel);
  await fs.ensureDir(path.dirname(full));
  await fs.writeFile(full, readBundledHeadlessKickoffTemplate(projectName), 'utf8');
  console.log(chalk.green('✓ Wrote'), rel, chalk.dim('— Cursor headless CLI prompt (Composer 2)'));
}

/** NORTH_STAR → PRD → parse-prd → DIRECTIVES Queued sync. */
async function runNorthStarBridge(cwd, opts) {
  const raw = Boolean(opts && opts.raw) || process.env.HEXCURSE_SKIP_AI_EXPAND === '1';
  console.log(chalk.bold('\nNORTH STAR → HexCurse bridge'), chalk.dim(`cwd: ${cwd}`));
  loadDotEnvFromFile(cwd, {
    forceKeys: ['OPENAI_BASE_URL', 'OPENAI_API_KEY', 'HEXCURSE_EXPAND_MODEL'],
  });
  await writeInstallerPathFile(cwd);
  const { path: northPath, legacy } = resolveNorthStarPathForRead(cwd);
  if (legacy) {
    console.log(
      chalk.yellow('⚠'),
      'Using legacy repo-root NORTH_STAR.md — move to HEXCURSE/NORTH_STAR.md when convenient.'
    );
  }
  if (!fs.existsSync(northPath)) {
    console.error(
      chalk.red('NORTH_STAR.md not found (expected HEXCURSE/NORTH_STAR.md).'),
      chalk.dim('Run cursor-governance install or copy cursor-governance/templates/NORTH_STAR.md into HEXCURSE/')
    );
    process.exit(1);
  }
  const northStarText = fs.readFileSync(northPath, 'utf8');
  if (!isNorthStarSubstantive(northStarText)) {
    console.error(
      chalk.red('NORTH_STAR.md looks empty or still the boilerplate template.'),
      chalk.dim('Replace it with your full project idea (see template instructions), then re-run.')
    );
    process.exit(1);
  }
  if (!fs.existsSync(path.join(cwd, '.taskmaster'))) {
    console.error(chalk.red('.taskmaster/ not found. Run task-master init in this repo first (or re-run cursor-governance install).'));
    process.exit(1);
  }
  const prdPath = path.join(cwd, '.taskmaster', 'docs', 'prd.txt');
  await fs.ensureDir(path.dirname(prdPath));
  let prdMd;
  if (raw) {
    prdMd = buildPrdFromNorthStarRaw(northStarText);
    console.log(chalk.dim('Using raw north star as PRD (no AI).'));
  } else {
    try {
      prdMd = await expandNorthStarToPrdMarkdown(cwd, northStarText);
      console.log(chalk.green('✓'), 'AI expanded NORTH_STAR → PRD markdown');
    } catch (e) {
      console.error(chalk.red('AI expansion failed:'), e.message);
      console.error(
        chalk.dim(
          'Tip: HEXCURSE_DEBUG_BRIDGE=1 re-run to log URL; ensure .env and .taskmaster/config.json use your PC LAN IP (not Tailscale unless this machine is on Tailscale). Or: node setup.js --run-hexcurse-raw'
        )
      );
      process.exit(1);
    }
  }
  await fs.writeFile(prdPath, prdMd, 'utf8');
  console.log(chalk.green('✓'), 'Wrote', path.relative(cwd, prdPath));
  maybePreflightCursorAgentBeforeTaskmasterParsePrd();
  const tmEnv = taskmasterChildEnvForBridge(cwd);
  const prdRel = path.join('.taskmaster', 'docs', 'prd.txt');
  if (!runCmd(cwd, `task-master parse-prd --force "${prdRel}"`, 'task-master parse-prd', tmEnv)) {
    console.warn(
      chalk.yellow('⚠'),
      'parse-prd failed — fix LM Studio / API, then re-run --run-hexcurse or: task-master parse-prd --force .taskmaster/docs/prd.txt'
    );
    process.exitCode = 1;
    return;
  }
  if (fs.existsSync(path.join(cwd, HEXCURSE_ROOT))) {
    syncDirectivesQueuedFromTasks(cwd);
  } else {
    console.warn(
      chalk.yellow('⚠'),
      'No HEXCURSE/ pack in this repo — skipped DIRECTIVES Queued sync. Run bridge from a cursor-governance–installed project, or sync root DIRECTIVES.md manually.'
    );
  }
  console.log(
    chalk.green('\n✓ Bridge complete.'),
    chalk.dim(
      fs.existsSync(path.join(cwd, HEXCURSE_ROOT))
        ? 'Paste HEXCURSE/SESSION_START_PROMPT.md in a new chat to continue.'
        : 'Open SESSION_START docs for this repo layout and continue.'
    )
  );
}

/** Prints health check from current working directory (target repo). */
function runDoctor(cwd) {
  ensureHexcurseSourceRepoDoctorArtifacts(cwd);
  const sourceRepo = isHexcurseGovernanceSourceRepo(cwd);
  const ok = [];
  const bad = [];
  const warn = [];
  const hexRoot = path.join(cwd, HEXCURSE_ROOT);
  const hexPaths = path.join(hexRoot, 'PATHS.json');
  const legSess = path.join(cwd, 'docs', 'SESSION_START_PROMPT.md');
  const hexSess = path.join(hexRoot, 'SESSION_START_PROMPT.md');
  const hexAgents = path.join(hexRoot, 'AGENTS.md');
  const rootAgents = path.join(cwd, 'AGENTS.md');
  const mcpPath = path.join(os.homedir(), '.cursor', 'mcp.json');
  const tmRoot = path.join(cwd, '.taskmaster');
  const tasksJson = path.join(tmRoot, 'tasks', 'tasks.json');
  const ciRelaxed = isDoctorCiRelaxed();
  if (ciRelaxed) {
    ok.push('Doctor CI mode: ~/.cursor/mcp.json + task-master PATH are non-blocking (set HEXCURSE_DOCTOR_CI=1 locally to match)');
  }

  if (fs.existsSync(hexRoot)) {
    if (fs.existsSync(hexPaths)) {
      try {
        const j = JSON.parse(fs.readFileSync(hexPaths, 'utf8'));
        if (j.schema === 'hexcurse-paths-v1' && j.paths && typeof j.paths === 'object') {
          ok.push('HEXCURSE/PATHS.json schema OK');
        } else {
          bad.push('HEXCURSE/PATHS.json missing schema or paths object');
        }
      } catch (e) {
        bad.push(`HEXCURSE/PATHS.json invalid JSON: ${e.message}`);
      }
    } else {
      bad.push('HEXCURSE/ exists but PATHS.json is missing');
    }
  } else {
    ok.push('No HEXCURSE/ folder — legacy layout (PATHS.json not required)');
  }

  if (fs.existsSync(hexSess)) ok.push('HEXCURSE/SESSION_START_PROMPT.md present');
  else if (fs.existsSync(legSess)) ok.push('Legacy docs/SESSION_START_PROMPT.md present');
  else bad.push('No SESSION_START_PROMPT.md (HEXCURSE or docs/)');

  if (fs.existsSync(hexAgents)) ok.push('HEXCURSE/AGENTS.md present');
  else if (fs.existsSync(rootAgents)) ok.push('Root AGENTS.md present');
  else bad.push('No AGENTS.md');

  if (fs.existsSync(path.join(cwd, '.cursor', 'rules', 'mcp-usage.mdc'))) ok.push('.cursor/rules/mcp-usage.mdc present');
  else bad.push('.cursor/rules/mcp-usage.mdc missing');
  if (fs.existsSync(path.join(cwd, '.cursor', 'rules', 'governance.mdc'))) ok.push('.cursor/rules/governance.mdc present');
  else warn.push('.cursor/rules/governance.mdc missing — run install or --refresh-rules');

  const clIndex = path.join(cwd, '.cursor', 'hooks', 'state', 'continual-learning-index.json');
  if (fs.existsSync(clIndex)) ok.push('continual-learning index present (.cursor/hooks/state/continual-learning-index.json)');
  else warn.push('continual-learning index missing — run cursor-governance install in this repo (seeds .cursor/hooks/state/)');

  const taxRoot = path.join(cwd, 'docs', 'MEMORY_TAXONOMY.md');
  const taxHex = path.join(cwd, HEXCURSE_ROOT, 'docs', 'MEMORY_TAXONOMY.md');
  if (fs.existsSync(taxHex)) ok.push('HEXCURSE/docs/MEMORY_TAXONOMY.md present');
  else if (fs.existsSync(taxRoot)) ok.push('Legacy docs/MEMORY_TAXONOMY.md present (prefer HEXCURSE/docs/)');
  else warn.push('HEXCURSE/docs/MEMORY_TAXONOMY.md missing — continual learning taxonomy not installed');

  const rollHex = path.join(cwd, HEXCURSE_ROOT, 'docs', 'ROLLING_CONTEXT.md');
  const rollRoot = path.join(cwd, 'docs', 'ROLLING_CONTEXT.md');
  if (fs.existsSync(rollHex)) ok.push('HEXCURSE/docs/ROLLING_CONTEXT.md present');
  else if (fs.existsSync(rollRoot)) ok.push('Legacy docs/ROLLING_CONTEXT.md present (prefer HEXCURSE/docs/)');
  else warn.push('HEXCURSE/docs/ROLLING_CONTEXT.md missing — optional; installer seeds it on new projects');

  const skillsDir = path.join(cwd, '.cursor', 'skills');
  if (fs.existsSync(skillsDir)) ok.push('.cursor/skills/ present');
  else warn.push('.cursor/skills/ missing — optional; create for procedural skills');

  const skQueue = path.join(cwd, '.cursor', 'hooks', 'state', 'skill-promotion-queue.json');
  if (fs.existsSync(skQueue)) ok.push('skill-promotion-queue.json present');
  else warn.push('skill-promotion-queue.json missing — optional seed from cursor-governance install');

  if (fs.existsSync(tasksJson)) {
    try {
      const tasksData = JSON.parse(fs.readFileSync(tasksJson, 'utf8'));
      const tasks = (tasksData.master && tasksData.master.tasks) || tasksData.tasks || [];
      if (tasks.length === 0) {
        warn.push(
          'tasks.json exists but has 0 tasks — run --parse-prd-via-agent to generate task graph'
        );
      } else if (
        tasks.length === 1 &&
        tasks[0].title &&
        tasks[0].title.toLowerCase().includes('placeholder')
      ) {
        warn.push(
          'tasks.json contains only the placeholder stub — run --parse-prd-via-agent to generate real task graph'
        );
      } else {
        ok.push(`tasks.json has ${tasks.length} task(s)`);
      }
    } catch (e) {
      warn.push('tasks.json exists but could not be parsed as valid JSON');
    }
  } else if (fs.existsSync(tmRoot)) bad.push('.taskmaster/ exists but tasks/tasks.json missing');
  else warn.push('.taskmaster/ not found — run task-master init when you use Taskmaster');

  const northPack = pathNorthStarPack(cwd);
  const northLegacy = path.join(cwd, 'NORTH_STAR.md');
  if (fs.existsSync(northPack)) ok.push('HEXCURSE/NORTH_STAR.md present (north star bridge entry point)');
  else if (fs.existsSync(northLegacy)) {
    if (sourceRepo) {
      ok.push('Repo-root NORTH_STAR.md present (HexCurse / cursor-governance source layout)');
    } else {
      warn.push('Legacy repo-root NORTH_STAR.md present — move to HEXCURSE/NORTH_STAR.md for single-folder layout');
    }
  } else {
    warn.push('HEXCURSE/NORTH_STAR.md missing — installer seeds it; use --run-hexcurse after filling');
  }

  const cursorPack = path.join(cwd, HEXCURSE_ROOT, 'CURSOR.md');
  if (fs.existsSync(cursorPack)) ok.push('HEXCURSE/CURSOR.md present');
  else if (fs.existsSync(path.join(cwd, 'CURSOR.md'))) {
    if (sourceRepo) {
      ok.push('Repo-root CURSOR.md present (HexCurse / cursor-governance source layout)');
    } else {
      warn.push('Legacy repo-root CURSOR.md present — use HEXCURSE/CURSOR.md');
    }
  }

  const onePrompt = path.join(cwd, HEXCURSE_ROOT, 'ONE_PROMPT.md');
  if (fs.existsSync(onePrompt)) ok.push('HEXCURSE/ONE_PROMPT.md present (single-message Cursor kickoff)');
  else if (fs.existsSync(hexRoot)) warn.push('HEXCURSE/ONE_PROMPT.md missing — re-run install to regenerate');

  const headlessKick = path.join(cwd, HEXCURSE_ROOT, 'HEADLESS_KICKOFF.txt');
  if (fs.existsSync(headlessKick)) ok.push('HEXCURSE/HEADLESS_KICKOFF.txt present (headless CLI kickoff)');
  else if (fs.existsSync(hexRoot)) warn.push('HEXCURSE/HEADLESS_KICKOFF.txt missing — re-run install to regenerate');

  const instPath = path.join(cwd, '.cursor', 'hexcurse-installer.path');
  if (fs.existsSync(instPath)) ok.push('.cursor/hexcurse-installer.path present (path to setup.js for agents)');
  else
    warn.push(
      '.cursor/hexcurse-installer.path missing — run install or `node …/setup.js --run-hexcurse` once to create it'
    );

  const rulesDir = path.join(cwd, '.cursor', 'rules');
  if (fs.existsSync(rulesDir)) {
    try {
      const mdc = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.mdc'));
      ok.push(`.cursor/rules: ${mdc.length} rule file(s) — ${mdc.sort().join(', ')}`);
    } catch (e) {
      warn.push(`.cursor/rules: could not list (${e.message})`);
    }
  } else {
    bad.push('.cursor/rules/ directory missing');
  }

  if (sourceRepo) {
    ok.push('Layout: HexCurse source — no HEXCURSE/ pack (governance at repo root)');
  } else if (fs.existsSync(hexRoot)) {
    ok.push('Layout: consumer — HEXCURSE/ governance pack present');
  } else {
    ok.push('Layout: legacy — root-level docs without HEXCURSE/ pack');
  }

  const parityRoot = path.join(cwd, 'docs', 'GOVERNANCE_PARITY.md');
  const parityHex = path.join(cwd, HEXCURSE_ROOT, 'docs', 'GOVERNANCE_PARITY.md');
  if (fs.existsSync(parityHex)) ok.push('HEXCURSE/docs/GOVERNANCE_PARITY.md present');
  else if (fs.existsSync(parityRoot)) ok.push('docs/GOVERNANCE_PARITY.md present (governance parity)');
  else warn.push('docs/GOVERNANCE_PARITY.md missing — see template in cursor-governance');

  if (fs.existsSync(hexRoot)) {
    const templatesRoot = path.join(__dirname, 'templates');
    if (fs.existsSync(templatesRoot)) {
      try {
        const fp = fingerprintTemplateDirectory(templatesRoot);
        const hexDocs = path.join(cwd, HEXCURSE_ROOT, 'docs');
        const docCount = fs.existsSync(hexDocs) ? countFilesRecursive(hexDocs, () => true) : 0;
        ok.push(
          `Template parity (consumer): ${fp.fileCount} installer template file(s), fingerprint sha256:${fp.fingerprintHex.slice(0, 16)}… — HEXCURSE/docs: ${docCount} file(s)`
        );
      } catch (e) {
        warn.push(`Template parity check failed: ${e.message}`);
      }
    } else {
      warn.push('cursor-governance/templates not found next to setup.js — template parity skipped');
    }
  }

  if (fs.existsSync(mcpPath)) {
    migrateSentryMcpEnvInMcpJson(mcpPath);
    migrateSemgrepMcpInMcpJson(mcpPath);
    ok.push('~/.cursor/mcp.json present');
    try {
      const mj = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
      const names = mj.mcpServers && typeof mj.mcpServers === 'object' ? Object.keys(mj.mcpServers) : [];
      const mcpServers = mj.mcpServers && typeof mj.mcpServers === 'object' ? mj.mcpServers : {};
      const semgrepEntry = mcpServers.semgrep;
      if (semgrepEntry) {
        if (!semgrepEntry.command && !semgrepEntry.url) {
          warn.push('semgrep entry has neither command nor url');
        } else if (semgrepEntry.command && String(semgrepEntry.command).includes('uvx')) {
          warn.push(
            'semgrep MCP is using deprecated uvx/stdio pattern — update to streamable-http: https://mcp.semgrep.ai/mcp'
          );
        }
      }
      if (names.includes('github')) ok.push('mcp.json defines github server');
      else if (ciRelaxed) warn.push('mcp.json has no github server entry (non-blocking in CI)');
      else warn.push('mcp.json has no github server entry (optional — local git + push; add github MCP only for PR/issue automation)');
      if (names.includes('jcodemunch')) ok.push('mcp.json defines jcodemunch server');
      else if (ciRelaxed) warn.push('mcp.json has no jcodemunch entry (non-blocking in CI)');
      else warn.push('mcp.json has no jcodemunch entry (recommended — RULE 10 / jcodemunch-mcp via uvx; installer merges it)');
      if (names.includes('taskmaster-ai')) ok.push('mcp.json defines taskmaster-ai');
      else if (ciRelaxed) warn.push('mcp.json has no taskmaster-ai entry (non-blocking in CI)');
      else bad.push('mcp.json has no taskmaster-ai entry');
      const mcpOptionalWarn = (id, hint) => {
        if (names.includes(id)) ok.push(`mcp.json defines ${id} server`);
        else if (ciRelaxed) warn.push(`mcp.json has no ${id} entry (non-blocking in CI)`);
        else warn.push(`mcp.json has no ${id} entry (${hint})`);
      };
      mcpOptionalWarn('context7', 'recommended — library API docs');
      mcpOptionalWarn('repomix', 'recommended — structural repo map');
      mcpOptionalWarn('serena', 'recommended — symbol-level edits');
      mcpOptionalWarn('gitmcp', 'optional — niche GitHub library docs');
      mcpOptionalWarn('gitmcp-adafruit-mpu6050', 'optional — Adafruit MPU6050 hardware docs via gitmcp.io');
      mcpOptionalWarn('sequential-thinking', 'recommended — planning');
      mcpOptionalWarn('memory', 'recommended — durable facts');
      mcpOptionalWarn('supabase', 'optional — Supabase MCP when using Supabase backend');
      mcpOptionalWarn('playwright', 'optional — UI / debugging.mdc');
      mcpOptionalWarn('semgrep', 'recommended — security.mdc');
      mcpOptionalWarn('sentry', 'optional — error context');
      mcpOptionalWarn('firecrawl', 'optional — research');
      mcpOptionalWarn('linear', 'optional — linear-sync.mdc');
      mcpOptionalWarn('pampa', 'optional — semantic skill search');
    } catch (e) {
      if (ciRelaxed) warn.push(`~/.cursor/mcp.json parse error (non-blocking in CI): ${e.message}`);
      else bad.push(`~/.cursor/mcp.json parse error: ${e.message}`);
    }
  } else if (ciRelaxed) {
    warn.push('~/.cursor/mcp.json missing (expected on CI runners — configure locally for MCP)');
  } else {
    bad.push('~/.cursor/mcp.json missing');
  }

  if (fs.existsSync(hexRoot)) {
    const mcpBudgetDoc = path.join(cwd, HEXCURSE_ROOT, 'docs', 'MCP_TOKEN_BUDGET.md');
    if (!fs.existsSync(mcpBudgetDoc)) {
      warn.push('HEXCURSE/docs/MCP_TOKEN_BUDGET.md missing — re-run install or copy from cursor-governance/templates');
    }
    const adrLogDoc = path.join(cwd, HEXCURSE_ROOT, 'docs', 'ADR_LOG.md');
    if (!fs.existsSync(adrLogDoc)) {
      warn.push('HEXCURSE/docs/ADR_LOG.md missing — re-run install for ADR stub');
    }
  }

  for (const ruleName of ['security.mdc', 'adr.mdc', 'memory-management.mdc', 'debugging.mdc']) {
    const rp = path.join(cwd, '.cursor', 'rules', ruleName);
    if (!fs.existsSync(rp)) {
      warn.push(`.cursor/rules/${ruleName} missing — run install or --refresh-rules`);
    }
  }

  if (fs.existsSync(skillsDir)) {
    try {
      const mdSkills = fs.readdirSync(skillsDir).filter((f) => f.endsWith('.md')).length;
      if (mdSkills >= 3 && !fs.existsSync(path.join(cwd, '.pampa'))) {
        warn.push(
          '.cursor/skills has 3+ .md files but no .pampa/ index — run `npx -y --package=pampa pampa-mcp index .cursor/skills/` or re-run install'
        );
      }
    } catch (e) {
      warn.push(`.cursor/skills: could not check PAMPA index (${e.message})`);
    }
  }

  try {
    const rootEnts = fs.readdirSync(cwd, { withFileTypes: true });
    for (const ent of rootEnts) {
      if (!ent.isDirectory()) continue;
      const n = ent.name;
      if (n.startsWith('.') || n === 'node_modules' || n === HEXCURSE_ROOT) continue;
      if (n === 'cursor-governance' && sourceRepo) continue;
      const subPkg = path.join(cwd, n, 'package.json');
      const subAgents = path.join(cwd, n, 'AGENTS.md');
      if (fs.existsSync(subPkg) && !fs.existsSync(subAgents)) {
        warn.push(
          `Monorepo folder ${n}/ has package.json but no AGENTS.md — add hierarchical AGENTS.md (existing-repo install or copy template)`
        );
      }
    }
  } catch (e) {
    warn.push(`Monorepo AGENTS.md scan failed: ${e.message}`);
  }

  if (fs.existsSync(hexRoot)) {
    const adrPath = path.join(cwd, HEXCURSE_ROOT, 'docs', 'ADR_LOG.md');
    if (fs.existsSync(adrPath)) {
      const sessionLogPath = resolveSessionLogForRollup(cwd);
      let sessionMd = '';
      if (fs.existsSync(sessionLogPath)) {
        try {
          sessionMd = fs.readFileSync(sessionLogPath, 'utf8');
        } catch (_) {
          /* skip */
        }
      }
      const sessionBlocks = (sessionMd.match(/^### Session /gm) || []).length;
      if (sessionBlocks >= 5) {
        try {
          const adrText = fs.readFileSync(adrPath, 'utf8');
          if (!/###\s+ADR-/m.test(adrText)) {
            warn.push(
              'HEXCURSE/docs/ADR_LOG.md has no ADR entries after 5+ session blocks in SESSION_LOG — add ADRs per adr.mdc'
            );
          }
        } catch (_) {
          /* skip */
        }
      }
    }
  }

  try {
    execSync('task-master --version', { shell: true, stdio: 'pipe', encoding: 'utf8' });
    ok.push('task-master CLI on PATH');
  } catch (e) {
    if (ciRelaxed) warn.push('task-master not on PATH (non-blocking in CI; install task-master-ai globally for local dev)');
    else bad.push('task-master not on PATH (install task-master-ai globally)');
  }

  console.log(chalk.cyan.bold('\nhexcurse-doctor'), chalk.dim(`cwd: ${cwd}\n`));
  ok.forEach((s) => console.log(chalk.green('✓'), s));
  warn.forEach((s) => console.log(chalk.yellow('!'), s));
  bad.forEach((s) => console.log(chalk.red('✗'), s));
  console.log('');
  if (bad.length) {
    console.log(chalk.yellow('Fix blocking issues above, then re-run doctor or the installer.\n'));
    process.exitCode = 1;
  } else {
    console.log(chalk.green('No blocking issues.\n'));
  }
}

/** Overwrites one .mdc in .cursor/rules and HEXCURSE/rules when the pack exists (always-on refresh). */
async function writeGovernanceRuleForceful(cwd, basename, content, hasHexDir) {
  await fs.ensureDir(path.join(cwd, '.cursor', 'rules'));
  await fs.writeFile(path.join(cwd, '.cursor', 'rules', basename), content, 'utf8');
  if (hasHexDir) {
    await fs.ensureDir(path.join(cwd, HEXCURSE_ROOT, 'rules'));
    await fs.writeFile(path.join(cwd, HEXCURSE_ROOT, 'rules', basename), content, 'utf8');
  }
}

/** Overwrites rule files from bundled templates; rebuilds base.mdc from repo docs when possible. */
async function runRefreshRules(cwd) {
  const pkg = readInstallerPackageJson();
  console.log(chalk.bold(`cursor-governance ${pkg.version}`), chalk.dim('— refresh-rules\n'));

  const hexAgents = path.join(cwd, HEXCURSE_ROOT, 'AGENTS.md');
  const rootAgents = path.join(cwd, 'AGENTS.md');
  const hexArch = path.join(cwd, HEXCURSE_ROOT, 'docs', 'ARCHITECTURE.md');
  const rootArch = path.join(cwd, 'docs', 'ARCHITECTURE.md');
  const hexBase = path.join(cwd, HEXCURSE_ROOT, 'rules', 'base.mdc');
  const cursorBase = path.join(cwd, '.cursor', 'rules', 'base.mdc');

  let projectName = 'Project';
  let purpose = 'Governed Cursor workspace — confirm purpose in ARCHITECTURE.md';
  let stack = 'TBD — confirm with human';
  let outOfScope = 'TBD — confirm with human';
  let sacredCsv = 'No secrets in git; one directive per session; confirm stack with human';

  const agentsPath = (await fs.pathExists(hexAgents)) ? hexAgents : rootAgents;
  const archPath = (await fs.pathExists(hexArch)) ? hexArch : rootArch;

  if (await fs.pathExists(agentsPath)) {
    projectName = extractProjectNameFromAgents(await fs.readFile(agentsPath, 'utf8'));
  }
  if (await fs.pathExists(archPath)) {
    const arch = await fs.readFile(archPath, 'utf8');
    purpose = extractMarkdownSection(arch, 'Purpose') || purpose;
    stack = extractMarkdownSection(arch, 'Tech Stack') || stack;
    outOfScope = extractMarkdownSection(arch, 'Out of Scope') || outOfScope;
  }

  const oldBasePath = (await fs.pathExists(hexBase)) ? hexBase : cursorBase;
  if (await fs.pathExists(oldBasePath)) {
    const prev = await fs.readFile(oldBasePath, 'utf8');
    const sacred = extractSacredCsvFromBaseMdc(prev);
    if (sacred) sacredCsv = sacred;
  }

  const constraintsBullets = formatConstraintBullets(sacredCsv);
  const baseContent = baseMdc(
    projectName.trim(),
    purpose.trim(),
    constraintsBullets,
    stack.trim(),
    outOfScope.trim()
  );

  const hasHexDir = await fs.pathExists(path.join(cwd, HEXCURSE_ROOT));
  const governanceContent = readBundledGovernanceMdc();
  await writeGovernanceRuleForceful(cwd, 'mcp-usage.mdc', MCP_USAGE_TEMPLATE, hasHexDir);
  await writeGovernanceRuleForceful(cwd, 'process-gates.mdc', PROCESS_GATES_TEMPLATE, hasHexDir);
  await writeGovernanceRuleForceful(cwd, 'base.mdc', baseContent, hasHexDir);
  await writeGovernanceRuleForceful(cwd, 'governance.mdc', governanceContent, hasHexDir);
  await writeGovernanceRuleForceful(cwd, 'security.mdc', SECURITY_MDC_TEMPLATE, hasHexDir);
  await writeGovernanceRuleForceful(cwd, 'adr.mdc', ADR_MDC_TEMPLATE, hasHexDir);
  await writeGovernanceRuleForceful(cwd, 'memory-management.mdc', MEMORY_MANAGEMENT_MDC_TEMPLATE, hasHexDir);
  await writeGovernanceRuleForceful(cwd, 'debugging.mdc', DEBUGGING_MDC_TEMPLATE, hasHexDir);
  await writeGovernanceRuleForceful(cwd, 'multi-agent.mdc', MULTI_AGENT_MDC_TEMPLATE, hasHexDir);
  await writeGovernanceRuleForceful(cwd, 'linear-sync.mdc', LINEAR_SYNC_MDC_TEMPLATE, hasHexDir);
  console.log(chalk.green('✓'), 'Wrote .cursor/rules/*.mdc (10 governance files)');
  if (hasHexDir) {
    console.log(chalk.green('✓'), `Wrote ${HEXCURSE_ROOT}/rules/*.mdc (mirror)`);
  } else {
    console.log(chalk.dim(`(No ${HEXCURSE_ROOT}/ folder — only .cursor/rules updated.)`));
  }
  console.log(chalk.dim('\nRestart Cursor to reload rules.\n'));
}

const PROCESS_GATES_TEMPLATE = `---
description: Short non-negotiable process gates for HexCurse implementation chats
alwaysApply: true
---

# PROCESS GATES (HexCurse — implementation agent)

Full MCP stack, session timeline, and rule mapping: **\`docs/MCP_COORDINATION.md\`** (pack: **\`HEXCURSE/docs/MCP_COORDINATION.md\`**). Binding detail: **\`mcp-usage.mdc\`**. If anything here conflicts, the **stricter** requirement wins.

1. **Memory then Taskmaster:** Query **memory** at session start (before DIRECTIVES / ARCHITECTURE); then **get_tasks** before planning or implementing — or **\`DEGRADED_MODE: <mcp> — <reason>\`** if a server is missing or red.
2. **Structural map:** **repomix --compress** once at session start on an existing codebase — or **DEGRADED_MODE** if repomix is unavailable.
2b. **Indexed code map (local):** **jcodemunch** — **\`resolve_repo\`** / **\`index_folder\`** on the workspace root after repomix when code work is in scope; **\`get_repo_outline\`** / **\`suggest_queries\`** as needed; use **\`search_symbols\`**, **\`get_context_bundle\`**, **\`get_blast_radius\`**, **\`find_references\`**, etc., during work — or **DEGRADED_MODE** (**mcp-usage.mdc** RULE 10).
3. **Plans:** **sequential-thinking** before non-trivial implementation plans — or **DEGRADED_MODE**.
4. **Code:** **jcodemunch** for discovery/impact + **Serena** symbol tools for edits — before broad reads/edits when applicable — or **DEGRADED_MODE** / explicit human approval for large reads per **mcp-usage.mdc**.
5. **Libraries:** **context7** before external library/API calls when relevant — or **DEGRADED_MODE**.
6. **Niche SDKs:** **gitmcp** for firmware / niche GitHub deps not covered as mainstream library docs — or **DEGRADED_MODE**.
7. **Local git & disk:** Work branches with **local git** after scope confirm (**mcp-usage.mdc** RULE 8). **github** MCP is optional (remote PR/issue only). **Source of truth** is the workspace on disk — not GitHub.
8. **Continual learning:** **agents-memory-updater** per **RULE 9** — human request; **governance** paths touched (no debounce); or **parent transcript delta** vs index with **debounce** via **continual-learning.json** \`lastMemoryUpdaterRunDateUtc\`. Optional \`node cursor-governance/setup.js --learning-rollup\` when **lastRollupAt** is stale (appends to **\`HEXCURSE/docs/ROLLING_CONTEXT.md\`** or legacy **\`docs/ROLLING_CONTEXT.md\`**). See **\`docs/CONTINUAL_LEARNING.md\`** (pack: **\`HEXCURSE/docs/CONTINUAL_LEARNING.md\`**).
9. **Memory vs repo:** **Memory** does not override Taskmaster, DIRECTIVES, ARCHITECTURE, or the live tree.

If any required MCP is missing or red in Cursor, announce **\`DEGRADED_MODE\`** and what you will not assume — do not silently skip.

## Gate: Pre-commit security (semgrep)

Before any **git commit** involving **source code** changes:

1. Invoke **semgrep** MCP **\`security_check\`** on all modified source files.
2. If **HIGH** or **CRITICAL** findings: **do not commit** — fix first.
3. If **MEDIUM** findings: commit is permitted, but log findings in **SESSION_LOG.md** under **\`## Security Notes\`**.
4. If **semgrep** is unavailable: note the exception in **SESSION_LOG.md** and proceed only with explicit human awareness.

This gate is mandatory. It cannot be skipped for “small” changes.

## Gate: Architectural decision (adr)

Before implementing any **significant** architectural change:

1. Write an ADR entry to **\`docs/ADR_LOG.md\`** (pack: **\`HEXCURSE/docs/ADR_LOG.md\`**) using the format in **\`adr.mdc\`**.
2. The ADR should be written **before** implementation begins when practical — not only after merge.
3. **Architectural** includes: new dependency, API contract change, data model change, new MCP server or external service, module boundary change, overriding **NORTH_STAR** / **DIRECTIVES** constraints.

## Gate: Session close checklist

Before ending any session, confirm:

- [ ] **Taskmaster** task status updated
- [ ] **Semgrep** final scan run on modified sources; **HIGH/CRITICAL** resolved or logged with exception
- [ ] **Linear** issues synced if **LINEAR_API_KEY** is set
- [ ] **ADR** written for any significant architectural decisions
- [ ] **SESSION_LOG.md** entry written
- [ ] **Memory** MCP updated with key learnings
`;

const MCP_USAGE_TEMPLATE = `---
description: MCP tool automatic behavior — fires without being asked, every session
alwaysApply: true
---

# MCP AUTOMATIC BEHAVIOR RULES
# These are not suggestions. They are hardwired automatic behaviors.
# Every rule below fires on its trigger condition without the human asking.
# If you find yourself about to do something a rule covers — the rule wins.

> **Token budget:** Each active MCP server adds roughly **500–1000** tokens of tool-description overhead per turn. See **\`docs/MCP_TOKEN_BUDGET.md\`** (pack: **\`HEXCURSE/docs/MCP_TOKEN_BUDGET.md\`**) for the full table and guidance on disabling session-conditional servers in **\`~/.cursor/mcp.json\`**.

## SOURCE OF TRUTH — workspace (disk)

HexCurse is enforced on **files in the open Cursor workspace on disk**. Taskmaster, DIRECTIVES, SESSION_LOG, repomix, **jcodemunch**, and Serena operate on **local paths** only.

- **Never** use the **github** MCP (or any remote API) to decide whether a file exists or to browse the tree — unpushed work exists only on disk.
- After the human adds or saves files, read them via **workspace paths** (\`read_file\`, Serena, repomix on the local tree). If a tool cannot see a file that exists on disk, state that and suggest refreshing the workspace / confirming the path — **do not** assume GitHub reflects the working tree.
- **Publishing:** \`git commit\` and \`git push\` are how work reaches GitHub. The **github** MCP is **optional** (PRs, issues, remote queries) and **never** required for governance.

## MANDATORY MCP UTILIZATION

HexCurse sessions must make **full, appropriate** use of available MCP tools. Agents must not default to manual reasoning, broad file reads, or ad hoc repo inspection when an MCP tool exists that can provide the needed data more directly, more accurately, or more efficiently.

### Required MCP-first order
1. **memory** — Read prior durable project facts and constraints first.
2. **taskmaster-ai** — Call **get_tasks** before planning or implementation.
3. **repomix** — Use when structural repo understanding is needed.
4. **jcodemunch** — Tree-sitter index + token-efficient retrieval on the **local workspace** (RULE 10). Use **before** wide manual scanning or ad hoc multi-file reads when the server is available.
5. **sequential-thinking** — Use before presenting any non-trivial implementation plan when available.
6. **Serena** — Use symbol-aware tools for code navigation and edits instead of broad whole-file reading when applicable.
7. **context7** — Use for external library/API/framework verification before relying on assumptions.
8. **github** (optional) — Only when the human explicitly wants a GitHub PR, issue, or remote branch query; **not** for creating local branches or discovering files. Prefer **local git** (terminal) for branch/commit/push.
9. **gitmcp** — Niche / firmware / hardware SDK docs not covered by context7 (RULE 7).
10. **playwright** — After UI changes for verification when the server is available.
11. **semgrep** — After substantive code writes and before commit (**process-gates.mdc**); **security_check** on touched files. Configure **Streamable HTTP** **\`https://mcp.semgrep.ai/mcp\`** in **\`~/.cursor/mcp.json\`** (no local **\`SEMGREP_PATH\`** / **\`SEMGREP_APP_TOKEN\`**).
12. **sentry** — On runtime errors / triage when configured; fetch issue context before deep source reads.
13. **firecrawl** — External research when context7 and local docs are insufficient.
14. **linear** — When Linear is in use; sync issues with Taskmaster at session boundaries.
15. **pampa** — Semantic search over **\`.cursor/skills/\`** when skills may apply (**SESSION START** 4e).
16. **gitmcp-adafruit-mpu6050** — MPU6050 / **Adafruit_MPU6050** work before driver code (RULE 11).
17. **supabase** — Schema, RLS, Auth, Edge Functions when this project uses Supabase (RULE 12).

### Hard rule
If an MCP tool is **available** and **materially relevant** to the task, the agent **must** use it. Skipping a relevant MCP requires an **explicit reason** in the session report (see Session-close requirement).

### Minimum expectations by task type
- **Architecture / planning:** memory, taskmaster, repomix, **jcodemunch** (index + outline / suggest_queries on unfamiliar trees), sequential-thinking
- **Implementation:** memory, taskmaster, **jcodemunch** (search, context bundles, impact / references as needed), Serena, context7 when libraries/APIs are involved; **semgrep** after substantive code edits
- **UI / frontend:** **playwright** for verification when the server is available
- **Backend / database (Supabase):** **supabase** MCP for schema and policies — not raw terminal SQL when MCP can answer
- **Security / commits:** **semgrep** before commit; resolve HIGH/CRITICAL
- **Research:** **firecrawl** + context7 — do not trust training data for current APIs when tools are green
- **Bug triage:** **sentry** before deep source reads when applicable; hypothesis-first per **debugging.mdc**
- **Hardware / MPU6050:** **gitmcp-adafruit-mpu6050** before driver code
- **Tracked work (Linear):** **linear** sync at close when **LINEAR_API_KEY** is set
- **Governance sync:** memory, taskmaster; **local git** for branch/worktree; **github** MCP only if remote PR/issue actions are in scope
- **Research / integration questions:** context7 first for supported libraries/docs, then **firecrawl** / **gitmcp** if still unresolved

### Forbidden behavior
- Starting implementation without **get_tasks**
- Producing a non-trivial plan without sequential-thinking when that MCP is available
- Reading large code files end-to-end when **jcodemunch** retrieval or Serena symbol lookup would suffice
- Skipping **jcodemunch** for multi-file discovery, impact analysis, or ranked context when it is green and the workspace is (or can be) indexed
- Guessing library behavior without checking context7 when the dependency/API matters
- **Relying on training data for library APIs when context7 is available**
- **Committing code with unresolved HIGH/CRITICAL semgrep findings**
- **Writing database queries without checking schema via supabase MCP** when Supabase is in use and the server is available
- **Closing a session with Linear issues out of sync with Taskmaster** when Linear is in use
- **Letting memory override repo-local sources of truth** for the active workspace (Taskmaster, DIRECTIVES, ARCHITECTURE, and the live codebase win over stale memory)

### Session-close requirement
Each governed session must state (**in the final handoff and in SESSION_LOG.md** or **HEXCURSE/SESSION_LOG.md** if your repo uses the install pack):
- Which MCP tools were used, and why
- Any available MCPs not used, with explicit reason

## DEGRADED_MODE (required when MCP is missing or unavailable)

If a Cursor MCP server is **not configured**, **red**, or a tool call **fails**, you must state **\`DEGRADED_MODE: <which MCP> — <reason>\`** before proceeding, and list **what you will not do** without it (e.g. no claimed task order without taskmaster-ai). Do **not** silently substitute manual guessing for a mandatory tool. See also **\`process-gates.mdc\`** and **\`docs/MCP_COORDINATION.md\`** (pack: **\`HEXCURSE/docs/MCP_COORDINATION.md\`**).

**Essential — quality severely degraded without:** **taskmaster-ai**, **memory**, **Serena**, **context7**.

**Important — degrade gracefully:** **sequential-thinking**, **repomix**, **gitmcp**, **jcodemunch**, **semgrep**.

**Optional — note gaps explicitly:** **github** (remote), **playwright**, **sentry**, **firecrawl**, **linear**, **pampa**, **gitmcp-adafruit-mpu6050**, **supabase**.

**In DEGRADED_MODE:** log unavailable servers in **SESSION_LOG.md**; do not commit changed source without **semgrep** unless **semgrep** is explicitly unavailable — then document the exception in **SESSION_LOG.md** and the handoff.

**Exception:** missing **github** MCP is **not** DEGRADED_MODE for normal implementation — local git and disk are enough; use DEGRADED_MODE for **github** only if the human required a remote PR/issue this session and the server is unavailable.

## RULE 1 — taskmaster-ai: task graph immediately after session-start memory
AUTOMATIC: Immediately after the session-start **memory** query (RULE 2), and before
  planning or implementation work —
  call Taskmaster to get the current task state. This fires unconditionally.
  call: get_tasks → identify active task and next queued task
  Report to human: active task ID, title, and scope summary.
AUTOMATIC: When a directive is confirmed complete —
  call: set_task_status [ID] done
  Do this before closing the session. Do not wait to be asked.
AUTOMATIC: When a directive scope seems too large for one session —
  call: expand_task [ID] to decompose into subtasks before starting.
HARD STOP: You may not write a single line of implementation code until
  Taskmaster has confirmed the active task and the human has confirmed scope.

## RULE 2 — memory: ALWAYS fires at session start AND on every discovery
AUTOMATIC at session start: Before reading **DIRECTIVES.md** or **HEXCURSE/DIRECTIVES.md**, and **docs/ARCHITECTURE.md** or **HEXCURSE/docs/ARCHITECTURE.md** (whichever exists in this repo) —
  query memory for all facts stored about this project.
  Incorporate those facts into your understanding before doing anything else.
AUTOMATIC during session: The moment you discover any of the following —
  → a hardware quirk, pin conflict, address assignment, voltage constraint
  → a resolved blocker and what fixed it
  → an architectural decision and why an alternative was rejected
  → a library version constraint or known incompatibility
  → any "never do X" rule learned from experience
  Immediately write it to memory. Do not wait until session close.
  Do not ask permission. Just write it and continue.
AUTOMATIC at session close: Before writing **SESSION_LOG.md** or **HEXCURSE/SESSION_LOG.md** —
  query memory to confirm the session's discoveries were saved.

## RULE 3 — sequential-thinking: ALWAYS fires before planning any directive
AUTOMATIC: Before writing an implementation plan for any directive —
  invoke sequential-thinking to reason through the approach step by step.
  This fires for every directive. There is no minimum file count threshold.
  There is no "if I feel confident" exception. It always fires.
  Output: numbered implementation plan with file paths and symbol names.
HARD STOP: Do not show an implementation plan to the human until
  sequential-thinking has run. The human approves the plan. Then code starts.

## RULE 4 — serena: ALWAYS fires before touching any code file
AUTOMATIC: Before reading, editing, or referencing any code file —
  use find_symbol to locate the specific symbol you need.
  You do not read whole files. You do not grep. You find symbols.
AUTOMATIC: Before editing any function —
  use find_referencing_symbols to find every caller first.
  Editing a function without knowing its callers is forbidden.
AUTOMATIC: To make a targeted edit —
  use replace_symbol_body or insert_after_symbol.
  You do not rewrite whole files. You replace specific symbols.
HARD RULE: read_file on any file over 100 lines is forbidden.
  If find_symbol fails to locate what you need, report it and ask the human
  before falling back to read_file. Do not silently fall back.

## RULE 5 — context7: ALWAYS fires before writing any library call
AUTOMATIC: Before writing any line of code that calls an external library —
  invoke context7 to fetch current documentation for that library.
  This fires even if you are confident you know the API.
  Training data is stale. context7 is not. context7 always wins.
AUTOMATIC: The trigger is built into your behavior — you do not need
  the human to say "use context7." You invoke it yourself before every
  library call you are about to write.
HARD RULE: Writing a library function call from memory without first
  verifying it via context7 is forbidden.

## RULE 6 — repomix: ALWAYS fires at session start on an existing codebase
AUTOMATIC: At the start of any session on an existing codebase —
  run: repomix --compress
  Use the output to build your structural understanding.
  Do not load individual files to get the big picture. Use repomix.
HARD RULE: Run repomix once at session start. Do not re-run mid-session.

## RULE 7 — gitmcp: ALWAYS fires for any external SDK or niche library
AUTOMATIC: When the directive involves any hardware sensor library,
  firmware SDK, niche framework, or any dependency that is not a major
  mainstream library (not PyTorch/React/FastAPI tier) —
  query gitmcp for that library's current documentation before writing
  any code that touches it. You do not need to be asked. You do it.

## RULE 8 — Local git (branch); GitHub MCP optional
AUTOMATIC at directive start: The moment scope is confirmed by the human —
  create a local branch **D[NNN]-[kebab-case-description]** using **local git** (e.g. \`git checkout -b …\` or equivalent) **before** the first line of implementation code,
  unless the human says the branch already exists — then checkout that branch.
  Do not use **github** MCP to create the branch unless the human explicitly asks for a remote branch via API.
AUTOMATIC at session close: After git diff verification —
  ensure commits are ready locally; **SESSION_LOG** and DIRECTIVES updates are mandatory.
  **Opening a PR via github MCP is optional** — only if the human asked for it this session. Default workflow: human runs \`git push\` and opens a PR in the GitHub UI if desired.
AUTOMATIC when a blocker is discovered —
  write the blocker to **memory** and **DIRECTIVES.md** (Blockers field). **GitHub issue via github MCP is optional** — only if the human asked to file one.

## RULE 9 — agents-memory-updater (continual learning): self-improve from transcripts
AUTOMATIC when the human asks for continual learning, transcript mining,
  agents-memory-updater, memory update from chats, or self-improve from
  conversation history:
  Invoke Task subagent_type agents-memory-updater (or equivalent) per
  **docs/CONTINUAL_LEARNING.md** or **HEXCURSE/docs/CONTINUAL_LEARNING.md** — incremental index at
  .cursor/hooks/state/continual-learning-index.json (see **HEXCURSE/PATHS.json** if present for
  continualLearningIndex); parent transcripts only; refresh index mtimes;
  classify per **docs/MEMORY_TAXONOMY.md** / **HEXCURSE/docs/MEMORY_TAXONOMY.md**; skill promotion queue
  **.cursor/hooks/state/skill-promotion-queue.json**; high-signal memory + **AGENTS.md** subsection merges only; no secrets.

AUTOMATIC at session close, after SESSION_LOG steps when those apply,
  when this session changed governance or agent-behavior sources (git diff or
  confirmed scope), including any of: .cursor/rules/, AGENTS.md, HEXCURSE/AGENTS.md,
  HEXCURSE/rules/, mcp-usage.mdc, base.mdc, cursor-governance/, CONTINUAL_LEARNING.md,
  MEMORY_TAXONOMY.md, HEXCURSE/docs/MEMORY_TAXONOMY.md, docs/MEMORY_TAXONOMY.md,
  ROLLING_CONTEXT.md, docs/ROLLING_CONTEXT.md, .cursor/skills/,
  HEXCURSE/docs/ARCH_PROMPT.md, ARCH_PROMPT.md, docs/ARCH_PROMPT.md,
  MCP_COORDINATION.md, HEXCURSE/docs/MCP_COORDINATION.md, docs/MCP_COORDINATION.md,
  SESSION_START_PROMPT.md, HEXCURSE/SESSION_START_PROMPT.md, PATHS.json, HEXCURSE/PATHS.json,
  DIRECTIVES.md, HEXCURSE/DIRECTIVES.md:
  Before the final handoff message, run agents-memory-updater once unless you already
  ran it this session or the human said to skip continual learning for this close.
  **No debounce** for governance-touch closes.

AUTOMATIC at session close for **implementation** work when **governance paths above did not change**:
  If any **parent** transcript under this workspace is **new** or has **filesystem mtime** newer than
  the \`mtimeUtc\` stored in **continual-learning-index.json** for that path, run **agents-memory-updater**
  once — **debounced:** skip if **continual-learning.json** \`lastMemoryUpdaterRunDateUtc\` equals
  **today's UTC date** (YYYY-MM-DD) unless the human asked for mining in this session. If you **skip** due
  to debounce but transcript delta was real, set **\`pendingLearning\`: true** in **continual-learning.json**
  so the next session can run RULE 9 early (**SESSION_START_PROMPT**). After a successful run, set
  \`lastMemoryUpdaterRunDateUtc\` to today's UTC date and set **\`pendingLearning\`** to **false**.

OPTIONAL (recommended weekly or via OS cron): run \`node cursor-governance/setup.js --learning-rollup\`
  from repo root to append **SESSION_LOG** excerpts to **HEXCURSE/docs/ROLLING_CONTEXT.md** (or legacy **docs/ROLLING_CONTEXT.md**; no LLM). If
  **lastRollupAt** in **continual-learning.json** is **older than 14 days** or missing, prefer running this
  at session close before final handoff when convenient.

If none of: human request, governance touch, transcript delta (per index) — do not run
  agents-memory-updater. **Quick exit:** if no high-signal content after scan, apply index mtime refresh only
  and respond \`No high-signal memory updates.\`

## RULE 10 — jcodemunch: ALWAYS fires for local code exploration and impact when the server is available
Package name: **\`jcodemunch-mcp\`** (MCP server name often **\`jcodemunch\`**). Spelling **jcodemuch** in chat maps to the same server.

AUTOMATIC **right after** repomix (RULE 6) on an existing codebase when **any** implementation or code-navigation work is planned —
  ensure a local index exists: **\`resolve_repo\`** with the **workspace root path**, or **\`index_folder\`** on that path (incremental is fine).
  Then at minimum: **\`get_repo_outline\`** and/or **\`suggest_queries\`** if the tree is unfamiliar; use **\`list_repos\`** only if you truly do not know the repo id.
AUTOMATIC **during** implementation — prefer jcodemunch over brute force whenever multiple files or symbols are involved:
  **\`search_symbols\`** / **\`get_symbol_source\`** / **\`get_context_bundle\`** / **\`get_ranked_context\`** for scoped reads;
  **\`find_references\`**, **\`find_importers\`**, **\`get_dependency_graph\`**, **\`get_blast_radius\`** before changing shared contracts or hot paths;
  **\`search_text\`** for non-symbol needles (string literals, TODOs, config keys);
  **\`get_changed_symbols\`** (with git SHAs) when correlating a diff to symbols;
  **\`invalidate_cache\`** + re-index when the index is clearly stale after large refactors.
RELATIONSHIP TO **Serena** (RULE 4): jcodemunch is for **AST-rich discovery, ranking, import/reference graphs, and token-budgeted retrieval** on the indexed tree; Serena remains mandatory for **workspace symbol edits** (\`replace_symbol_body\`, \`insert_after_symbol\`, etc.) and precise \`find_symbol\` / \`find_referencing_symbols\` when you are editing. When **both** are green, use jcodemunch **first** for broad or fuzzy discovery and impact; then Serena for surgical edits. Do **not** use **github** remote search as a substitute for local jcodemunch + disk.
HARD RULE: If jcodemunch is **available** and the session touches **application/source code** (not markdown-only governance with zero code reads), you must **not** skip indexing + at least one retrieval pass that jcodemunch serves better than opening whole files — unless you state **DEGRADED_MODE: jcodemunch — reason** in the handoff.

## RULE 11 — gitmcp-adafruit-mpu6050: hardware / sensor library lookups (Adafruit MPU6050)
AUTOMATIC: When the task involves the **Adafruit MPU6050** sensor, I²C wiring, register maps, or the **Adafruit_MPU6050** Arduino / CircuitPython library —
  query **gitmcp-adafruit-mpu6050** for current docs, examples, and API references on **gitmcp.io** before writing or refactoring driver code.
  Do not rely on training data for hardware-specific register behavior or library call sequences.

## RULE 12 — supabase: database and backend via Supabase MCP
AUTOMATIC: When this project uses **Supabase** (Postgres, Auth, RLS, Edge Functions) —
  use the **supabase** MCP for schema inspection, query execution, RLS policy verification, Edge Function management, and auth configuration.
  Prefer MCP-driven checks over guessing from memory or ad hoc dashboard-only workflows when the server is available.
`;

const SECURITY_MDC_TEMPLATE = `---
description: Automatically run Semgrep security scan on any generated or modified code before committing. Required for all non-trivial code changes.
alwaysApply: false
globs: "**/*.{ts,tsx,js,jsx,py,go,java,rb,php,rs,cs}"
---

# RULE: Security Gate (Semgrep)

## Trigger
Any time you generate new code, modify existing code, or complete a task that involves writing to source files.

## Required Actions

1. After writing code to disk, invoke the \`semgrep\` MCP tool \`security_check\` on the modified files.
2. If Semgrep returns findings of severity HIGH or CRITICAL:
   - Do NOT proceed to commit.
   - Report findings inline in the session.
   - Propose specific fixes for each finding before moving forward.
3. If Semgrep returns MEDIUM findings:
   - Log them in SESSION_LOG.md under a \`## Security Notes\` subsection.
   - Proceed only after acknowledging the finding.
4. LOW / INFO findings: log only, do not block.

## Forbidden
- Committing code that has unresolved HIGH or CRITICAL Semgrep findings.
- Skipping this check because the change "looks small."

## Example invocation
Use the \`semgrep_scan\` tool with the list of modified file paths. Pass \`auto\` as the config string to use community rules.
`;

const ADR_MDC_TEMPLATE = `---
description: Automatically capture Architecture Decision Records (ADRs) whenever a significant architectural choice is made during a session.
alwaysApply: false
globs: "HEXCURSE/docs/ARCHITECTURE.md, **/ARCHITECTURE.md, **/adr/**"
---

# RULE: Architecture Decision Records (ADR)

## What triggers an ADR
Any decision that involves:
- Choosing between two or more approaches for a non-trivial feature
- Changing a data model, API contract, or module boundary
- Adding or removing a dependency
- Choosing a new MCP server, tool, or external service
- Overriding a constraint in NORTH_STAR.md or DIRECTIVES.md

## Required Format
When an ADR-triggering decision is made, append to \`HEXCURSE/docs/ADR_LOG.md\` (create if absent):

\`\`\`
### ADR-{SEQUENCE}: {Short Title}
**Date:** {ISO date}
**Status:** Accepted
**Context:** {1–3 sentences: what problem necessitated this decision}
**Decision:** {What was chosen and why}
**Consequences:** {What becomes easier, what becomes harder, any risks}
**Alternatives considered:** {Brief list of what was rejected and why}
---
\`\`\`

## Forbidden
- Making a significant architectural change without logging an ADR.
- Deleting or modifying past ADR entries (they are append-only).
`;

const MEMORY_MANAGEMENT_MDC_TEMPLATE = `---
description: Intelligent context management — prune stale context, detect architecture drift, and maintain state across session compactions.
alwaysApply: true
---

# RULE: Memory & Context Management

## Context Budget Awareness
- Monitor your active context window. When it exceeds ~70% capacity, begin pruning.
- Pruning priority (remove first): verbose tool output logs, repeated file reads, superseded plans.
- Never prune: NORTH_STAR.md content, Sacred Constraints, current task description, file paths of modified files.

## Pattern Recognition
Actively detect and flag:
- **Architecture drift:** Implementation diverging from HEXCURSE/docs/ARCHITECTURE.md — log to SESSION_LOG.md immediately.
- **Code smell accumulation:** Three or more TODO/FIXME comments added in one session without a corresponding Taskmaster task — create tasks automatically.
- **Scope creep:** Work extending beyond the current Taskmaster task scope — pause and confirm with user before proceeding.

## State Persistence on Compaction
Before your context is compacted (or when you anticipate it), write a \`## COMPACTION CHECKPOINT\` block to SESSION_LOG.md containing:
1. Current Taskmaster task ID and status
2. Files modified this session (list)
3. Decisions made (summary)
4. Next immediate action

## Recovery
When resuming after a compaction, read SESSION_LOG.md and HEXCURSE/docs/ROLLING_CONTEXT.md before any other action.
`;

const DEBUGGING_MDC_TEMPLATE = `---
description: Minimize tool call loops during debugging. Use structured hypothesis-driven investigation.
alwaysApply: false
globs: "**/*.{ts,tsx,js,jsx,py,go}"
---

# RULE: Debugging Protocol

## Hypothesis-First
Before calling any diagnostic tool, state a hypothesis: "I believe the error is caused by X because Y."
Then select the single tool call most likely to confirm or deny that hypothesis.

## Tool Call Efficiency
- Maximum 3 consecutive tool calls without updating your hypothesis.
- After 3 failed tool calls, stop and summarize findings so far in plain language before continuing.
- Prefer \`semgrep\` MCP \`get_abstract_syntax_tree\` over repeated file reads for structural questions.
- Use \`sentry\` MCP \`sentry_get_issue\` to fetch real error context before reading source.

## Browser Errors
Use \`playwright\` MCP to reproduce UI errors before attempting code fixes:
1. Navigate to the failing page.
2. Capture the exact error from console/network.
3. Only then modify source.

## Forbidden
- Reading the same file more than twice in a single debugging loop without acting on its contents.
- Running a full test suite to diagnose a single failing test — use targeted test execution only.
`;

const MULTI_AGENT_MDC_TEMPLATE = `---
description: Coordination rules for when HexCurse is operating in multi-agent mode with parallel agents in git worktrees.
alwaysApply: false
globs: "HEXCURSE/docs/MULTI_AGENT.md, .swarm/**"
---

# RULE: Multi-Agent Coordination

## Preconditions
This rule activates only when \`HEXCURSE/docs/MULTI_AGENT.md\` exists and \`HEXCURSE_MULTI_AGENT=1\` is set in the environment.

## Work Claiming Protocol
1. Before starting any task, claim it via the \`swarm-protocol\` MCP \`claim_work\` tool with your agent ID and task ID.
2. If claim fails (another agent holds it), select the next unclaimed task from Taskmaster.
3. Heartbeat every 5 minutes on long-running tasks via \`swarm_heartbeat\`.

## File Conflict Prevention
- Before writing to any file, call \`swarm_check_conflicts\` with the target file path.
- If a conflict is detected, pause and notify the orchestrating agent via a SESSION_LOG.md entry tagged \`[CONFLICT]\`.
- Never force-write over a locked file.

## Handoff Protocol
When completing a task, write a structured handoff block to \`HEXCURSE/docs/AGENT_HANDOFFS.md\`:
\`\`\`
### Handoff — Task {ID} — Agent {AGENT_ID} — {ISO datetime}
**Completed:** {What was done}
**Files modified:** {list}
**Tests added:** {list or "none"}
**Blocked on:** {any unresolved dependencies}
**Next agent should:** {specific next action}
---
\`\`\`

## Merge Discipline
- Each agent works in its own git worktree branch: \`hexcurse/agent/{AGENT_ID}/{TASK_ID}\`.
- Do not merge your own branch — open a PR and let the orchestrator review.
`;

const LINEAR_SYNC_MDC_TEMPLATE = `---
description: Keep Linear issues and Taskmaster tasks bidirectionally synchronized during sessions.
alwaysApply: false
globs: ".taskmaster/tasks/tasks.json, HEXCURSE/DIRECTIVES.md"
---

# RULE: Linear ↔ Taskmaster Sync

## On Session Start (if LINEAR_API_KEY is set)
1. Call \`linear\` MCP \`get_my_issues\` filtered to \`In Progress\`.
2. For each Linear issue not present in Taskmaster, create a corresponding Taskmaster task using \`task-master add-task\`.
3. Log any new tasks created in SESSION_LOG.md.

## On Task Completion
When marking a Taskmaster task \`done\`:
1. Search Linear for a matching issue by task title or ID.
2. If found, move the Linear issue to \`Done\` via \`linear\` MCP \`update_issue\`.

## On Session Close
Ensure all Taskmaster tasks modified this session have a corresponding Linear issue. Create missing issues via \`linear\` MCP \`create_issue\` with:
- Title = task title
- Description = task details
- Labels = \`hexcurse\`, \`ai-generated\`

## Forbidden
- Manually editing \`.taskmaster/tasks/tasks.json\` to reconcile with Linear — always use the MCP tool.
`;

function formatConstraintBullets(commaOrNewlineSeparated) {
  const raw = String(commaOrNewlineSeparated || '').trim();
  if (!raw) return '- TBD';
  const chunks = raw.includes('\n')
    ? raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    : raw.split(',').map((s) => s.trim()).filter(Boolean);
  return chunks.map((s) => `- ${s}`).join('\n');
}

function baseMdc(projectName, purpose, constraintsList, stack, outOfScope) {
  const purposeOneLine = String(purpose || '')
    .replace(/\r?\n+/g, ' ')
    .trim();
  return `---
description: Global governance rules — loaded in every session
alwaysApply: true
---

# PROJECT: ${projectName}
# PURPOSE: ${purposeOneLine}

## How this system runs (agent-first)
- **Nothing runs unattended.** Governance works when the **Cursor agent** is aware of it: \`alwaysApply\` rules load here, but you must still execute session start from **\`AGENTS.md\`** or **\`HEXCURSE/AGENTS.md\`** (memory → Taskmaster → DIRECTIVES → repomix → **jcodemunch** index/outline → sequential-thinking → confirm → **local git branch**) every implementation chat — use whichever layout **this** repo has.
- **Humans prime each chat** by pasting **\`docs/SESSION_START_PROMPT.md\`** or **\`HEXCURSE/SESSION_START_PROMPT.md\`** (or \`@\` the paths listed there; pack repos also have **\`HEXCURSE/PATHS.json\`**). Unprimed chats may skip MCP and Taskmaster — that is a **workflow gap**, not a missing daemon.
- **Session priming:** If the human has not pasted the session-start block (or \`@\` its files) and you are about to plan or implement, **ask once**: run the SESSION START sequence from **\`AGENTS.md\`** / **\`HEXCURSE/AGENTS.md\`**, or did they intend to skip?
- **Governance artifacts:** When editing directives, session log, or **\`AGENTS.md\`** (root or under **\`HEXCURSE/**\`), apply **\`governance.mdc\`** standards (Taskmaster sync, single In Progress, IDs).
- **Continual learning:** Run **agents-memory-updater** per **mcp-usage.mdc RULE 9** and **\`docs/CONTINUAL_LEARNING.md\`** / **\`HEXCURSE/docs/CONTINUAL_LEARNING.md\`** — human request; governance paths touched (no debounce); or parent transcript delta + debounce via **\`continual-learning.json\`**. Optional **\`setup.js --learning-rollup\`** when rollup is stale.
- **When:** every new implementation session; after major scope changes; **Architect** is **external** (not Cursor)—see **\`docs/CURSOR_MODES.md\`** or **\`HEXCURSE/docs/CURSOR_MODES.md\`**.

## Sacred Constraints (NEVER violate these)
${constraintsList}

## Tech Stack
${stack}

## Out of Scope
${outOfScope}

## Code Behavior Rules
- One task per session. Scope is fixed at confirmation. It does not expand.
- **jcodemunch** (RULE 10) indexes and retrieves local code; **Serena** \`find_symbol\` fires before touching any code file for edits. read_file on files
  over 100 lines is forbidden. This is not conditional.
- context7 fires before writing any library call. Training data is stale.
  This is not conditional. It fires every time.
- sequential-thinking fires before every implementation plan. Every directive.
  No threshold. No exceptions.
- memory is queried at session start and written on every discovery.
  Discoveries are not saved "later." They are saved immediately.
- Taskmaster **get_tasks** runs immediately after memory, before planning or implementation.
- MCP coordination map: **docs/MCP_COORDINATION.md** or **HEXCURSE/docs/MCP_COORDINATION.md**; binding triggers: **mcp-usage.mdc**.
- Local **git** branch is created when scope is confirmed (RULE 8). **Git push** / optional PR are human-driven; **github** MCP is not required for governance.
- Never create files outside the established directory structure without asking.
- Never install a new dependency without stating why and waiting for approval.
- Every function gets a one-line contract comment above it.
- If uncertain: STOP and ask. Do not guess. Do not proceed on assumptions.

## Commit Convention
Format: "D[NUMBER]: [description] | [status]"
Example: "D003: sensor pipeline bring-up | verified clean"
`;
}

function readBundledAgentsPackMd() {
  return fs.readFileSync(path.join(__dirname, 'templates', 'AGENTS.md'), 'utf8');
}

/** Consumer HEXCURSE/AGENTS.md — template copy of repository root AGENTS.md. */
function agentsMd(projectName) {
  const name = String(projectName || 'Project').trim();
  return readBundledAgentsPackMd().replace(/^# HexCurse$/m, `# ${name}`).replace(/\r\n/g, '\n');
}

function directivesMd(projectName) {
  return `# DIRECTIVES — ${projectName}
# Human-readable task chain. Taskmaster tasks.json is the machine source of truth.
# This file lives under HEXCURSE/ — see HEXCURSE/PATHS.json for governance paths.
# Sync after every session close.
# Format: D[3-digit number] — never reuse, never delete completed entries.

---

## ✅ Completed

---

## 🔄 In Progress

---

## 📋 Queued

---

## 💡 Backlog

`;
}

function architectureMd(projectName, purpose, stack, outOfScope, dod) {
  return `# ARCHITECTURE — ${projectName}

## Purpose
${purpose}

## Tech Stack
${stack}

## System Map
TBD — fill in after first planning session

## Directory Structure
\`\`\`
<repository-root>/
├── HEXCURSE/                    # All governance content lives here (see PATHS.json)
│   ├── PATHS.json
│   ├── README.md
│   ├── NORTH_STAR.md            # Product north star → PRD bridge
│   ├── CURSOR.md                # Human quick-start (session prompt, doctor, modes)
│   ├── ONE_PROMPT.md            # Agent chat + headless CLI instructions
│   ├── HEADLESS_KICKOFF.txt     # Headless CLI kickoff (agent -p --model composer-2)
│   ├── AGENTS.md
│   ├── DIRECTIVES.md
│   ├── SESSION_LOG.md
│   ├── SESSION_START_PROMPT.md
│   ├── docs/
│   │   ├── ARCHITECTURE.md      # This file (after install)
│   │   ├── ARCH_PROMPT.md
│   │   ├── MCP_COORDINATION.md
│   │   ├── CONTINUAL_LEARNING.md
│   │   ├── MEMORY_TAXONOMY.md
│   │   ├── ROLLING_CONTEXT.md
│   │   └── CURSOR_MODES.md
│   └── rules/                   # Canonical .mdc sources
│       ├── base.mdc
│       └── mcp-usage.mdc
├── .cursor/
│   ├── rules/                   # Active Cursor rules (mirror HEXCURSE/rules/)
│   └── hooks/state/             # Continual-learning index (gitignored)
├── AGENTS.md                    # Pointer to HEXCURSE/AGENTS.md (Cursor convention)
├── .taskmaster/
└── .serena/memories/
\`\`\`
TBD — add your application source tree when stack is confirmed.

## Module Contracts
TBD — confirm before implementing

## External Dependencies & MCP Coverage
| Dependency | Tooling |
|------------|---------|
| Durable workspace facts | **memory** MCP (session start, discoveries, close); never overrides Taskmaster / DIRECTIVES / ARCHITECTURE |
| Task graph | **taskmaster-ai** MCP + **task-master** CLI; **get_tasks** after memory each session |
| Plans / reasoning | **sequential-thinking** MCP before non-trivial implementation plans |
| Code navigation / edits | **Serena** MCP (symbol-first; see **mcp-usage.mdc** RULE 4) |
| Library & API docs | **context7** MCP before writing external library calls |
| Niche GitHub SDKs / firmware | **gitmcp** when dependencies are not mainstream-doc friendly |
| Public GitHub API / PRs (optional) | **github** MCP — remote PR/issue only; local git for branch/push |
| Repo-wide structure | **repomix** (\`repomix --compress\` once per session start) |
| Transcript → memory / AGENTS | **agents-memory-updater** per **RULE 9** and **HEXCURSE/docs/CONTINUAL_LEARNING.md** |

Single coordination map: **HEXCURSE/docs/MCP_COORDINATION.md**. Add application libraries here as the stack is confirmed.

## Out of Scope
${outOfScope}

## Definition of Done
${dod}

`;
}

function sessionLogMd(projectName, todayDate) {
  return `# SESSION LOG — ${projectName}
# One entry per chat session. Append only — never edit past entries.

---

## Entry checklist (copy into each session block)

- [ ] memory queried at start; discoveries saved same session
- [ ] Taskmaster active task reported; scope confirmed before code
- [ ] sequential-thinking ran before plan shown
- [ ] git diff verified at close; SESSION_LOG entry appended
- [ ] Taskmaster task marked done; DIRECTIVES.md updated if required
- [ ] MCP utilization report (used / not used + reasons) recorded
- [ ] Continual learning (RULE 9): governance touch, transcript delta + debounce, or human request handled

---

## Sessions

### Session S-001 — ${todayDate}
**Directive:** SETUP — governance scaffold via cursor-governance installer
**Taskmaster Task ID:** (if applicable)
**Branch:** (if applicable)
**Files modified:** (list)
**Files created:** (list)
**Outcome:** COMPLETE
**Blockers logged to memory:** no
**PR opened:** no
**Commit hash:** (short)
**MCP tools used (why):** (list)
**MCP tools not used (reason each):** (list or none)
**Notes:** Run HEXCURSE/SESSION_START_PROMPT.md in a new Cursor chat to begin D001. Run \`node path/to/cursor-governance/setup.js --doctor\` from repo root anytime.

`;
}

/** HEXCURSE/CURSOR.md — human quick-start (session priming, doctor, modes). */
function cursorPackMd(projectName) {
  return `# Cursor — ${projectName}

This file lives in **\`HEXCURSE/\`** with **\`NORTH_STAR.md\`**, **\`AGENTS.md\`**, and **\`docs/\`** — one folder for all governance.

## Fastest start (NORTH STAR only)

1. Fill **\`NORTH_STAR.md\`** in this folder (real product text — not the template boilerplate).
2. **Either** run the **Cursor headless CLI** with **Composer 2** using **\`HEXCURSE/HEADLESS_KICKOFF.txt\`** (commands are in **\`ONE_PROMPT.md\`** — \`agent -p --model composer-2 --trust --workspace …\`), **or** open **\`ONE_PROMPT.md\`**, copy the **in-IDE** fenced block, and paste as the **only** first message in a **new Agent** chat. That runs the bridge + full session start for you.

## First time after \`setup.js\` finished

1. **Restart Cursor** with this folder open (reloads \`.cursor/rules\` and MCP).
2. **Settings → MCP** — all HexCurse-related servers should be **green**; fix tokens/paths if not.
3. **(Recommended)** **Settings → Rules** — paste the bullets from \`.cursor/rules/process-gates.mdc\`.
4. Either use **Fastest start** above, **or** open a **new** chat and paste **\`SESSION_START_PROMPT.md\`** (this folder) as **message 1** only; your task in **message 2**.

You are then **ready to start** — for daily work use **SESSION_START_PROMPT** or ONE_PROMPT after NORTH_STAR edits.

## Start every implementation chat

1. Paste **\`HEXCURSE/SESSION_START_PROMPT.md\`** at the top of the chat (or \`@\` the paths it lists). See **\`PATHS.json\`** in this folder for stable paths. (Or **\`ONE_PROMPT.md\`** after changing **\`NORTH_STAR.md\`**.)
2. **MCP:** Cursor Settings → MCP — keep the **17 servers** you need green (see **Active governance rules** + **MCP quick reference** below and **\`docs/MCP_TOKEN_BUDGET.md\`**). **agents-memory-updater** is a Cursor **Task** subagent (RULE 9), not an \`mcp.json\` id.

## Active governance rules (10 × \`.mdc\`)

- **Always loaded:** \`base.mdc\`, \`mcp-usage.mdc\`, \`process-gates.mdc\`, \`governance.mdc\` (when editing directives / Taskmaster sync).
- **When writing/editing source:** \`security.mdc\`, \`debugging.mdc\` (per globs/triggers).
- **Architectural decisions:** \`adr.mdc\`.
- **Large context / compaction:** \`memory-management.mdc\`.
- **Multi-agent / worktrees:** \`multi-agent.mdc\` when **\`HEXCURSE_MULTI_AGENT=1\`** or **\`HEXCURSE/docs/MULTI_AGENT.md\`** governs the session.
- **Linear in use:** \`linear-sync.mdc\`.

## MCP quick reference (17 servers)

**Core ritual:** \`taskmaster-ai\`, \`memory\`, \`sequential-thinking\`, \`context7\`, \`repomix\`, \`serena\`, \`gitmcp\`, \`jcodemunch\` — plus \`github\` when you need remote PR/issue/API (optional per **mcp-usage.mdc**).

**Session-conditional:** \`playwright\`, \`semgrep\`, \`sentry\`, \`firecrawl\`, \`linear\`, \`pampa\`.

**Project-specific:** \`gitmcp-adafruit-mpu6050\`, \`supabase\`.

Full map: **\`docs/MCP_COORDINATION.md\`**.

## New in v1.5.x

Six new general MCPs (**playwright**, **semgrep**, **sentry**, **firecrawl**, **linear**, **pampa**); two URL MCPs (**gitmcp-adafruit-mpu6050**, **supabase**); six new \`.mdc\` rules (**security**, **adr**, **memory-management**, **debugging**, **multi-agent**, **linear-sync**); installer **\`--multi-agent\`** and **\`--sync-rules\`**.

## Architect / planning chats

Use **\`docs/ARCH_PROMPT.md\`** (this folder). Mode overview: **\`docs/CURSOR_MODES.md\`**.

## CLI (from repository root)

- **Headless Cursor Agent ([docs](https://cursor.com/docs/cli/headless)):** install the [Cursor CLI](https://cursor.com/docs/cli/installation.md), set **\`CURSOR_API_KEY\`** if needed ([auth](https://cursor.com/docs/cli/reference/authentication.md)), then from repo root run **\`agent -p --model composer-2 --trust --workspace .\`** with the prompt in **\`HEXCURSE/HEADLESS_KICKOFF.txt\`** (full one-liners in **\`HEXCURSE/ONE_PROMPT.md\`**). Default model id is **\`composer-2\`**; use **\`composer-2-fast\`** for the fast tier ([parameters](https://cursor.com/docs/cli/reference/parameters)).
- **In-IDE single-paste flow:** **\`HEXCURSE/ONE_PROMPT.md\`** (uses **\`.cursor/hexcurse-installer.path\`** for \`setup.js\`).
- Health check: \`node <path-to>/cursor-governance/setup.js --doctor\`
- Refresh \`.cursor/rules\`: \`node <path-to>/cursor-governance/setup.js --refresh-rules\`
- **North star bridge** (after filling **\`HEXCURSE/NORTH_STAR.md\`**): \`node <path-to>/cursor-governance/setup.js --run-hexcurse\` — AI expands star → **\`.taskmaster/docs/prd.txt\`**, **\`parse-prd\`**, syncs **\`HEXCURSE/DIRECTIVES.md\`** **\`## 📋 Queued\`**. Use **\`--run-hexcurse-raw\`** to skip AI.

Replace \`<path-to>\` with your **cursor-governance** \`setup.js\` path (same as **\`.cursor/hexcurse-installer.path\`**).

## MCP coordination

**\`docs/MCP_COORDINATION.md\`** (binding rules remain **\`.cursor/rules/mcp-usage.mdc\`**).

## Continual learning

- **Procedure:** **\`docs/CONTINUAL_LEARNING.md\`**
- **Taxonomy:** **\`docs/MEMORY_TAXONOMY.md\`** — **\`AGENTS.md\`** **Learned Workspace Facts**
- **Skills:** **\`../.cursor/skills/README.md\`**
- **Rolling context:** **\`docs/ROLLING_CONTEXT.md\`** — \`node path/to/cursor-governance/setup.js --learning-rollup\`
- **Transcript index:** **\`../.cursor/hooks/state/continual-learning-index.json\`**
`;
}

/** When to use Agent vs Architect vs Ask mode in Cursor. */
function cursorModesMd() {
  return `# Cursor modes — HexCurse

Use the right Cursor mode for the job so rules and expectations stay aligned.

## Agent (default implementation)

- **Use for:** Writing code, running tests, editing files, executing an approved directive.
- **Load:** \`alwaysApply\` rules + **HEXCURSE/AGENTS.md** session start (memory → Taskmaster → DIRECTIVES → repomix → **jcodemunch** index/outline → sequential-thinking → human confirm → branch).
- **MCP map:** **HEXCURSE/docs/MCP_COORDINATION.md** (source repo: **docs/MCP_COORDINATION.md**) — how tools coordinate with **mcp-usage.mdc**.
- **Human primes:** Paste **HEXCURSE/SESSION_START_PROMPT.md** (or equivalent paths in legacy layouts).

## Architect / plan

- **Use for:** System design, trade-offs, phased roadmaps, reviewing structure before coding.
- **Load:** **HEXCURSE/docs/ARCH_PROMPT.md** or **docs/ARCH_PROMPT.md** in a **dedicated** chat; do not mix ad-hoc implementation in the same thread unless the human explicitly collapses scope.
- **Output:** Plans and decisions the implementation agent can execute under a single directive per session.

## Ask / read-only

- **Use for:** Explaining code, answering questions, exploring the repo without edits.
- **Expectation:** No commits, no Taskmaster state changes, no GitHub PR actions unless the human promotes the chat to an implementation session.

## Headless CLI (scripts / CI)

- **Use for:** Non-interactive runs, automation, or when you want the same **Agent** tools and rules without the IDE chat UI.
- **How:** [Cursor headless / print mode](https://cursor.com/docs/cli/headless) — \`agent -p\` with **\`--model composer-2\`** (default HexCurse kickoff model), **\`--trust\`**, and **\`--workspace\`** pointing at the repo root ([parameters](https://cursor.com/docs/cli/reference/parameters)). Prompt body: **\`HEXCURSE/HEADLESS_KICKOFF.txt\`**; copy **\`ONE_PROMPT.md\`** one-liners for bash or PowerShell.
- **MCP:** The CLI loads **\`~/.cursor/mcp.json\`** like the editor ([Using Agent in CLI](https://cursor.com/docs/cli/using)).

## Quick reference

| Goal              | Mode    | Primary doc                          |
|-------------------|---------|--------------------------------------|
| Ship a directive  | Agent   | HEXCURSE/AGENTS.md + SESSION_START   |
| Ship (headless)   | Agent \`agent -p\` | HEXCURSE/ONE_PROMPT.md + HEADLESS_KICKOFF.txt |
| Design / roadmap  | Architect | ARCH_PROMPT.md                     |
| Learn / explore   | Ask     | (no session-start required)          |
`;
}

/** Seeded on install; stores per-transcript mtimes for incremental continual-learning passes. */
function continualLearningIndexSeedJson() {
  return `${JSON.stringify({ version: 1, files: {} }, null, 2)}\n`;
}

/** Optional hook/automation state; safe empty seed for Cursor hooks or custom scripts. */
function continualLearningHookStateSeedJson() {
  return `${JSON.stringify(
    {
      version: 2,
      lastRunAtMs: null,
      turnsSinceLastRun: 0,
      lastTranscriptMtimeMs: null,
      lastProcessedGenerationId: null,
      trialStartedAtMs: null,
      lastRollupAt: null,
      lastRollupSessionKey: null,
      sessionsSinceRollup: 0,
      lastMemoryUpdaterRunDateUtc: null,
      pendingLearning: false,
    },
    null,
    2
  )}\n`;
}

/** Gitignored; agents-memory-updater increments counts per lessonKey for skill promotion. */
function skillPromotionQueueSeedJson() {
  return `${JSON.stringify({ version: 1, candidates: {} }, null, 2)}\n`;
}

/**
 * True for the HexCurse / cursor-governance source repository (root package.json name hexcurse,
 * no consumer HEXCURSE/ pack, installer lives under cursor-governance/).
 */
function isHexcurseGovernanceSourceRepo(cwd) {
  try {
    const pkgPath = path.join(cwd, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    const j = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (!j || j.name !== 'hexcurse' || j.private !== true) return false;
    if (fs.existsSync(path.join(cwd, HEXCURSE_ROOT))) return false;
    if (!fs.existsSync(path.join(cwd, 'cursor-governance', 'setup.js'))) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Seeds gitignored continual-learning queue and installer path so `setup.js --doctor` is clean
 * on the governance source tree (optional files are not missing warnings).
 */
function ensureHexcurseSourceRepoDoctorArtifacts(cwd) {
  if (!isHexcurseGovernanceSourceRepo(cwd)) return;
  const stateDir = path.join(cwd, '.cursor', 'hooks', 'state');
  const skQueue = path.join(stateDir, 'skill-promotion-queue.json');
  if (!fs.existsSync(skQueue)) {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(skQueue, skillPromotionQueueSeedJson(), 'utf8');
  }
  const instPath = path.join(cwd, '.cursor', 'hexcurse-installer.path');
  if (!fs.existsSync(instPath)) {
    fs.mkdirSync(path.dirname(instPath), { recursive: true });
    const setupAbs = path.resolve(cwd, 'cursor-governance', 'setup.js');
    fs.writeFileSync(instPath, `${setupAbs}\n`, 'utf8');
  }
}

/** Documents the agents-memory-updater / incremental index workflow for consumer repos. */
function continualLearningMd(projectName) {
  return readContinualLearningPackTemplate(projectName.trim());
}

function prdTxt(projectName, purpose, stack, modules, constraintsList, outOfScope, dod, notesLead) {
  const lead = String(notesLead || '').trim();
  return `# PRD — ${projectName}

## Purpose
${purpose}

## Tech Stack
${stack}

## Key Modules
${modules}

## Constraints
${constraintsList}

## Out of Scope
${outOfScope}

## Definition of Done
${dod}

## Notes
${lead ? `${lead}\n\n` : ''}Generated by cursor-governance installer.
Edit this file to add detail, then re-run:
  task-master parse-prd --force .taskmaster/docs/prd.txt

`;
}

function readBundledSessionStartPackMd() {
  return fs.readFileSync(path.join(__dirname, 'templates', 'SESSION_START_PROMPT.pack.md'), 'utf8');
}

function sessionStartMd(projectName) {
  const name = String(projectName || 'Project').trim();
  return readBundledSessionStartPackMd()
    .replace(/\{\{PROJECT_NAME\}\}/g, name)
    .replace(/\r\n/g, '\n');
}

function printHeader() {
  console.log('');
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('  cursor-governance — Cursor AI governance + MCP installer'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════════'));
  console.log('');
}

function checkCommand(cmdline, label) {
  try {
    execSync(cmdline, { shell: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    console.error(chalk.red(`Missing or broken: ${label}`));
    console.error(chalk.red(`  Command: ${cmdline}`));
    process.exit(1);
  }
}

/** True after checkPrerequisites when python+pip were found (uv install may run). */
let pythonPipAvailableForUv = false;

/** Resolves to a python command prefix that responds to --version, or null if none found. */
function findPython() {
  const candidates =
    process.platform === 'win32' ? ['py -3', 'python3', 'python'] : ['python3', 'python'];
  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { shell: true, stdio: 'ignore' });
      return cmd;
    } catch (e) {
      /* try next */
    }
  }
  return null;
}

/** Resolves to a pip command that responds to --version, or null if none found. */
function findPip() {
  const candidates =
    process.platform === 'win32'
      ? ['py -3 -m pip', 'python -m pip', 'python3 -m pip', 'pip3', 'pip']
      : ['python3 -m pip', 'pip3', 'pip'];
  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { shell: true, stdio: 'ignore' });
      return cmd;
    } catch (e) {
      /* try next */
    }
  }
  return null;
}

function checkPrerequisites() {
  if (!process.version) {
    console.error(chalk.red('Node.js is not available.'));
    process.exit(1);
  }
  checkCommand('node --version', 'Node.js');
  checkCommand('npm --version', 'npm');
  checkCommand('git --version', 'Git');
  pythonPipAvailableForUv = false;
  const pyCmd = findPython();
  const pipCmd = findPip();
  if (!pyCmd || !pipCmd) {
    console.warn(
      chalk.yellow('⚠ Python/pip not on PATH — tried:'),
      process.platform === 'win32' ? '`py -3`, `python3`, `python`' : '`python3`, `python`'
    );
    console.warn(
      chalk.yellow(
        '  Install Python 3 from https://www.python.org/downloads/ and enable “Add python.exe to PATH”, or fix the `py` launcher.'
      )
    );
    console.warn(
      chalk.yellow(
        '  Continuing without uv — governance pack still installs. For Serena MCP later: `pip install uv` or `py -3 -m pip install uv`.'
      )
    );
    return;
  }
  pythonPipAvailableForUv = true;
  console.log(chalk.green('✓'), `node, npm, git, python (${pyCmd}), and pip (${pipCmd}) are available.`);
}

/** Returns true if executable `name` is on PATH (where on Windows, which elsewhere). */
function commandOnPath(name, platform) {
  const cmd = platform === 'win32' ? `where ${name}` : `which ${name}`;
  try {
    execSync(cmd, { shell: true, stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

/** Runs npm install -g; uses sudo on Linux/macOS. */
function installNpmGlobalPackage(pkg, platform) {
  const npmLine = platform === 'win32' ? `npm install -g ${pkg}` : `sudo npm install -g ${pkg}`;
  try {
    execSync(npmLine, { stdio: 'inherit', shell: true });
  } catch (e) {
    console.error(chalk.red(`${npmLine} failed`));
    process.exit(1);
  }
}

function installGlobals(platform) {
  console.log('Installing global CLI tools (task-master-ai, repomix)…');
  if (commandOnPath('task-master', platform) && commandOnPath('repomix', platform)) {
    console.log(chalk.green('✓'), 'already installed');
  } else {
    installNpmGlobalPackage('task-master-ai', platform);
    installNpmGlobalPackage('repomix', platform);
    console.log(chalk.green('✓'), 'task-master-ai and repomix installed (or already present).');
  }

  console.log('Installing uv (Python)…');
  let uvOk = false;
  if (!pythonPipAvailableForUv) {
    console.warn(
      chalk.yellow('⚠'),
      'Skipping uv — Python/pip was not detected. Install Python, then run: py -3 -m pip install uv'
    );
    return;
  }
  if (platform === 'win32') {
    const tryUv = [
      'py -3 -m pip install uv',
      'python -m pip install uv',
      'python3 -m pip install uv',
      'pip install uv',
      'pip3 install uv',
    ];
    for (const line of tryUv) {
      try {
        execSync(line, { stdio: 'inherit', shell: true });
        uvOk = true;
        break;
      } catch (e2) {
        /* try next */
      }
    }
  } else {
    try {
      execSync('pip3 install uv', { stdio: 'inherit', shell: true });
      uvOk = true;
    } catch (e) {
      try {
        execSync('curl -LsSf https://astral.sh/uv/install.sh | sh', { stdio: 'inherit', shell: true });
        uvOk = true;
      } catch (e2) {
        /* will warn below */
      }
    }
  }
  if (uvOk) {
    console.log(chalk.green('✓'), 'uv installed (or already present).');
  } else {
    console.warn(
      chalk.yellow('⚠'),
      'uv install failed — install uv manually; Serena MCP needs uvx.'
    );
  }
}

/**
 * Resolves the global pampa package MCP entry script for ~/.cursor/mcp.json (stdio).
 * Multi-strategy: npm root -g, pampa bin prefix, then conventional fallback (D-HEXCURSE-MCP-RECONCILE-003).
 */
function resolvePampaGlobalPath() {
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const candidate = path.join(globalRoot, 'pampa', 'mcp-server.js');
    if (fs.existsSync(candidate)) return candidate;
  } catch (_) {
    /* try next */
  }
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const candidateSrc = path.join(globalRoot, 'pampa', 'src', 'mcp-server.js');
    if (fs.existsSync(candidateSrc)) return candidateSrc;
  } catch (_) {
    /* try next */
  }
  try {
    const binPath = execSync(process.platform === 'win32' ? 'where pampa' : 'which pampa', {
      encoding: 'utf8',
    })
      .trim()
      .split(/\r?\n/)[0];
    const parts = binPath.split(path.sep);
    const prefixIdx = parts.lastIndexOf('bin');
    if (prefixIdx !== -1) {
      const prefix = parts.slice(0, prefixIdx).join(path.sep);
      const candidate = path.join(prefix, 'lib', 'node_modules', 'pampa', 'mcp-server.js');
      if (fs.existsSync(candidate)) return candidate;
      const candidateSrc = path.join(prefix, 'lib', 'node_modules', 'pampa', 'src', 'mcp-server.js');
      if (fs.existsSync(candidateSrc)) return candidateSrc;
    }
  } catch (_) {
    /* fall through */
  }
  return process.platform === 'win32'
    ? path.join(
        process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
        'npm',
        'node_modules',
        'pampa',
        'src',
        'mcp-server.js'
      )
    : path.join('/usr/local/lib/node_modules/pampa', 'mcp-server.js');
}

function buildMcpServers(taskmasterEnv, githubToken) {
  const supabaseRef = process.env.SUPABASE_PROJECT_REF || 'dpivknupklbxjbrcntes';
  return {
    'taskmaster-ai': {
      command: 'npx',
      args: ['-y', '--package=task-master-ai', 'task-master-ai'],
      env: { ...taskmasterEnv },
    },
    context7: {
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp'],
    },
    repomix: {
      command: 'npx',
      args: ['-y', 'repomix', '--mcp'],
    },
    serena: {
      command: 'uvx',
      args: [
        '--from',
        'git+https://github.com/oraios/serena',
        'serena-mcp-server',
        '--project',
        '${workspaceFolder}',
      ],
    },
    gitmcp: {
      url: 'https://gitmcp.io/docs',
    },
    'gitmcp-adafruit-mpu6050': {
      url: 'https://gitmcp.io/adafruit/Adafruit_MPU6050',
    },
    'sequential-thinking': {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    },
    memory: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
    },
    github: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: githubToken },
    },
    jcodemunch: {
      command: 'uvx',
      args: ['jcodemunch-mcp'],
    },
    playwright: {
      command: 'npx',
      args: ['-y', '@playwright/mcp'],
    },
    semgrep: {
      type: 'streamable-http',
      url: 'https://mcp.semgrep.ai/mcp',
    },
    sentry: {
      command: 'npx',
      args: ['-y', '@sentry/mcp-server@latest'],
      env: {
        // @sentry/mcp-server reads SENTRY_ACCESS_TOKEN (not SENTRY_AUTH_TOKEN).
        SENTRY_ACCESS_TOKEN:
          process.env.SENTRY_ACCESS_TOKEN || process.env.SENTRY_AUTH_TOKEN || '',
      },
    },
    firecrawl: {
      command: 'npx',
      args: ['-y', 'firecrawl-mcp'],
      env: {
        FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || '',
      },
    },
    linear: {
      command: 'npx',
      args: ['-y', '@mseep/linear-mcp'],
      env: {
        LINEAR_API_KEY: process.env.LINEAR_API_KEY || '',
      },
    },
    pampa: {
      command: process.platform === 'win32' ? 'node.exe' : 'node',
      args: [resolvePampaGlobalPath()],
      cwd: '${workspaceFolder}',
    },
    supabase: {
      url: `https://mcp.supabase.com/mcp?project_ref=${supabaseRef}`,
    },
  };
}

function mergeMcpJson(taskmasterEnv, githubToken) {
  const mcpPath = path.join(os.homedir(), '.cursor', 'mcp.json');
  const required = buildMcpServers(taskmasterEnv, githubToken);
  let data = { mcpServers: {} };
  if (fs.existsSync(mcpPath)) {
    try {
      const raw = fs.readFileSync(mcpPath, 'utf8');
      data = JSON.parse(raw);
      if (!data.mcpServers || typeof data.mcpServers !== 'object') {
        data.mcpServers = {};
      }
    } catch (e) {
      console.warn(chalk.yellow(`Could not parse ${mcpPath} — backing up and merging into fresh object.`));
      fs.copySync(mcpPath, `${mcpPath}.backup.${Date.now()}`);
      data = { mcpServers: {} };
    }
  }
  let added = 0;
  let kept = 0;
  for (const [name, cfg] of Object.entries(required)) {
    if (data.mcpServers[name]) {
      kept++;
      console.log(chalk.dim(`  MCP: kept existing "${name}" (not overwritten)`));
      continue;
    }
    data.mcpServers[name] = cfg;
    added++;
    console.log(chalk.green(`  MCP: added "${name}"`));
  }
  fs.ensureDirSync(path.dirname(mcpPath));
  fs.writeFileSync(mcpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(mcpPath, 0o600);
    } catch (e) {
      /* non-fatal — some filesystems ignore mode */
    }
  }
  migrateSentryMcpEnvInMcpJson(mcpPath);
  migrateSemgrepMcpInMcpJson(mcpPath);
  return { mcpPath, added, kept };
}

/**
 * @sentry/mcp-server reads SENTRY_ACCESS_TOKEN; older HexCurse templates used SENTRY_AUTH_TOKEN.
 * Copies the value across so the MCP process receives a token when present.
 */
function migrateSentryMcpEnvInMcpJson(mcpPath) {
  if (!fs.existsSync(mcpPath)) return;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
  } catch (e) {
    return;
  }
  const sentry = data.mcpServers && data.mcpServers.sentry;
  if (!sentry || !sentry.env || typeof sentry.env !== 'object') return;
  const env = sentry.env;
  if (env.SENTRY_AUTH_TOKEN != null && env.SENTRY_ACCESS_TOKEN == null) {
    env.SENTRY_ACCESS_TOKEN = env.SENTRY_AUTH_TOKEN;
    delete env.SENTRY_AUTH_TOKEN;
    fs.writeFileSync(mcpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    console.log(
      chalk.green('✓'),
      'Migrated sentry MCP: env key SENTRY_AUTH_TOKEN → SENTRY_ACCESS_TOKEN (required by @sentry/mcp-server)'
    );
  }
}

/**
 * Replaces deprecated uvx/stdio semgrep-mcp with official Streamable HTTP endpoint.
 */
function migrateSemgrepMcpInMcpJson(mcpPath) {
  if (!fs.existsSync(mcpPath)) return;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
  } catch (e) {
    return;
  }
  const semgrep = data.mcpServers && data.mcpServers.semgrep;
  if (!semgrep || typeof semgrep !== 'object') return;
  const args = Array.isArray(semgrep.args) ? semgrep.args : [];
  const usesDeprecatedUvx =
    semgrep.command === 'uvx' || args.some((a) => String(a).includes('semgrep-mcp'));
  if (!usesDeprecatedUvx) return;
  data.mcpServers.semgrep = {
    type: 'streamable-http',
    url: 'https://mcp.semgrep.ai/mcp',
  };
  fs.writeFileSync(mcpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(
    chalk.green('✓'),
    'Migrated semgrep MCP to streamable-http (https://mcp.semgrep.ai/mcp)'
  );
}

/**
 * Ensures ~/.cursor/mcp.json defines swarm-protocol using the bundled launcher
 * (installs/builds phuryn/swarm-protocol from GitHub — see bin/swarm-protocol-mcp.js).
 */
function mergeSwarmProtocolMcpServerIfMissing() {
  const mcpPath = path.join(os.homedir(), '.cursor', 'mcp.json');
  let data = { mcpServers: {} };
  if (fs.existsSync(mcpPath)) {
    try {
      const raw = fs.readFileSync(mcpPath, 'utf8');
      data = JSON.parse(raw);
      if (!data.mcpServers || typeof data.mcpServers !== 'object') {
        data.mcpServers = {};
      }
    } catch (e) {
      console.warn(
        chalk.yellow(`Could not parse ${mcpPath} — fix mcp.json then re-run --multi-agent.`),
        chalk.dim(e.message || String(e))
      );
      return;
    }
  }
  const launcherPath = path.resolve(__dirname, 'bin', 'swarm-protocol-mcp.js');
  if (!fs.existsSync(launcherPath)) {
    console.warn(
      chalk.yellow('⚠'),
      'swarm-protocol launcher missing — expected',
      chalk.dim(launcherPath)
    );
    return;
  }
  const prev = data.mcpServers['swarm-protocol'] || {};
  const prevEnv = prev.env && typeof prev.env === 'object' ? { ...prev.env } : {};
  const defaultLocalSwarm =
    'postgresql://postgres:postgres@127.0.0.1:5432/swarm_protocol';
  const envOut = { ...prevEnv };
  // Do not embed DB credentials in mcp.json — use ~/.cursor/swarm-database.env (see bin/swarm-protocol-mcp.js).
  if (envOut.DATABASE_URL === defaultLocalSwarm) delete envOut.DATABASE_URL;
  if (!envOut.DATABASE_URL && !envOut.SWARM_DATABASE_URL) {
    const fromShell = String(
      process.env.SWARM_DATABASE_URL || process.env.DATABASE_URL || ''
    ).trim();
    if (fromShell) envOut.DATABASE_URL = fromShell;
  }
  data.mcpServers['swarm-protocol'] = {
    command: 'node',
    args: [launcherPath],
    env: envOut,
  };
  fs.ensureDirSync(path.dirname(mcpPath));
  fs.writeFileSync(mcpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(mcpPath, 0o600);
    } catch (e) {
      /* non-fatal */
    }
  }
  console.log(chalk.green('✓'), 'Configured swarm-protocol MCP in ~/.cursor/mcp.json (launcher → phuryn/swarm-protocol).');
  console.log(
    chalk.dim(
      '  First MCP start may run npm install + tsc (~1–2 min). Requires PostgreSQL (see swarm-protocol README / docker compose).'
    )
  );
}

/** True when stdin is an interactive TTY (false for pipes — required for readline on Windows). */
function stdinIsTTY() {
  return process.stdin.isTTY === true;
}

/**
 * Line-buffered prompts via Node readline (works in Windows PowerShell ConPTY;
 * enquirer/prompts raw-mode input often freezes on Enter there).
 */
function ask(question, defaultValue) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: stdinIsTTY(),
    });
    const promptText = defaultValue
      ? `${question} (${defaultValue}): `
      : `${question}: `;
    rl.question(promptText, (answer) => {
      rl.close();
      resolve((answer || '').trim() || (defaultValue !== undefined ? String(defaultValue) : '') || '');
    });
  });
}

async function choose(question, options) {
  const list = options.map((o, i) => `  ${i + 1}. ${o}`).join('\n');
  for (;;) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: stdinIsTTY(),
    });
    const picked = await new Promise((resolve) => {
      rl.question(`${question}\n${list}\nEnter number: `, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
    const idx = parseInt(String(picked || '').trim(), 10) - 1;
    if (idx >= 0 && idx < options.length) {
      return options[idx];
    }
    console.log(`  Invalid — enter a number from 1 to ${options.length}.`);
  }
}

async function askRequired(question, defaultValue, validate) {
  for (;;) {
    const answer = await ask(question, defaultValue);
    if (!validate || validate(answer)) {
      return answer;
    }
    console.log('  Invalid — try again.');
  }
}

function providerKeyFromLabel(label) {
  const map = {
    'LM Studio': 'lmstudio',
    Anthropic: 'anthropic',
    OpenAI: 'openai',
    Other: 'other',
  };
  return map[label] || 'lmstudio';
}

/** Returns { token, source } from env or ~/.cursor/mcp.json so repeat installs skip the GitHub prompt. */
function resolveGithubTokenFromUserEnvironment() {
  const fromEnv = String(
    process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN || ''
  ).trim();
  if (fromEnv.length > 10) {
    return { token: fromEnv, source: 'environment (GITHUB_PERSONAL_ACCESS_TOKEN or GITHUB_TOKEN)' };
  }
  const mcpPath = path.join(os.homedir(), '.cursor', 'mcp.json');
  if (!fs.existsSync(mcpPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(mcpPath, 'utf8');
    const data = JSON.parse(raw);
    const t = String(data?.mcpServers?.github?.env?.GITHUB_PERSONAL_ACCESS_TOKEN || '').trim();
    if (t.length > 10) {
      return { token: t, source: '~/.cursor/mcp.json (github server)' };
    }
  } catch (e) {
    /* ignore */
  }
  return null;
}

/** Reads all stdin lines when piped (Windows-safe — avoids per-prompt readline losing the buffer). */
function readPipedStdinLines() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.once('error', reject);
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.once('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      let lines = raw.split(/\r?\n/);
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      resolve(lines.map((l) => l.replace(/\r$/, '')));
    });
    process.stdin.resume();
  });
}

/** Prompt implementations that consume a pre-read line array (for CI / `type answers.txt | node setup.js`). */
function createBufferedPrompts(rawLines) {
  const lines = rawLines.slice();
  let i = 0;
  const take = () => {
    if (i >= lines.length) return '';
    return String(lines[i++]).trim();
  };

  async function buffAsk(question, defaultValue) {
    const promptText =
      defaultValue !== undefined && defaultValue !== ''
        ? `${question} (${defaultValue}): `
        : `${question}: `;
    process.stdout.write(promptText);
    let answer = take();
    console.log(answer);
    if (!answer && defaultValue !== undefined) {
      answer = String(defaultValue);
    }
    return String(answer || '').trim();
  }

  async function buffChoose(question, options) {
    const list = options.map((o, idx) => `  ${idx + 1}. ${o}`).join('\n');
    console.log(`${question}\n${list}\nEnter number: `);
    for (;;) {
      const picked = take();
      console.log(picked);
      const idx = parseInt(String(picked || '').trim(), 10) - 1;
      if (idx >= 0 && idx < options.length) {
        return options[idx];
      }
      console.log(`  Invalid — enter a number from 1 to ${options.length}.`);
    }
  }

  async function buffAskRequired(question, defaultValue, validate) {
    for (;;) {
      const answer = await buffAsk(question, defaultValue);
      if (!validate || validate(answer)) {
        return answer;
      }
      console.log('  Invalid — try again.');
    }
  }

  return { ask: buffAsk, choose: buffChoose, askRequired: buffAskRequired };
}

async function promptUser() {
  let chooseFn = choose;
  let askFn = ask;
  let askRequiredFn = askRequired;
  if (!stdinIsTTY()) {
    const piped = await readPipedStdinLines();
    const b = createBufferedPrompts(piped);
    chooseFn = b.choose;
    askFn = b.ask;
    askRequiredFn = b.askRequired;
  }

  const providerLabel = await chooseFn('Which model provider are you using?', [
    'LM Studio',
    'Anthropic',
    'OpenAI',
    'Other',
  ]);
  const provider = providerKeyFromLabel(providerLabel);

  let taskmasterEnv = {};

  if (provider === 'lmstudio') {
    let url = await askFn('LM Studio base URL', lmStudioBaseUrlFromEnv());
    url = normalizeLmStudioV1BaseUrl(String(url).trim() || lmStudioBaseUrlFromEnv());
    taskmasterEnv = {
      OPENAI_API_KEY: 'lm-studio',
      OPENAI_BASE_URL: url,
    };
  } else if (provider === 'anthropic') {
    const key = await askRequiredFn('Anthropic API key (sk-ant-...)', undefined, (v) =>
      String(v || '').trim().startsWith('sk-ant-')
    );
    taskmasterEnv = { ANTHROPIC_API_KEY: String(key).trim() };
  } else if (provider === 'openai') {
    const key = await askRequiredFn('OpenAI API key (sk-...)', undefined, (v) =>
      String(v || '').trim().startsWith('sk-')
    );
    taskmasterEnv = { OPENAI_API_KEY: String(key).trim() };
  } else {
    const apiBaseUrl = await askRequiredFn('API base URL', undefined, (v) => String(v || '').trim().length > 0);
    const apiKey = await askRequiredFn('API key', undefined, (v) => String(v || '').trim().length > 0);
    taskmasterEnv = {
      OPENAI_BASE_URL: String(apiBaseUrl).trim(),
      OPENAI_API_KEY: String(apiKey).trim(),
    };
  }

  let github;
  const resolvedGh = resolveGithubTokenFromUserEnvironment();
  if (resolvedGh) {
    github = resolvedGh.token;
    console.log(
      chalk.green('✓'),
      'Reusing GitHub token from',
      chalk.dim(resolvedGh.source + '.'),
      chalk.dim('To enter a new token: unset GITHUB_PERSONAL_ACCESS_TOKEN / GITHUB_TOKEN and remove github from ~/.cursor/mcp.json (or clear its env).')
    );
  } else {
    github = await askRequiredFn(
      'GitHub Personal Access Token',
      undefined,
      (v) => String(v || '').trim().length > 10
    );
  }
  if (String(github || '').trim().length <= 10) {
    console.error(chalk.red('GitHub token is missing or too short.'));
    process.exit(1);
  }

  const repoKindLabel = await chooseFn('New greenfield project, or existing codebase?', [
    'New project (you describe goals and stack)',
    'Existing codebase (infer NORTH_STAR from the repo via repomix + your model)',
  ]);
  const repoKind = repoKindLabel.startsWith('Existing') ? 'existing' : 'new';

  let projectName;
  let purpose;
  let stack;
  let modules;
  let sacred;
  let outOfScope;
  let dod;
  let northStarDraftMd = null;

  if (repoKind === 'new') {
    projectName = await askRequiredFn('Project name', undefined, (v) => String(v || '').trim().length > 0);
    purpose = await askRequiredFn(
      'One-sentence project purpose',
      undefined,
      (v) => String(v || '').trim().length > 0
    );
    stack = await askRequiredFn(
      'Tech stack (e.g. Python, FastAPI, SQLite)',
      undefined,
      (v) => String(v || '').trim().length > 0
    );
    modules = await askRequiredFn(
      'Top 3-5 modules/subsystems (comma-separated)',
      undefined,
      (v) => String(v || '').trim().length > 0
    );

    const sacredDefault = 'no cloud, no global state, always deterministic';
    sacred = await askFn('Sacred constraints (comma-separated)', sacredDefault);

    outOfScope = await askRequiredFn(
      'What is explicitly out of scope for v1',
      undefined,
      (v) => String(v || '').trim().length > 0
    );
    dod = await askRequiredFn(
      'Definition of done for first working version',
      undefined,
      (v) => String(v || '').trim().length > 0
    );
  } else {
    const cwd = process.cwd();
    projectName = path.basename(path.resolve(cwd)) || 'Project';
    console.log(
      chalk.dim(`Project name (folder): ${projectName}`),
      chalk.dim('— edit NORTH_STAR.md if you want a different display name.')
    );
    const humanFocus = await askFn(
      'Optional one-line focus (e.g. stabilize CI, onboard to HexCurse). Leave empty to infer from code only.',
      ''
    );
    const sacredDefaultExisting = 'no secrets in git; one directive per session';
    sacred = await askFn('Sacred constraints (comma-separated)', sacredDefaultExisting);

    console.log(chalk.bold('\nPacking repository (npx repomix --compress)…'));
    const snapshot = runRepomixCompressSnapshot(cwd);
    console.log(chalk.dim(`Snapshot length: ${snapshot.length} characters`));
    console.log(
      chalk.bold('Drafting NORTH_STAR.md'),
      chalk.dim('via your chosen provider (same API as Taskmaster)…')
    );
    try {
      const draft = await generateNorthStarFromExistingRepo({
        provider,
        taskmasterEnv,
        snapshot,
        humanFocus: String(humanFocus || '').trim(),
        projectName: String(projectName).trim(),
      });
      northStarDraftMd = draft.northStarMd;
      purpose = draft.purpose;
      stack = draft.stack;
      modules = draft.modules;
      outOfScope = draft.outOfScope;
      dod = draft.dod;
      console.log(chalk.green('✓'), 'NORTH_STAR draft ready (you can refine it after Cursor restart).');
    } catch (e) {
      console.error(chalk.red('Auto NORTH_STAR generation failed:'), e.message);
      console.log(
        chalk.yellow('Falling back to template NORTH_STAR.md — fill it manually, then use ONE_PROMPT or --run-hexcurse.')
      );
      northStarDraftMd = null;
      purpose = `Existing codebase (${projectName}); define purpose in NORTH_STAR.md`;
      stack = 'TBD — confirm from repository';
      modules = 'TBD — list in NORTH_STAR.md after review';
      outOfScope = 'TBD — confirm with human';
      dod = 'NORTH_STAR filled; task-master parse-prd succeeds';
    }
  }

  return {
    projectName: String(projectName).trim(),
    purpose: String(purpose).trim(),
    stack: String(stack).trim(),
    modules: String(modules).trim(),
    sacred: String(sacred).trim(),
    outOfScope: String(outOfScope).trim(),
    dod: String(dod).trim(),
    provider,
    taskmasterEnv,
    github: String(github).trim(),
    repoKind,
    northStarDraftMd,
  };
}

/** JSON manifest so hooks, scripts, and agents resolve governance paths without guessing. */
function pathsManifestObject(installerMeta) {
  const h = HEXCURSE_ROOT;
  const base = {
    version: 1,
    schema: 'hexcurse-paths-v1',
    description:
      'HexCurse governance pack — canonical paths relative to repository root. Read this file to locate agents, directives, rules, and prompts.',
    packRoot: h,
    paths: {
      agents: `${h}/AGENTS.md`,
      directives: `${h}/DIRECTIVES.md`,
      architecture: `${h}/docs/ARCHITECTURE.md`,
      archPrompt: `${h}/docs/ARCH_PROMPT.md`,
      sessionStartPrompt: `${h}/SESSION_START_PROMPT.md`,
      sessionLog: `${h}/SESSION_LOG.md`,
      pathsManifest: `${h}/PATHS.json`,
      packReadme: `${h}/README.md`,
      rulesCanonicalDir: `${h}/rules`,
      baseMdcCanonical: `${h}/rules/base.mdc`,
      mcpUsageMdcCanonical: `${h}/rules/mcp-usage.mdc`,
      governanceMdcCanonical: `${h}/rules/governance.mdc`,
      rulesCursorDir: '.cursor/rules',
      baseMdcActive: '.cursor/rules/base.mdc',
      mcpUsageMdcActive: '.cursor/rules/mcp-usage.mdc',
      governanceMdcActive: '.cursor/rules/governance.mdc',
      taskmasterRoot: '.taskmaster',
      prd: '.taskmaster/docs/prd.txt',
      agentParsePromptCache: '.taskmaster/agent-parse-prompt.txt',
      serenaMemories: '.serena/memories',
      rootAgentsPointer: 'AGENTS.md',
      continualLearningGuide: `${h}/docs/CONTINUAL_LEARNING.md`,
      mcpCoordination: `${h}/docs/MCP_COORDINATION.md`,
      governanceParity: `${h}/docs/GOVERNANCE_PARITY.md`,
      memoryTaxonomy: `${h}/docs/MEMORY_TAXONOMY.md`,
      continualLearningIndex: '.cursor/hooks/state/continual-learning-index.json',
      continualLearningHookState: '.cursor/hooks/state/continual-learning.json',
      skillPromotionQueue: '.cursor/hooks/state/skill-promotion-queue.json',
      cursorSkillsDir: '.cursor/skills',
      rollingContext: `${h}/docs/ROLLING_CONTEXT.md`,
      northStar: `${h}/NORTH_STAR.md`,
      cursorQuickStart: `${h}/CURSOR.md`,
      oneShotPrompt: `${h}/ONE_PROMPT.md`,
      headlessKickoffPrompt: `${h}/HEADLESS_KICKOFF.txt`,
      cursorHeadlessModelDefault: 'composer-2',
      installerPathFile: '.cursor/hexcurse-installer.path',
      securityMdcCanonical: `${h}/rules/security.mdc`,
      securityMdcActive: '.cursor/rules/security.mdc',
      adrMdcCanonical: `${h}/rules/adr.mdc`,
      adrMdcActive: '.cursor/rules/adr.mdc',
      memoryMgmtMdcCanonical: `${h}/rules/memory-management.mdc`,
      memoryMgmtMdcActive: '.cursor/rules/memory-management.mdc',
      debuggingMdcCanonical: `${h}/rules/debugging.mdc`,
      debuggingMdcActive: '.cursor/rules/debugging.mdc',
      multiAgentMdcCanonical: `${h}/rules/multi-agent.mdc`,
      multiAgentMdcActive: '.cursor/rules/multi-agent.mdc',
      linearSyncMdcCanonical: `${h}/rules/linear-sync.mdc`,
      linearSyncMdcActive: '.cursor/rules/linear-sync.mdc',
      supabaseProjectRef: process.env.SUPABASE_PROJECT_REF || 'dpivknupklbxjbrcntes',
      mcpTokenBudget: `${h}/docs/MCP_TOKEN_BUDGET.md`,
      multiAgentDoc: `${h}/docs/MULTI_AGENT.md`,
      adrLog: `${h}/docs/ADR_LOG.md`,
      agentHandoffs: `${h}/docs/AGENT_HANDOFFS.md`,
    },
  };
  if (installerMeta && installerMeta.installerVersion) {
    base.installer = {
      name: String(installerMeta.installerName || 'cursor-governance'),
      version: String(installerMeta.installerVersion),
      generatedAt: String(installerMeta.generatedAt || new Date().toISOString()),
    };
  }
  return base;
}

function hexcurseReadmeMd(projectName) {
  return `# HexCurse governance pack — ${projectName}

All **HexCurse** artifacts for AI-assisted development in this repository live in **${HEXCURSE_ROOT}/** so tools and humans have one place to look.

## Minimal workflow (NORTH STAR → one Cursor message)

1. Edit **\`NORTH_STAR.md\`** in this folder with your full product idea.
2. **Either** run **[Cursor headless CLI](https://cursor.com/docs/cli/headless)** with **\`agent -p --model composer-2 --trust --workspace .\`** and **[HEADLESS_KICKOFF.txt](./HEADLESS_KICKOFF.txt)** (see **[ONE_PROMPT.md](./ONE_PROMPT.md)** for bash/PowerShell one-liners), **or** open **[ONE_PROMPT.md](./ONE_PROMPT.md)** → copy the **in-IDE** **fenced** block → paste as the **entire** first message in a **new Agent** chat. The agent runs **\`setup.js --run-hexcurse\`** (path from **\`.cursor/hexcurse-installer.path\`**) and then full session start.

## Right after install — you are almost done

The installer already wrote rules, Taskmaster state, MCP merge hints, **\`ONE_PROMPT.md\`**, and **\`.cursor/hexcurse-installer.path\`**. Do this once per machine/repo:

1. **Restart Cursor** and open **this** repository folder (so \`.cursor/rules\` and MCP config reload).
2. **Cursor → Settings → MCP** — fix any **red** servers (tokens/paths); optional: **Settings → Rules** → paste bullets from \`.cursor/rules/process-gates.mdc\`.
3. **New Agent chat** → either **[ONE_PROMPT.md](./ONE_PROMPT.md)** (after **\`./NORTH_STAR.md\`**) **or** **[SESSION_START_PROMPT.md](./SESSION_START_PROMPT.md)** → paste as **message 1**.

Then you are **ready to work** under HexCurse (Taskmaster + MCP ritual). Health check from repo root: \`node path/to/cursor-governance/setup.js --doctor\`.

## Human entry points
| Artifact | Path |
|----------|------|
| Agent rules (session flow, MCP) | [AGENTS.md](./AGENTS.md) |
| Directive chain | [DIRECTIVES.md](./DIRECTIVES.md) |
| Architecture | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Paste at new Cursor chat | [SESSION_START_PROMPT.md](./SESSION_START_PROMPT.md) |
| Session audit log | [SESSION_LOG.md](./SESSION_LOG.md) |
| Architect / planning chats | [docs/ARCH_PROMPT.md](./docs/ARCH_PROMPT.md) |
| MCP stack coordination | [docs/MCP_COORDINATION.md](./docs/MCP_COORDINATION.md) |
| Memory taxonomy (buckets) | [docs/MEMORY_TAXONOMY.md](./docs/MEMORY_TAXONOMY.md) |
| Rolling context / rollups | [docs/ROLLING_CONTEXT.md](./docs/ROLLING_CONTEXT.md) |
| Cursor quick-start | [CURSOR.md](./CURSOR.md) |
| Cursor skills (procedural) | [../.cursor/skills/README.md](../.cursor/skills/README.md) |
| North star → PRD / tasks | [NORTH_STAR.md](./NORTH_STAR.md) + [ONE_PROMPT.md](./ONE_PROMPT.md) / [HEADLESS_KICKOFF.txt](./HEADLESS_KICKOFF.txt) (headless \`agent -p --model composer-2\`) or \`node path/to/setup.js --run-hexcurse\` |

## Agent-first reminder
Governance is active when **Cursor agents** are primed each chat: paste **[SESSION_START_PROMPT.md](./SESSION_START_PROMPT.md)** (or \`@\` the files it lists). Rules in \`.cursor/rules/\` load automatically but do not replace that sequence.

## Tools and automation
**[PATHS.json](./PATHS.json)** lists the same paths as JSON (repo-root–relative). Use it from hooks, CLIs, or MCP helpers that need to open governance files.

**Cursor** loads \`alwaysApply\` rules from **\`.cursor/rules/**\`. Those files are written to match **\`${HEXCURSE_ROOT}/rules/**\`** at install time. If you edit rules by hand, keep both copies aligned (or re-run the installer on a fresh clone).

Taskmaster uses **\`.taskmaster/**\` at the repository root. Serena memories default to **\`.serena/memories/**\` at the repository root.

**Continual learning:** See **[docs/CONTINUAL_LEARNING.md](./docs/CONTINUAL_LEARNING.md)** — incremental transcript index under \`.cursor/hooks/state/\` (seeded at install, gitignored), **agents-memory-updater** flow, and when to touch **Learned Workspace Facts** in AGENTS.md.

**MCP coordination:** See **[docs/MCP_COORDINATION.md](./docs/MCP_COORDINATION.md)** — how every MCP fits session start, implementation, and close (with **mcp-usage.mdc** as binding spec).

**Memory taxonomy & skills:** **[docs/MEMORY_TAXONOMY.md](./docs/MEMORY_TAXONOMY.md)** (this pack) and **\`.cursor/skills/README.md\`**. Deterministic log rollup → **docs/ROLLING_CONTEXT.md**: \`node path/to/cursor-governance/setup.js --learning-rollup\`.
`;
}

/** Subpackage AGENTS.md pointer when a top-level folder has its own package.json (existing-repo installs). */
function subAgentsPointerMd(projectName, subdir) {
  const s = String(subdir || 'package').trim();
  const p = String(projectName || 'Project').trim();
  return `# Agent Instructions — ${s}

This package is part of **${p}**.
Global governance rules: see root \`AGENTS.md\` → \`HEXCURSE/AGENTS.md\`.

## Package-specific overrides
<!-- Add any ${s}-specific agent instructions below.
     These take precedence over root AGENTS.md for files inside this directory. -->
`;
}

function rootAgentsPointerMd(projectName) {
  return `# AI agent rules — pointer

**${projectName}** — full **HexCurse** governance lives in **${HEXCURSE_ROOT}/** (north star, Cursor quick-start, session log, and docs are **inside** that folder).

| What | Where |
|------|--------|
| Rules of engagement | [${HEXCURSE_ROOT}/AGENTS.md](${HEXCURSE_ROOT}/AGENTS.md) |
| North star / PRD bridge | [${HEXCURSE_ROOT}/NORTH_STAR.md](${HEXCURSE_ROOT}/NORTH_STAR.md) |
| Cursor quick-start | [${HEXCURSE_ROOT}/CURSOR.md](${HEXCURSE_ROOT}/CURSOR.md) |
| Path manifest (for tools) | [${HEXCURSE_ROOT}/PATHS.json](${HEXCURSE_ROOT}/PATHS.json) |
| Session start paste | [${HEXCURSE_ROOT}/SESSION_START_PROMPT.md](${HEXCURSE_ROOT}/SESSION_START_PROMPT.md) |

Open **${HEXCURSE_ROOT}/SESSION_START_PROMPT.md** and paste its block into a new Cursor chat (it \`@\`-mentions paths under \`${HEXCURSE_ROOT}/\`).
`;
}

/** Writes identical rule content to HEXCURSE/rules and .cursor/rules; skip both if canonical file exists. */
async function writeGovernanceRules(cwd, basename, content, written, skipped) {
  const relPack = path.join(HEXCURSE_ROOT, 'rules', basename);
  const relCursor = path.join('.cursor', 'rules', basename);
  const fullPack = path.join(cwd, relPack);
  if (await fs.pathExists(fullPack)) {
    skipped.push(relPack);
    skipped.push(relCursor);
    return;
  }
  const fullCursor = path.join(cwd, relCursor);
  await fs.ensureDir(path.dirname(fullPack));
  await fs.ensureDir(path.dirname(fullCursor));
  await fs.writeFile(fullPack, content, 'utf8');
  await fs.writeFile(fullCursor, content, 'utf8');
  written.push(relPack);
  written.push(relCursor);
}

async function writeFileMaybeSkip(cwd, rel, content, written, skipped) {
  const full = path.join(cwd, rel);
  if (await fs.pathExists(full)) {
    skipped.push(rel);
    console.warn(chalk.yellow(`⚠ SKIP (exists): ${rel}`));
    return;
  }
  await fs.ensureDir(path.dirname(full));
  await fs.writeFile(full, content, 'utf8');
  written.push(rel);
  console.log(chalk.green(`✓ Wrote ${rel}`));
}

/** Best-effort: index .cursor/skills with PAMPA when CLI is available (warn-only on failure). */
async function tryIndexSkillsWithPampa(cwd) {
  const skillsDir = path.join(cwd, '.cursor', 'skills');
  if (!fs.existsSync(skillsDir)) return;
  let canRun = false;
  if (commandOnPath('pampa', process.platform)) {
    canRun = true;
  } else {
    try {
      execSync('npm view pampa version', {
        cwd,
        shell: true,
        stdio: 'pipe',
        encoding: 'utf8',
      });
      canRun = true;
    } catch (_) {
      /* optional tooling */
    }
  }
  if (!canRun) {
    console.warn(
      chalk.yellow('⚠'),
      'PAMPA not on PATH and `npm view pampa version` failed — skip skill indexing (optional).'
    );
    return;
  }
  try {
    execSync('npx -y --package=pampa pampa-mcp index .cursor/skills/', {
      cwd,
      shell: true,
      stdio: 'inherit',
    });
    console.log(
      chalk.green('✓'),
      'PAMPA indexed .cursor/skills/ — skills are now semantically searchable'
    );
  } catch (e) {
    console.warn(
      chalk.yellow('⚠'),
      'PAMPA skill indexing failed — optional tooling.',
      chalk.dim(e && e.message ? e.message : String(e))
    );
  }
}

async function appendGitignoreLines(cwd) {
  const lines = [
    'repomix-output.xml',
    path.join('.taskmaster', 'agent-parse-prompt.txt'),
    path.join('.taskmaster', 'tasks', 'tasks.json'),
    path.join('.serena', 'project.local.yml'),
    '.cursor/hooks/state/',
    '.cursor/hexcurse-installer.path',
    '.env',
  ];
  const gi = path.join(cwd, '.gitignore');
  let body = '';
  if (await fs.pathExists(gi)) {
    body = await fs.readFile(gi, 'utf8');
  }
  const toAdd = [];
  for (const line of lines) {
    if (!body.split(/\r?\n/).some((l) => l.trim() === line)) {
      toAdd.push(line);
    }
  }
  if (toAdd.length === 0) {
    console.log(chalk.dim('.gitignore already contains required lines.'));
    return;
  }
  const prefix = body.length && !body.endsWith('\n') ? '\n' : '';
  const block = `${prefix}${toAdd.join('\n')}\n`;
  await fs.appendFile(gi, block, 'utf8');
  console.log(chalk.green('✓ Appended to .gitignore:'), toAdd.join(', '));
}

/** Runs a shell command; optional extraEnv is merged into the child process environment. */
function runCmd(cwd, cmdline, label, extraEnv) {
  const env = extraEnv ? { ...process.env, ...extraEnv } : process.env;
  try {
    execSync(cmdline, { cwd, shell: true, stdio: 'inherit', env });
    return true;
  } catch (e) {
    console.warn(chalk.yellow(`⚠ ${label} failed — continuing.`));
    return false;
  }
}

/** Env vars for task-master CLI so parse-prd and models use the same provider as the install answers. */
function taskmasterChildEnv(answers) {
  const env = { ...process.env };
  const te = answers.taskmasterEnv || {};
  if (answers.provider === 'lmstudio') {
    env.OPENAI_API_KEY = String(te.OPENAI_API_KEY || 'lm-studio');
    env.OPENAI_BASE_URL = resolvedLmStudioApiBaseUrl(answers);
  } else if (answers.provider === 'anthropic' && te.ANTHROPIC_API_KEY) {
    env.ANTHROPIC_API_KEY = String(te.ANTHROPIC_API_KEY);
  } else if (answers.provider === 'openai' && te.OPENAI_API_KEY) {
    env.OPENAI_API_KEY = String(te.OPENAI_API_KEY);
  } else if (answers.provider === 'other') {
    Object.assign(env, te);
  }
  return env;
}

/** Writes minimal .env for LM Studio if missing so task-master CLI picks it up. */
async function writeLmStudioDotEnvIfMissing(cwd, answers) {
  if (answers.provider !== 'lmstudio') return;
  const dotEnv = path.join(cwd, '.env');
  if (await fs.pathExists(dotEnv)) return;
  const url = resolvedLmStudioApiBaseUrl(answers);
  const body = `# Written by cursor-governance install (LM Studio). Do not commit.\nOPENAI_API_KEY=lm-studio\nOPENAI_BASE_URL=${url}\n`;
  await fs.writeFile(dotEnv, body, 'utf8');
  console.log(chalk.green('✓'), 'Wrote .env for LM Studio (OPENAI_* for task-master CLI)');
}

/**
 * Point Taskmaster main/fallback/research at the chosen provider so parse-prd does not default to Anthropic/Perplexity.
 */
function configureTaskmasterModelsForInstall(cwd, answers) {
  const { provider } = answers;
  if (provider === 'other') {
    console.log(chalk.dim('Skipping task-master models alignment (preset "other").'));
    return;
  }
  const env = taskmasterChildEnv(answers);
  const shQuote = (s) => `"${String(s).replace(/"/g, '\\"')}"`;

  if (provider === 'lmstudio') {
    const url = resolvedLmStudioApiBaseUrl(answers);
    const model = String(process.env.HEXCURSE_LM_STUDIO_MODEL || 'qwen3.5-2b').trim();
    const base = `task-master models --set-main ${shQuote(model)} --lmstudio --baseURL ${shQuote(url)}`;
    runCmd(cwd, base, 'task-master models (main)', env);
    runCmd(
      cwd,
      `task-master models --set-fallback ${shQuote(model)} --lmstudio --baseURL ${shQuote(url)}`,
      'task-master models (fallback)',
      env
    );
    runCmd(
      cwd,
      `task-master models --set-research ${shQuote(model)} --lmstudio --baseURL ${shQuote(url)}`,
      'task-master models (research)',
      env
    );
    return;
  }
  if (provider === 'anthropic') {
    runCmd(
      cwd,
      'task-master models --set-main claude-sonnet-4-20250514',
      'task-master models (anthropic main)',
      env
    );
    runCmd(
      cwd,
      'task-master models --set-fallback claude-3-7-sonnet-20250219',
      'task-master models (anthropic fallback)',
      env
    );
    runCmd(
      cwd,
      'task-master models --set-research claude-3-7-sonnet-20250219',
      'task-master models (anthropic research)',
      env
    );
    return;
  }
  if (provider === 'openai') {
    runCmd(cwd, 'task-master models --set-main gpt-4o', 'task-master models (openai main)', env);
    runCmd(cwd, 'task-master models --set-fallback gpt-4o-mini', 'task-master models (openai fallback)', env);
    runCmd(cwd, 'task-master models --set-research gpt-4o-mini', 'task-master models (openai research)', env);
  }
}

/**
 * Cap Taskmaster completion maxTokens and default task counts for LM Studio so parse-prd fits context.
 * Uses HEXCURSE_LM_STUDIO_MAX_CONTEXT when set; otherwise DEFAULT_LM_STUDIO_MAX_CONTEXT (8000).
 */
async function patchTaskmasterConfigForLmStudioContext(cwd, answers) {
  if (answers.provider !== 'lmstudio') return;
  const raw = process.env.HEXCURSE_LM_STUDIO_MAX_CONTEXT;
  const effective =
    raw != null && String(raw).trim() !== '' ? String(raw).trim() : String(DEFAULT_LM_STUDIO_MAX_CONTEXT);
  const ctx = parseInt(effective, 10);
  if (!Number.isFinite(ctx) || ctx < 1024) return;

  const configPath = path.join(cwd, '.taskmaster', 'config.json');
  if (!(await fs.pathExists(configPath))) return;

  let cfg;
  try {
    cfg = await fs.readJson(configPath);
  } catch {
    return;
  }
  if (!cfg.models || typeof cfg.models !== 'object') return;

  const maxCompletion = Math.max(256, Math.min(8192, Math.floor(ctx * 0.35)));
  for (const key of ['main', 'fallback', 'research']) {
    const m = cfg.models[key];
    if (m && typeof m === 'object' && m.provider === 'lmstudio') {
      m.maxTokens = maxCompletion;
    }
  }

  if (cfg.global && typeof cfg.global === 'object') {
    const num = cfg.global.defaultNumTasks ?? 10;
    const sub = cfg.global.defaultSubtasks ?? 5;
    if (ctx <= 4096) {
      cfg.global.defaultNumTasks = Math.min(num, 5);
      cfg.global.defaultSubtasks = Math.min(sub, 3);
    } else if (ctx <= 10240) {
      /* ~8k class (e.g. 8000, 8192): still tight for parse-prd + schema */
      cfg.global.defaultNumTasks = Math.min(num, 7);
      cfg.global.defaultSubtasks = Math.min(sub, 4);
    }
  }

  await fs.writeJson(configPath, cfg, { spaces: 2 });
  console.log(
    chalk.green('✓'),
    `Adjusted .taskmaster/config.json for LM Studio context ≈ ${ctx} (maxTokens≈${maxCompletion}, smaller default task graph).`
  );
}

/** If parse-prd did not create tasks, seed one placeholder so --doctor passes until the user fixes AI config. */
async function seedPlaceholderTasksJsonIfMissing(cwd) {
  const p = path.join(cwd, '.taskmaster', 'tasks', 'tasks.json');
  if (await fs.pathExists(p)) return;
  await fs.ensureDir(path.dirname(p));
  const stub = {
    master: {
      tasks: [
        {
          id: '1',
          title: 'Placeholder — run task-master parse-prd after models/APIs work',
          description:
            'Install completed without tasks.json. Configure .env / models, then: task-master parse-prd --force .taskmaster/docs/prd.txt',
          details: '',
          testStrategy: '',
          status: 'pending',
          dependencies: [],
          priority: 'medium',
          subtasks: [],
        },
      ],
    },
  };
  await fs.writeFile(p, `${JSON.stringify(stub, null, 2)}\n`, 'utf8');
  console.log(
    chalk.yellow('⚠'),
    'Wrote placeholder .taskmaster/tasks/tasks.json — replace by running parse-prd when your LLM endpoint is up.'
  );
}

/** Reads --preset=value from argv or HEXCURSE_PRESET. */
function parsePresetFromArgv(argv) {
  const raw = argv.slice(2).find((a) => a.startsWith('--preset='));
  if (raw) {
    const v = raw.slice('--preset='.length).trim().toLowerCase();
    if (['lmstudio', 'anthropic', 'openai', 'other'].includes(v)) return v;
  }
  const e = String(process.env.HEXCURSE_PRESET || '').trim().toLowerCase();
  if (['lmstudio', 'anthropic', 'openai', 'other'].includes(e)) return e;
  return 'lmstudio';
}

function argvHasQuick(argv) {
  return argv.slice(2).some((a) => a === '--quick' || a === '-q');
}

/** Builds install answers without prompts (for --quick). */
function buildQuickInstallAnswers(cwd, preset) {
  const gh = resolveGithubTokenFromUserEnvironment();
  if (!gh) {
    console.error(
      chalk.red(
        'Quick install needs a GitHub token: set GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN, or add github.env.GITHUB_PERSONAL_ACCESS_TOKEN in ~/.cursor/mcp.json'
      )
    );
    process.exit(1);
  }
  // Preset "other": skip Taskmaster model alignment (same as interactive "Other" provider).

  const base = path.basename(path.resolve(cwd));
  const projectName = String(process.env.HEXCURSE_PROJECT_NAME || base || 'Project').trim();
  const purpose = String(
    process.env.HEXCURSE_PURPOSE || `Governed project (${projectName})`
  ).trim();
  const stack = String(process.env.HEXCURSE_STACK || 'TBD — confirm with human').trim();
  const modules = String(process.env.HEXCURSE_MODULES || 'core').trim();
  const sacred = String(
    process.env.HEXCURSE_SACRED || 'no secrets in git; one directive per session'
  ).trim();
  const outOfScope = String(process.env.HEXCURSE_OUT_OF_SCOPE || 'TBD — confirm with human').trim();
  const dod = String(
    process.env.HEXCURSE_DOD || 'Taskmaster parse-prd succeeds; SESSION_START prompt exists'
  ).trim();

  let taskmasterEnv = {};
  if (preset === 'lmstudio') {
    const raw = String(
      process.env.HEXCURSE_LM_STUDIO_BASE_URL ||
        process.env.LM_STUDIO_BASE_URL ||
        process.env.OPENAI_BASE_URL ||
        ''
    ).trim();
    const url = normalizeLmStudioV1BaseUrl(raw || DEFAULT_LM_STUDIO_BASE_URL);
    taskmasterEnv = { OPENAI_API_KEY: 'lm-studio', OPENAI_BASE_URL: url };
  } else if (preset === 'anthropic') {
    const key = String(process.env.ANTHROPIC_API_KEY || '').trim();
    if (!key.startsWith('sk-ant-')) {
      console.error(chalk.red('Quick install with --preset=anthropic requires ANTHROPIC_API_KEY (sk-ant-...) in the environment.'));
      process.exit(1);
    }
    taskmasterEnv = { ANTHROPIC_API_KEY: key };
  } else if (preset === 'openai') {
    const key = String(process.env.OPENAI_API_KEY || '').trim();
    if (key.length < 20) {
      console.error(
        chalk.red('Quick install with --preset=openai requires OPENAI_API_KEY in the environment.')
      );
      process.exit(1);
    }
    taskmasterEnv = { OPENAI_API_KEY: key };
  }

  const repoKind =
    String(process.env.HEXCURSE_REPO_KIND || '').toLowerCase() === 'existing'
      ? 'existing'
      : 'new';

  return {
    projectName,
    purpose,
    stack,
    modules,
    sacred,
    outOfScope,
    dod,
    provider: preset,
    taskmasterEnv,
    github: gh.token,
    repoKind,
    northStarDraftMd: null,
  };
}

async function tryGitCommit(cwd) {
  if (!(await fs.pathExists(path.join(cwd, '.git')))) {
    try {
      execSync('git init', { cwd, shell: true, stdio: 'inherit' });
      console.log(chalk.green('✓ git init'));
    } catch (e) {
      console.warn(chalk.yellow('⚠ git init failed — continuing.'));
      return;
    }
  }
  try {
    execSync('git add .', { cwd, shell: true, stdio: 'inherit' });
  } catch (e) {
    console.warn(chalk.yellow('⚠ git add . failed — continuing.'));
    return;
  }
  try {
    execSync('git commit -m "chore: cursor-governance scaffold"', { cwd, shell: true, stdio: 'inherit' });
    console.log(chalk.green('✓ git commit: chore: cursor-governance scaffold'));
  } catch (e) {
    console.warn(chalk.yellow('⚠ git commit failed (nothing to commit or user.name not set) — continuing.'));
  }
}

function printSummary(written, skipped, cwd, mcpResult, answers) {
  console.log('');
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('  DONE'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════════'));
  console.log('');
  console.log(chalk.bold('Project directory:'), cwd);
  if (mcpResult) {
    console.log(
      chalk.bold('MCP config:'),
      mcpResult.mcpPath,
      chalk.dim(`(${mcpResult.added} added, ${mcpResult.kept} already present — not overwritten)`)
    );
  }
  console.log(
    chalk.yellow(
      '\n⚠  MCP Token Budget: Each active server adds ~500–1000 tokens per tool to every request.\n' +
        '   HexCurse now installs 17 servers. Disable project-specific servers in ~/.cursor/mcp.json\n' +
        '   when not needed (e.g. disable gitmcp-adafruit-mpu6050 on non-hardware projects,\n' +
        '   disable Supabase when working offline or on non-Supabase backends).\n' +
        '   See HEXCURSE/docs/MCP_TOKEN_BUDGET.md for guidance.'
    )
  );
  const pampaPath = resolvePampaGlobalPath();
  if (!fs.existsSync(pampaPath)) {
    console.log(
      chalk.yellow(
        '⚠  pampa: mcp-server.js not found at resolved path: ' +
          pampaPath +
          '\n' +
          '   Install globally with: npm install -g pampa\n' +
          '   Then re-run the installer to refresh the path in ~/.cursor/mcp.json'
      )
    );
  }
  console.log('');
  console.log(chalk.bold('Files written:'));
  if (written.length === 0) {
    console.log(chalk.dim('  (none — all existed)'));
  } else {
    written.forEach((f) => console.log(chalk.green('  ✓'), f));
  }
  console.log('');
  console.log(chalk.bold('Files skipped (already existed):'));
  if (skipped.length === 0) {
    console.log(chalk.dim('  (none)'));
  } else {
    skipped.forEach((f) => console.log(chalk.yellow('  ⚠'), f));
  }
  console.log('');
  console.log(chalk.bold('Next steps:'));
  console.log('  1. Restart Cursor so MCP servers reload.');
  console.log('  2. Open Settings → MCP and confirm all servers are green.');
  const draftedExisting =
    answers &&
    answers.repoKind === 'existing' &&
    answers.northStarDraftMd &&
    String(answers.northStarDraftMd).trim().length > 150;
  if (draftedExisting) {
    console.log(
      `  3. Review **HEXCURSE/NORTH_STAR.md** (installer drafted it from a repomix snapshot). Refine in Cursor using memory, repomix, and Serena MCPs, then open ${path.join(HEXCURSE_ROOT, 'ONE_PROMPT.md')} — paste the fenced block as your only first message in a new chat.`
    );
  } else {
    console.log(
      `  3. Fill HEXCURSE/NORTH_STAR.md, then open ${path.join(HEXCURSE_ROOT, 'ONE_PROMPT.md')} — paste the fenced block as your only first message in a new chat.`
    );
  }
  console.log(chalk.dim(`  Or: open ${path.join(HEXCURSE_ROOT, 'SESSION_START_PROMPT.md')} for the daily session-start block.`));
  console.log(
    chalk.dim(
      '  Tip: quick install  node setup.js --quick --preset=lmstudio  |  existing repo: set HEXCURSE_REPO_KIND=existing'
    )
  );
  console.log('');
}

/** Appends HEXCURSE_MULTI_AGENT=1 to repo .env when not already set. */
async function appendHexcurseMultiAgentEnv(cwd) {
  const dotEnv = path.join(cwd, '.env');
  const line = 'HEXCURSE_MULTI_AGENT=1';
  let body = '';
  if (await fs.pathExists(dotEnv)) {
    body = await fs.readFile(dotEnv, 'utf8');
  }
  const lines = body.split(/\r?\n/);
  if (lines.some((l) => /^\s*HEXCURSE_MULTI_AGENT\s*=/.test(l))) {
    console.log(chalk.dim('.env already sets HEXCURSE_MULTI_AGENT'));
    return;
  }
  const prefix = body.length && !body.endsWith('\n') ? '\n' : '';
  await fs.writeFile(dotEnv, `${body}${prefix}${line}\n`, 'utf8');
  console.log(chalk.green('✓'), 'Appended HEXCURSE_MULTI_AGENT=1 to .env');
}

/** Enables multi-agent scaffold: swarm MCP, .env flag, docs, and multi-agent.mdc rules. */
async function runMultiAgentSetup(cwd) {
  const hexRoot = path.join(cwd, HEXCURSE_ROOT);
  if (!(await fs.pathExists(hexRoot))) {
    console.error(
      chalk.red('HEXCURSE/ pack not found.'),
      chalk.dim('Run cursor-governance install in this repository root first.')
    );
    process.exit(1);
  }
  mergeSwarmProtocolMcpServerIfMissing();
  await appendHexcurseMultiAgentEnv(cwd);
  const written = [];
  const skipped = [];
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'MULTI_AGENT.md'),
    multiAgentMd(),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'AGENT_HANDOFFS.md'),
    agentHandoffsStubMd(),
    written,
    skipped
  );
  await writeGovernanceRules(cwd, 'multi-agent.mdc', MULTI_AGENT_MDC_TEMPLATE, written, skipped);
  console.log(
    chalk.green('Multi-agent mode enabled.'),
    chalk.dim('Use git worktrees per HEXCURSE/docs/MULTI_AGENT.md.')
  );
}

/**
 * Fetches bundled .mdc templates from a raw GitHub URL and updates .cursor/rules/ when content differs.
 * Remote base URL: HEXCURSE_RULES_REMOTE_URL (required — no implicit placeholder; avoids silent 404 sync).
 */
async function syncRemoteRules(cwd, { dryRun = false } = {}) {
  const rawBase = String(process.env.HEXCURSE_RULES_REMOTE_URL || '').trim();
  if (!rawBase) {
    console.error(
      chalk.red(
        'HEXCURSE_RULES_REMOTE_URL is required. Set it to the raw GitHub base URL for cursor-governance/templates/ (trailing slash optional). Example: https://raw.githubusercontent.com/org/repo/main/cursor-governance/templates/'
      )
    );
    process.exit(1);
  }
  const normalized = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  const names = [
    'base.mdc',
    'mcp-usage.mdc',
    'process-gates.mdc',
    'governance.mdc',
    'security.mdc',
    'adr.mdc',
    'memory-management.mdc',
    'debugging.mdc',
    'multi-agent.mdc',
    'linear-sync.mdc',
  ];
  let updated = 0;
  let upToDate = 0;
  let wouldUpdate = 0;
  let failed = 0;
  const rulesDir = path.join(cwd, '.cursor', 'rules');
  await fs.ensureDir(rulesDir);

  for (const name of names) {
    const url = `${normalized}${name}`;
    let remoteText;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(chalk.yellow('⚠'), `Fetch failed ${url} — HTTP ${res.status}`);
        failed += 1;
        continue;
      }
      remoteText = await res.text();
    } catch (e) {
      console.warn(chalk.yellow('⚠'), `Fetch failed ${url} —`, e.message || String(e));
      failed += 1;
      continue;
    }
    const remoteHash = crypto.createHash('sha256').update(remoteText, 'utf8').digest('hex');
    const localPath = path.join(rulesDir, name);
    let localHash = '';
    if (fs.existsSync(localPath)) {
      const localText = fs.readFileSync(localPath, 'utf8');
      localHash = crypto.createHash('sha256').update(localText, 'utf8').digest('hex');
    }
    if (remoteHash === localHash) {
      console.log(chalk.green('✓'), 'UP TO DATE', chalk.dim(name));
      upToDate += 1;
      continue;
    }
    if (dryRun) {
      console.log(chalk.yellow('~'), 'WOULD UPDATE', chalk.dim(name));
      wouldUpdate += 1;
      continue;
    }
    fs.writeFileSync(localPath, remoteText, 'utf8');
    console.log(chalk.cyan('↑'), 'UPDATED', chalk.dim(name));
    updated += 1;
  }

  if (failed === 0) {
    const statePath = path.join(cwd, '.cursor', 'hooks', 'state', 'continual-learning.json');
    const iso = new Date().toISOString();
    let state = {};
    if (fs.existsSync(statePath)) {
      try {
        state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      } catch (_) {
        state = {};
      }
    }
    state.version = state.version || 2;
    state.lastSyncAt = iso;
    await fs.ensureDir(path.dirname(statePath));
    await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log('');
  console.log(
    chalk.bold('Rules sync summary:'),
    dryRun
      ? chalk.dim(`would update ${wouldUpdate}, up-to-date ${upToDate}, failed ${failed}`)
      : chalk.dim(`updated ${updated}, up-to-date ${upToDate}, failed ${failed}`)
  );
  if (failed > 0) {
    process.exit(1);
  }
}

async function main() {
  const mode = parseSetupArgv(process.argv);
  if (mode === 'help') {
    printCliHelp();
    return;
  }
  if (mode === 'version') {
    console.log(readInstallerPackageJson().version);
    return;
  }
  if (mode === 'doctor') {
    runDoctor(process.cwd());
    return;
  }
  if (mode === 'parse-prd-via-agent') {
    await runParsePrdViaAgent(process.cwd(), parseParsePrdViaAgentArgv(process.argv));
    return;
  }
  if (mode === 'multi-agent') {
    await runMultiAgentSetup(process.cwd());
    return;
  }
  if (mode === 'sync-rules') {
    await syncRemoteRules(process.cwd(), { dryRun: argvHasDryRun(process.argv) });
    return;
  }
  if (mode === 'refresh-rules') {
    await runRefreshRules(process.cwd());
    return;
  }
  if (mode === 'learning-rollup') {
    runLearningRollup(process.cwd(), parseLearningRollupSessions(process.argv));
    return;
  }
  if (mode === 'preflight-cursor-agent') {
    assertCursorAgentCliAuthenticated();
    console.log(chalk.green('✓'), 'Cursor CLI: agent status OK');
    return;
  }
  if (mode === 'run-hexcurse' || mode === 'run-hexcurse-raw') {
    await runNorthStarBridge(process.cwd(), { raw: mode === 'run-hexcurse-raw' });
    return;
  }

  const cwd = process.cwd();
  const installerPkg = readInstallerPackageJson();
  const pathsMeta = {
    installerName: installerPkg.name,
    installerVersion: installerPkg.version,
    generatedAt: new Date().toISOString(),
  };

  printHeader();
  const platform = process.platform;
  console.log(`Detected platform: ${platform}`);
  checkPrerequisites();

  const useQuick = argvHasQuick(process.argv);
  const preset = parsePresetFromArgv(process.argv);
  let answers;
  if (useQuick) {
    console.log(chalk.bold('\nQuick install'), chalk.dim(`(preset: ${preset})`));
    answers = buildQuickInstallAnswers(cwd, preset);
    if (answers.repoKind === 'existing') {
      await enrichExistingRepoQuick(cwd, answers);
    }
  } else {
    answers = await promptUser();
  }
  const constraintsBullets = formatConstraintBullets(answers.sacred);
  const todayDate = new Date().toISOString().slice(0, 10);

  installGlobals(platform);

  const cursorMcpPath = path.join(os.homedir(), '.cursor', 'mcp.json');
  console.log(chalk.bold(`\nMerging ${cursorMcpPath} …`));
  const mcpResult = mergeMcpJson(answers.taskmasterEnv, answers.github);

  const written = [];
  const skipped = [];

  console.log(chalk.bold('\nWriting governance files into:'), cwd, chalk.dim(`(${HEXCURSE_ROOT}/ pack + .cursor/rules mirror)`));
  await writeGovernanceRules(
    cwd,
    'base.mdc',
    baseMdc(
      answers.projectName.trim(),
      answers.purpose.trim(),
      constraintsBullets,
      answers.stack.trim(),
      answers.outOfScope.trim()
    ),
    written,
    skipped
  );
  await writeGovernanceRules(cwd, 'mcp-usage.mdc', MCP_USAGE_TEMPLATE, written, skipped);
  await writeGovernanceRules(cwd, 'process-gates.mdc', PROCESS_GATES_TEMPLATE, written, skipped);
  await writeGovernanceRules(cwd, 'governance.mdc', readBundledGovernanceMdc(), written, skipped);
  await writeGovernanceRules(cwd, 'security.mdc', SECURITY_MDC_TEMPLATE, written, skipped);
  await writeGovernanceRules(cwd, 'adr.mdc', ADR_MDC_TEMPLATE, written, skipped);
  await writeGovernanceRules(cwd, 'memory-management.mdc', MEMORY_MANAGEMENT_MDC_TEMPLATE, written, skipped);
  await writeGovernanceRules(cwd, 'debugging.mdc', DEBUGGING_MDC_TEMPLATE, written, skipped);
  await writeGovernanceRules(cwd, 'multi-agent.mdc', MULTI_AGENT_MDC_TEMPLATE, written, skipped);
  await writeGovernanceRules(cwd, 'linear-sync.mdc', LINEAR_SYNC_MDC_TEMPLATE, written, skipped);
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'PATHS.json'),
    `${JSON.stringify(pathsManifestObject(pathsMeta), null, 2)}\n`,
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'README.md'),
    hexcurseReadmeMd(answers.projectName.trim()),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'AGENTS.md'),
    agentsMd(answers.projectName.trim()),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'DIRECTIVES.md'),
    directivesMd(answers.projectName.trim()),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'ARCHITECTURE.md'),
    architectureMd(
      answers.projectName.trim(),
      answers.purpose.trim(),
      answers.stack.trim(),
      answers.outOfScope.trim(),
      answers.dod.trim()
    ),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'GOVERNANCE_PARITY.md'),
    readBundledGovernanceParityTemplate(answers.projectName.trim()),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'SESSION_LOG.md'),
    sessionLogMd(answers.projectName.trim(), todayDate),
    written,
    skipped
  );
  const prdNotesLead =
    answers.repoKind === 'existing' && answers.northStarDraftMd
      ? 'Existing-repo install path: PRD fields were extracted from an auto-drafted NORTH_STAR (repomix snapshot + your model). Refine HEXCURSE/NORTH_STAR.md in Cursor with MCPs as needed.'
      : '';
  await writeFileMaybeSkip(
    cwd,
    path.join('.taskmaster', 'docs', 'prd.txt'),
    prdTxt(
      answers.projectName.trim(),
      answers.purpose.trim(),
      answers.stack.trim(),
      answers.modules.trim(),
      constraintsBullets,
      answers.outOfScope.trim(),
      answers.dod.trim(),
      prdNotesLead
    ),
    written,
    skipped
  );
  await writeFileMaybeSkip(cwd, path.join('.serena', 'memories', '.gitkeep'), '', written, skipped);
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'SESSION_START_PROMPT.md'),
    sessionStartMd(answers.projectName.trim()),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    'AGENTS.md',
    rootAgentsPointerMd(answers.projectName.trim()),
    written,
    skipped
  );
  if (answers.repoKind === 'existing') {
    let rootEntries;
    try {
      rootEntries = fs.readdirSync(cwd, { withFileTypes: true });
    } catch (_) {
      rootEntries = [];
    }
    for (const ent of rootEntries) {
      if (!ent.isDirectory()) continue;
      const n = ent.name;
      if (n === '.git' || n === 'node_modules' || n === HEXCURSE_ROOT || n.startsWith('.')) continue;
      const subPkg = path.join(cwd, n, 'package.json');
      if (fs.existsSync(subPkg)) {
        await writeFileMaybeSkip(
          cwd,
          path.join(n, 'AGENTS.md'),
          subAgentsPointerMd(answers.projectName.trim(), n),
          written,
          skipped
        );
      }
    }
  }
  const northStarBody =
    answers.northStarDraftMd && String(answers.northStarDraftMd).trim().length > 150
      ? `${String(answers.northStarDraftMd).trim()}\n`
      : readBundledNorthStarTemplate(answers.projectName.trim());
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'NORTH_STAR.md'),
    northStarBody,
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'CURSOR.md'),
    cursorPackMd(answers.projectName.trim()),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'CURSOR_MODES.md'),
    cursorModesMd(),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'ARCH_PROMPT.md'),
    readBundledArchPromptTemplate(),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'CONTINUAL_LEARNING.md'),
    continualLearningMd(answers.projectName.trim()),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'MCP_COORDINATION.md'),
    readBundledMcpCoordinationTemplate(),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'MCP_TOKEN_BUDGET.md'),
    mcpTokenBudgetMd(),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'MULTI_AGENT.md'),
    multiAgentMd(),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'ADR_LOG.md'),
    adrLogStubMd(answers.projectName),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'AGENT_HANDOFFS.md'),
    agentHandoffsStubMd(),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join('.cursor', 'hooks', 'state', 'continual-learning-index.json'),
    continualLearningIndexSeedJson(),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join('.cursor', 'hooks', 'state', 'continual-learning.json'),
    continualLearningHookStateSeedJson(),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join('.cursor', 'hooks', 'state', 'skill-promotion-queue.json'),
    skillPromotionQueueSeedJson(),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'MEMORY_TAXONOMY.md'),
    readBundledMemoryTaxonomyTemplate(),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'docs', 'ROLLING_CONTEXT.md'),
    rollingContextStubMd(answers.projectName.trim()),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join('.cursor', 'skills', 'README.md'),
    readBundledCursorSkillsReadmeTemplate(),
    written,
    skipped
  );
  await writeFileMaybeSkip(
    cwd,
    path.join('.cursor', 'skills', '_TEMPLATE_SKILL.md'),
    readBundledTemplateSkillMd(),
    written,
    skipped
  );

  await tryIndexSkillsWithPampa(cwd);

  await appendGitignoreLines(cwd);

  console.log(chalk.bold('\nTaskmaster …'));
  if (!runCmd(cwd, 'task-master init --yes', 'task-master init')) {
    console.warn(chalk.yellow('⚠ task-master init reported failure — continuing.'));
  }
  await writeLmStudioDotEnvIfMissing(cwd, answers);
  configureTaskmasterModelsForInstall(cwd, answers);
  await patchTaskmasterConfigForLmStudioContext(cwd, answers);

  const prdRel = path.join('.taskmaster', 'docs', 'prd.txt');
  const tmEnv = taskmasterChildEnv(answers);
  if (
    !runCmd(cwd, `task-master parse-prd --force "${prdRel}"`, 'task-master parse-prd', tmEnv)
  ) {
    console.warn(chalk.yellow('⚠ task-master parse-prd reported failure — continuing.'));
    console.warn(
      chalk.dim(
        '  Tip: start LM Studio (or set API keys), then run: task-master parse-prd --force .taskmaster/docs/prd.txt'
      )
    );
    console.warn(
      chalk.dim(
        '  If parse-prd still fails, set HEXCURSE_LM_STUDIO_MAX_CONTEXT to your real context (e.g. 4096 or 8000) before install, or use a larger-context GGUF / cloud for parse-prd.'
      )
    );
  }
  await seedPlaceholderTasksJsonIfMissing(cwd);

  await writeInstallerPathFile(cwd);
  await writeOnePromptFile(cwd, answers.projectName.trim());
  await writeHeadlessKickoffFile(cwd, answers.projectName.trim());

  console.log(chalk.bold('\nGit …'));
  await tryGitCommit(cwd);

  printSummary(written, skipped, cwd, mcpResult, answers);
}

module.exports = main;

/** Test harness: path resolution must stay consistent with install / doctor / bridge / rollup. */
main.hexcursePaths = {
  HEXCURSE_ROOT,
  pathNorthStarPack,
  resolveNorthStarPathForRead,
  resolveSessionLogForRollup,
  resolveRollingContextPathForRollup,
};

/** Test-only: existing-repo NORTH_STAR draft (repomix snapshot + install-time LLM). See test/north-star-existing-repo.test.js */
main.hexcurseInstallTestHooks = {
  generateNorthStarFromExistingRepo,
};

/** Test-only: quick-install answer shape. See test/hexcurse-pack.test.js */
main.hexcurseQuickInstallTestHooks = {
  buildQuickInstallAnswers,
};

/** Test-only: sacred merge for --refresh-rules. See test/hexcurse-pack.test.js */
main.hexcurseRefreshRulesTestHooks = {
  extractSacredCsvFromBaseMdc,
};

/** Test-only: --parse-prd-via-agent schema and prompt. See test/hexcurse-pack.test.js */
main.hexcurseAgentParseHooks = {
  validateTaskmasterSchema,
  buildAgentParsePrompt,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
