'use strict';

/**
 * Isolated readline smoke test for Windows PowerShell (line-buffered stdin).
 * Run: node test-input.js
 * Non-interactive check: echo hello | node test-input.js
 */
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

rl.question('Type something and press Enter: ', (answer) => {
  rl.close();
  console.log('Received:', JSON.stringify((answer || '').trim()));
});
