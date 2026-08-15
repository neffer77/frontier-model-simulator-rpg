// P2-K — Problem Quality & Anti-Grind
// Makes the highest-reward diagnostic behavior track the highest-learning-value behavior.
const PROBLEM_QUALITY_VERSION=1;
const PROBLEM_QUALITY_REPEAT=[1,.72,.42,.20,.08];

function ensureProblemQualityState(){
  state.problemQuality ||= {version:PROBLEM_QUALITY_VERSION,attempts:{},concepts:{},history:[],qualitySolves:0,protectedSolves:0};
  const q=state.problemQuality;
  q.version=PROBLEM_QUALITY_VERSION;q.attempts||={};q.concepts||={};q.history||=[];q.qualitySolves||=0;q.protectedSolves||=0;
  return q;
}
function pqClamp(v,min,max){return Math.max(min,Math.min(max,v))}
function pqIncidentKey(inc){return `incident:${inc?.id||'unknown'}`}
function pqConceptKey(inc){return inc?.term||inc?.id||'unknown'}
function pqSuccessfulRepeats(inc){const q=ensureProblemQualityState();return q.attempts[pqIncidentKey(inc)]?.successful||0}
function pqConceptMastery(inc){return Number(state.diagnosticMastery?.[pqConceptKey(inc)]||0)}
function pqDifficulty(inc,c){
  const decisive=c?.decisive||[];
  const decisiveCost=decisive.reduce((sum,id)=>sum+Number(c?.tools?.[id]?.cost||0),0);
  return pqClamp(1+Math.max(0,decisive.length-2)*.08+decisiveCost/40,1,1.30);
}
function pqRepeatFactor(successful){return PROBLEM_QUALITY_REPEAT[Math.min(successful,PROBLEM_QUALITY_REPEAT.length-1)]}
function pqWeakConceptFactor(mastery){if(mastery<=0)return 1.35;if(mastery<=2)return 1.25;if(mastery<=5)return 1.12;if(mastery<=9)return 1;return .9}
function pqCleanFactor(w,grade){
  let f=1;
  if(w.hints===0)f+=.12;
  if(w.falseMoves===0)f+=.12;
  if(grade==='S')f+=.12;else if(grade==='A')f+=.05;
  return f;
}
function problemQualityPreview(inc,c,w,grade){
  const repeats=pqSuccessfulRepeats(inc),mastery=pqConceptMastery(inc),novel=repeats===0;
  const repeatFactor=pqRepeatFactor(repeats),weakFactor=pqWeakConceptFactor(mastery),difficultyFactor=pqDifficulty(inc,c),cleanFactor=pqCleanFactor(w,grade);
  const multiplier=pqClamp(repeatFactor*weakFactor*difficultyFactor*cleanFactor,.05,1.8);
  const protectedSolve=repeats>=3||repeatFactor<=.20;
  const reasons=[];
  if(novel)reasons.push('new problem');else reasons.push(`repeat #${repeats+1}`);
  if(mastery<=5)reasons.push('weak concept bonus');
  if(w.hints===0)reasons.push('no-hint bonus');
  if(w.falseMoves===0)reasons.push('clean-solve bonus');
  if(difficultyFactor>1.02)reasons.push('appropriate difficulty');
  if(repeatFactor<1)reasons.push('repeat decay');
  if(protectedSolve)reasons.push('anti-farm protection');
  return {version:PROBLEM_QUALITY_VERSION,multiplier,repeatFactor,weakFactor,difficultyFactor,cleanFactor,repeats,mastery,novel,protectedSolve,reasons};
}
function problemQualityRewards(baseMastery,grade,quality){
  const baseResearch=grade==='S'?2:1;
  const baseReputation=grade==='S'?3:grade==='A'?2:1;
  if(quality.protectedSolve)return {mastery:0,research:0,reputation:0,baseMastery,baseResearch,baseReputation};
  return {
    mastery:Math.max(0,Math.round(baseMastery*quality.multiplier)),
    research:Math.max(0,Math.round(baseResearch*quality.multiplier)),
    reputation:Math.max(0,Math.round(baseReputation*quality.multiplier)),
    baseMastery,baseResearch,baseReputation
  };
}
function recordProblemQualityFailure(inc,w){
  const q=ensureProblemQualityState(),key=pqIncidentKey(inc),today=Number(state.day||1);
  const entry=q.attempts[key]||{attempts:0,successful:0,failed:0,lastDay:null,bestGrade:null,totalAwardedMastery:0};
  entry.attempts++;entry.failed=(entry.failed||0)+1;entry.lastDay=today;q.attempts[key]=entry;
  q.history.unshift({day:today,problem:key,concept:pqConceptKey(inc),outcome:'failed-action',hints:w.hints,falseMoves:w.falseMoves,masteryAwarded:0,researchAwarded:0,reputationAwarded:0,protectedSolve:true,reasons:['incorrect attempts do not grant progression']});
  q.history=q.history.slice(0,100);
}
function recordProblemQualitySolve(inc,w,grade,quality,rewards){
  const q=ensureProblemQualityState(),key=pqIncidentKey(inc),concept=pqConceptKey(inc),today=Number(state.day||1);
  const entry=q.attempts[key]||{attempts:0,successful:0,failed:0,lastDay:null,bestGrade:null,totalAwardedMastery:0};
  entry.attempts++;entry.successful++;entry.lastDay=today;entry.totalAwardedMastery+=rewards.mastery;
  const grades={S:4,A:3,B:2,C:1};if(!entry.bestGrade||grades[grade]>grades[entry.bestGrade])entry.bestGrade=grade;
  q.attempts[key]=entry;
  q.concepts[concept]={mastery:pqConceptMastery(inc),lastPracticedDay:today,successful:(q.concepts[concept]?.successful||0)+1};
  q.qualitySolves++;if(quality.protectedSolve)q.protectedSolves++;
  q.history.unshift({day:today,problem:key,concept,outcome:'solved',grade,multiplier:Number(quality.multiplier.toFixed(3)),repeatsBefore:quality.repeats,hints:w.hints,falseMoves:w.falseMoves,masteryAwarded:rewards.mastery,researchAwarded:rewards.research,reputationAwarded:rewards.reputation,protectedSolve:quality.protectedSolve,reasons:quality.reasons});
  q.history=q.history.slice(0,100);
}
function problemQualityLabel(q){
  if(q.protectedSolve)return 'Practice only';
  if(q.multiplier>=1.35)return 'High-value learning';
  if(q.multiplier>=1)return 'Full-value learning';
  if(q.multiplier>=.5)return 'Reduced repeat value';
  return 'Low-value repeat';
}
function problemQualitySummary(){
  const q=ensureProblemQualityState();
  return {version:q.version,qualitySolves:q.qualitySolves,protectedSolves:q.protectedSolves,uniqueProblems:Object.keys(q.attempts).length,uniqueConcepts:Object.keys(q.concepts).length,recent:q.history.slice(0,12)};
}
