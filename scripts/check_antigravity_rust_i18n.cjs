#!/usr/bin/env node
'use strict';

// Static guard for Antigravity-related Rust messages. Does not modify source.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const guardedFiles = [
  'src-tauri/src/commands/account.rs',
  'src-tauri/src/commands/oauth.rs',
  'src-tauri/src/commands/instance.rs',
  'src-tauri/src/commands/antigravity_legacy_instance.rs',
  'src-tauri/src/commands/group.rs',
  'src-tauri/src/commands/import.rs',
  'src-tauri/src/modules/account.rs',
  'src-tauri/src/modules/oauth.rs',
  'src-tauri/src/modules/antigravity_credential.rs',
  'src-tauri/src/modules/antigravity_paths.rs',
  'src-tauri/src/modules/antigravity_switch_history.rs',
  'src-tauri/src/modules/antigravity_legacy_instance.rs',
];

const han = /[\u3400-\u9fff]/;
const errors = [];
for (const file of guardedFiles) {
  assert.ok(fs.existsSync(file), 'Missing Rust file: ' + file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const text = line.trim();
    // Source comments are not runtime output; review separately.
    if (!han.test(text) || /^(\/\/|\/\*|\*|#!)/.test(text)) return;
    errors.push(file + ':' + (i + 1) + ': ' + text.slice(0, 100));
  });
}

// Catch dangling compile-time includes after removing locale documents.
const checker = 'src-tauri/src/modules/update_checker.rs';
const source = fs.readFileSync(checker, 'utf8');
for (const match of source.matchAll(/include_str!\(\s*"([^"]+)"\s*\)/g)) {
  const asset = path.resolve(path.dirname(checker), match[1]);
  if (!fs.existsSync(asset)) errors.push(checker + ': missing bundled asset ' + match[1]);
}
if (errors.length) {
  console.error('Antigravity Rust localization check failed:\n' + errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Antigravity Rust localized messages: OK (' + guardedFiles.length + ' modules).');
  console.log('Bundled changelog references: OK.');
}
