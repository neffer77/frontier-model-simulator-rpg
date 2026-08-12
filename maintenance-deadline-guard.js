// Phase 4D.5 guard: overdue migration pressure may escalate at most once per simulated day.
enforceDeprecationDeadlines=function(){
  ensureMaintenanceState();
  const today=state.day||1;
  state.maintenance.events.filter(e=>e.status==='open'&&today>e.dueDay).forEach(ev=>{
    ev.lastEscalatedDayByFamily ||= {};
    ev.affectedFamilies.filter(fid=>!ev.migratedFamilies.includes(fid)).forEach(fid=>{
      const r=state.maintenance.families[fid];
      if(!r||r.lifecycle==='eol'||ev.lastEscalatedDayByFamily[fid]===today)return;
      ev.lastEscalatedDayByFamily[fid]=today;
      r.deadlineRisk=Math.min(1,(r.deadlineRisk||0)+.08);
      const f=familyById(fid);if(f)f.lockIn=Math.min(.98,(f.lockIn||0)+.01);
      state.maintenance.history.push({day:today,type:'deadline.missed',eventId:ev.id,familyId:fid});
    });
  });
  Object.values(state.maintenance.families).forEach(r=>maintenanceRegisterFamily(familyById(r.familyId)));
};
