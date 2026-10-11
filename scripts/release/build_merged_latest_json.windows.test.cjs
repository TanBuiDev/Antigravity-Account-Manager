#!/usr/bin/env node
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const script = path.join(__dirname, 'build_merged_latest_json.cjs');

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'windows-updater-'));
  const assets = path.join(root, 'assets');
  fs.mkdirSync(assets);
  const notes = path.join(root, 'notes.md');
  fs.writeFileSync(notes, 'Bản phát hành Windows');
  const msi = 'Cockpit.Tools_1.3.67_x64_en-US.msi';
  const nsis = 'Cockpit.Tools_1.3.67_x64-setup.exe';
  for (const file of [msi, nsis]) {
    fs.writeFileSync(path.join(assets, file), 'test artifact');
    fs.writeFileSync(path.join(assets, file + '.sig'), 'dummy-signature-for-test');
  }
  const output = path.join(root, 'latest.json');
  function run() {
    return spawnSync(process.execPath, [
      script, '--windows-only',
      '--version', '1.3.67',
      '--repo', 'example/repo',
      '--assets-dir', assets,
      '--notes-file', notes,
      '--published-at', '2026-10-11T00:00:00Z',
      '--output', output,
    ], { encoding: 'utf8' });
  }
  return { root, assets, output, msi, nsis, run };
}

test('Windows-only updater manifest does not require macOS or Linux assets', (t) => {
  const f = createFixture();
  t.after(() => fs.rmSync(f.root, { recursive: true, force: true }));
  const run = f.run();
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(fs.readFileSync(f.output, 'utf8'));
  assert.deepEqual(Object.keys(result.platforms).sort(), [
    'windows-x86_64', 'windows-x86_64-msi', 'windows-x86_64-nsis',
  ].sort());
  assert.deepEqual(result.platforms['windows-x86_64'], result.platforms['windows-x86_64-msi']);
  assert.match(result.platforms['windows-x86_64-nsis'].url, /_x64-setup\.exe$/);
  assert.match(result.platforms['windows-x86_64-msi'].url, /_x64_en-US\.msi$/);
  assert.equal(result.platforms['windows-x86_64'].signature, 'dummy-signature-for-test');
});

test('Windows-only updater refuses unsigned installer assets', (t) => {
  const f = createFixture();
  t.after(() => fs.rmSync(f.root, { recursive: true, force: true }));
  fs.rmSync(path.join(f.assets, f.msi + '.sig'));
  const run = f.run();
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Missing signature file/);
  assert.equal(fs.existsSync(f.output), false);
});
