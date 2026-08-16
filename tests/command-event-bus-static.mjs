import fs from 'node:fs';
import assert from 'node:assert/strict';

const bus=fs.readFileSync('command-event-bus.js','utf8');
const adapters=fs.readFileSync('command-adapters.js','utf8');
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
assert(bus.includes('Handlers receive the original payload'),'redaction must not mutate command handler input');

for(const command of [
  'navigation.home.open','navigation.training.open','training.incident.open','training.diagnostic.run',
  'training.hypothesis.commit','training.production.execute','npc.advice.request','npc.advice.close',
  'team.open','model.lab.open','data.evals.open'
])assert(adapters.includes(command),`starter command catalog missing ${command}`);
assert(adapters.includes('runtime.command-adapters.ready'),'starter command catalog readiness event missing');

const identityPos=html.indexOf('state-identity.js');
const corePos=html.indexOf('frontier-lab.js');
const busPos=html.indexOf('command-event-bus.js');
const nextPos=html.indexOf('runtime-compat.js');
const adapterPos=html.indexOf('command-adapters.js');
const responsivePos=html.indexOf('responsive-visual-sweep.js');
assert(identityPos>=0&&corePos>identityPos&&busPos>corePos&&nextPos>busPos,'command bus must load after core state and before feature modules');
assert(adapterPos>responsivePos,'command adapters must load after legacy feature globals exist');
assert(sw.includes("CACHE='frontier-lab-v29'"),'P5.0.2 must advance PWA cache to v29');
assert(sw.includes('./command-event-bus.js'),'PWA cache missing command event bus');
assert(sw.includes('./command-adapters.js'),'PWA cache missing command adapters');

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

console.log(JSON.stringify({commandEventBusStatic:'pass',schemaVersion:1,maxEvents:600,starterCommands:11,releaseBlocker:true},null,2));
