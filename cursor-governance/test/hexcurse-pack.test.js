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
    ['learning rollup integration', testLearningRollupWritesToHexPack],
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
