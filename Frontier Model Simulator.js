// Frontier Lab — Scriptable launcher
// Run directly in Scriptable or from an iOS Shortcut using “Run Script”.
// Loads the same V3 browser game into a native Scriptable WebView.

const BRANCH = "feature/frontier-lab-v3";
const BASE = `https://raw.githubusercontent.com/neffer77/frontier-model-simulator-rpg/${BRANCH}/`;

async function fetchText(path) {
  const req = new Request(BASE + path);
  req.timeoutInterval = 20;
  return await req.loadString();
}

async function buildGame() {
  const [html, css, extraCss, workstationCss, game, economy, workstation] = await Promise.all([
    fetchText("index.html"),
    fetchText("styles.css"),
    fetchText("v3-extra.css"),
    fetchText("workstation.css"),
    fetchText("frontier-lab.js"),
    fetchText("economy.js"),
    fetchText("workstation.js")
  ]);
  return html
    .replace('<link rel="stylesheet" href="styles.css" />', `<style>${css}</style>`)
    .replace('<link rel="stylesheet" href="v3-extra.css" />', `<style>${extraCss}</style>`)
    .replace('<link rel="stylesheet" href="workstation.css" />', `<style>${workstationCss}</style>`)
    .replace('<script src="frontier-lab.js"></script>', `<script>${game}<\/script>`)
    .replace('<script src="economy.js"></script>', `<script>${economy}<\/script>`)
    .replace('<script src="workstation.js"></script>', `<script>${workstation}<\/script>`);
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
