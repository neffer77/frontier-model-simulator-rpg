// Item 9 — canonical simulation balance, resource pacing, and playtest telemetry.
(function(){
  const g=window;
  const CFG=Object.freeze({
    version:1,
    incidentCooldownDays:5,
    maxIncidentsPerRun:2,
    computePerCapexM:45000,
    infraComputeGrants:{2:15000,3:100000,4:600000,5:3000000,6:7000000},
    strategicComputeGrants:{gpu:400000,cloud:125000},
    targets:{firstModel:[18,50],firstHire:[20,58],graduated:[22,65]}
  });
  g.BALANCE_PACING=CFG;

  function ensure(){
    state.balancePacing ||= {version:CFG.version,lastEconomicDay:state.day||1,infraComputeGranted:[],capexGrantKeys:[],strategicGrantKeys:[],milestones:{},stats:{operatingBurnM:0,computeGranted:0,runsLaunched:0,runsCompleted:0,incidentsResolved:0,wrongIncidentChoices:0,hires:0,infraUpgrades:0},lastRunwayBand:null};
    const b=state.balancePacing;b.version=CFG.version;b.infraComputeGranted ||= [];b.capexGrantKeys ||= [];b.strategicGrantKeys ||= [];b.milestones ||= {};b.stats ||= {};
    for(const [k,v] of Object.entries({operatingBurnM:0,computeGranted:0,runsLaunched:0,runsCompleted:0,incidentsResolved:0,wrongIncidentChoices:0,hires:0,infraUpgrades:0}))if(b.stats[k]==null)b.stats[k]=v;
    if(b.lastEconomicDay==null)b.lastEconomicDay=state.day||1;
    inferMilestones();return b;
  }
  function inferMilestones(){
    const b=state.balancePacing;if(!b)return;const m=b.milestones;
    if(state.started&&m.foundedDay==null)m.foundedDay=1;
    if(m.firstModelDay==null&&state.models?.length)m.firstModelDay=state.models[0].day||state.day||1;
    if(m.firstHireDay==null){const c=state.hiring?.candidates?.find?.(x=>x.status==='hired');if(c)m.firstHireDay=c.offer?.day||state.day||1;else if((state.npcEmployees||[]).some(e=>String(e.id||'').startsWith('hire-')))m.firstHireDay=state.day||1;}
    if(m.graduatedDay==null&&state.campaign?.graduated)m.graduatedDay=state.day||1;
  }
  function headcount(){return Math.max(Number(state.employees||0),(state.npcEmployees||[]).length)}
  function monthlyBurn(){
    const contracts=state.roadmapPressure?.contracts?.length||0,debt=state.financeStrategy?.monthlyDebtServiceM||0;
    return Number((1+headcount()*.03+Math.max(0,(state.infra||1)-1)*.10+contracts*.04+debt).toFixed(3));
  }
  function runwayMonths(){return Number(((state.cashM||0)/Math.max(.01,monthlyBurn())).toFixed(1))}
  function runwayBand(r=runwayMonths()){return r<1?'critical':r<2?'low':r<4?'watch':'healthy'}
  g.balanceMonthlyBurn=monthlyBurn;g.balanceRunwayMonths=runwayMonths;

  function chargeOperatingBurn(){
    if(!state?.started)return;const b=ensure(),now=state.day||1,last=b.lastEconomicDay??now;if(now<=last)return;
    const days=now-last,burn=Number((monthlyBurn()*days/30).toFixed(3));state.cashM=Math.max(0,Number(((state.cashM||0)-burn).toFixed(3)));b.stats.operatingBurnM=Number((b.stats.operatingBurnM+burn).toFixed(3));b.lastEconomicDay=now;
    const band=runwayBand();if(b.lastRunwayBand&&band!==b.lastRunwayBand&&['low','critical'].includes(band))log?.(`⚠ Runway is now ${runwayMonths()} months at roughly $${monthlyBurn().toFixed(2)}M/month operating burn.`);b.lastRunwayBand=band;
    save();
  }
  function grantCompute(key,amount,reason,bucket='capexGrantKeys'){
    const b=ensure();if(!amount||b[bucket]?.includes(key))return 0;b[bucket].push(key);state.compute=(state.compute||0)+Math.round(amount);b.stats.computeGranted+=Math.round(amount);log?.(`⚡ ${reason}: +${fmt(Math.round(amount),0)} H100h available.`);save();return Math.round(amount)
  }
  function nextTier(){
    if(typeof MODEL_TIERS==='undefined')return null;const done=new Set((state.models||[]).map(m=>MODEL_TIERS.find(t=>t.name===m.tier)?.id).filter(Boolean));return MODEL_TIERS.find(t=>!done.has(t.id))||MODEL_TIERS.at(-1)
  }
  function paceStatus(name,day){const range=CFG.targets[name];if(!range||day==null)return 'unmeasured';return day<range[0]?'fast':day>range[1]?'slow':'target'}
  function report(){
    const b=ensure(),m=b.milestones;return {version:CFG.version,day:state.day||1,resources:{cashM:Number((state.cashM||0).toFixed(2)),computeH100h:Math.round(state.compute||0),monthlyBurnM:monthlyBurn(),runwayMonths:runwayMonths(),research:state.research||0,reputation:state.reputation||0},milestones:{...m},pace:{firstModel:paceStatus('firstModel',m.firstModelDay),firstHire:paceStatus('firstHire',m.firstHireDay),graduated:paceStatus('graduated',m.graduatedDay)},stats:{...b.stats},campaign:g.campaignCurrentStage?.().id||null,openDebt:state.techDebt?.items?.filter(x=>x.status==='open').length||0};
  }
  g.balanceReport=report;

  // Infrastructure now represents actual accelerator access, not only a UI/eligibility gate.
  if(typeof g.upgradeInfra==='function'){
    const base=g.upgradeInfra;g.upgradeInfra=function(){const before=state.infra||1,out=base();const after=state.infra||1;if(after>before){const b=ensure();b.stats.infraUpgrades++;const amount=CFG.infraComputeGrants[after]||0;if(amount)grantCompute(`infra-${after}`,amount,`${typeof infraName==='function'?infraName():'Infrastructure'} capacity came online`,'infraComputeGranted');if(amount)render()}return out};
  }
  // Quarterly compute allocation now buys usable H100-hours as well as an abstract capacity score.
  if(typeof g.approveQuarterPlan==='function'){
    const base=g.approveQuarterPlan;g.approveQuarterPlan=function(){const p=state.quarterlyBoard?.plan,before=p?.status,quarter=p?.quarter,computeM=Number(p?.allocations?.compute||0),out=base();if(before==='active'&&state.quarterlyBoard?.plan?.status==='funded'&&computeM>0){const efficiency=1+Math.max(0,(state.infra||1)-1)*.15,amount=Math.round(computeM*CFG.computePerCapexM*efficiency);if(grantCompute(`q${quarter}-compute`,amount,`Q${quarter} compute allocation converted into accelerator time`))render()}return out};
  }
  // Strategic GPU/cloud deals also replenish the real compute pool.
  if(typeof g.executeStrategicDeal==='function'){
    const base=g.executeStrategicDeal;g.executeStrategicDeal=function(type){const before=state.financeStrategy?.partnerships?.length||0,out=base(type),after=state.financeStrategy?.partnerships?.length||0;if(after>before&&CFG.strategicComputeGrants[type]){const rec=state.financeStrategy.partnerships.at(-1),key=`deal-${type}-${rec?.day||state.day}-${after}`;if(grantCompute(key,CFG.strategicComputeGrants[type],`${rec?.name||type} reserved usable compute`,'strategicGrantKeys'))render()}return out};
  }

  if(typeof g.launchTier==='function'){
    const base=g.launchTier;g.launchTier=function(id){const had=!!state.activeRun,out=base(id);if(!had&&state.activeRun){const b=ensure();b.stats.runsLaunched++;b.milestones.firstRunDay ??= state.day||1;save()}return out};
  }
  if(typeof g.completeRun==='function'){
    const base=g.completeRun;g.completeRun=function(){const before=state.models?.length||0,out=base();if((state.models?.length||0)>before){const b=ensure();b.stats.runsCompleted++;b.milestones.firstModelDay ??= state.models[0]?.day||state.day||1;save()}return out};
  }
  if(typeof g.hireCandidate==='function'){
    const base=g.hireCandidate;g.hireCandidate=function(c){const before=(state.npcEmployees||[]).length,out=base(c);if((state.npcEmployees||[]).length>before){const b=ensure();b.stats.hires++;b.milestones.firstHireDay ??= state.day||1;save()}return out};
  }
  if(typeof g.campaignChoosePriority==='function'){
    const base=g.campaignChoosePriority;g.campaignChoosePriority=function(choice){const out=base(choice),b=ensure();if(state.campaign?.graduated)b.milestones.graduatedDay ??= state.day||1;save();return out};
  }

  // Space incidents so failures stay meaningful instead of becoming click-tax. The first
  // guided incident still fires; after a resolution, ordinary/debt incidents cool down.
  if(typeof g.solveIncident==='function'){
    const base=g.solveIncident;g.solveIncident=function(id){const before=state.activeRun?.incident,out=base(id),after=state.activeRun?.incident,b=ensure();if(before&&after!==before){b.lastResolvedIncidentDay=state.day||1;b.stats.incidentsResolved++;if(state.activeRun)state.activeRun.balanceIncidentCount=(state.activeRun.balanceIncidentCount||0)+1}else if(before&&after===before)b.stats.wrongIncidentChoices++;save();return out};
  }
  if(typeof g.advanceRun==='function'){
    const base=g.advanceRun;g.advanceRun=function(){const b=ensure(),r=state.activeRun,maxed=(r?.balanceIncidentCount||0)>=CFG.maxIncidentsPerRun,cool=b.lastResolvedIncidentDay!=null&&(state.day||1)-b.lastResolvedIncidentDay<CFG.incidentCooldownDays,suppress=!!r&&!r.incident&&(maxed||cool);if(!suppress)return base();
      const originalDebt=g.maybeTriggerDebtIncident,originalRandom=Math.random;let calls=0;
      if(typeof originalDebt==='function')g.maybeTriggerDebtIncident=()=>false;
      Math.random=()=>{calls++;return calls===3?.99:originalRandom()};
      try{return base()}finally{Math.random=originalRandom;if(typeof originalDebt==='function')g.maybeTriggerDebtIncident=originalDebt}
    };
  }

  function renderTempo(){
    document.querySelector('.balance-tempo')?.remove();if(!state?.started)return;const target=nextTier(),r=report();const host=document.querySelector('.campaign-progress')||document.querySelector('.gameplay-guidance');if(!host)return;let targetText='Frontier scale reached';if(target){let physics=null;try{physics=trainingPhysics(target)}catch{}targetText=`${target.name}: $${target.costM.toFixed(2)}M · ${fmt(physics?.gpuHours||0,0)} H100h`}
    const el=document.createElement('aside');el.className=`balance-tempo runway-${runwayBand(r.resources.runwayMonths)}`;el.innerHTML=`<div><span>LAB TEMPO</span><b>${r.resources.runwayMonths} mo runway</b><small>$${r.resources.monthlyBurnM.toFixed(2)}M/mo burn</small></div><div><span>COMPUTE</span><b>${fmt(r.resources.computeH100h,0)} H100h</b><small>${targetText}</small></div><div><span>TECHNICAL PRESSURE</span><b>${r.openDebt} open debt</b><small>${r.stats.incidentsResolved} incidents resolved</small></div>`;host.insertAdjacentElement('afterend',el)
  }
  const baseRender=g.render;if(typeof baseRender==='function')g.render=function(){chargeOperatingBurn();const out=baseRender();requestAnimationFrame(renderTempo);return out};
  ensure();if(state.started)requestAnimationFrame(renderTempo);
})();
