import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const vendorRoot = path.join(repoRoot, 'vendor', 'dirplayer-rs');
const vendorDist = path.join(vendorRoot, 'dist-polyfill', 'dirplayer-polyfill.js');
const publicTarget = path.join(repoRoot, 'public', 'dirplayer', 'dirplayer-polyfill.local.js');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const wasmPackCmd = process.platform === 'win32' ? 'wasm-pack.exe' : 'wasm-pack';
const rustupCmd = process.platform === 'win32' ? 'rustup.exe' : 'rustup';

function run(command, args, cwd) {
  console.log(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function tryRun(command, args, cwd = repoRoot) {
  return spawnSync(command, args, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

if (!existsSync(vendorRoot)) {
  console.error('Missing vendored DirPlayer source at vendor/dirplayer-rs.');
  process.exit(1);
}

const wasmPackVersion = tryRun(wasmPackCmd, ['--version']);
if (wasmPackVersion.status !== 0) {
  console.error(
    'wasm-pack is required to rebuild the local DirPlayer bundle. Install it first, then rerun `npm run dirplayer:build-local`.',
  );
  process.exit(1);
}

const installedTargets = tryRun(rustupCmd, ['target', 'list', '--installed']);
if (
  installedTargets.status === 0 &&
  !installedTargets.stdout.split(/\r?\n/).includes('wasm32-unknown-unknown')
) {
  run(rustupCmd, ['target', 'add', 'wasm32-unknown-unknown'], repoRoot);
}

run(npmCmd, ['install'], vendorRoot);
run(npmCmd, ['run', 'build-vm'], vendorRoot);
run(npmCmd, ['run', 'build-polyfill'], vendorRoot);

if (!existsSync(vendorDist)) {
  console.error(`Expected built polyfill at ${vendorDist}`);
  process.exit(1);
}

mkdirSync(path.dirname(publicTarget), { recursive: true });
copyFileSync(vendorDist, publicTarget);

console.log(`Copied ${vendorDist} -> ${publicTarget}`);
