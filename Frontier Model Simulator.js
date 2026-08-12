// Frontier Lab — Scriptable launcher
// Run directly in Scriptable or from an iOS Shortcut using “Run Script”.
// Loads the same browser game into a native Scriptable WebView.

const BRANCH = "feature/phase-4d5-maintenance-dependency-graphs";
const BASE = `https://raw.githubusercontent.com/neffer77/frontier-model-simulator-rpg/${BRANCH}/`;

async function fetchText(path) {
  const req = new Request(BASE + path);
  req.timeoutInterval = 20;
  return await req.loadString();
}

async function buildGame() {
  const [html, css, extraCss, workstationCss, momentumCss, modelLabCss, npcCss, npcBeliefsCss, postmortemsCss, knowledgeCss, careerCss, hiringCss, artifactCss, incidentArtifactCss, codeCss, dataEvalsCss, techDebtCss, debtConsequencesCss, architectureCss, familyForksCss, maintenanceCss, game, economy, workstation, momentum, engagement, modelLab, npcTeam, npcBeliefs, postmortems, knowledge, career, hiring, artifacts, incidentArtifacts, codeLab, dataEvals, techDebt, debtConsequences, architectureMigrations, familyForks, maintenanceEconomics] = await Promise.all([
    fetchText("index.html"),fetchText("styles.css"),fetchText("v3-extra.css"),fetchText("workstation.css"),fetchText("momentum.css"),fetchText("model-lab.css"),fetchText("npc-team.css"),fetchText("npc-beliefs.css"),fetchText("postmortems.css"),fetchText("knowledge.css"),fetchText("career.css"),fetchText("hiring.css"),fetchText("engineering-artifacts.css"),fetchText("incident-artifacts.css"),fetchText("code-lab.css"),fetchText("data-evals.css"),fetchText("tech-debt.css"),fetchText("debt-consequences.css"),fetchText("architecture-migrations.css"),fetchText("family-forks.css"),fetchText("maintenance-economics.css"),fetchText("frontier-lab.js"),fetchText("economy.js"),fetchText("workstation.js"),fetchText("momentum.js"),fetchText("engagement.js"),fetchText("model-lab.js"),fetchText("npc-team.js"),fetchText("npc-beliefs.js"),fetchText("postmortems.js"),fetchText("knowledge.js"),fetchText("career.js"),fetchText("hiring.js"),fetchText("engineering-artifacts.js"),fetchText("incident-artifacts.js"),fetchText("code-lab.js"),fetchText("data-evals.js"),fetchText("tech-debt.js"),fetchText("debt-consequences.js"),fetchText("architecture-migrations.js"),fetchText("family-forks.js"),fetchText("maintenance-economics.js")
  ]);
  return html
    .replace('<link rel="stylesheet" href="styles.css" />', `<style>${css}</style>`)
    .replace('<link rel="stylesheet" href="v3-extra.css" />', `<style>${extraCss}</style>`)
    .replace('<link rel="stylesheet" href="workstation.css" />', `<style>${workstationCss}</style>`)
    .replace('<link rel="stylesheet" href="momentum.css" />', `<style>${momentumCss}</style>`)
    .replace('<link rel="stylesheet" href="model-lab.css" />', `<style>${modelLabCss}</style>`)
    .replace('<link rel="stylesheet" href="npc-team.css" />', `<style>${npcCss}</style>`)
    .replace('<link rel="stylesheet" href="npc-beliefs.css" />', `<style>${npcBeliefsCss}</style>`)
    .replace('<link rel="stylesheet" href="postmortems.css" />', `<style>${postmortemsCss}</style>`)
    .replace('<link rel="stylesheet" href="knowledge.css" />', `<style>${knowledgeCss}</style>`)
    .replace('<link rel="stylesheet" href="career.css" />', `<style>${careerCss}</style>`)
    .replace('<link rel="stylesheet" href="hiring.css" />', `<style>${hiringCss}</style>`)
    .replace('<link rel="stylesheet" href="engineering-artifacts.css" />', `<style>${artifactCss}</style>`)
    .replace('<link rel="stylesheet" href="incident-artifacts.css" />', `<style>${incidentArtifactCss}</style>`)
    .replace('<link rel="stylesheet" href="code-lab.css" />', `<style>${codeCss}</style>`)
    .replace('<link rel="stylesheet" href="data-evals.css" />', `<style>${dataEvalsCss}</style>`)
    .replace('<link rel="stylesheet" href="tech-debt.css" />', `<style>${techDebtCss}</style>`)
    .replace('<link rel="stylesheet" href="debt-consequences.css" />', `<style>${debtConsequencesCss}</style>`)
    .replace('<link rel="stylesheet" href="architecture-migrations.css" />', `<style>${architectureCss}</style>`)
    .replace('<link rel="stylesheet" href="family-forks.css" />', `<style>${familyForksCss}</style>`)
    .replace('<link rel="stylesheet" href="maintenance-economics.css" />', `<style>${maintenanceCss}</style>`)
    .replace('<script src="frontier-lab.js"></script>', `<script>${game}<\/script>`)
    .replace('<script src="economy.js"></script>', `<script>${economy}<\/script>`)
    .replace('<script src="workstation.js"></script>', `<script>${workstation}<\/script>`)
    .replace('<script src="momentum.js"></script>', `<script>${momentum}<\/script>`)
    .replace('<script src="engagement.js"></script>', `<script>${engagement}<\/script>`)
    .replace('<script src="model-lab.js"></script>', `<script>${modelLab}<\/script>`)
    .replace('<script src="npc-team.js"></script>', `<script>${npcTeam}<\/script>`)
    .replace('<script src="npc-beliefs.js"></script>', `<script>${npcBeliefs}<\/script>`)
    .replace('<script src="postmortems.js"></script>', `<script>${postmortems}<\/script>`)
    .replace('<script src="knowledge.js"></script>', `<script>${knowledge}<\/script>`)
    .replace('<script src="career.js"></script>', `<script>${career}<\/script>`)
    .replace('<script src="hiring.js"></script>', `<script>${hiring}<\/script>`)
    .replace('<script src="engineering-artifacts.js"></script>', `<script>${artifacts}<\/script>`)
    .replace('<script src="incident-artifacts.js"></script>', `<script>${incidentArtifacts}<\/script>`)
    .replace('<script src="code-lab.js"></script>', `<script>${codeLab}<\/script>`)
    .replace('<script src="data-evals.js"></script>', `<script>${dataEvals}<\/script>`)
    .replace('<script src="tech-debt.js"></script>', `<script>${techDebt}<\/script>`)
    .replace('<script src="debt-consequences.js"></script>', `<script>${debtConsequences}<\/script>`)
    .replace('<script src="architecture-migrations.js"></script>', `<script>${architectureMigrations}<\/script>`)
    .replace('<script src="family-forks.js"></script>', `<script>${familyForks}<\/script>`)
    .replace('<script src="maintenance-economics.js"></script>', `<script>${maintenanceEconomics}<\/script>`);
}

try {
  const web = new WebView();
  const html = await buildGame();
  await web.loadHTML(html, BASE);
  await web.present(true);
} catch (error) {
  const alert = new Alert();
  alert.title = "Frontier Lab";
  alert.message = `Could not load the game. Check your internet connection and GitHub access.\n\n${error}`;
  alert.addAction("OK");
  await alert.present();
}

Script.complete();
