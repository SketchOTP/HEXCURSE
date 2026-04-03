/**
 * One-shot: rebuild agentsMd() in setup.js from repo-root AGENTS.md (consumer path mapping + escaping).
 * Run: node cursor-governance/scripts/patch-agentsMd-from-root.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const setupPath = path.resolve(__dirname, '..', 'setup.js');
const agentsPath = path.join(root, 'AGENTS.md');

let body = fs.readFileSync(agentsPath, 'utf8');

// Pack header
body = body.replace(/^# HexCurse\s*$/m, '# ${projectName}');
body = body.replace(
  /^# Every AI agent working on this project MUST read this file at session start\.\r?\n# This file lives at[\s\S]*?— only one layout applies per repo\.\r?\n/m,
  '# Every AI agent working on this project MUST read this file at session start.\n# This file lives under HEXCURSE/ — see HEXCURSE/PATHS.json for all governance paths.\n\n',
);

// Governance path mapping (source repo -> consumer pack)
const pathReplacements = [
  [/\*\*`docs\//g, '**`HEXCURSE/docs/'],
  [/\(`docs\//g, '(`HEXCURSE/docs/'],
  [/\(`docs\//g, '(`HEXCURSE/docs/'],
  [/\*\*docs\//g, '**HEXCURSE/docs/'],
  [/`docs\//g, '`HEXCURSE/docs/'],
  [/\*\*DIRECTIVES\.md\*\*/g, '**HEXCURSE/DIRECTIVES.md**'],
  [/ \*\*DIRECTIVES\.md\*\*/g, ' **HEXCURSE/DIRECTIVES.md**'],
  [/Update \*\*DIRECTIVES\.md\*\*/g, 'Update **HEXCURSE/DIRECTIVES.md**'],
  [/read \*\*DIRECTIVES\.md\*\*/gi, 'read **HEXCURSE/DIRECTIVES.md**'],
  [/Read \*\*DIRECTIVES\.md\*\*/g, 'Read **HEXCURSE/DIRECTIVES.md**'],
  [/\*\*SESSION_LOG\.md\*\*/g, '**HEXCURSE/SESSION_LOG.md**'],
  [/ \*\*SESSION_LOG\.md\*\*/g, ' **HEXCURSE/SESSION_LOG.md**'],
  [/in \*\*SESSION_LOG\.md\*\*/g, 'in **HEXCURSE/SESSION_LOG.md**'],
  [/to \*\*SESSION_LOG\.md\*\*/g, 'to **HEXCURSE/SESSION_LOG.md**'],
  [/Write \*\*SESSION_LOG\.md\*\*/g, 'Write **HEXCURSE/SESSION_LOG.md**'],
  [/and \*\*SESSION_LOG\.md\*\*/g, 'and **HEXCURSE/SESSION_LOG.md**'],
  [/below\); use \*\*SESSION_LOG\.md\*\*/g, 'below); use **HEXCURSE/SESSION_LOG.md**'],
];
for (const [re, to] of pathReplacements) body = body.replace(re, to);

// NORTH STAR section: pack-only flow (drop source-repo-only bullets)
body = body.replace(
  /## NORTH STAR → Taskmaster \(consumer repos\)[\s\S]*?(?=## SESSION START)/m,
  `## NORTH STAR → Taskmaster (one human step + one Cursor message)

- **Primary flow:** The human fills **\`HEXCURSE/NORTH_STAR.md\`**, then either (1) runs the **Cursor headless CLI** from repo root with **\`agent -p --model composer-2 --trust --workspace .\`** and the prompt in **\`HEXCURSE/HEADLESS_KICKOFF.txt\`** (see **\`HEXCURSE/ONE_PROMPT.md\`**), or (2) pastes **only** the fenced block from **\`HEXCURSE/ONE_PROMPT.md\`** as the **entire** first message in a new **in-IDE Agent** chat. Both instruct you to run the bridge via terminal using **\`.cursor/hexcurse-installer.path\`** (absolute path to **\`setup.js\`**), then run **SESSION START** from STEP 0 below.
- **Manual bridge:** From repo root: \`node <path-to>/cursor-governance/setup.js --run-hexcurse\` (or **\`--run-hexcurse-raw\`** without AI). Same effects: **\`.taskmaster/docs/prd.txt\`**, **\`parse-prd\`**, **\`HEXCURSE/DIRECTIVES.md\`** **\`## 📋 Queued\`** sync.
- **\`.cursor/hexcurse-installer.path\`**: written by install and **\`--run-hexcurse\`**; gitignored; first line = **\`setup.js\`** to invoke.
- If **\`HEXCURSE/NORTH_STAR.md\`** is missing, still has a **standalone** placeholder line **\`NORTH_STAR_NOT_READY\`** (whole line only — prose mentions do not count), or is otherwise boilerplate, stop and tell the human to fill it first.

`,
);

// SESSION START STEP 1: pack NORTH_STAR only
body = body.replace(
  /\*\*STEP 1\.\*\* Read \*\*`HEXCURSE\/NORTH_STAR\.md`\*\* or legacy repo-root \*\*`NORTH_STAR\.md`\*\* when present \(consumer\)\. \*\*This source repo:\*\* optional continuity read; there is no pack \*\*`NORTH_STAR`\*\* unless you add one\./,
  '**STEP 1.** Read **`HEXCURSE/NORTH_STAR.md`** or legacy repo-root **`NORTH_STAR.md`** when present.',
);

// SESSION START STEP 2: single pack path
body = body.replace(
  /\*\*STEP 2\.\*\* Read \*\*`HEXCURSE\/docs\/ROLLING_CONTEXT\.md`\*\* or \*\*`HEXCURSE\/docs\/ROLLING_CONTEXT\.md`\*\* when the file exists\./,
  '**STEP 2.** Read **`HEXCURSE/docs/ROLLING_CONTEXT.md`** when the file exists.',
);

// Fix duplicate HEXCURSE if any
body = body.replace(/HEXCURSE\/HEXCURSE\//g, 'HEXCURSE/');

// Escape for embedding in setup.js template literal (return `...`)
function escapeForTemplateLiteral(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

// Restore ${projectName} after escape
let escaped = escapeForTemplateLiteral(body);
escaped = escaped.replace(/\\# \\$\{projectName\}/, '# ${projectName}');
// We had # ${projectName} in body - escape turned ${ to \${
escaped = escaped.replace(/^# \\$\{projectName\}/m, '# ${projectName}');

const setup = fs.readFileSync(setupPath, 'utf8');
const start = setup.indexOf('function agentsMd(projectName) {');
const nextFn = setup.indexOf('function directivesMd(', start);
if (start === -1 || nextFn === -1) throw new Error('Could not find agentsMd boundaries');
const before = setup.slice(0, start);
const after = setup.slice(nextFn);
const newFn = `function agentsMd(projectName) {\n  return \`${escaped}\`;\n}`;
fs.writeFileSync(setupPath, before + newFn + after, 'utf8');
console.log('patched agentsMd() in setup.js');
