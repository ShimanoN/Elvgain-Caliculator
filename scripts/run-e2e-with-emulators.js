#!/usr/bin/env node
import { spawn } from 'child_process';
import net from 'net';

function waitForPort(port, host = '127.0.0.1', timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function tryConnect() {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) return reject(new Error(`Timeout waiting for ${host}:${port}`));
        setTimeout(tryConnect, 500);
      });
      socket.once('timeout', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) return reject(new Error(`Timeout waiting for ${host}:${port}`));
        setTimeout(tryConnect, 500);
      });
      socket.connect(port, host, () => {
        socket.end();
        resolve();
      });
    })();
  });
}

async function main() {
  console.log('Starting Firebase emulators (firestore, auth)...');
  const emu = spawn('npx', ['firebase', 'emulators:start', '--only', 'firestore,auth'], { stdio: 'inherit' });

  let killed = false;
  function cleanup() {
    if (killed) return;
    killed = true;
    try {
      emu.kill('SIGINT');
    } catch (e) {}
  }
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  try {
    console.log('Waiting for Firestore emulator on port 8080...');
    await waitForPort(8080);
    console.log('Firestore emulator reachable.');
    console.log('Waiting for Auth emulator on port 9099...');
    await waitForPort(9099);
    console.log('Auth emulator reachable.');

    console.log('Running Playwright E2E...');
    const e2e = spawn('npm', ['run', 'e2e'], { stdio: 'inherit' });
    e2e.on('exit', (code) => {
      console.log('E2E finished with code', code);
      cleanup();
      process.exit(code || 0);
    });
  } catch (err) {
    console.error('Error waiting for emulators:', err);
    cleanup();
    process.exit(1);
  }
}

main();
