import { spawn } from 'node:child_process';
import path from 'node:path';

const children = [
  spawn(process.execPath, ['server/index.js'], { stdio: 'inherit' }),
  spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1'], { stdio: 'inherit' }),
];
const labels = ['API server', 'Vite client'];
let stopping = false;

function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
  }
  process.exitCode = code;
}

for (const child of children) {
  child.on('error', error => {
    console.error('Could not start development process:', error);
    stopAll(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`${labels[children.indexOf(child)]} stopped unexpectedly (${signal || `exit ${code}`}).`);
      stopAll(code === 0 ? 1 : code ?? 1);
    }
  });
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
