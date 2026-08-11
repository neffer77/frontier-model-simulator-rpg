// Frontier Model Simulator — Scriptable launcher
// Run directly in Scriptable or call it from an iOS Shortcut using “Run Script”.
// It downloads the same browser UI from GitHub and embeds CSS/JS into one WebView.

const BRANCH = "feature/technical-simulator-v2";
const BASE = `https://raw.githubusercontent.com/neffer77/frontier-model-simulator-rpg/${BRANCH}/`;

async function fetchText(path) {
  const req = new Request(BASE + path);
  req.timeoutInterval = 20;
  return await req.loadString();
}

async function buildGame() {
  const [html, css, js] = await Promise.all([
    fetchText("index.html"),
    fetchText("styles.css"),
    fetchText("technical.js")
  ]);

  return html
    .replace('<link rel="stylesheet" href="styles.css" />', `<style>${css}</style>`)
    .replace('<script src="technical.js"></script>', `<script>${js}<\/script>`);
}

try {
  const web = new WebView();
  const html = await buildGame();
  await web.loadHTML(html, BASE);
  await web.present(true);
} catch (error) {
  const alert = new Alert();
  alert.title = "Frontier Model Simulator";
  alert.message = `Could not load the game. Check your internet connection and GitHub access.\n\n${error}`;
  alert.addAction("OK");
  await alert.present();
}

Script.complete();
