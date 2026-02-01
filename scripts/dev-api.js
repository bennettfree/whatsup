const { spawn } = require('child_process');

const bin =
  process.platform === 'win32'
    ? 'node_modules\\.bin\\ts-node-dev.cmd'
    : 'node_modules/.bin/ts-node-dev';

const child = spawn(
  bin,
  ['--respawn', '--transpile-only', 'backend/server.ts'],
  {
    stdio: 'inherit',
    // Needed on Windows to execute `.cmd` shims reliably.
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      // Ensure backend tsconfig (CommonJS) is used, not the app tsconfig.
      TS_NODE_PROJECT: 'backend/tsconfig.json',
    },
  },
);

child.on('exit', (code) => process.exit(code ?? 0));

