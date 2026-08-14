import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const tokens=read('theme-tokens.css');

const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
assert.equal(styles[0],'theme-tokens.css','theme-tokens.css must load before every module stylesheet');
assert(tokens.includes('color-scheme:dark'),'theme tokens must explicitly declare the app dark');

const required=[
  '--fl-canvas','--fl-canvas-deep','--fl-chrome','--fl-surface-1','--fl-surface-2','--fl-surface-3','--fl-surface-4','--fl-surface-5','--fl-surface-hover',
  '--fl-border-subtle','--fl-border-default','--fl-border-strong','--fl-border-accent','--fl-border-focus',
  '--fl-text-primary','--fl-text-secondary','--fl-text-muted','--fl-text-subtle','--fl-text-disabled','--fl-text-accent','--fl-text-on-accent',
  '--fl-accent-cyan','--fl-accent-gold','--fl-success','--fl-warning','--fl-danger','--fl-disabled-bg','--fl-disabled-border','--fl-disabled-text',
  '--fl-gradient-panel','--fl-gradient-elevated','--fl-gradient-sheet','--fl-gradient-action','--fl-shadow-soft','--fl-shadow-panel','--fl-shadow-elevated','--fl-shadow-modal','--fl-focus-ring'
];
for(const token of required)assert(tokens.includes(`${token}:`),`missing canonical theme token ${token}`);

// Item 8 aliases remain variables, not independent palette values.
for(const alias of ['--feel-cyan','--feel-gold','--feel-red']){
  const m=tokens.match(new RegExp(`${alias}:([^;]+)`));
  assert(m,`missing compatibility alias ${alias}`);
  assert(m[1].includes('var(--fl-'),`${alias} must resolve through the canonical Frontier Lab palette`);
}

const shared=[
  ['responsive-gameplay-shell.css',15],
  ['app-experience.css',15],
  ['game-feel.css',10],
  ['mobile-ux.css',5]
];
for(const [file,min] of shared){
  const css=read(file);
  const uses=(css.match(/var\(--fl-/g)||[]).length;
  assert(uses>=min,`${file} should consume the global theme system (found ${uses}, expected at least ${min})`);
}

assert(!read('game-feel.css').includes(':root{--feel-'),'game-feel.css must not own a second color palette');

console.log(JSON.stringify({themeTokens:'pass',requiredTokens:required.length,sharedStyles:shared.map(([f])=>f)},null,2));
