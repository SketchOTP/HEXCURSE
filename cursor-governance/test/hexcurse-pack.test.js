'use strict';

/**
 * Automated checks for HEXCURSE pack path resolution and installer helpers.
 * Run: node test/hexcurse-pack.test.js
 * Must match setup.js helpers (see main.hexcursePaths).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, execSync } = require('child_process');

const setupMain = require('../setup.js');
const { HEXCURSE_ROOT, pathNorthStarPack, resolveNorthStarPathForRead } = setupMain.hexcursePaths;

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
    assert.fail('expected non-zero exit');
  } catch (e) {
    assert.ok(e.status === 1 || e.code === 1, 'exit 1');
  }
}

function testMcpNpmPackagesCoreMcpExist() {
  execSync('npm view @modelcontextprotocol/server-github name', { stdio: 'pipe' });
  execSync('npm view @upstash/context7-mcp name', { stdio: 'pipe' });
  execSync('npm view @modelcontextprotocol/server-memory name', { stdio: 'pipe' });
  execSync('npm view task-master-ai name', { stdio: 'pipe' });
}

function testBuildMcpServersCoreOnly() {
  const { buildMcpServers } = setupMain.hexcurseMcpTestHooks;
  const servers = buildMcpServers({
    github: 'test-token',
    taskmasterEnv: { OPENAI_API_KEY: 'x' },
    selectedOptionals: [],
  });
  assert.deepStrictEqual(Object.keys(servers).sort(), [
    'context7',
    'github',
    'memory',
    'taskmaster-ai',
  ]);
}

function testBuildMcpServersAllOptionals() {
  const { buildMcpServers } = setupMain.hexcurseMcpTestHooks;
  const servers = buildMcpServers({
    github: 'g',
    taskmasterEnv: {},
    selectedOptionals: ['playwright', 'semgrep', 'supabase', 'lightrag', 'custom'],
    customMcp: { mode: 'url', url: 'https://example.com/mcp' },
  });
  assert.ok(servers.playwright && servers.playwright.command === 'npx');
  assert.strictEqual(servers.semgrep.type, 'streamable-http');
  assert.strictEqual(servers.semgrep.url, 'https://mcp.semgrep.ai/mcp');
  assert.ok(
    servers.supabase &&
      String(servers.supabase.url).includes('mcp.supabase.com') &&
      String(servers.supabase.url).includes('project_ref=')
  );
  assert.strictEqual(servers.lightrag.command, 'uvx');
  assert.strictEqual(servers.custom.url, 'https://example.com/mcp');
}

function testQuickInstallPresetOther() {
  const cwd = mkTmp();
  fs.mkdirSync(path.join(cwd, '.git'), { recursive: true });
  const env = {
    ...process.env,
    HEXCURSE_QUICK: '1',
    HEXCURSE_PRESET: 'other',
    HEXCURSE_PROJECT_NAME: 'p',
    HEXCURSE_PURPOSE: 'x',
    HEXCURSE_STACK: 'y',
    HEXCURSE_MODULES: 'z',
    HEXCURSE_SACRED: 'none',
    HEXCURSE_OUT_OF_SCOPE: 'n',
    HEXCURSE_DOD: 'd',
    CI: 'true',
    GITHUB_ACTIONS: 'true',
  };
  execFileSync(process.execPath, [setupJs, '--quick', '--preset=other'], {
    cwd,
    env,
    stdio: 'pipe',
    encoding: 'utf8',
  });
}

function testValidateTaskmasterSchemaRejectsIncompleteTask() {
  const bad = {
    master: {
      tasks: [
        {
          id: 1,
          title: 'Only one',
          description: 'd',
          details: 'x',
          testStrategy: 't',
          status: 'pending',
          dependencies: [],
          priority: 'high',
          subtasks: [],
        },
      ],
    },
  };
  const r = validateTaskmasterSchema(bad);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('at least 5')));
}

function testValidateTaskmasterSchemaAcceptsValidTask() {
  const tasks = [];
  for (let i = 1; i <= 5; i++) {
    tasks.push({
      id: i,
      title: `T${i}`,
      description: 'd',
      details: 'x',
      testStrategy: 't',
      status: 'pending',
      dependencies: i > 1 ? [i - 1] : [],
      priority: 'high',
      subtasks: [],
    });
  }
  const good = { master: { tasks } };
  const r = validateTaskmasterSchema(good);
  assert.strictEqual(r.ok, true, r.errors && r.errors.join('; '));
}

function testParsePrdViaAgentExitsOnStubPrd() {
  const cwd = mkTmp();
  const prdPath = path.join(cwd, 'prd.txt');
  fs.mkdirSync(path.dirname(prdPath), { recursive: true });
  fs.writeFileSync(prdPath, 'short', 'utf8');
  try {
    execFileSync(process.execPath, [setupJs, '--parse-prd-via-agent', `--prd=${prdPath}`], {
      cwd,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    assert.fail('expected exit');
  } catch (e) {
    assert.ok(e.status === 1 || e.code === 1);
  }
}

function testBuildAgentParsePromptContainsSchemaAndPrd() {
  const prd = 'x'.repeat(120);
  const out = buildAgentParsePrompt(prd, '.taskmaster/tasks/tasks.json');
  assert.ok(out.includes('"master"'), out);
  assert.ok(out.includes(prd), out);
}

function testParsePrdViaAgentApplyStripsMarkdownFences() {
  const cwd = mkTmp();
  const prdPath = path.join(cwd, '.taskmaster', 'docs', 'prd.txt');
  fs.mkdirSync(path.dirname(prdPath), { recursive: true });
  fs.writeFileSync(
    prdPath,
    '# PRD\n\n' + 'body '.repeat(80),
    'utf8'
  );
  const inner = {
    master: {
      tasks: [
        {
          id: 1,
          title: 'One',
          description: 'First task',
          details: 'Phase one work',
          testStrategy: 'Automated',
          status: 'pending',
          dependencies: [],
          priority: 'high',
          subtasks: [],
        },
        {
          id: 2,
          title: 'Two',
          description: 'Second task',
          details: 'Depends on one',
          testStrategy: 'Automated',
          status: 'pending',
          dependencies: [1],
          priority: 'high',
          subtasks: [],
        },
        {
          id: 3,
          title: 'Three',
          description: 'Third task',
          details: 'Parallel work',
          testStrategy: 'Automated',
          status: 'pending',
          dependencies: [],
          priority: 'medium',
          subtasks: [],
        },
        {
          id: 4,
          title: 'Four',
          description: 'Fourth task',
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

function run() {
  const tests = [
    ['pathNorthStarPack', testPathNorthStarPack],
    ['resolveNorthStar pack only', testResolveNorthStarPackOnly],
    ['resolveNorthStar legacy only', testResolveNorthStarLegacyOnly],
    ['resolveNorthStar prefers pack', testResolveNorthStarPrefersPackOverLegacy],
    ['extract sacred CSV includes trailing bullets', testExtractSacredIncludesTrailingBullets],
    ['sync-rules requires HEXCURSE_RULES_REMOTE_URL', testSyncRulesRequiresRemoteUrl],
    ['MCP npm packages core v2 exist', testMcpNpmPackagesCoreMcpExist],
    ['buildMcpServers core-only keys', testBuildMcpServersCoreOnly],
    ['buildMcpServers all optionals shape', testBuildMcpServersAllOptionals],
    ['quick install preset other', testQuickInstallPresetOther],
    ['validateTaskmasterSchema rejects incomplete task', testValidateTaskmasterSchemaRejectsIncompleteTask],
    ['validateTaskmasterSchema accepts valid tasks', testValidateTaskmasterSchemaAcceptsValidTask],
    ['parse-prd-via-agent exits on stub PRD', testParsePrdViaAgentExitsOnStubPrd],
    ['buildAgentParsePrompt contains schema and PRD', testBuildAgentParsePromptContainsSchemaAndPrd],
    ['parse-prd-via-agent apply strips markdown fences', testParsePrdViaAgentApplyStripsMarkdownFences],
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
