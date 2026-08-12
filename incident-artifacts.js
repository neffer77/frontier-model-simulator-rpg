// Phase 4C.2 — Incident-linked artifacts, config diffs, traces, checkpoints, and team sharing
const ARTIFACT_V2_VERSION=2;
function ensureArtifactV2(){
  ensureArtifactLab();
  const a=state.artifactLab;
  a.version=Math.max(a.version||1,ARTIFACT_V2_VERSION);
  a.baselineConfig ||= {...parseArtifactConfig()};
  a.runHistory ||= [];
  a.checkpoints ||= [
    {id:'ckpt-440500',step:440500,status:'healthy',loss:1.992,shard:'018'},
    {id:'ckpt-441000',step:441000,status:'healthy',loss:1.958,shard:'018'},
    {id:'ckpt-441190',step:441190,status:'healthy',loss:1.948,shard:'019'},
    {id:'ckpt-441198',step:441198,status:a.challengeId==='nan'?'suspect':'healthy',loss:a.challengeId==='nan'?null:1.946,shard:'019'}
  ];
  a.selectedCheckpoint ||= 'ckpt-441190';
  a.sharedArtifacts ||= {};
  a.rankFocus ??= 0;
  if(state.selectedIncident && state.selectedIncident!==a.challengeId){
    a.challengeId=state.selectedIncident;
    a.challengeStatus='open';
    a.lastGrade=null;
  }
}
function artifactIncidentSync(){ensureArtifactV2();if(state.selectedIncident)state.artifactLab.challengeId=state.selectedIncident}
const artifactV2Open=artifactOpen;
artifactOpen=function(){artifactIncidentSync();return artifactV2Open()};
function configDiff(){const before=state.artifactLab.appliedConfig||state.artifactLab.baselineConfig||{},after=parseArtifactConfig();return Object.keys({...before,...after}).map(k=>({key:k,before:before[k],after:after[k],changed:String(before[k])!==String(after[k])})).filter(x=>x.changed)}
function artifactRunBenchmark(){ensureArtifactV2();const c=parseArtifactConfig(),m=artifactMetrics(),id=state.artifactLab.challengeId;const baseline={mfu:id==='bubble'?31.4:51.9,pipeIdle:id==='bubble'?38.2:12.0,ttft:id==='ttft'?2840:690,loss:id==='nan'?null:1.946};const after={mfu:m.mfu,pipeIdle:m.pipeIdle,ttft:m.ttft,loss:m.loss.at(-1)};const run={id:`RUN-${String(state.artifactLab.runHistory.length+1).padStart(3,'0')}`,day:state.day,config:{...c},baseline,after,diff:configDiff(),challengeId:id};state.artifactLab.runHistory.unshift(run);state.artifactLab.appliedConfig={...c};state.artifactLab.runs=(state.artifactLab.runs||0)+1;if(typeof orgEvent==='function')orgEvent('engineering.before_after_run',{runId:run.id,diff:run.diff,after});save();render()}
function artifactRankTrace(rank){ensureArtifactV2();state.artifactLab.rankFocus=rank;const stage=Math.floor(rank/8)%8,local=rank%8,id=state.artifactLab.challengeId;const idle=id==='bubble'?Math.max(8,42-stage*3+(local%3)*2):10+(rank%4);const compute=100-idle;return {rank,stage,tpRank:local,dpReplica:Math.floor(rank/64),compute,idle,send:1.2+(rank%5)*.2,recv:1.1+(rank%4)*.2}}
function artifactCheckpointAction(action,id){ensureArtifactV2();const a=state.artifactLab,cp=a.checkpoints.find(x=>x.id===id);if(!cp)return;if(action==='select')a.selectedCheckpoint=id;else if(action==='verify'){cp.verified=true;cp.status=cp.status==='suspect'?'corrupt':'healthy';if(typeof orgEvent==='function')orgEvent('checkpoint.verified',{checkpointId:id,status:cp.status})}else if(action==='restore'){const bad=a.challengeId==='nan'&&cp.status==='corrupt';a.terminal.push({kind:bad?'err':'ok',text:bad?`restore ${id}: replay failed at shard ${cp.shard}`:`restore ${id}: checkpoint loaded; deterministic replay ready`});if(!bad){a.selectedCheckpoint=id;a.recovery={checkpointId:id,status:'restored',day:state.day};if(typeof orgEvent==='function')orgEvent('checkpoint.restored',{checkpointId:id})}}save();render()}
function artifactShareWithNpc(employeeId,artifactId){ensureArtifactV2();const a=state.artifactLab;a.sharedArtifacts[employeeId] ||= [];if(!a.sharedArtifacts[employeeId].includes(artifactId))a.sharedArtifacts[employeeId].push(artifactId);if(typeof shareEvidenceWithNpc==='function'&&state.selectedIncident){try{shareEvidenceWithNpc(employeeId,artifactEvidenceMap(artifactId))}catch(e){}}if(typeof orgEvent==='function')orgEvent('engineering.artifact_shared',{employeeId,artifactId});save();render()}
function artifactEvidenceMap(id){const map={trainer:'trainer_log',nccl:'nccl_trace',metrics:'metrics',data:'data_replay',evals:'eval_slice',checkpoint:'checkpoint_replay',profiler:'distributed_profiler'};return map[id]||id}
function renderArtifactShareBar(artifactId){if(!state.selectedIncident||!state.npcEmployees?.length)return'';return `<div class="artifact-share"><span>Share evidence</span>${state.npcEmployees.slice(0,8).map(e=>`<button onclick="artifactShareWithNpc('${e.id}','${artifactId}')">${esc(e.name.split(' ')[0])}</button>`).join('')}</div>`}
function artifactDiffPanel(){const d=configDiff();return `<section class="artifact-card"><div class="eyebrow">CONFIG DIFF</div><h3>Proposed train.yaml changes</h3>${d.length?d.map(x=>`<div class="config-diff"><b>${esc(x.key)}</b><span>${esc(String(x.before))}</span><i>→</i><strong>${esc(String(x.after))}</strong></div>`).join(''):'<p>No config changes from the current baseline.</p>'}<button onclick="artifactRunBenchmark()">Run before/after benchmark</button></section>`}
function artifactRunHistoryPanel(){const runs=state.artifactLab.runHistory||[];return `<section class="artifact-card"><div class="eyebrow">CONTROLLED RUNS</div><h3>Before / after results</h3>${runs.length?runs.slice(0,4).map(r=>`<div class="run-result"><b>${r.id}</b><span>MFU ${r.baseline.mfu}% → ${r.after.mfu}%</span><span>idle ${r.baseline.pipeIdle}% → ${r.after.pipeIdle}%</span><span>TTFT ${r.baseline.ttft}ms → ${r.after.ttft}ms</span></div>`).join(''):'<p>No comparison runs yet.</p>'}</section>`}
function artifactTracePanel(){const r=artifactRankTrace(state.artifactLab.rankFocus||0);return `<section class="artifact-card wide"><div class="eyebrow">RANK / STAGE TRACE</div><div class="trace-head"><h3>Rank ${r.rank} · stage ${r.stage} · TP ${r.tpRank} · DP replica ${r.dpReplica}</h3><input type="range" min="0" max="255" value="${r.rank}" oninput="artifactRankTrace(Number(this.value));state.artifactLab.rankFocus=Number(this.value);render()"/></div><div class="trace-bars"><div style="width:${r.compute}%">compute ${r.compute}%</div><i style="width:${r.idle}%">idle ${r.idle}%</i></div><p>send p95 ${r.send.toFixed(1)}ms · recv p95 ${r.recv.toFixed(1)}ms</p>${renderArtifactShareBar('profiler')}</section>`}
function artifactCheckpointPanel(){ensureArtifactV2();return `<section class="artifact-card wide"><div class="eyebrow">CHECKPOINT / REPLAY</div><h3>Recovery timeline</h3><div class="checkpoint-list">${state.artifactLab.checkpoints.map(cp=>`<div class="checkpoint ${cp.status}"><div><b>${cp.id}</b><span>step ${cp.step} · shard ${cp.shard} · ${cp.status}</span></div><button onclick="artifactCheckpointAction('verify','${cp.id}')">Verify</button><button onclick="artifactCheckpointAction('restore','${cp.id}')">Restore + replay</button></div>`).join('')}</div>${state.artifactLab.recovery?`<p class="ok-note">Recovered from ${esc(state.artifactLab.recovery.checkpointId)}.</p>`:''}${renderArtifactShareBar('checkpoint')}</section>`}
const artifactV2Metrics=artifactMetricsView;
artifactMetricsView=function(){ensureArtifactV2();return `<div class="artifact-grid">${artifactV2Metrics().replace(/^<div class="artifact-grid">|<\/div>$/g,'')}${artifactTracePanel()}${artifactDiffPanel()}${artifactRunHistoryPanel()}</div>`};
const artifactV2Network=artifactNetworkView;
artifactNetworkView=function(){ensureArtifactV2();return artifactV2Network().replace('</section>',`${renderArtifactShareBar('nccl')}</section>`)};
const artifactV2Data=artifactDataView;
artifactDataView=function(){ensureArtifactV2();return artifactV2Data().replace('</div>',`${renderArtifactShareBar(state.artifactLab.challengeId==='contam'?'data':'evals')}</div>`)};
const artifactV2Workspace=artifactWorkspace;
artifactWorkspace=function(){ensureArtifactV2();return `${artifactV2Workspace()}<div class="artifact-grid artifact-extra">${artifactCheckpointPanel()}</div>`};
const artifactV2Render=renderArtifactLab;
renderArtifactLab=function(){ensureArtifactV2();return artifactV2Render()};
render();
