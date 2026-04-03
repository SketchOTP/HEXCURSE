#!/usr/bin/env node
'use strict';

/**
 * Launches the phuryn/swarm-protocol MCP server from a user cache (git install + local tsc build).
 * Upstream publishes sources on GitHub only; dist/ is produced on first run.
 * Default DB: postgresql://postgres:postgres@localhost:5432/swarm_protocol (see swarm-protocol README).
 *
 * Credentials: do not put DATABASE_URL in ~/.cursor/mcp.json if you avoid storing passwords there.
 * Set DATABASE_URL (or SWARM_DATABASE_URL) in ~/.cursor/swarm-database.env — this file is loaded
 * when DATABASE_URL is not already set (e.g. by MCP env).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

/** Loads KEY=value pairs from path into process.env for DATABASE_URL / SWARM_DATABASE_URL only (no override if already set). */
function loadSwarmDatabaseEnvFile() {
  const envPath = path.join(os.homedir(), '.cursor', 'swarm-database.env');
  if (!fs.existsSync(envPath)) return;
  let raw;
  try {
    raw = fs.readFileSync(envPath, 'utf8');
  } catch (e) {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== 'DATABASE_URL' && key !== 'SWARM_DATABASE_URL') continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
  if (!process.env.DATABASE_URL && process.env.SWARM_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.SWARM_DATABASE_URL;
  }
}

loadSwarmDatabaseEnvFile();

const cacheRoot = path.join(os.homedir(), '.cursor', 'hexcurse-cache', 'swarm-protocol');
const pkgDir = path.join(cacheRoot, 'node_modules', 'swarm-protocol');
const distJs = path.join(pkgDir, 'dist', 'index.js');

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (r.status !== 0 && r.status !== null) process.exit(r.status);
  if (r.error) throw r.error;
}

function ensureSwarmBuilt() {
  fs.mkdirSync(cacheRoot, { recursive: true });
  const pj = path.join(cacheRoot, 'package.json');
  if (!fs.existsSync(pj)) {
    fs.writeFileSync(
      pj,
      `${JSON.stringify(
        {
          name: 'hexcurse-swarm-runtime',
          private: true,
          dependencies: {
            'swarm-protocol': 'github:phuryn/swarm-protocol',
          },
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  }
  if (!fs.existsSync(path.join(pkgDir, 'package.json'))) {
    run('npm', ['install'], cacheRoot);
  }
  if (!fs.existsSync(distJs)) {
    run('npm', ['install'], pkgDir);
    run('npx', ['tsc'], pkgDir);
    const schemaSrc = path.join(pkgDir, 'src', 'db', 'schema.sql');
    const schemaDst = path.join(pkgDir, 'dist', 'db', 'schema.sql');
    fs.mkdirSync(path.dirname(schemaDst), { recursive: true });
    fs.copyFileSync(schemaSrc, schemaDst);
  }
}

ensureSwarmBuilt();

const child = spawn(process.execPath, [distJs], {
  stdio: 'inherit',
  env: process.env,
});
child.on('exit', (code) => process.exit(code == null ? 1 : code));
