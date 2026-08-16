import fs from 'node:fs';
import assert from 'node:assert/strict';

const bus=fs.readFileSync('command-event-bus.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const policy=JSON.parse(fs.readFileSync('release-gate-policy.json','utf8'));
const workflow=fs.readFileSync('.github/workflows/browser-qa.yml','utf8');

for(const marker of [
  'frontierRegisterCommand','frontierDispatchCommand','frontierEmitEvent','frontierSubscribeEvent',
  'frontierEventJournal','frontierCommandRegistry','frontierCommandEventSnapshot',
  'command.started','command.completed','command.failed','command.registered',
  'state.saved','ui.click','runtime.error','runtime.unhandledrejection','runtime.command-bus.ready',
  'correlationId','commandId','stateRevisionBefore','stateRevisionAfter','MAX_EVENTS=600','[REDACTED]'
])assert(bus.includes(marker),`command/event bus missing contract ${marker}`);

assert(bus.includes("window.addEventListener('frontier:state-saved'"),'P5.0.1 state-save bridge missing');
assert(bus.includes("document.addEventListener('click'"),'legacy click observability missing');
assert(bus.includes('sensitiveKey'),'event payload redaction missing');
assert(bus.includes('journal.length>MAX_EVENTS'),'bounded journal contract missing');
assert(bus.includes("pattern.endsWith('*')"),'prefix subscription contract missing');

const identityPos=html.indexOf('state-identity.js');
const corePos=html.indexOf('frontier-lab.js');
const busPos=html.indexOf('command-event-bus.js');
const nextPos=html.indexOf('runtime-compat.js');
assert(identityPos>=0&&corePos>identityPos&&busPos>corePos&&nextPos>busPos,'command bus must load after core state and before feature modules');
assert(sw.includes("CACHE='frontier-lab-v29'"),'P5.0.2 must advance PWA cache to v29');
assert(sw.includes('./command-event-bus.js'),'PWA cache missing command event bus');

assert.equal(pkg.scripts['test:command-bus'],'node tests/command-event-bus.mjs','browser command bus script missing');
assert.equal(pkg.scripts['test:command-bus-static'],'node tests/command-event-bus-static.mjs','static command bus script missing');
assert(pkg.scripts['test:static'].includes('tests/command-event-bus-static.mjs'),'command bus static contract must be cumulative');
assert(pkg.scripts['test:qa'].includes('tests/command-event-bus.mjs'),'command bus browser regression must be cumulative');

const gate=policy.gates.find(gate=>gate.id==='command-event-bus');
assert(gate,'release policy missing command-event-bus gate');
assert.equal(gate.severity,'blocker','command-event-bus must be release blocking');
assert.equal(gate.script,'test:command-bus','command-event-bus gate must run canonical browser test');
assert.equal(gate.evidence,'artifacts/command-event-bus/report.json','command-event-bus evidence path drifted');

assert(workflow.includes('artifacts/command-event-bus'),'browser QA must retain command/event bus evidence');
assert(workflow.includes('Command + Event Bus'),'browser QA summary must publish P5.0.2 evidence');

console.log(JSON.stringify({commandEventBusStatic:'pass',schemaVersion:1,maxEvents:600,releaseBlocker:true},null,2));
