// Domain tests enter a fresh lab through the UI. Story rendering is deferred to
// requestAnimationFrame, so a fixed sleep or a DOM count is not a completion signal.
export async function foundLabAndDismissIntro(page,{timeout=10000}={}){
  await page.getByRole('button',{name:/found the lab/i}).click({timeout});
  await page.waitForFunction(()=>state.started&&state.story?.active==='intro',null,{timeout});
  await page.locator('.story-overlay').getByRole('button',{name:'Skip',exact:true}).click({timeout});
  await page.waitForFunction(()=>
    state.story?.active===null&&state.story.seen.includes('intro')&&
    !document.querySelector('.story-overlay'),null,{timeout});
}
