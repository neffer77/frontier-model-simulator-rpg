import fs from 'node:fs';
import vm from 'node:vm';
export function fixture(){
  const storage=new Map(),commands=new Map(),events=[];
  const c={console,Date,Math,JSON,structuredClone,Map,Set,
    state:{day:8,cash:30000000,programLearning:{programMaturity:.45},npcEmployees:[{id:'maya',name:'Maya Chen'},{id:'priya',name:'Priya Rao'},{id:'external',name:'Not on committee'}],
      portfolioStrategy:{initiatives:[{id:'IN-001',key:'research',name:'Architecture bet',createdDay:8,status:'proposed',costM:2.4,fundedM:0,peopleAllocated:0,progress:0,risk:.52,upsideM:14,theme:'science'}]},
      investmentCommittee:{version:1,scenarios:{bull:.25,base:.5,bear:.25},gates:{},decisions:[],debates:[],committeeIds:['maya','priya'],optionDiscipline:.51}},
    ensurePortfolioStrategy(){throw Error('Typed decisions must not advance unrelated portfolio progression')},
    save(){if(c.failSave)throw Error('Injected simulation persistence failure');storage.set('simulation',JSON.stringify(c.state))},render(){},
    document:{getElementById(){return null},querySelector(){return null}},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(c.failMail)throw Error('Injected Mail persistence failure');storage.set(k,v)},removeItem:k=>storage.delete(k)},
    frontierRegisterCommand:(name,fn)=>commands.set(name,fn),frontierEmitEvent:(type,data)=>events.push({type,data})};
  c.window=c;vm.createContext(c);
  for(const file of ['investment-committee.js','frontier-mail-frontieros.js','frontier-mail-command.js']){
    let code=fs.readFileSync(file,'utf8');if(file==='investment-committee.js')code=code.slice(0,code.indexOf('const icBaseRender='));
    vm.runInContext(code,c,{filename:file});
  }
  return {c,storage,commands,events};
}
