// Frontier Lab — Scriptable launcher
// Run directly in Scriptable or from an iOS Shortcut using “Run Script”.
// Loads the same browser game into a native Scriptable WebView.

const BRANCH = "feature/phase-4d27-public-communications";
const BASE = `https://raw.githubusercontent.com/neffer77/frontier-model-simulator-rpg/${BRANCH}/`;
const STYLE_FILES = [
  "styles.css","v3-extra.css","workstation.css","momentum.css","model-lab.css","npc-team.css","npc-beliefs.css","postmortems.css","knowledge.css","career.css","hiring.css","engineering-artifacts.css","incident-artifacts.css","code-lab.css","data-evals.css","tech-debt.css","debt-consequences.css","architecture-migrations.css","family-forks.css","maintenance-economics.css","operations-ownership.css","slo-reliability.css","release-governance.css","roadmap-enterprise.css","quarterly-board.css","financing-strategy.css","macro-restructuring.css","governance-board.css","executive-politics.css","employee-talent-memory.css","org-management.css","workforce-planning.css","project-portfolio.css","critical-path.css","program-management.css","program-learning.css","portfolio-strategy.css","investment-committee.css","competitive-intelligence.css","ecosystem-strategy.css","policy-regulatory.css","public-communications.css"
];
const SCRIPT_FILES = [
  "frontier-lab.js","economy.js","workstation.js","momentum.js","engagement.js","model-lab.js","npc-team.js","npc-beliefs.js","postmortems.js","knowledge.js","career.js","hiring.js","engineering-artifacts.js","incident-artifacts.js","code-lab.js","data-evals.js","tech-debt.js","debt-consequences.js","architecture-migrations.js","family-forks.js","maintenance-economics.js","maintenance-deadline-guard.js","operations-ownership.js","slo-reliability.js","release-governance.js","roadmap-enterprise.js","quarterly-board.js","financing-strategy.js","macro-restructuring.js","governance-board.js","executive-politics.js","employee-talent-memory.js","org-management.js","workforce-planning.js","project-portfolio.js","critical-path.js","program-management.js","program-learning.js","portfolio-strategy.js","investment-committee.js","competitive-intelligence.js","ecosystem-strategy.js","policy-regulatory.js","public-communications.js"
];
async function fetchText(path){const req=new Request(BASE+path);req.timeoutInterval=20;return await req.loadString()}
async function buildGame(){
  let html=await fetchText("index.html");
  const styles=await Promise.all(STYLE_FILES.map(fetchText));
  const scripts=await Promise.all(SCRIPT_FILES.map(fetchText));
  STYLE_FILES.forEach((file,i)=>{html=html.replace(`<link rel="stylesheet" href="${file}" />`,`<style>${styles[i]}</style>`)});
  SCRIPT_FILES.forEach((file,i)=>{html=html.replace(`<script src="${file}"></script>`,`<script>${scripts[i]}<\/script>`)});
  return html;
}
try{
  const web=new WebView();
  const html=await buildGame();
  await web.loadHTML(html,BASE);
  await web.present(true);
}catch(error){
  const alert=new Alert();alert.title="Frontier Lab";alert.message=`Could not load the game. Check your internet connection and GitHub access.\n\n${error}`;alert.addAction("OK");await alert.present();
}
Script.complete();