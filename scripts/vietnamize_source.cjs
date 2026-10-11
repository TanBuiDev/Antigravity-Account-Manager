#!/usr/bin/env node
'use strict';
// Update only i18next fallback strings with matching Vietnamese keys and placeholders.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const vi=JSON.parse(fs.readFileSync('src/locales/vi.json','utf8'));
const write=process.argv.includes('--write'),check=process.argv.includes('--check');
const han=/[\u3400-\u9fff]/,out={scanned:0,files:0,replaced:0,pending:[],remaining:[],comments:0};
function walk(dir,files=[]){if(!fs.existsSync(dir))return files;
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','dist','target'].includes(entry.name))continue;
 const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p,files);else files.push(p);}return files;}
function lookup(key){let v=vi;for(const part of key.split('.'))v=v?.[part];return typeof v==='string'&&!han.test(v)?v:null;}
function placeholders(s){return [...s.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map(m=>m[1].trim()).sort().join('|');}
const isStr=n=>ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n);
function examine(file){
 const prev=fs.readFileSync(file,'utf8'),kind=/\.[jt]sx$/.test(file)?ts.ScriptKind.TSX:ts.ScriptKind.TS;
 const ast=ts.createSourceFile(file,prev,ts.ScriptTarget.Latest,true,kind),edits=[];
 const apply=(node,key)=>{if(!isStr(node)||!han.test(node.text))return;
 const v=lookup(key);if(!v||placeholders(v)!==placeholders(node.text)){out.pending.push({file,key});return;}
 edits.push({from:node.getStart(ast),to:node.getEnd(),value:JSON.stringify(v)});};
 function visit(n){if(ts.isCallExpression(n)&&n.arguments.length>1&&
 (ts.isIdentifier(n.expression)&&n.expression.text==='t'||ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='t')){
 const [key,option]=n.arguments;if(isStr(key)){
 if(isStr(option))apply(option,key.text);
 else if(ts.isObjectLiteralExpression(option))for(const prop of option.properties){
 if(ts.isPropertyAssignment(prop)&&(ts.isIdentifier(prop.name)||ts.isStringLiteral(prop.name))&&prop.name.text==='defaultValue')apply(prop.initializer,key.text);
 }}}ts.forEachChild(n,visit);}visit(ast);
 let next=prev;for(const e of edits.sort((a,b)=>b.from-a.from))next=next.slice(0,e.from)+e.value+next.slice(e.to);
 if(edits.length){out.files++;out.replaced+=edits.length;if(write)fs.writeFileSync(file,next);}
 const final=write?ts.createSourceFile(file,next,ts.ScriptTarget.Latest,true,kind):ast;
 function residual(n){if((isStr(n)||ts.isJsxText(n)||ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n))&&han.test(n.text||'')){
 out.remaining.push({file,line:final.getLineAndCharacterOfPosition(n.getStart(final)).line+1,
 type:/\.test\.[jt]sx$/.test(file)?'test':ts.isJsxText(n)?'jsx':'literal',
 sample:(n.text||'').replace(/\s+/g,' ').slice(0,70)});}ts.forEachChild(n,residual);}residual(final);out.scanned++;
}
for(const f of walk('src'))if(!f.includes(path.sep+'locales'+path.sep)&&/\.[jt]sx?$/.test(f))examine(f);
for(const dir of ['src-tauri/src','crates/cockpit-core/src'])for(const f of walk(dir))if(f.endsWith('.rs')){
 fs.readFileSync(f,'utf8').split(/\r?\n/).forEach((line,i)=>{if(!han.test(line))return;
 if(/^\s*(\/\/|\/\*|\*)/.test(line)){out.comments++;return;}
 out.remaining.push({file:f,line:i+1,type:'rust-review',sample:line.trim().slice(0,70)});});out.scanned++;
}
if(write){const totals={};for(const x of out.remaining)totals[x.type]=(totals[x.type]||0)+1;
 const report=['# Rà soát chuỗi tiếng Trung trong mã nguồn','',
 'Đây là quét tĩnh; không tự ý thay đổi chuỗi giao thức, kiểm tra lỗi, URL và dữ liệu thử nghiệm.','',
 'Tệp mã nguồn: '+out.scanned,'Tệp fallback có thể Việt hóa: '+out.files,
 'Lời dự phòng đã Việt hóa: '+out.replaced,'Lời dự phòng cần kiểm tra thủ công: '+out.pending.length,
 'Vị trí chuỗi chữ Hán còn lại: '+out.remaining.length,'Dòng chú thích Rust có chữ Hán: '+out.comments,'',
 '## Phân loại',...Object.entries(totals).map(x=>x[0]+': '+x[1]),'',
 '## Fallback chưa chuyển',...out.pending.map(x=>x.file+' - '+x.key),'',
 '## Ví dụ cần đánh giá thủ công',...out.remaining.filter(x=>x.type!=='test').slice(0,300)
 .map(x=>x.file+':'+x.line+' ['+x.type+'] '+x.sample),
 '','Không thay key, API, token, câu lệnh, đường dẫn và placeholder {{...}}.'].join('\n');
 fs.mkdirSync('docs/i18n',{recursive:true});fs.writeFileSync('docs/i18n/chinese-audit.md',report);
}
console.log(JSON.stringify({scanned:out.scanned,files:out.files,replaced:out.replaced,pending:out.pending.length,remaining:out.remaining.length,comments:out.comments}));
if(process.argv.includes('--verbose')&&out.pending.length){
 console.log('UNRESOLVED_FALLBACKS_BEGIN');
 for(const p of out.pending)console.log(p.file+' - '+p.key);
 console.log('UNRESOLVED_FALLBACKS_END');
}

if(check&&(out.files||out.pending.length)){
 console.error('Vietnamese fallback check failed: '+out.files+' files can be translated, '+out.pending.length+' fallbacks still require manual review.');
 process.exitCode=1;
}
