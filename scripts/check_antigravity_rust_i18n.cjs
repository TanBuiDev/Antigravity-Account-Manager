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
  'src-tauri/src/modules/instance.rs',
  'src-tauri/src/modules/instance_store.rs',
  'src-tauri/src/modules/account_index_repair.rs',
  'src-tauri/src/modules/secure_account_storage.rs',
  'src-tauri/src/modules/quota.rs',
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

// Historical Chinese changelog headings are accepted as parser inputs,
// but new Chinese diagnostics in update_checker.rs must not be introduced.
const updaterLines = source.split(/\r?\n/);
const testSection = source.indexOf('#[cfg(test)]');
const legacyHeadings = new Set([
  '"added" | "新增" => Some(ReleaseHistorySection::Added),',
  '"changed" | "变更" => Some(ReleaseHistorySection::Changed),',
  '"fixed" | "修复" => Some(ReleaseHistorySection::Fixed),',
  '"removed" | "移除" => Some(ReleaseHistorySection::Removed),',
]);
let cursor = 0;
for (const [i, line] of updaterLines.entries()) {
  const trimmed = line.trim();
  const lineStart = cursor;
  cursor += line.length + 1;
  if (!han.test(line) || /^(\/\/|\/\*|\*)/.test(trimmed)) continue;
  if (testSection >= 0 && lineStart > testSection) continue; // Historical parser test fixtures
  if (legacyHeadings.has(trimmed)) continue;
  errors.push(checker + ':' + (i + 1) + ': untranslated runtime text: ' + trimmed.slice(0, 120));
}

if (errors.length) {
  console.error('Antigravity Rust localization check failed:\n' + errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Antigravity Rust localized messages: OK (' + guardedFiles.length + ' modules).');
  console.log('Bundled changelog references: OK.');
}
