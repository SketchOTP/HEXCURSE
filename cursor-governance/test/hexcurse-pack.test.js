'use strict';

/**
 * Automated checks for HEXCURSE pack path resolution and learning rollup.
 * Run: node test/hexcurse-pack.test.js
 * Must match setup.js helpers (see main.hexcursePaths).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, execSync } = require('child_process');

const setupMain = require('../setup.js');
const {
  HEXCURSE_ROOT,
  pathNorthStarPack,
  resolveNorthStarPathForRead,
  resolveSessionLogForRollup,
  resolveRollingContextPathForRollup,
} = setupMain.hexcursePaths;

const { validateTaskmasterSchema, buildAgentParsePrompt } = setupMain.hexcurseAgentParseHooks;
const { isWindowsConPTY } = setupMain.hexcursePlatformTestHooks;

const setupJs = path.join(__dirname, '..', 'setup.js');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hexcurse-pack-'));
}

function testPathNorthStarPack() {
  const cwd = mkTmp();
  const p = pathNorthStarPack(cwd);
  assert.strictEqual(p, path.join(cwd, 'HEXCURSE', 'NORTH_STAR.md'));
}

function testResolveNorthStarPackOnly() {
  const cwd = mkTmp();
  const pack = pathNorthStarPack(cwd);
  fs.mkdirSync(path.dirname(pack), { recursive: true });
  fs.writeFileSync(pack, '# North Star\n\n' + 'x'.repeat(200), 'utf8');
  const r = resolveNorthStarPathForRead(cwd);
  assert.strictEqual(r.legacy, false);
  assert.strictEqual(r.path, pack);
}

function testResolveNorthStarLegacyOnly() {
  const cwd = mkTmp();
  const leg = path.join(cwd, 'NORTH_STAR.md');
  fs.writeFileSync(leg, '# North Star\n\n' + 'y'.repeat(200), 'utf8');
  const r = resolveNorthStarPathForRead(cwd);
  assert.strictEqual(r.legacy, true);
  assert.strictEqual(r.path, leg);
}

function testResolveNorthStarPrefersPackOverLegacy() {
  const cwd = mkTmp();
  const pack = pathNorthStarPack(cwd);
  fs.mkdirSync(path.dirname(pack), { recursive: true });
  fs.writeFileSync(pack, '# Pack\n\n' + 'a'.repeat(200), 'utf8');
  fs.writeFileSync(path.join(cwd, 'NORTH_STAR.md'), '# Legacy\n\n' + 'b'.repeat(200), 'utf8');
  const r = resolveNorthStarPathForRead(cwd);
  assert.strictEqual(r.legacy, false);
  assert.strictEqual(r.path, pack);
}

function testSessionLogPrefersHex() {
  const cwd = mkTmp();
  const hexLog = path.join(cwd, HEXCURSE_ROOT, 'SESSION_LOG.md');
  const rootLog = path.join(cwd, 'SESSION_LOG.md');
  fs.mkdirSync(path.dirname(hexLog), { recursive: true });
  fs.writeFileSync(hexLog, '# log\n', 'utf8');
  fs.writeFileSync(rootLog, '# root\n', 'utf8');
  assert.strictEqual(resolveSessionLogForRollup(cwd), hexLog);
}

function testSessionLogFallsBackRoot() {
  const cwd = mkTmp();
  const rootLog = path.join(cwd, 'SESSION_LOG.md');
  fs.writeFileSync(rootLog, '# root\n', 'utf8');
  assert.strictEqual(resolveSessionLogForRollup(cwd), rootLog);
}

function testRollingPrefersHexWhenBothMissingButHexDirExists() {
  const cwd = mkTmp();
  fs.mkdirSync(path.join(cwd, HEXCURSE_ROOT, 'docs'), { recursive: true });
  const expected = path.join(cwd, HEXCURSE_ROOT, 'docs', 'ROLLING_CONTEXT.md');
  assert.strictEqual(resolveRollingContextPathForRollup(cwd), expected);
}

function testRollingUsesExistingHexFile() {
  const cwd = mkTmp();
  const hexRoll = path.join(cwd, HEXCURSE_ROOT, 'docs', 'ROLLING_CONTEXT.md');
  fs.mkdirSync(path.dirname(hexRoll), { recursive: true });
  fs.writeFileSync(hexRoll, '# roll\n', 'utf8');
  const rootDocs = path.join(cwd, 'docs');
  fs.mkdirSync(rootDocs, { recursive: true });
  fs.writeFileSync(path.join(rootDocs, 'ROLLING_CONTEXT.md'), '# root docs\n', 'utf8');
  assert.strictEqual(resolveRollingContextPathForRollup(cwd), hexRoll);
}

function testExtractSacredIncludesTrailingBullets() {
  const { extractSacredCsvFromBaseMdc } = setupMain.hexcurseRefreshRulesTestHooks;
  const md = `## Sacred Constraints\n\n- Keep secrets out of git\n\n## Out of Scope\n\nUI\n\n- No TypeScript any types in production code\n`;
  const csv = extractSacredCsvFromBaseMdc(md);
  assert.ok(csv.includes('Keep secrets out of git'), csv);
  assert.ok(csv.includes('No TypeScript any types'), csv);
}

function testSyncRulesRequiresRemoteUrl() {
  const cwd = mkTmp();
  fs.mkdirSync(path.join(cwd, '.cursor', 'rules'), { recursive: true });
  const env = { ...process.env };
  delete env.HEXCURSE_RULES_REMOTE_URL;
  try {
    execFileSync(process.execPath, [setupJs, '--sync-rules'], {
      cwd,
      env,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    assert.fail('expected sync-rules to exit 1 when HEXCURSE_RULES_REMOTE_URL is unset');
  } catch (e) {
    assert.strictEqual(e.status, 1, String(e.stdout || '') + String(e.stderr || ''));
    const out = `${e.stdout || ''}${e.stderr || ''}`;
    assert.ok(
      out.includes('HEXCURSE_RULES_REMOTE_URL'),
      'stderr should name HEXCURSE_RULES_REMOTE_URL'
    );
  }
}

function testMcpNpmPackagesLinearAndPampaExist() {
  execSync('npm view @mseep/linear-mcp name', { encoding: 'utf8', stdio: 'pipe', shell: true });
  execSync('npm view pampa name', { encoding: 'utf8', stdio: 'pipe', shell: true });
}

function testQuickInstallPresetOther() {
  const prev = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  process.env.GITHUB_PERSONAL_ACCESS_TOKEN = 'ghp_test_token_minimum_len_ok_xxxxxxxx';
  try {
    const { buildQuickInstallAnswers } = setupMain.hexcurseQuickInstallTestHooks;
    const cwd = mkTmp();
    const a = buildQuickInstallAnswers(cwd, 'other');
    assert.strictEqual(a.provider, 'other');
    assert.deepStrictEqual(a.taskmasterEnv, {});
    assert.ok(String(a.github || '').length > 10);
  } finally {
    if (prev === undefined) delete process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    else process.env.GITHUB_PERSONAL_ACCESS_TOKEN = prev;
  }
}

function testValidateTaskmasterSchemaRejectsIncompleteTask() {
  const badInput = { master: { tasks: [{ id: 1, title: 'Test' }] } };
  const r = validateTaskmasterSchema(badInput);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.length > 0);
}

function testValidateTaskmasterSchemaAcceptsValidTasks() {
  const goodInput = {
    master: {
      tasks: [
        {
          id: 1,
          title: 'Foundation task',
          description: 'Sets up the project',
          details: 'Creates initial structure',
          testStrategy: 'Run doctor',
          status: 'pending',
          dependencies: [],
          priority: 'high',
          subtasks: [],
        },
        {
          id: 2,
          title: 'Second task',
          description: 'Builds on foundation',
          details: 'Extends the structure',
          testStrategy: 'Run tests',
          status: 'pending',
          dependencies: [1],
          priority: 'medium',
          subtasks: [],
        },
        {
          id: 3,
          title: 'Third task',
          description: 'Completes the phase',
          details: 'Finalizes the work',
          testStrategy: 'Manual review',
          status: 'pending',
          dependencies: [1],
          priority: 'low',
          subtasks: [],
        },
        {
          id: 4,
          title: 'Fourth task',
          description: 'Validates the output',
          details: 'Runs validation suite',
          testStrategy: 'Automated tests',
          status: 'pending',
          dependencies: [2, 3],
          priority: 'high',
          subtasks: [],
        },
        {
          id: 5,
          title: 'Fifth task',
          description: 'Ships the release',
          details: 'Packages and publishes',
          testStrategy: 'npm publish dry-run',
          status: 'pending',
          dependencies: [4],
          priority: 'high',
          subtasks: [],
        },
      ],
    },
  };
  const r = validateTaskmasterSchema(goodInput);
  assert.strictEqual(r.ok, true, r.errors.join('; '));
}

function testParsePrdViaAgentExitsOnStubPrd() {
  const cwd = mkTmp();
  const stubPrd = path.join(cwd, 'stub-prd.txt');
  fs.writeFileSync(stubPrd, 'short', 'utf8');
  try {
    execFileSync(process.execPath, [setupJs, '--parse-prd-via-agent', `--prd=${stubPrd}`, '--dry-run'], {
      cwd,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    assert.fail('expected stub PRD to exit 1');
  } catch (e) {
    assert.strictEqual(e.status, 1);
    const out = `${e.stdout || ''}${e.stderr || ''}`;
    assert.ok(out.includes('stub') || out.includes('chars'), out);
  }
}

function testBuildAgentParsePromptContainsSchemaAndPrd() {
  const prdSnippet = 'UNIQUE_PRD_SNIPPET_FOR_PROMPT_TEST_12345';
  const p = buildAgentParsePrompt(prdSnippet, '/tmp/tasks.json');
  for (const needle of ['master', 'tasks', 'id', 'dependencies', 'priority', 'pending']) {
    assert.ok(p.includes(needle), `prompt should include ${needle}`);
  }
  assert.ok(p.includes(prdSnippet), 'prompt should embed PRD body');
}

function testParsePrdViaAgentApplyStripsMarkdownFences() {
  const cwd = mkTmp();
  const prdPath = path.join(cwd, 'prd.txt');
  fs.writeFileSync(prdPath, 'x'.repeat(120), 'utf8');
  const inner = {
    master: {
      tasks: [
        {
          id: 1,
          title: 'Foundation',
          description: 'Sets up project',
          details: 'Creates structure',
          testStrategy: 'Run doctor',
          status: 'pending',
          dependencies: [],
          priority: 'high',
          subtasks: [],
        },
        {
          id: 2,
          title: 'Task two',
          description: 'Builds on one',
          details: 'Extends it',
          testStrategy: 'Run tests',
          status: 'pending',
          dependencies: [1],
          priority: 'medium',
          subtasks: [],
        },
        {
          id: 3,
          title: 'Task three',
          description: 'Third phase',
          details: 'Phase three work',
          testStrategy: 'Manual check',
          status: 'pending',
          dependencies: [1],
          priority: 'low',
          subtasks: [],
        },
        {
          id: 4,
          title: 'Task four',
          description: 'Fourth phase',
          details: 'Phase four work',
          testStrategy: 'Automated',
          status: 'pending',
          dependencies: [2, 3],
          priority: 'high',
          subtasks: [],
        },
        {
          id: 5,
          title: 'Task five',
          description: 'Final phase',
          details: 'Ships it',
          testStrategy: 'npm publish dry-run',
          status: 'pending',
          dependencies: [4],
          priority: 'high',
          subtasks: [],
        },
      ],
    },
  };
  const respPath = path.join(cwd, 'agent-response.json');
  fs.writeFileSync(respPath, '```json\n' + JSON.stringify(inner) + '\n```\n', 'utf8');
  const out = execFileSync(
    process.execPath,
    [
      setupJs,
      '--parse-prd-via-agent',
      `--prd=${prdPath}`,
      `--apply=${respPath}`,
      '--dry-run',
    ],
    { cwd, stdio: 'pipe', encoding: 'utf8' }
  );
  assert.ok(out.includes('Parsed 5 tasks'), out);
  assert.ok(out.includes('dry-run: tasks.json not written'), out);
}

function testIsWindowsConPTYBoolean() {
  const v = isWindowsConPTY();
  assert.strictEqual(typeof v, 'boolean');
}

function testLearningRollupWritesToHexPack() {
  const cwd = mkTmp();
  const hexDir = path.join(cwd, HEXCURSE_ROOT, 'docs');
  fs.mkdirSync(hexDir, { recursive: true });
  const sessionPath = path.join(cwd, HEXCURSE_ROOT, 'SESSION_LOG.md');
  const rollingPath = path.join(hexDir, 'ROLLING_CONTEXT.md');
  fs.writeFileSync(
    sessionPath,
    `# SESSION LOG — Test

## Sessions

### Session S-900 — 2026-01-01
**Directive:** D001 — smoke
**Outcome:** COMPLETE
`,
    'utf8'
  );
  fs.writeFileSync(rollingPath, '# Rolling context\n\n*(No entries yet.)*\n', 'utf8');

  execFileSync(process.execPath, [setupJs, '--learning-rollup', '--sessions=2'], {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  const after = fs.readFileSync(rollingPath, 'utf8');
  assert.ok(
    after.includes('### Session S-900'),
    'rollup should append SESSION_LOG block to HEXCURSE/docs/ROLLING_CONTEXT.md'
  );
  assert.ok(after.includes('Raw session index'), 'rollup should add raw session index section');
}

function run() {
  const tests = [
    ['pathNorthStarPack', testPathNorthStarPack],
    ['resolveNorthStar pack only', testResolveNorthStarPackOnly],
    ['resolveNorthStar legacy only', testResolveNorthStarLegacyOnly],
    ['resolveNorthStar prefers pack', testResolveNorthStarPrefersPackOverLegacy],
    ['sessionLog prefers HEXCURSE', testSessionLogPrefersHex],
    ['sessionLog fallback root', testSessionLogFallsBackRoot],
    ['rolling default path when HEX dir exists', testRollingPrefersHexWhenBothMissingButHexDirExists],
    ['rolling prefers existing hex file', testRollingUsesExistingHexFile],
    ['extract sacred CSV includes trailing bullets', testExtractSacredIncludesTrailingBullets],
    ['sync-rules requires HEXCURSE_RULES_REMOTE_URL', testSyncRulesRequiresRemoteUrl],
    ['MCP npm packages linear + pampa exist', testMcpNpmPackagesLinearAndPampaExist],
    ['quick install preset other', testQuickInstallPresetOther],
    ['validateTaskmasterSchema rejects incomplete task', testValidateTaskmasterSchemaRejectsIncompleteTask],
    ['validateTaskmasterSchema accepts valid tasks', testValidateTaskmasterSchemaAcceptsValidTasks],
    ['parse-prd-via-agent exits on stub PRD', testParsePrdViaAgentExitsOnStubPrd],
    ['buildAgentParsePrompt contains schema and PRD', testBuildAgentParsePromptContainsSchemaAndPrd],
    ['parse-prd-via-agent apply strips markdown fences', testParsePrdViaAgentApplyStripsMarkdownFences],
    ['learning rollup integration', testLearningRollupWritesToHexPack],
    ['isWindowsConPTY returns boolean', testIsWindowsConPTYBoolean],
  ];
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      fn();
      console.log('ok', name);
    } catch (e) {
      failed++;
      console.error('FAIL', name, e.message);
    }
  }
  if (failed) {
    process.exit(1);
  }
  console.log('\nhexcurse-pack.test.js: all', tests.length, 'passed');
}

run();
