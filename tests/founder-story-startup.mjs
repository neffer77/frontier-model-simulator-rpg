import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {foundLabAndDismissIntro} from './helpers/founder-story.mjs';

const url=process.env.TEST_URL||'http://127.0.0.1:4173/';
const out='artifacts/founder-story-startup';
fs.mkdirSync(out,{recursive:true});
const cases=[
  {name:'desktop',width:1280,height:900,delayMs:0},
  {name:'desktop-delayed',width:1280,height:900,delayMs:150},
  {name:'phone-delayed',width:390,height:844,delayMs:150},
  {name:'blocked-skip',width:1280,height:900,delayMs:150,blockSkip:true}
];
const browser=await chromium.launch({headless:true}),results=[];
try{
  for(const scenario of cases){
    const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},isMobile:scenario.width<500,hasTouch:scenario.width<500});
    await context.tracing.start({screenshots:true,snapshots:true,sources:true});
    const page=await context.newPage(),errors=[],result={name:scenario.name,delayMs:scenario.delayMs,pass:false};
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(({delayMs,blockSkip})=>{
      const probe=window.__storyStartup={pendingFrames:0,delayedFrames:0,skipClicks:0,before:null};
      document.addEventListener('click',event=>{
        if(!event.target.closest?.('.story-overlay button[onclick="storySceneClose()"]'))return;
        probe.skipClicks++;probe.before={cash:state.cashM,compute:state.compute,day:state.day};
        if(blockSkip){event.preventDefault();event.stopImmediatePropagation()}
      },true);
      const raf=window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame=callback=>{
        if(!delayMs||callback.name!=='renderScene')return raf(callback);
        probe.pendingFrames++;probe.delayedFrames++;
        return raf(time=>setTimeout(()=>{try{callback(time)}finally{probe.pendingFrames--}},delayMs));
      };
    },scenario);
    try{
      await page.goto(url,{waitUntil:'networkidle'});
      if(scenario.blockSkip){
        await assert.rejects(foundLabAndDismissIntro(page,{timeout:2000}),error=>error.name==='TimeoutError','an unclosed story must fail startup');
      }else await foundLabAndDismissIntro(page);
      await page.waitForFunction(()=>window.__storyStartup.pendingFrames===0);
      result.state=await page.evaluate(()=>({
        ...window.__storyStartup,started:state.started,active:state.story.active,seen:[...state.story.seen],
        after:{cash:state.cashM,compute:state.compute,day:state.day},
        overlays:document.querySelectorAll('.story-overlay').length,
        savedStory:JSON.parse(localStorage.getItem('frontier-lab-v3'))?.story
      }));
      assert.equal(result.state.skipClicks,1,'startup must use one real Skip click');
      assert.deepEqual(result.state.after,result.state.before,'story dismissal must preserve money, compute and simulation day');
      assert.equal(result.state.started,true);
      if(scenario.delayMs)assert(result.state.delayedFrames>=1,'delayed story rendering must actually execute');
      if(scenario.blockSkip){
        assert.equal(result.state.active,'intro');
        assert.equal(result.state.overlays,1);
        assert.equal(result.state.seen.includes('intro'),false);
      }else{
        assert.equal(result.state.active,null);
        assert.equal(result.state.overlays,0);
        assert(result.state.seen.includes('intro'));
        assert.equal(result.state.savedStory.active,null);
        assert(result.state.savedStory.seen.includes('intro'),'canonical story dismissal must persist');
        if(scenario.delayMs)assert(result.state.delayedFrames>=2,'both opening and closing frames must be delayed');
      }
      assert.deepEqual(errors,[]);
      result.pass=true;
    }catch(error){result.error=String(error.stack||error);throw error}
    finally{
      result.pageErrors=errors;results.push(result);
      await page.screenshot({path:`${out}/${scenario.name}.png`,fullPage:true}).catch(()=>{});
      fs.writeFileSync(`${out}/${scenario.name}.html`,await page.content().catch(()=>''));
      await context.tracing.stop({path:`${out}/${scenario.name}-trace.zip`});
      await context.close();
    }
  }
}finally{
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({pass:results.length===cases.length&&results.every(x=>x.pass),results},null,2));
  await browser.close();
}
console.log('Founder story startup: normal and delayed UI dismissal, persisted state, unchanged resources and blocked-dismissal rejection passed');
