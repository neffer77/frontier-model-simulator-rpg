import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// A browser may run the first replayability frame while the next script is still
// loading. Canonical registration must refresh that already-rendered founder UI.
for(const saved of [null,{difficulty:'frontier',archetype:'systems',challenge:'capital',perk:'none'}]){
  const frames=[],storage=new Map();let html='';
  if(saved)storage.set('frontier-run-setup-v1',JSON.stringify(saved));
  const launch={parentNode:{insertBefore(box){html=box.innerHTML}}};
  const card={querySelector:()=>launch};
  const c={console,state:{started:false},render(){},esc:String,requestAnimationFrame:fn=>frames.push(fn),
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    document:{querySelector:s=>s==='.founder-card'?card:s==='.replay-founder'&&html?{remove(){html=''}}:null,createElement:()=>({})}};
  c.window=c;vm.createContext(c);
  vm.runInContext(fs.readFileSync('replayability.js','utf8'),c,{filename:'replayability.js'});
  for(const fn of frames.splice(0))fn();
  assert(!html.includes('Balanced Lab'),'Fixture must reproduce the early pre-canonical frame');
  vm.runInContext(fs.readFileSync('replayability-canonical.js','utf8'),c,{filename:'replayability-canonical.js'});
  assert(html.includes('Balanced Lab'),'Canonical registration left the founder screen missing Balanced Lab');
  assert(html.indexOf('Balanced Lab')<html.indexOf('Research Lab'));
  assert.equal((html.match(/replaySetupSet\('archetype'/g)||[]).length,5);
  assert.deepEqual(JSON.parse(storage.get('frontier-run-setup-v1')),saved||{difficulty:'standard',archetype:'balanced',challenge:'generalist',perk:'none'});
  const selected=saved?.archetype||'balanced';
  assert(html.includes('class="replay-choice selected" onclick="replaySetupSet(\'archetype\',\''+selected+'\')"'));
}
console.log('Founder startup: canonical choice is visible after an early frame; saved setup preserved');
