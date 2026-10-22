// Opt-in real-browser rehearsal. Requires running production frontends and a named backend run.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../../..');
const run = process.env.VERIQ_REHEARSAL_RUN || 'integration-ticket1';
const directory = path.join(root, 'server/platform/var/rehearsals', run);
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json')));
const runtime = JSON.parse(fs.readFileSync(path.join(directory, 'runtime.json')));
const logins = JSON.parse(fs.readFileSync(path.join(directory, 'browser-logins.json')));
const cedar = process.env.CEDAR_BROWSER_ORIGIN || 'http://localhost:3000';
const veriq = process.env.VERIQ_BROWSER_ORIGIN || 'http://localhost:3001';
async function bank(app, endpoint, token) {
  const response = await fetch(`http://127.0.0.1:${manifest[app+'_port']}${endpoint}`, { headers: { Authorization: `Bearer ${runtime.tokens[token]}` } });
  assert.equal(response.status,200,endpoint);return response.json();
}
async function login(page, app, role) {
  await page.goto((app==='cedar'?cedar:veriq)+'/login');
  await page.getByLabel('Username',{exact:true}).fill(logins[app][role].username);
  await page.getByLabel('Password',{exact:true}).fill(logins[app][role].password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL(url=>url.pathname!=='/login');
}
async function action(context, body, options={}) {
  const current=await context.request.get(cedar+'/api/session');assert.equal(current.status(),200);
  const session=await current.json();
  return context.request.post(cedar+'/api/cedar',{headers:{Origin:cedar,'Content-Type':'application/json','x-csrf-token':session.csrf,...options},data:body});
}
const waitAction = (page, action) => page.waitForResponse(response=>response.url()===cedar+'/api/cedar' && response.request().postDataJSON()?.action===action);
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium-browser',args:['--disable-gpu','--disable-dev-shm-usage']});
 try {
  const operator=await browser.newContext(), customer=await browser.newContext(), staff=await browser.newContext();
  const op=await operator.newPage(), cp=await customer.newPage(), sp=await staff.newPage();
  for(const page of [op,cp,sp])page.setDefaultTimeout(20000);
  await login(op,'cedar','operator');
  const initial=await bank('cedar','/v1/transactions','cedar_operator');assert.equal(initial.length,0,'Use a fresh prepared rehearsal');
  for(let attempt=0;attempt<2;attempt++){
   const result=waitAction(op,'timeout_batch');await op.getByRole('button',{name:'Generate ten G1 timeout transfers'}).click();
   const response=await result;assert.equal(response.status(),200);const body=await response.json();assert.equal(body.count,10);
   assert.equal(new Set(body.records.map(row=>row.data.transaction_id)).size,10);
   await op.getByRole('button',{name:'Generate ten G1 timeout transfers'}).waitFor({state:'visible'});
   await op.getByText('10 original transfer records created or confirmed.',{exact:false}).waitFor();
  }
  assert.equal((await bank('cedar','/v1/transactions','cedar_operator')).length,10);
  await op.getByRole('heading',{name:'Recent gateway observations',exact:true}).waitFor();
  await op.locator('[data-observation-id]').first().waitFor();
  assert.equal(await op.locator('[data-observation-id]').count(),10);
  const feed=await bank('cedar','/v1/feed?source_id=cedar-operations&limit=500&after=0','cedar_feed');
  const nativeIds=new Set(feed.items.map(item=>item.envelope.native_record_id));
  for(const id of await op.locator('[data-observation-id]').evaluateAll(rows=>rows.map(row=>row.dataset.observationId))) assert.ok(nativeIds.has(id));

  const account=(await bank('cedar','/v1/accounts','customer1'))[0].data;
  assert.equal(account.balance_minor-account.reserved_minor,99990000);
  console.log('PASS: operator batch uses ten distinct bank transfers; repeat creates no duplicates; ₦50,000 remains affordable');
  await login(cp,'cedar','customer');
  const cookies=await customer.cookies();const cookie=cookies.find(c=>c.name==='cedar-demo-session');
  assert.equal(cookie.httpOnly,true);assert.equal(cookie.sameSite,'Strict');assert.equal(cookie.secure,false);
  assert.equal((await cp.evaluate(()=>document.cookie)).includes('cedar-demo-session'),false);
  for(const route of ['/staff','/operator'])assert.equal((await cp.goto(cedar+route)).status(),403);
  await cp.goto(cedar+'/banking');
  assert.equal((await action(customer,{action:'seed'})).status(),403);
  assert.equal((await action(customer,{action:'prepare_transfer'},{'x-csrf-token':'forged'})).status(),403);
  assert.equal((await action(customer,{action:'seed'},{Origin:'https://other.invalid'})).status(),403);
  let lostTransfer, originalTransfer, lostReport, originalReport;
  await cp.route('**/api/cedar',async route=>{
   const body=route.request().postDataJSON();
   if(body.action==='transfer'&&!lostTransfer){originalTransfer=body;const response=await route.fetch();lostTransfer=await response.json();await route.abort();}
   else if(body.action==='interaction'&&!lostReport){originalReport=body;const response=await route.fetch();lostReport=await response.json();await route.abort();}
   else await route.continue();
  });
  await cp.getByRole('button',{name:'Make a transfer',exact:false}).click();
  await cp.getByLabel('From account').selectOption('A1');await cp.getByLabel('Transfer route').selectOption('R1');
  assert.equal(await cp.getByLabel('Amount (NGN)').inputValue(),'50000');
  await cp.getByRole('button',{name:'Review transfer',exact:true}).click();
  await cp.getByRole('button',{name:'Confirm synthetic transfer',exact:true}).click();
  await cp.getByText('Failed to fetch',{exact:false}).waitFor();
  assert.equal(lostTransfer.data.amount_minor,5000000);assert.equal(lostTransfer.data.status,'pending');
  await cp.reload();
  const recovered=waitAction(cp,'transfer');await cp.getByRole('button',{name:'Recover original transfer',exact:true}).click();
  const recoveredTransfer=await recovered;
  assert.deepEqual(recoveredTransfer.request().postDataJSON(),originalTransfer);
  assert.equal((await recoveredTransfer.json()).data.transaction_id,lostTransfer.data.transaction_id);
  await cp.getByRole('heading',{name:'Transfer status',exact:true}).waitFor();
  assert.equal((await bank('cedar','/v1/transactions','customer1')).length,11);
  console.log('PASS: browser loses a committed ₦50,000 transfer response, reloads, and recovers the same pending transaction');
  await cp.getByRole('button',{name:'Report a problem',exact:true}).click();
  await cp.getByLabel('Your message').fill('The ₦50,000 transfer is pending; the recipient has not confirmed receipt.');
  await cp.getByRole('button',{name:'Submit support request',exact:true}).click();
  await cp.getByText('Failed to fetch',{exact:false}).waitFor();
  await cp.reload();
  const recoveredReport=waitAction(cp,'interaction');await cp.getByRole('button',{name:'Recover original support request',exact:true}).click();
  const reportResponse=await recoveredReport;
  assert.equal((await reportResponse.json()).id,lostReport.id);
  assert.deepEqual(reportResponse.request().postDataJSON(),originalReport);
  await cp.getByRole('heading',{name:'Support history',exact:true}).waitFor();
  const reports=await bank('cedar','/v1/interactions','customer1');assert.equal(reports.length,1);assert.equal(reports[0].data.transaction_id,lostTransfer.data.transaction_id);
  console.log('PASS: support response ambiguity/reload preserves exact message identity, timestamp, text and transaction link');
  await login(sp,'cedar','staff');
  for(const route of ['/banking','/operator'])assert.equal((await sp.goto(cedar+route)).status(),403);
  assert.equal((await action(staff,{action:'seed'})).status(),403);
  await sp.goto(cedar+'/staff/transactions');
  await sp.locator('select[name="transaction_id"]').selectOption(lostTransfer.data.transaction_id);
  await sp.getByLabel('Bank rationale').fill('Bank reconciliation confirms processing; beneficiary receipt remains unverified.');
  const reconciliation=waitAction(sp,'reconcile');await sp.getByRole('button',{name:'Record reconciliation',exact:true}).click();
  const reconciled=await (await reconciliation).json();assert.equal(reconciled.data.status,'completed');assert.equal(reconciled.data.beneficiary_verified,false);
  assert.equal((await bank('cedar','/v1/interactions','customer1'))[0].data.text,reports[0].data.text);
  for(const route of ['/staff','/staff/payment-routes','/staff/support-channels','/staff/institutional-sources']){
   const response=await sp.goto(cedar+route);assert.equal(response.status(),200);assert.doesNotMatch(await sp.locator('body').innerText(),/bank API is unreachable|Bank credential unavailable/);
  }
  await cp.goto(cedar+'/banking');await cp.getByRole('button',{name:'View all transactions',exact:true}).click();
  assert.equal(await cp.locator('.banking-list .banking-row').count(),11);
  await cp.getByRole('button',{name:new RegExp(lostTransfer.data.transaction_id)}).click();
  await cp.getByText('Completed',{exact:true}).waitFor();
  const pendingAnomaly=(await bank('cedar','/v1/transactions','cedar_operator')).find(row=>row.data.status==='pending');
  await sp.goto(cedar+'/staff/transactions');
  await sp.locator('select[name="transaction_id"]').selectOption(pendingAnomaly.data.transaction_id);
  await sp.locator('select[name="outcome"]').selectOption('failed');
  assert.equal(await sp.locator('input[name="beneficiary_verified"]').isDisabled(),true);
  await sp.getByLabel('Bank rationale').fill('Bank confirms failure and releases the original reservation.');
  const failure=waitAction(sp,'reconcile');await sp.getByRole('button',{name:'Record reconciliation',exact:true}).click();
  const failed=await (await failure).json();assert.equal(failed.data.status,'failed');assert.equal(failed.data.beneficiary_verified,false);
  await cp.goto(cedar+'/banking');await cp.getByRole('button',{name:'View all transactions',exact:true}).click();
  await cp.getByRole('button',{name:new RegExp(pendingAnomaly.data.transaction_id)}).click();await cp.getByText('Recorded failure',{exact:true}).waitFor();
  console.log('PASS: staff-authorized completion and failure render actual bank outcomes; reports stay unchanged; staff live views load');
  // Check every application credential against actual rendered bank HTML.
  for(const page of [cp,sp,op]){
   const html=await page.content();for(const token of Object.values(runtime.tokens))assert.equal(html.includes(token),false);
  }
  await op.goto(cedar+'/operator');
  const doc=waitAction(op,'document');await op.getByRole('button',{name:'Submit source document',exact:true}).click();assert.equal((await doc).status(),201);
  const config=waitAction(op,'configuration');await op.getByRole('button',{name:'Publish routing configuration',exact:true}).click();assert.equal((await config).status(),201);
  console.log('PASS: operator submits institutional document/configuration through Cedar; rendered pages contain no bearer credentials');
  // Real evidence acquisition runs independently of inference.
  let incidents=[];
  for(let attempt=0;attempt<15;attempt++){
   incidents=await bank('veriq','/v1/incidents','veriq_admin');if(incidents.length)break;await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert.ok(incidents.length>0,'Automatic approved source polling should detect the genuine timeout observations');
  console.log('PASS: Veriq detects the source-generated incident with no inference model running');
  if(process.env.TEST_VERIQ_BROWSER==='true'){
   const investigator=await browser.newContext();const vp=await investigator.newPage();
   await login(vp,'veriq','investigator');
   await vp.goto(veriq+'/knowledge');await vp.getByRole('heading',{name:'Knowledge Explorer',exact:true}).waitFor();
   assert.doesNotMatch(await vp.locator('body').innerText(),/Knowledge Explorer unavailable/);
   assert.equal((await vp.goto(veriq+'/data-sources')).status(),403);
   assert.equal((await vp.goto(veriq+'/administration')).status(),403);
   const admin=await browser.newContext();const ap=await admin.newPage();await login(ap,'veriq','admin');
   const sources=await ap.goto(veriq+'/data-sources');assert.equal(sources.status(),200);assert.doesNotMatch(await ap.locator('body').innerText(),/Knowledge sources unavailable/);
   for(const page of [vp,ap]){const html=await page.content();for(const token of Object.values(runtime.tokens))assert.equal(html.includes(token),false);}
   console.log('PASS: Veriq investigator loads real knowledge without sources permission; admin loads registry; sessions expose no bearer credentials');
  }
  console.log('Real Chromium localhost integration checks passed.');
 } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
