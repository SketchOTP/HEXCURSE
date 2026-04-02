#!/usr/bin/env node
'use strict';

const run = require('../setup.js');
Promise.resolve(run())
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
