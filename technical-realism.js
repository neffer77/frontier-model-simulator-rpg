// Item 10 — technical realism audit, source registry, and teaching-approximation labels.
(function(){
  const g=window;
  const VERSION=1;
  const EFFECTIVE_H100_FLOPS=3.3e14; // 330 TFLOP/s effective teaching baseline, not hardware peak.
  const SOURCES10={
    chinchilla:{title:'Training Compute-Optimal Large Language Models',url:'https://arxiv.org/abs/2203.15556'},
    switch:{title:'Switch Transformers',url:'https://arxiv.org/abs/2101.03961'},
    h100:{title:'NVIDIA H100 Tensor Core GPU specifications',url:'https://www.nvidia.com/en-us/data-center/h100/'},
    fsdp:{title:'PyTorch FullyShardedDataParallel',url:'https://docs.pytorch.org/docs/stable/fsdp.html'},
    torchrun:{title:'PyTorch torchrun / Elastic Launch',url:'https://docs.pytorch.org/docs/stable/elastic/run'},
    fp8:{title:'NVIDIA Transformer Engine FP8 primer',url:'https://docs.nvidia.com/deeplearning/transformer-engine/user-guide/examples/fp8_primer.html'},
    flash:{title:'FlashAttention',url:'https://arxiv.org/abs/2205.14135'},
    vllm:{title:'PagedAttention / vLLM',url:'https://arxiv.org/abs/2309.06180'},
    megatron:{title:'Megatron Core parallelism strategies',url:'https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/parallelism-guide.html'},
    dpo:{title:'Direct Preference Optimization',url:'https://arxiv.org/abs/2305.18290'},
    contam:{title:'Evaluation data contamination in LLMs',url:'https://arxiv.org/abs/2411.03923'},
    sre:{title:'Google SRE error-budget policy',url:'https://sre.google/workbook/error-budget-policy/'}
  };
  const AUDIT=[
    {domain:'Training compute',status:'approx',claim:'Dense pretraining uses a 6 × parameters × tokens teaching estimate.',note:'Useful for order-of-magnitude reasoning, not a kernel-level accounting. Architecture, sequence length, recomputation, optimizer work and implementation details matter.',sources:['chinchilla']},
    {domain:'Sparse MoE compute',status:'corrected',claim:'MoE compute is based on active parameters rather than total stored parameters.',note:'Sparse experts avoid activating the full parameter set for each token. The simulator now uses active parameters as a proxy, while omitting routing and communication overhead.',sources:['switch','chinchilla']},
    {domain:'H100-hours',status:'approx',claim:'The simulator converts FLOPs to H100-hours with a 330 TFLOP/s effective baseline.',note:'This is deliberately an effective-throughput assumption, not NVIDIA peak throughput. Real achieved throughput depends on precision, sparsity, MFU, topology and workload.',sources:['h100','megatron']},
    {domain:'FSDP',status:'grounded',claim:'FULL_SHARD shards parameters, gradients and optimizer state and uses collectives to materialize/synchronize model state.',note:'Real deployments also depend on wrapping policy, device mesh, mixed precision and checkpoint strategy.',sources:['fsdp']},
    {domain:'Distributed launcher',status:'approx',claim:'The code lab models multi-process rank behavior and scheduler-launched torchrun jobs.',note:'Rank concepts are grounded, but the displayed Slurm/Kubernetes commands are illustrative. Real multi-node torchrun requires consistent node count plus rendezvous/job configuration supplied directly or through the scheduler environment.',sources:['torchrun']},
    {domain:'FP8',status:'grounded',claim:'FP8 training uses formats/scaling recipes selectively; not every operation is safe in FP8.',note:'FP8 is not technically dependent on FlashAttention. Any dependency shown in the research tree is a lab-progression prerequisite.',sources:['fp8']},
    {domain:'FlashAttention',status:'grounded',claim:'FlashAttention is exact attention reorganized to reduce GPU-memory traffic.',note:'It is useful for efficiency and long contexts but is not itself a mandatory prerequisite for FP8 or long-context research.',sources:['flash']},
    {domain:'Parallelism',status:'grounded',claim:'DP, TP, PP, CP/EP and sharded data parallelism solve different memory/throughput constraints and can be composed.',note:'The game research graph simplifies this into unlocks; those unlock edges are organizational progression, not universal technical dependencies.',sources:['megatron']},
    {domain:'Architecture economics',status:'game',claim:'MoE, dense, long-context and FP8 architectures have different operational tradeoffs.',note:'The direction of several tradeoffs is plausible, but lock-in, reliability, migration days, cost multipliers and risk percentages are synthetic company-game parameters.',sources:['megatron','switch','fp8']},
    {domain:'Paged KV cache',status:'grounded',claim:'PagedAttention addresses KV-cache fragmentation and enables more efficient memory sharing/serving throughput.',note:'Serving performance still depends on batching, scheduling, prefill/decode mix and hardware.',sources:['vllm']},
    {domain:'DPO',status:'grounded',claim:'DPO optimizes preference data without an explicit reward-model + RL training loop.',note:'Beta/reference-policy behavior follows the standard objective, but exact behavior is implementation and dataset dependent.',sources:['dpo']},
    {domain:'Eval contamination',status:'grounded',claim:'Train/eval overlap can inflate benchmark performance and should be measured rather than ignored.',note:'The simulator’s overlap percentages and 5% quarantine threshold are synthetic lab policy, not an industry standard.',sources:['contam']},
    {domain:'SLOs / error budgets',status:'grounded',claim:'Error budgets are used to balance reliability and release velocity.',note:'The simulator’s concrete SLO targets and budget burn are game values, not prescribed production targets.',sources:['sre']},
    {domain:'Incidents',status:'synthetic',claim:'Incident telemetry and answer choices are constructed scenarios.',note:'They are designed to teach evidence-based diagnosis; the exact metric values are not claims about a specific real incident.',sources:[]},
    {domain:'Capability / eval scores',status:'synthetic',claim:'Capability index, migrated model scores, data-mixture projections and experiment deltas are simulated.',note:'They should be read as gameplay feedback, not empirical benchmark predictions.',sources:[]},
    {domain:'Company finance',status:'game',claim:'Funding thresholds, valuation, burn, dilution and compute grants are gameplay abstractions.',note:'They create strategic pressure but are not financial forecasts or typical financing terms.',sources:[]},
    {domain:'Board governance',status:'game',claim:'Board votes, control risk, vetoes and CEO confidence are compressed governance mechanics.',note:'Vote probabilities, fiduciary posture effects and founder-control scores are fictional game rules, not legal advice or a model of any specific company charter.',sources:[]},
    {domain:'Policy / regulation',status:'game',claim:'Jurisdictions, export exposure and access-policy outcomes are fictional strategic scenarios.',note:'Atlantic Union, Pacific Federation and Growth Bloc are invented jurisdictions. Scores and outcomes do not encode current law, export-control rules or compliance requirements.',sources:[]},
    {domain:'Public communications',status:'game',claim:'Media sentiment, public trust, transparency and testimony outcomes are game state.',note:'The direction of reputation tradeoffs is narrative simulation; response effects and percentages are not empirical communications research.',sources:[]},
    {domain:'Dedicated AI safety / security',status:'gap',claim:'The current live main runtime does not load dedicated AI-safety or security gameplay modules.',note:'This audit does not claim coverage for systems that are absent from the live runtime. Those modules require a separate fact-check when they are integrated.',sources:[]}
  ];
  g.REALISM_SOURCES=SOURCES10;g.REALISM_AUDIT=AUDIT;

  function ensure(){state.realismAudit ||= {version:VERSION,moeMigrationDone:false};state.realismAudit.version=VERSION;return state.realismAudit}
  const basePhysics=g.trainingPhysics;
  if(typeof basePhysics==='function')g.trainingPhysics=function(t){
    const computeParamsB=Number(t?.activeB||t?.paramsB||0),tokens=Number(t?.tokensB||0)*1e9,params=computeParamsB*1e9;
    const flops=6*params*tokens;
    const baseGpuHours=Math.ceil(flops/(EFFECTIVE_H100_FLOPS*3600));
    const techBoost=(hasTech('flash')?0.08:0)+(hasTech('fp8')?0.14:0)+(hasTech('3d')?0.05:0);
    const gpuHours=Math.ceil(baseGpuHours/(1+techBoost));
    const target=(t?.paramsB||0)<2?262144:(t?.paramsB||0)<10?1048576:4194304;
    const batch=Math.max(262144,Math.round(target/8192)*8192),steps=Math.ceil(tokens/batch);
    return {flops,gpuHours,batch,steps,tokens:steps*batch,techBoost,computeParamsB,totalParamsB:t?.paramsB||0,activeParamsB:t?.activeB||null,effectiveH100TFLOPS:EFFECTIVE_H100_FLOPS/1e12,flopsMethod:t?.activeB?'6 × active-parameter proxy × tokens':'6 × parameters × tokens',teachingApproximation:true};
  };

  function migrateActiveMoe(){
    const a=ensure(),r=state.activeRun;if(a.moeMigrationDone||!r||r.tier!=='moe')return;a.moeMigrationDone=true;
    const t=typeof MODEL_TIERS!=='undefined'?MODEL_TIERS.find(x=>x.id==='moe'):null;if(!t)return;const old=Number(r.physics?.gpuHours||0),fresh=g.trainingPhysics(t);r.physics=fresh;
    if(old>fresh.gpuHours){const refund=old-fresh.gpuHours;state.compute=(state.compute||0)+refund;log?.(`⚙ Realism migration: sparse-MoE compute now uses active parameters; refunded ${fmt(refund,0)} simulated H100h.`)}
    save?.();
  }

  function sourceLinks(keys){return (keys||[]).map(k=>{const s=SOURCES10[k];return s?`<a href="${s.url}" target="_blank" rel="noopener">${s.title}</a>`:''}).join('')}
  function realismPage(){
    const counts=AUDIT.reduce((m,x)=>(m[x.status]=(m[x.status]||0)+1,m),{});
    return `<div class="realism-shell"><header class="realism-head"><div><div class="eyebrow">ITEM 10 · FACT-CHECKED SIMULATION</div><h1>Technical Realism Audit</h1><p>This simulator separates primary-source-grounded concepts from teaching approximations, synthetic scenarios, deliberate gameplay abstractions, and known coverage gaps.</p></div><button onclick="realismClose()">Return to company</button></header><section class="realism-summary"><div><span>Grounded</span><b>${counts.grounded||0}</b></div><div><span>Corrected</span><b>${counts.corrected||0}</b></div><div><span>Approximations</span><b>${counts.approx||0}</b></div><div><span>Synthetic / game</span><b>${(counts.synthetic||0)+(counts.game||0)}</b></div><div><span>Coverage gaps</span><b>${counts.gap||0}</b></div></section><main class="realism-grid">${AUDIT.map(x=>`<article class="realism-card ${x.status}"><header><span>${x.domain}</span><b>${x.status}</b></header><h3>${x.claim}</h3><p>${x.note}</p>${x.sources?.length?`<footer>${sourceLinks(x.sources)}</footer>`:''}</article>`).join('')}</main><section class="realism-method"><h2>Interpretation rule</h2><p><b>Grounded</b> means the concept matches the cited source. <b>Approximation</b> means the direction/formula is useful but incomplete. <b>Synthetic</b> means the scenario or number was authored for gameplay. <b>Game</b> means the mechanic intentionally compresses organizational, legal or financial reality. <b>Gap</b> means the live runtime does not currently contain the system needed for a meaningful audit.</p></section></div>`
  }
  g.realismOpen=()=>{state.view='realism';save();render()};
  g.realismClose=()=>{state.view='company';save();render()};

  function note(host,text){if(!host||host.querySelector(':scope > .realism-inline-note'))return;const n=document.createElement('div');n.className='realism-inline-note';n.textContent=text;host.appendChild(n)}
  function annotate(){
    if(!state?.started||state.view==='realism')return;
    document.querySelectorAll('.tech-node small').forEach(s=>{if(s.textContent.trim().startsWith('Requires '))s.textContent=s.textContent.replace(/^Requires /,'Lab prerequisite: ')});
    note(document.querySelector('.tech.panel'),'Research-tree edges are lab progression prerequisites, not claims that one technology universally requires another.');
    const moe=[...document.querySelectorAll('.tier')].find(x=>x.textContent.includes('8×22B MoE'));if(moe){const b=moe.querySelector('b');if(b)b.textContent='176B total · 44B active/token';note(moe,'Sparse-MoE compute uses an active-parameter proxy; routing/communication overhead remains simplified.')}
    const sim=document.querySelector('.sim-note');if(sim&&state.activeRun){const p=state.activeRun.physics||{};sim.textContent=`Training FLOPs: ${p.flopsMethod||'6 × parameters × tokens'}; H100h uses ${p.effectiveH100TFLOPS||330} TFLOP/s effective throughput. Teaching approximation, not peak hardware throughput.`}
    document.querySelectorAll('.de-card').forEach(card=>{const text=card.textContent;if(/Projected capability pressure/i.test(text))note(card,'Synthetic projection: these score responses are gameplay curves, not empirical scaling laws.');if(/DEDUP ENGINEERING/i.test(text))note(card,'Dedup percentages and rare-pattern-loss curves are synthetic; real thresholds must be calibrated to the corpus and matching method.');if(/SLICE-LEVEL EVALS/i.test(text))note(card,'Overlap values are simulated. The 5% quarantine cutoff is a lab policy for the game, not an industry-standard contamination threshold.')});
    document.querySelectorAll('.lab-panel').forEach(card=>{if(/LATEST EVAL/i.test(card.textContent))note(card,'Historical/migrated capability scores are synthetic unless a specific recorded eval artifact says otherwise.');if(/EXPERIMENT NOTEBOOK/i.test(card.textContent))note(card,'Experiment outcomes and deltas are simulated gameplay results; use them to practice experimental reasoning, not as real performance estimates.')});
    note(document.querySelector('.code-shell'),'The debugging concepts are grounded, but tests, rank logs, faults and launcher commands are deterministic teaching simulation. Real multi-node torchrun needs scheduler/rendezvous-specific configuration.');
    note(document.querySelector('.arch-shell'),'Architecture tradeoff directions are educationally plausible; lock-in, reliability, migration time, cash and risk multipliers are synthetic gameplay values.');
    document.querySelectorAll('.qb-shell,.fs-shell').forEach(card=>note(card,'Capital, valuation, runway and financing numbers are strategic gameplay abstractions rather than typical financing terms or forecasts.'));
    note(document.querySelector('.gv-shell'),'Board composition and control matter in real companies, but vote probabilities, founder-control risk, veto logic and fiduciary effects here are fictional governance mechanics—not legal advice.');
    note(document.querySelector('.policy-shell'),'All jurisdictions and policy coefficients on this screen are fictional. Do not treat this simulator as a statement of current law, export controls, licensing requirements or market-access rules.');
    note(document.querySelector('.cm-shell'),'Media, trust and testimony percentages are narrative gameplay variables rather than empirical predictions about communications outcomes.');
    document.querySelectorAll('.slo-shell').forEach(card=>note(card,'SLO/error-budget concepts are grounded in SRE practice; the specific targets and burn values here are game parameters.'));
    const shell=document.querySelector('.game-shell');if(shell&&!shell.querySelector('.realism-launch')){const b=document.createElement('button');b.className='realism-launch';b.onclick=g.realismOpen;b.innerHTML='<span>REALISM AUDIT</span><b>Primary sources + approximation labels</b><small>See what is grounded, synthetic, simplified, or not yet covered →</small>';shell.appendChild(b)}
  }

  const baseRender=g.render;
  if(typeof baseRender==='function')g.render=function(){ensure();migrateActiveMoe();if(state.view==='realism'){document.getElementById('app').innerHTML=realismPage();return}const out=baseRender();requestAnimationFrame(annotate);return out};
  ensure();migrateActiveMoe();requestAnimationFrame(annotate);
})();