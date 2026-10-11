#!/usr/bin/env node
'use strict';
// Protect key Antigravity screens from Chinese runtime strings.
const fs=require('node:fs');
const files=[
  'src/App.tsx',
  'src/pages/AccountsPage.tsx',
  'src/pages/AccountsOverviewView.tsx',
  'src/pages/SettingsPage.tsx',
  'src/pages/DashboardPage.tsx',
  'src/pages/WakeupTasksPage.tsx',
  'src/components/AccountGroupModal.tsx',
  'src/components/GlobalModal.tsx',
  'src/components/QuickSettingsPopover.tsx',
  'src/components/AnnouncementCenter.tsx'
];
const han=/[\u3400-\u9fff]/;
const errors=[];
for(const path of files){
 if(!fs.existsSync(path)){errors.push('Missing: '+path);continue;}
 fs.readFileSync(path,'utf8').split(/\r?\n/).forEach((raw,i)=>{
  if(!han.test(raw))return;
  const line=raw.trim();
  // Native Japanese language name is not Chinese UI.
  if(/label:\s*['"]日本語['"]/.test(line))return;
  // Code comments are source documentation, not runtime UI.
  if(/^(\/\/|\/\*|\*|\{\/\*)/.test(line))return;
  // These are manually reviewed screens; reject newly introduced Chinese literals.
  errors.push(path+':'+(i+1)+': '+line.slice(0,100));
 });
}
if(errors.length){
 console.error('Chinese text in active Antigravity screen code:\n'+errors.join('\n'));
 process.exitCode=1;
}else console.log('Active Antigravity screen localization: OK ('+files.length+' files).');
