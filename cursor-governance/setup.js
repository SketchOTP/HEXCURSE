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

/** README for .cursor/skills on install (inline — no bundled template file). */
function cursorSkillsReadmeMd() {
  return `# Skills

Add reusable agent patterns as Markdown files in this folder. Copy \`_TEMPLATE_SKILL.md\` to start.

- One skill per file; keep instructions actionable.
- Prefer concrete examples over abstract rules.
`;
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

function printCliHelp() {
  console.log(`
cursor-governance — HexCurse installer (writes into the current working directory)

  node setup.js [options]
  cursor-governance [options]   (if installed globally)

Options:
  --help, -h          Show this message
  --version, -v       Print package version and exit
  --doctor            Verify governance layout, PATHS.json, task-master, ~/.cursor/mcp.json (from repo root)
  --refresh-rules     Rewrite the 5 default .mdc rules (base, mcp-usage, process-gates, security, adr; uses AGENTS.md + ARCHITECTURE.md for base). Use --multi-agent for multi-agent.mdc.
  --multi-agent       Enable parallel agent orchestration via git worktrees and swarm-protocol MCP
  --sync-rules        Fetch latest governance rules from the HexCurse GitHub source and update .cursor/rules/ (optional --dry-run)
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
  HEXCURSE_DOCTOR_CI=1 — with \`setup.js --doctor\`, treat missing ~/.cursor/mcp.json and missing task-master CLI as warnings (for CI); same as CI=true or GITHUB_ACTIONS=true,
  ANTHROPIC_API_KEY or OPENAI_API_KEY for anthropic / openai presets.

  Interactive install (v2): seven core questions — project name, purpose, GitHub token (skipped if
  token is reused from env/mcp.json), then y/n for Playwright, Semgrep, Supabase (if y: project ref line),
  LightRAG, then y/n for custom MCP (if y: transport 1–3 where 3 = skip; URL and command prompts accept cancel/skip/q/0). Piped stdin: one
  line per answer in that order. Taskmaster LLM keys are **not** prompted — set ANTHROPIC_API_KEY,
  OPENAI_API_KEY / OPENAI_BASE_URL (or lm-studio defaults) in the environment before install.

Run from your target repository root with no flags to start the interactive install.
`);
}

/** Returns 'install' | 'help' | 'version' | 'doctor' | 'refresh-rules' | 'multi-agent' | 'sync-rules' | 'parse-prd-via-agent'. */
function parseSetupArgv(argv) {
  const flags = new Set(argv.slice(2).filter((a) => a.startsWith('-')));
  if (flags.has('--help') || flags.has('-h')) return 'help';
  if (flags.has('--version') || flags.has('-v')) return 'version';
  if (flags.has('--doctor')) return 'doctor';
  if (flags.has('--refresh-rules')) return 'refresh-rules';
  if (flags.has('--multi-agent')) return 'multi-agent';
  if (flags.has('--sync-rules')) return 'sync-rules';
  if (flags.has('--parse-prd-via-agent')) return 'parse-prd-via-agent';
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
 * (stops stale OPENAI_BASE_URL in the shell from shadowing repo `.env`).
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

/** True when doctor should not fail CI for machine-local deps (~/.cursor/mcp.json, task-master on PATH). */
function isDoctorCiRelaxed() {
  return (
    process.env.CI === 'true' ||
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.HEXCURSE_DOCTOR_CI === '1'
  );
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

/** Writes gitignored absolute path to this package's setup.js for installer refresh and tooling. */
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

/** Prints health check from current working directory (target repo). */
function runDoctor(cwd) {
  ensureHexcurseSourceRepoDoctorArtifacts(cwd);
  const sourceRepo = isHexcurseGovernanceSourceRepo(cwd);
  const ok = [];
  const bad = [];
  const warn = [];
  const hexRoot = path.join(cwd, HEXCURSE_ROOT);
  const hexPaths = path.join(hexRoot, 'PATHS.json');
  const legSess = path.join(cwd, 'docs', 'SESSION_START.md');
  const legLegacy = path.join(cwd, 'docs', 'SESSION_START_PROMPT.md');
  const hexSess = path.join(hexRoot, 'SESSION_START.md');
  const hexLegacy = path.join(hexRoot, 'SESSION_START_PROMPT.md');
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

  if (fs.existsSync(hexSess)) ok.push('HEXCURSE/SESSION_START.md present');
  else if (fs.existsSync(hexLegacy)) ok.push('HEXCURSE/SESSION_START_PROMPT.md present (legacy)');
  else if (fs.existsSync(legSess)) ok.push('docs/SESSION_START.md present');
  else if (fs.existsSync(legLegacy)) ok.push('Legacy docs/SESSION_START_PROMPT.md present');
  else bad.push('No SESSION_START.md (HEXCURSE/ or docs/)');

  if (fs.existsSync(hexAgents)) ok.push('HEXCURSE/AGENTS.md present');
  else if (fs.existsSync(rootAgents)) ok.push('Root AGENTS.md present');
  else bad.push('No AGENTS.md');

  if (fs.existsSync(path.join(cwd, '.cursor', 'rules', 'mcp-usage.mdc'))) ok.push('.cursor/rules/mcp-usage.mdc present');
  else bad.push('.cursor/rules/mcp-usage.mdc missing');
  if (fs.existsSync(path.join(cwd, '.cursor', 'rules', 'process-gates.mdc'))) ok.push('.cursor/rules/process-gates.mdc present');
  else bad.push('.cursor/rules/process-gates.mdc missing');

  const skillsDir = path.join(cwd, '.cursor', 'skills');
  if (fs.existsSync(skillsDir)) ok.push('.cursor/skills/ present');
  else warn.push('.cursor/skills/ missing — optional; create for procedural skills');

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
    warn.push('HEXCURSE/NORTH_STAR.md missing — installer seeds it; fill it then use --parse-prd-via-agent for tasks');
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

  const instPath = path.join(cwd, '.cursor', 'hexcurse-installer.path');
  if (fs.existsSync(instPath)) ok.push('.cursor/hexcurse-installer.path present (path to setup.js for agents)');
  else warn.push('.cursor/hexcurse-installer.path missing — run cursor-governance install once to create it');

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
      for (const id of MCP_CORE_IDS) {
        if (names.includes(id)) ok.push(`mcp.json defines ${id} server (v2 core)`);
        else if (ciRelaxed) warn.push(`mcp.json has no ${id} entry (v2 core — non-blocking in CI)`);
        else bad.push(`mcp.json has no ${id} entry (v2 requires core: ${MCP_CORE_IDS.join(', ')})`);
      }
      const mcpOptionalWarn = (id, hint) => {
        if (names.includes(id)) ok.push(`mcp.json defines ${id} server`);
        else warn.push(`mcp.json has no ${id} entry (${hint})`);
      };
      mcpOptionalWarn('playwright', 'optional — select at install for UI / browser work');
      mcpOptionalWarn('semgrep', 'optional — select at install for security scans');
      mcpOptionalWarn('supabase', 'optional — select at install when using Supabase');
      mcpOptionalWarn('lightrag', 'optional — select at install for LightRAG codebase memory');
      mcpOptionalWarn('custom', 'optional — select at install for a custom MCP server');
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

  for (const ruleName of ['base.mdc', 'security.mdc', 'adr.mdc']) {
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
  await writeGovernanceRuleForceful(cwd, 'mcp-usage.mdc', MCP_USAGE_TEMPLATE, hasHexDir);
  await writeGovernanceRuleForceful(cwd, 'process-gates.mdc', PROCESS_GATES_TEMPLATE, hasHexDir);
  await writeGovernanceRuleForceful(cwd, 'base.mdc', baseContent, hasHexDir);
  await writeGovernanceRuleForceful(cwd, 'security.mdc', SECURITY_MDC_TEMPLATE, hasHexDir);
  await writeGovernanceRuleForceful(cwd, 'adr.mdc', ADR_MDC_TEMPLATE, hasHexDir);
  console.log(chalk.green('✓'), 'Wrote .cursor/rules/*.mdc (5 default governance files)');
  if (hasHexDir) {
    console.log(chalk.green('✓'), `Wrote ${HEXCURSE_ROOT}/rules/*.mdc (mirror)`);
  } else {
    console.log(chalk.dim(`(No ${HEXCURSE_ROOT}/ folder — only .cursor/rules updated.)`));
  }
  console.log(chalk.dim('\nRestart Cursor to reload rules.\n'));
}

const PROCESS_GATES_TEMPLATE = `---
description: Non-negotiable process gates for implementation work
alwaysApply: true
---

# PROCESS GATES

Binding detail: **mcp-usage.mdc**. Stricter requirement wins.

1. **memory** then **taskmaster-ai** **get_tasks** before planning or code — or state **DEGRADED_MODE** with server id and reason.
2. **repomix --compress** once per session start on existing codebases when repomix is available.
3. **jcodemunch** index (**resolve_repo** / **index_folder**) when code work is in scope — or DEGRADED_MODE.
4. **sequential-thinking** before non-trivial plans — or DEGRADED_MODE.
5. **context7** before external library/API calls — or DEGRADED_MODE.
6. **Serena** symbol tools for edits; avoid **read_file** on files over 100 lines without approval — or DEGRADED_MODE.

If a required MCP is missing or red, state **DEGRADED_MODE** and what you will not assume.

## Semgrep (commits touching source)

1. Run **semgrep** **security_check** on modified source files.
2. **HIGH/CRITICAL:** do not commit until resolved.
3. **MEDIUM:** note in handoff; commit allowed with acknowledgment.
4. If semgrep unavailable: note in handoff; proceed only with human awareness.

## Architecture

Significant design changes: append an ADR per **adr.mdc** to **docs/ADR_LOG.md** (pack: **HEXCURSE/docs/ADR_LOG.md**).

## Session close

- [ ] Taskmaster task status updated
- [ ] Semgrep on touched sources (or logged exception)
- [ ] ADR if architecture changed
- [ ] Handoff lists MCP used / not used
- [ ] **memory** updated with key discoveries
`;

const MCP_USAGE_TEMPLATE = `---
description: When to use which MCP tools — automatic triggers
alwaysApply: true
---

# MCP UTILIZATION

Disk in the open workspace is source of truth — not remote Git.

## Core order (when available)

1. **memory** — start of session; write discoveries immediately.
2. **taskmaster-ai** — **get_tasks** before plan or implementation; **set_task_status** when work completes.
3. **repomix** — **--compress** once per session on existing trees.
4. **jcodemunch** — index workspace; use **search_symbols**, **get_context_bundle**, **find_references** for multi-file work.
5. **sequential-thinking** — before non-trivial implementation plans.
6. **Serena** — **find_symbol**, **find_referencing_symbols**, **replace_symbol_body** for edits.
7. **context7** — before every external library or API call you add or change.
8. **github** — only when the human asked for PR/issue/remote; use local git for branches.

After substantive code edits, run **semgrep** **security_check** before commit (**process-gates.mdc**). After UI changes, **playwright** when available. **supabase** for schema before DB queries when this project uses it. Use any other configured MCP when materially relevant; skipping needs an explicit reason in the handoff.

## DEGRADED_MODE

If a server is missing or failing: announce **DEGRADED_MODE** (server id and reason) and list what you will not assume.

## Hard stops

- No implementation until the active Taskmaster task is known and scope is confirmed.
- No guessing library APIs when **context7** is available — verify first.
- No commits with unresolved **HIGH/CRITICAL** semgrep findings on touched code.

## Handoff

State which MCP tools were used or skipped (with reason).
`;

const SECURITY_MDC_TEMPLATE = `---
description: Semgrep security gate before commits
alwaysApply: false
globs: "**/*.{ts,tsx,js,jsx,py,go,java,rb,php,rs,cs}"
---

# Security (Semgrep)

## When
Any change that writes or rewrites source files.

## Actions

1. Run **semgrep** MCP **security_check** on modified paths.
2. **HIGH/CRITICAL:** do not commit; fix and re-scan.
3. **MEDIUM:** record in handoff under security notes; then proceed.
4. **LOW/INFO:** note only.

## Forbidden
- Committing with unresolved HIGH/CRITICAL findings.
- Skipping the scan because the change looks small.
`;

const ADR_MDC_TEMPLATE = `---
description: Record significant architecture decisions
alwaysApply: false
globs: "**/ARCHITECTURE.md, **/adr/**, HEXCURSE/docs/ARCHITECTURE.md"
---

# Architecture Decision Records

## Triggers
- Non-trivial design fork, data/API contract change, new dependency or external service, MCP/tool choice, or overriding NORTH_STAR / DIRECTIVES constraints.

## Format
Append to **HEXCURSE/docs/ADR_LOG.md** or **docs/ADR_LOG.md** using heading **### ADR-{N}: Title**, then lines **Date**, **Status**, **Context**, **Decision**, **Consequences**, **Alternatives**, and a horizontal rule.

## Rules
- ADRs are append-only; do not delete prior entries.
`;

const MULTI_AGENT_MDC_TEMPLATE = `---
description: Multi-agent coordination (worktrees + swarm-protocol)
alwaysApply: false
globs: "HEXCURSE/docs/MULTI_AGENT.md, .swarm/**"
---

# Multi-agent

Active only when **HEXCURSE/docs/MULTI_AGENT.md** exists and **HEXCURSE_MULTI_AGENT=1**.

1. Claim work via **swarm-protocol** **claim_work** before starting; heartbeat long tasks.
2. **swarm_check_conflicts** before writes; on conflict, pause and note in **session_log.md** with **[CONFLICT]**.
3. Handoffs go to **HEXCURSE/docs/AGENT_HANDOFFS.md** with task id, files, blockers, next step.
4. Branch per agent **hexcurse/agent/{AGENT_ID}/{TASK_ID}**; do not self-merge — orchestrator reviews.
`;

/** Keeps generated base.mdc under the line-count budget (see V.4 in D-009). */
function limitMarkdownBlock(text, maxLines) {
  const raw = String(text || '').trim();
  if (!raw) return '_TBD — see ARCHITECTURE.md_';
  const lines = raw.split(/\r?\n/);
  if (lines.length <= maxLines) return raw;
  return `${lines.slice(0, maxLines).join('\n')}\n*(truncated — see ARCHITECTURE.md for full text)*`;
}

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
  const c = limitMarkdownBlock(constraintsList, 12);
  const s = limitMarkdownBlock(stack, 14);
  const o = limitMarkdownBlock(outOfScope, 10);
  return `---
description: Project governance — loaded every session
alwaysApply: true
---

# PROJECT: ${projectName}
# PURPOSE: ${purposeOneLine}

## Workflow

- Follow **AGENTS.md** or **HEXCURSE/AGENTS.md** for session start (memory, Taskmaster, directives, tooling, plan → confirm → local branch).
- Resolve prompt paths via **PATHS.json** when the pack is installed.
- **mcp-usage.mdc** defines MCP triggers; **process-gates.mdc** defines quality gates.
- Keep **DIRECTIVES** aligned with Taskmaster; at most one item **In Progress**.

## Sacred Constraints

${c}

## Tech Stack

${s}

## Out of Scope

${o}

## Code rules

- One task per session after scope is fixed.
- **jcodemunch** + **Serena** for discovery and edits; no **read_file** over 100 lines without approval.
- **context7** before external library calls; **sequential-thinking** before non-trivial plans.
- **memory** at session start and when you learn something material.
- Local **git** branch after scope confirm; **github** MCP optional for remotes.
- No new dependencies without approval. One-line contract on new functions.

## Commits

Format: \`D[NNN]: description | status\`
`;
}

function readBundledAgentsPackMd() {
  return fs.readFileSync(path.join(__dirname, 'templates', 'AGENTS.md'), 'utf8');
}

/** Consumer HEXCURSE/AGENTS.md — generic template; placeholders {{PROJECT_NAME}}, {{PURPOSE}}, {{STACK}}, {{SACRED}}. */
function agentsMd(projectName, purpose, stack, sacredRaw) {
  const name = String(projectName || 'Project').trim();
  const p = String(purpose || 'TBD — fill NORTH_STAR.md / ARCHITECTURE.md').trim();
  const st = String(stack || 'TBD — confirm with maintainers').trim();
  const sacred = formatConstraintBullets(sacredRaw || '');
  return readBundledAgentsPackMd()
    .replace(/\{\{PROJECT_NAME\}\}/g, name)
    .replace(/\{\{PURPOSE\}\}/g, p)
    .replace(/\{\{STACK\}\}/g, st)
    .replace(/\{\{SACRED\}\}/g, sacred)
    .replace(/\r\n/g, '\n');
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
│   ├── SESSION_START.md
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

/** HEXCURSE/CURSOR.md — human quick-start (session priming, doctor). */
function cursorPackMd(projectName) {
  return `# Cursor — ${projectName}

Governance for this repo lives in **\`HEXCURSE/\`**. Use **\`NORTH_STAR.md\`**, **\`AGENTS.md\`**, **\`SESSION_START.md\`**, and **\`ONE_PROMPT.md\`** as entry points.

## After install

1. Restart Cursor so \`.cursor/rules\` and MCP reload.
2. **Settings → MCP** — fix any red servers (tokens / paths).
3. New Agent chat: paste **\`HEXCURSE/SESSION_START.md\`** (or follow **\`ONE_PROMPT.md\`**).

## CLI (repo root)

- Health: \`node <path-to>/cursor-governance/setup.js --doctor\` (path also in **\`.cursor/hexcurse-installer.path\`**).
- Refresh rules: \`node <path-to>/cursor-governance/setup.js --refresh-rules\`
- Task graph from PRD (via Cursor agent): \`node <path-to>/cursor-governance/setup.js --parse-prd-via-agent\`

See **\`docs/MCP_TOKEN_BUDGET.md\`** and **\`docs/CURSOR_MODES.md\`** for detail.
`;
}

/** When to use Agent vs Ask mode in Cursor. */
function cursorModesMd() {
  return `# Cursor modes — ${HEXCURSE_ROOT} pack

## Agent (implementation)

- Writing code, running tests, editing files under an approved task.
- Load **\`HEXCURSE/AGENTS.md\`** and paste **\`HEXCURSE/SESSION_START.md\`** at session start.
- Binding MCP behavior: **\`.cursor/rules/mcp-usage.mdc\`**.

## Ask / read-only

- Explaining code and exploring without edits.
- No commits or Taskmaster changes unless the human promotes the chat.

## Optional: Cursor CLI

- [Headless / print mode](https://cursor.com/docs/cli/headless) — same MCP and rules as the IDE when configured.
`;
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

/** Seeds installer path on the governance source tree so `setup.js --doctor` is clean. */
function ensureHexcurseSourceRepoDoctorArtifacts(cwd) {
  if (!isHexcurseGovernanceSourceRepo(cwd)) return;
  const instPath = path.join(cwd, '.cursor', 'hexcurse-installer.path');
  if (!fs.existsSync(instPath)) {
    fs.mkdirSync(path.dirname(instPath), { recursive: true });
    const setupAbs = path.resolve(cwd, 'cursor-governance', 'setup.js');
    fs.writeFileSync(instPath, `${setupAbs}\n`, 'utf8');
  }
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

function readBundledSessionStartMd() {
  return fs.readFileSync(path.join(__dirname, 'templates', 'SESSION_START.md'), 'utf8');
}

function sessionStartMd(projectName) {
  const name = String(projectName || 'Project').trim();
  return readBundledSessionStartMd()
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

/** Runs npm install -g; Windows never uses sudo; Unix tries sudo then ~/.npm-global prefix (CI-friendly). */
function installNpmGlobalPackage(pkg, platform) {
  if (platform === 'win32') {
    try {
      execSync(`npm install -g ${pkg}`, { stdio: 'inherit', shell: true });
    } catch (e) {
      console.error(chalk.red(`npm install -g ${pkg} failed`));
      process.exit(1);
    }
    return;
  }
  try {
    execSync(`sudo npm install -g ${pkg}`, { stdio: 'inherit', shell: true });
  } catch (e) {
    console.warn(
      chalk.yellow('⚠'),
      `sudo failed — trying user install for ${pkg} under ~/.npm-global`
    );
    const prefix = path.join(os.homedir(), '.npm-global');
    fs.mkdirSync(prefix, { recursive: true });
    try {
      execSync(`npm install -g ${pkg} --prefix ${prefix}`, { stdio: 'inherit', shell: true });
    } catch (e2) {
      console.error(chalk.red(`npm install -g ${pkg} --prefix ~/.npm-global failed`));
      process.exit(1);
    }
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
      'uv install failed — install uv manually; optional LightRAG MCP uses uvx.'
    );
  }
}

/** Fallback Supabase project ref when `SUPABASE_PROJECT_REF` is unset (same as pre-v2 installer). */
const DEFAULT_SUPABASE_PROJECT_REF = 'dpivknupklbxjbrcntes';

/** Optional MCP ids — prompt order and merge order after the four core servers. */
const MCP_OPTIONAL_IDS_ORDER = ['playwright', 'semgrep', 'supabase', 'lightrag', 'custom'];

/** v2 core MCP ids — doctor treats these as required (bad if missing when not CI-relaxed). */
const MCP_CORE_IDS = ['github', 'context7', 'memory', 'taskmaster-ai'];

/**
 * Builds the `mcpServers` entries this installer merges into `~/.cursor/mcp.json` (v2: 4 core + selected optionals).
 * Does not remove or overwrite existing keys — see `mergeMcpJson`.
 */
function buildMcpServers(answers) {
  const taskmasterEnv = { ...(answers.taskmasterEnv || {}) };
  const githubToken = String(answers.github || '').trim();
  const selected = new Set(
    Array.isArray(answers.selectedOptionals)
      ? answers.selectedOptionals.map((s) => String(s).trim().toLowerCase())
      : []
  );

  const servers = {};

  servers.github = {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: githubToken },
  };
  servers.context7 = {
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp'],
  };
  servers.memory = {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
  };
  servers['taskmaster-ai'] = {
    command: 'npx',
    args: ['-y', '--package=task-master-ai', 'task-master-ai'],
    env: { ...taskmasterEnv },
  };

  const supabaseRef =
    String(process.env.SUPABASE_PROJECT_REF || '').trim() ||
    String(answers.supabaseProjectRef || '').trim() ||
    DEFAULT_SUPABASE_PROJECT_REF;

  for (const id of MCP_OPTIONAL_IDS_ORDER) {
    if (!selected.has(id)) continue;
    if (id === 'playwright') {
      servers.playwright = {
        command: 'npx',
        args: ['-y', '@playwright/mcp'],
      };
    } else if (id === 'semgrep') {
      servers.semgrep = {
        type: 'streamable-http',
        url: 'https://mcp.semgrep.ai/mcp',
      };
    } else if (id === 'supabase') {
      servers.supabase = {
        url: `https://mcp.supabase.com/mcp?project_ref=${supabaseRef}`,
      };
    } else if (id === 'lightrag') {
      servers.lightrag = {
        command: 'uvx',
        args: ['lightrag-mcp'],
      };
    } else if (id === 'custom' && answers.customMcp) {
      const c = answers.customMcp;
      if (c.mode === 'url' && c.url) {
        servers.custom = { type: 'streamable-http', url: c.url };
      } else if (c.mode === 'stdio' && c.command) {
        servers.custom = {
          command: c.command,
          args: Array.isArray(c.args) ? c.args : [],
        };
      }
    }
  }

  return servers;
}

/**
 * Merges v2 lean MCP definitions into `~/.cursor/mcp.json`.
 *
 * **Migration:** Existing files keep any servers already present — this function only **adds** keys that are missing.
 * Dropping servers from `buildMcpServers()` does not remove them on reinstall; developers must delete keys manually
 * if they want a slimmer config. On parse failure, the file is backed up and replaced with a fresh object before merge.
 */
function mergeMcpJson(answers) {
  const mcpPath = path.join(os.homedir(), '.cursor', 'mcp.json');
  const required = buildMcpServers(answers);
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

/** Heuristic: Windows Terminal / VS Code / ConEmu ConPTY (may affect readline behavior). */
function isWindowsConPTY() {
  return (
    process.platform === 'win32' &&
    !!(process.env.WT_SESSION || process.env.ConEmuPID || process.env.TERM_PROGRAM === 'vscode')
  );
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

/** Quick-install / env: comma- or space-separated optional MCP ids (see MCP_OPTIONAL_IDS_ORDER). */
function parseSelectedOptionalsFromEnv() {
  const raw = String(process.env.HEXCURSE_SELECTED_MCP_OPTIONALS || '').trim();
  if (!raw) return [];
  const allowed = new Set(MCP_OPTIONAL_IDS_ORDER);
  const out = [];
  for (const part of raw.split(/[,;\s]+/).filter(Boolean)) {
    const id = String(part).trim().toLowerCase();
    if (allowed.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Quick-install: `HEXCURSE_CUSTOM_MCP_URL` or `HEXCURSE_CUSTOM_MCP_COMMAND` + optional JSON/string args. */
function parseCustomMcpFromEnv() {
  const url = String(process.env.HEXCURSE_CUSTOM_MCP_URL || '').trim();
  if (url && /^https?:\/\//i.test(url)) return { mode: 'url', url };
  const command = String(process.env.HEXCURSE_CUSTOM_MCP_COMMAND || '').trim();
  if (!command) return null;
  let args = [];
  const argsRaw = String(process.env.HEXCURSE_CUSTOM_MCP_ARGS || '').trim();
  if (argsRaw) {
    try {
      const parsed = JSON.parse(argsRaw);
      if (Array.isArray(parsed)) args = parsed.map((x) => String(x));
    } catch {
      args = argsRaw.split(/\s+/).filter(Boolean);
    }
  }
  return { mode: 'stdio', command, args };
}

async function askYesNo(askFn, question, defaultValue = false) {
  const hint = defaultValue ? 'Y/n' : 'y/N';
  const defStr = defaultValue ? 'y' : 'n';
  const raw = String(await askFn(`${question} (${hint})`, defStr))
    .trim()
    .toLowerCase();
  if (raw === 'y' || raw === 'yes') return true;
  if (raw === 'n' || raw === 'no') return false;
  return defaultValue;
}

/** Returns true when the user typed a token that abandons the custom MCP sub-flow (TTY or piped). */
function isCustomMcpCancelLine(s) {
  return /^(cancel|skip|q|abort|0)$/i.test(String(s || '').trim());
}

/** Prompts for one custom MCP (stdio or streamable URL). Returns null if the user skips or cancels. */
async function promptCustomMcp(chooseFn, askFn, _askRequiredFn) {
  const optUrl = 'Streamable URL (HTTPS)';
  const optStdio = 'stdio — local command';
  const optSkip = 'Skip — do not add a custom MCP';
  const kind = await chooseFn('Custom MCP transport?', [optUrl, optStdio, optSkip]);
  if (kind === optSkip) {
    console.log(chalk.dim('Skipping custom MCP.'));
    return null;
  }
  if (kind === optUrl) {
    for (;;) {
      const raw = await askFn('MCP server URL (https://…) — or type cancel to skip', undefined);
      const s = String(raw || '').trim();
      if (isCustomMcpCancelLine(s)) {
        console.log(chalk.dim('Skipping custom MCP.'));
        return null;
      }
      if (/^https?:\/\//i.test(s)) {
        return { mode: 'url', url: s };
      }
      console.log('  Invalid — URL must start with http:// or https://. Type cancel to skip.');
    }
  }
  if (kind === optStdio) {
    for (;;) {
      const raw = await askFn('Command (e.g. npx) — or type cancel to skip', 'npx');
      const cmd = String(raw || '').trim();
      if (isCustomMcpCancelLine(cmd)) {
        console.log(chalk.dim('Skipping custom MCP.'));
        return null;
      }
      if (cmd.length > 0) {
        const argsLine = await askFn('Args (space-separated)', '');
        const args = String(argsLine || '')
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        return { mode: 'stdio', command: cmd, args };
      }
      console.log('  Invalid — empty command. Type cancel to skip.');
    }
  }
  console.log(chalk.yellow('⚠'), 'Unexpected transport choice — skipping custom MCP.');
  return null;
}

/**
 * v2 interactive install: Taskmaster / LLM credentials come from the environment only (no provider prompts).
 * Invoked after `promptUser()` returns, before `mergeMcpJson`, so `taskmaster-ai` MCP env is populated.
 */
function applyTaskmasterProviderFromEnvironment(answers) {
  const anthropic = String(process.env.ANTHROPIC_API_KEY || '').trim();
  if (anthropic.startsWith('sk-ant-')) {
    answers.provider = 'anthropic';
    answers.taskmasterEnv = { ANTHROPIC_API_KEY: anthropic };
    return;
  }
  const oai = String(process.env.OPENAI_API_KEY || '').trim();
  const ob = String(process.env.OPENAI_BASE_URL || '').trim();
  if (oai === 'lm-studio') {
    answers.provider = 'lmstudio';
    answers.taskmasterEnv = {
      OPENAI_API_KEY: 'lm-studio',
      OPENAI_BASE_URL: ob ? normalizeLmStudioV1BaseUrl(ob) : lmStudioBaseUrlFromEnv(),
    };
    return;
  }
  if (ob && oai && !oai.startsWith('sk-')) {
    answers.provider = 'other';
    answers.taskmasterEnv = {
      OPENAI_BASE_URL: normalizeLmStudioV1BaseUrl(ob),
      OPENAI_API_KEY: oai,
    };
    return;
  }
  if (oai.startsWith('sk-')) {
    answers.provider = 'openai';
    answers.taskmasterEnv = { OPENAI_API_KEY: oai };
    return;
  }
  answers.provider = 'lmstudio';
  answers.taskmasterEnv = {
    OPENAI_API_KEY: 'lm-studio',
    OPENAI_BASE_URL: ob ? normalizeLmStudioV1BaseUrl(ob) : lmStudioBaseUrlFromEnv(),
  };
}

/** v2: seven core questions + optional custom MCP (D-009 §2.3). Taskmaster: `applyTaskmasterProviderFromEnvironment` after return. */
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

  const projectName = await askRequiredFn(
    'Project name',
    undefined,
    (v) => String(v || '').trim().length > 0
  );

  const purpose = await askRequiredFn(
    'What are you building? (one sentence — seeds NORTH_STAR / PRD)',
    undefined,
    (v) => String(v || '').trim().length > 0
  );

  let github;
  const resolvedGh = resolveGithubTokenFromUserEnvironment();
  if (resolvedGh) {
    github = resolvedGh.token;
    console.log(
      chalk.green('✓'),
      'Reusing GitHub token from',
      chalk.dim(resolvedGh.source + '.'),
      chalk.dim(
        'To enter a new token: unset GITHUB_PERSONAL_ACCESS_TOKEN / GITHUB_TOKEN and clear github env in ~/.cursor/mcp.json.'
      )
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

  const selectedOptionals = [];
  let customMcp = null;
  let supabaseProjectRef = '';

  if (await askYesNo(askFn, 'Enable Playwright MCP for browser or UI work?', false)) {
    selectedOptionals.push('playwright');
  }
  if (await askYesNo(askFn, 'Enable Semgrep MCP for security scanning?', false)) {
    selectedOptionals.push('semgrep');
  }
  if (await askYesNo(askFn, 'Use Supabase MCP?', false)) {
    selectedOptionals.push('supabase');
    const ref = await askRequiredFn(
      'Supabase project ref (from dashboard Project Settings → General)',
      undefined,
      (v) => String(v || '').trim().length > 4
    );
    supabaseProjectRef = String(ref).trim();
    process.env.SUPABASE_PROJECT_REF = supabaseProjectRef;
  }
  if (await askYesNo(askFn, 'Enable LightRAG MCP for deep codebase memory? (requires Python / uv)', false)) {
    selectedOptionals.push('lightrag');
    if (!pythonPipAvailableForUv) {
      console.warn(
        chalk.yellow('⚠'),
        'Python/pip was not detected earlier — LightRAG may not run until Python and `uv` are installed.'
      );
    }
  }

  if (await askYesNo(askFn, 'Add a custom MCP server?', false)) {
    customMcp = await promptCustomMcp(chooseFn, askFn, askRequiredFn);
    if (customMcp) {
      selectedOptionals.push('custom');
    }
  }

  const stack = 'TBD — set in NORTH_STAR.md and ARCHITECTURE.md';
  const modules = 'TBD — list in NORTH_STAR.md';
  const sacred = 'no secrets in git; one directive per session';
  const outOfScope = 'TBD — confirm with human';
  const dod = 'Taskmaster parse-prd succeeds; SESSION_START.md exists';

  return {
    projectName: String(projectName).trim(),
    purpose: String(purpose).trim(),
    stack,
    modules,
    sacred,
    outOfScope,
    dod,
    provider: '',
    taskmasterEnv: {},
    github: String(github).trim(),
    repoKind: 'new',
    northStarDraftMd: null,
    selectedOptionals,
    customMcp,
    supabaseProjectRef,
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
      sessionStart: `${h}/SESSION_START.md`,
      pathsManifest: `${h}/PATHS.json`,
      packReadme: `${h}/README.md`,
      rulesCanonicalDir: `${h}/rules`,
      baseMdcCanonical: `${h}/rules/base.mdc`,
      mcpUsageMdcCanonical: `${h}/rules/mcp-usage.mdc`,
      processGatesMdcCanonical: `${h}/rules/process-gates.mdc`,
      rulesCursorDir: '.cursor/rules',
      baseMdcActive: '.cursor/rules/base.mdc',
      mcpUsageMdcActive: '.cursor/rules/mcp-usage.mdc',
      processGatesMdcActive: '.cursor/rules/process-gates.mdc',
      taskmasterRoot: '.taskmaster',
      prd: '.taskmaster/docs/prd.txt',
      agentParsePromptCache: '.taskmaster/agent-parse-prompt.txt',
      rootAgentsPointer: 'AGENTS.md',
      cursorSkillsDir: '.cursor/skills',
      northStar: `${h}/NORTH_STAR.md`,
      cursorQuickStart: `${h}/CURSOR.md`,
      oneShotPrompt: `${h}/ONE_PROMPT.md`,
      installerPathFile: '.cursor/hexcurse-installer.path',
      securityMdcCanonical: `${h}/rules/security.mdc`,
      securityMdcActive: '.cursor/rules/security.mdc',
      adrMdcCanonical: `${h}/rules/adr.mdc`,
      adrMdcActive: '.cursor/rules/adr.mdc',
      multiAgentMdcCanonical: `${h}/rules/multi-agent.mdc`,
      multiAgentMdcActive: '.cursor/rules/multi-agent.mdc',
      supabaseProjectRef: process.env.SUPABASE_PROJECT_REF || '',
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
  return `# Governance pack — ${projectName}

AI workflow files for this repository live in **${HEXCURSE_ROOT}/**.

## After install

1. Restart Cursor; fix any red MCP servers.
2. Fill **\`NORTH_STAR.md\`**, then use **\`ONE_PROMPT.md\`** or paste **\`SESSION_START.md\`** in a new Agent chat.
3. Generate or refresh tasks: \`node path/to/cursor-governance/setup.js --parse-prd-via-agent\` (see **\`.cursor/hexcurse-installer.path\`** for \`path/to\`).

## Entry points

| Artifact | Path |
|----------|------|
| Agent rules | [AGENTS.md](./AGENTS.md) |
| Directives | [DIRECTIVES.md](./DIRECTIVES.md) |
| Architecture | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Session start | [SESSION_START.md](./SESSION_START.md) |
| Cursor quick-start | [CURSOR.md](./CURSOR.md) |
| Skills | [../.cursor/skills/README.md](../.cursor/skills/README.md) |
| North star | [NORTH_STAR.md](./NORTH_STAR.md) |
| MCP token notes | [docs/MCP_TOKEN_BUDGET.md](./docs/MCP_TOKEN_BUDGET.md) |

**[PATHS.json](./PATHS.json)** lists stable paths for tooling. Rules mirror **\`${HEXCURSE_ROOT}/rules/**\` → **\`.cursor/rules/**\`. Taskmaster uses **\`.taskmaster/**\**.
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
| Session start paste | [${HEXCURSE_ROOT}/SESSION_START.md](${HEXCURSE_ROOT}/SESSION_START.md) |

Open **${HEXCURSE_ROOT}/SESSION_START.md** and paste its block into a new Cursor chat (it \`@\`-mentions paths under \`${HEXCURSE_ROOT}/\`).
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
    process.env.HEXCURSE_DOD || 'Taskmaster parse-prd succeeds; SESSION_START.md exists'
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
    selectedOptionals: parseSelectedOptionalsFromEnv(),
    customMcp: parseCustomMcpFromEnv(),
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
      '\n⚠  MCP token budget: each active server adds ~500–1000 tokens of tool-description overhead per request.\n' +
        '   v2 merges 4 core servers plus optionals you selected. Reinstall **never removes** existing `mcp.json` keys —\n' +
        '   it only adds missing ones — so older 17-server configs stay until you delete keys manually.\n' +
        '   See HEXCURSE/docs/MCP_TOKEN_BUDGET.md for guidance.'
    )
  );
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
      `  3. Review **HEXCURSE/NORTH_STAR.md** (installer drafted it from a repomix snapshot). Refine in Cursor using memory, context7, and your merged MCPs, then open ${path.join(HEXCURSE_ROOT, 'ONE_PROMPT.md')} — paste the fenced block as your only first message in a new chat.`
    );
  } else {
    console.log(
      `  3. Fill HEXCURSE/NORTH_STAR.md, then open ${path.join(HEXCURSE_ROOT, 'ONE_PROMPT.md')} — paste the fenced block as your only first message in a new chat.`
    );
  }
  console.log(chalk.dim(`  Or: open ${path.join(HEXCURSE_ROOT, 'SESSION_START.md')} for the daily session-start block.`));
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
    'security.mdc',
    'adr.mdc',
    'multi-agent.mdc',
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
    applyTaskmasterProviderFromEnvironment(answers);
    console.log(
      chalk.dim(
        `Taskmaster / LLM for this install: provider=${answers.provider} (from environment — set OPENAI_*, ANTHROPIC_* before install if needed).`
      )
    );
  }
  const constraintsBullets = formatConstraintBullets(answers.sacred);

  installGlobals(platform);

  const cursorMcpPath = path.join(os.homedir(), '.cursor', 'mcp.json');
  console.log(chalk.bold(`\nMerging ${cursorMcpPath} …`));
  const mcpResult = mergeMcpJson(answers);

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
  await writeGovernanceRules(cwd, 'security.mdc', SECURITY_MDC_TEMPLATE, written, skipped);
  await writeGovernanceRules(cwd, 'adr.mdc', ADR_MDC_TEMPLATE, written, skipped);
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
    agentsMd(
      answers.projectName.trim(),
      answers.purpose.trim(),
      answers.stack.trim(),
      answers.sacred.trim()
    ),
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
  await writeFileMaybeSkip(
    cwd,
    path.join(HEXCURSE_ROOT, 'SESSION_START.md'),
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
    path.join('.cursor', 'skills', 'README.md'),
    cursorSkillsReadmeMd(),
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

  console.log(chalk.bold('\nGit …'));
  await tryGitCommit(cwd);

  printSummary(written, skipped, cwd, mcpResult, answers);
}

module.exports = main;

/** Test harness: path resolution must stay consistent with install / doctor. */
main.hexcursePaths = {
  HEXCURSE_ROOT,
  pathNorthStarPack,
  resolveNorthStarPathForRead,
};

/** Test-only: existing-repo NORTH_STAR draft (repomix snapshot + install-time LLM). See test/north-star-existing-repo.test.js */
main.hexcurseInstallTestHooks = {
  generateNorthStarFromExistingRepo,
  applyTaskmasterProviderFromEnvironment,
};

/** Test-only: quick-install answer shape. See test/hexcurse-pack.test.js */
main.hexcurseQuickInstallTestHooks = {
  buildQuickInstallAnswers,
};

/** Test-only: v2 MCP merge shape. */
main.hexcurseMcpTestHooks = {
  buildMcpServers,
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

/** Test-only: Windows ConPTY heuristic. See test/hexcurse-pack.test.js */
main.hexcursePlatformTestHooks = {
  isWindowsConPTY,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
