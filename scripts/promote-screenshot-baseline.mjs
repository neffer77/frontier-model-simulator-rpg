import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args=process.argv.slice(2);
const reviewed=args.includes('--reviewed')||process.env.SCREENSHOT_BASELINE_REVIEWED==='1';
const dryRun=args.includes('--dry-run');
const candidateArg=args.find(x=>!x.startsWith('--'));
const candidatePath=path.resolve(candidateArg||process.env.SCREENSHOT_BASELINE_CANDIDATE||'artifacts/screenshot-regression/candidate-baseline.json');
const baselinePath=path.resolve('visual-qa/screenshot-baseline.json');
const reviewerArg=args.find(x=>x.startsWith('--reviewed-by='));
const reviewer=reviewerArg?.slice('--reviewed-by='.length)||process.env.SCREENSHOT_BASELINE_REVIEWER||process.env.GITHUB_ACTOR||'manual-review';

if(!reviewed){
  console.error('Refusing to promote screenshot baseline without explicit review. Re-run with --reviewed after inspecting the candidate screenshots/artifact.');
  process.exit(2);
}
if(!fs.existsSync(candidatePath)){
  console.error(`Candidate baseline not found: ${candidatePath}`);
  process.exit(2);
}

const inventory=JSON.parse(fs.readFileSync('visual-qa/inventory.json','utf8'));
const matrix=JSON.parse(fs.readFileSync('visual-qa/responsive-matrix.json','utf8'));
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const raw=fs.readFileSync(candidatePath);
const candidate=JSON.parse(raw.toString('utf8'));
const autoSpecials=inventory.specialCaptures.filter(x=>!x.manual);
const expectedCount=(inventory.screens.length+autoSpecials.length)*matrix.viewports.length;
const expectedKeys=[];
for(const viewport of matrix.viewports){
  for(const screen of inventory.screens)expectedKeys.push(`${viewport.id}/route-${screen.id}`);
  for(const special of autoSpecials)expectedKeys.push(`${viewport.id}/${special.id}`);
}

const problems=[];
const expect=(condition,message)=>{if(!condition)problems.push(message)};
expect(candidate.version===1,'candidate version must be 1');
expect(candidate.item==='13.14','candidate must belong to Item 13.14 screenshot regression');
expect(candidate.status==='active','candidate status must be active');
expect(candidate.inventoryVersion===inventory.version,'candidate inventory version does not match visual inventory');
expect(candidate.responsiveMatrixVersion===matrix.version,'candidate responsive matrix version does not match canonical matrix');
expect(candidate.playwrightVersion===pkg.devDependencies?.playwright,'candidate Playwright version does not match pinned package version');
expect(Number(candidate.expectedCaptureCount)===expectedCount,`candidate expectedCaptureCount must be ${expectedCount}`);

const captures=candidate.captures||{};
const actualKeys=Object.keys(captures).sort();
expect(actualKeys.length===expectedCount,`candidate must contain exactly ${expectedCount} captures; found ${actualKeys.length}`);
const expectedSet=new Set(expectedKeys);
for(const key of expectedKeys)expect(Boolean(captures[key]),`candidate missing expected capture ${key}`);
for(const key of actualKeys)expect(expectedSet.has(key),`candidate contains unexpected capture ${key}`);
for(const [key,row] of Object.entries(captures)){
  expect(/^[a-f0-9]{64}$/.test(String(row.sha256||'')),`${key}: invalid SHA-256`);
  expect(Number(row.width)>0&&Number(row.height)>0,`${key}: invalid image dimensions`);
  expect(Number(row.bytes)>0,`${key}: invalid image byte count`);
}

if(problems.length){
  console.error(`Screenshot baseline promotion rejected with ${problems.length} validation problem(s):`);
  for(const problem of problems)console.error(`- ${problem}`);
  process.exit(1);
}

const candidateSha256=crypto.createHash('sha256').update(raw).digest('hex');
const promoted={
  version:1,
  item:'13.14',
  status:'active',
  description:'Reviewed deterministic SHA-256 baselines for Item 13.14 full-page Playwright screenshots.',
  inventoryVersion:inventory.version,
  responsiveMatrixVersion:matrix.version,
  playwrightVersion:pkg.devDependencies?.playwright||null,
  expectedCaptureCount:expectedCount,
  generatedAt:candidate.generatedAt||null,
  promotedAt:new Date().toISOString(),
  promotion:{
    item:'13.17',
    reviewed:true,
    reviewedBy:reviewer,
    candidateSha256,
    candidateFile:path.relative(process.cwd(),candidatePath)||path.basename(candidatePath)
  },
  capturePolicy:candidate.capturePolicy||{},
  captures
};

if(!dryRun)fs.writeFileSync(baselinePath,JSON.stringify(promoted,null,2)+'\n');
console.log(JSON.stringify({
  screenshotBaseline:dryRun?'validated':'promoted',
  reviewed:true,
  reviewedBy:reviewer,
  captures:actualKeys.length,
  expectedCaptureCount:expectedCount,
  candidateSha256,
  baseline:baselinePath,
  dryRun
},null,2));
