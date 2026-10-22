const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadModule}=require('./load-module.cjs');
const {configure,session}=require('./session-fixture.cjs');
function harness(role){
 configure();const login=session(role);const calls=[];const rows=new Map();let lose=false,tamper=false;
 const api=loadModule('app/api/cedar/route.ts',{'next/server':{NextResponse:{json:(body,opts={})=>({body,status:opts.status??200})}},fetch:async(url,options)=>{
  const body=options.body?JSON.parse(options.body):{};calls.push({url:String(url),body,token:options.headers.Authorization});
  const key=body.idempotency_key??body.message_id??String(url);
  if(!rows.has(key)) rows.set(key,{id:`row-${rows.size+1}`,data:{...body,transaction_id:String(url).endsWith("/v1/transfers")?`TX-${rows.size+1}`:body.transaction_id,status:'pending',gateway_id:'G1',text:body.message,occurred_at:body.sent_at,source_native_record_id:tamper?'invented':body.message_id}});
  if(lose)throw new Error('response interrupted');return{ok:true,status:201,text:async()=>JSON.stringify(rows.get(key))};
 }});
 return{calls,rows,login,set tamper(value){tamper=value;},set lose(value){lose=value;},send:(body,csrf=login.session.csrf)=>api.POST({headers:new Map([['origin','http://localhost:3000'],['content-type','application/json'],['x-csrf-token',csrf]]),cookies:{get:()=>({value:login.value})},text:async()=>JSON.stringify(body)})};
}
test('support ambiguity and reload retain exact original identity, timestamp and statement',async()=>{
 const app=harness('customer');const report={action:'interaction',customer_id:'C1',message_id:'support-1',sent_at:'2026-10-22T19:00:00.000Z',text:' My original report. ',transaction_id:'TX-1'};
 app.lose=true;assert.equal((await app.send(report)).status,502);
 const saved=await loadModule('lib/request-store.ts').pendingRequests(app.login.session);
 assert.equal(saved.report.sent_at,report.sent_at);assert.equal(saved.report.text,report.text);
 assert.equal((await app.send({...report,text:'changed'})).status,409);
 app.lose=false;assert.equal((await app.send(report)).status,201);assert.equal(app.rows.size,1);
 assert.deepEqual(app.calls[0].body,app.calls[1].body);
 assert.equal((await app.send({action:'acknowledge_interaction',message_id:'support-1'})).status,200);
 assert.equal((await loadModule('lib/request-store.ts').pendingRequests(app.login.session)).report,null);
});
test('customer cannot choose another customer, reconcile, seed or generate anomaly batches',async()=>{
 const app=harness('customer');
 for(const action of ['seed','reconcile','timeout_batch','document','configuration','contact_burst'])assert.equal((await app.send({action})).status,403);
 assert.equal((await app.send({action:'interaction',customer_id:'C2'})).status,403);assert.equal(app.calls.length,0);
});
test('staff reconciliation uses the staff bank authority and cannot invoke simulation',async()=>{
 const app=harness('staff');assert.equal((await app.send({action:'seed'})).status,403);
 assert.equal((await app.send({action:'reconcile',transaction_id:'TX-1',outcome:'completed',beneficiary_verified:false,rationale:'Bank evidence checked'})).status,201);
 assert.equal(app.calls[0].token,'Bearer staff-bearer');assert.match(app.calls[0].url,/\/transactions\/TX-1\/reconcile$/);
});
test('operator batch makes ten genuine distinct transfer requests and replays identical keys',async()=>{
 const app=harness('operator');assert.equal((await app.send({action:'timeout_batch',batch_id:'batch-g1'})).body.count,10);
 assert.equal((await app.send({action:'timeout_batch',batch_id:'new-browser-identity'})).body.count,10);
 const transfers=app.calls.filter(call=>call.url.endsWith('/v1/transfers'));
 assert.equal(transfers.length,20);assert.equal(new Set(transfers.map(call=>call.body.idempotency_key)).size,10);
 assert.ok(transfers.every(call=>call.body.route_id==='R1'&&call.body.amount_minor===1000&&call.token==='Bearer staff-bearer'));
 assert.equal(app.calls.filter(call=>call.url.endsWith('/v1/simulator/conditions')).length,2);
 assert.equal(app.rows.size,11,'one condition and ten financial operations, no Veriq mutations');
});
test('backend outage remains an error and does not return mock banking data',async()=>{
 const app=harness('customer');app.lose=true;
 const api=loadModule('lib/cedar-api.ts',{'next/headers':{cookies:async()=>({get:()=>({value:app.login.value})})},fetch:async()=>{throw new Error('offline');}});
 const result=await api.bankGet('/v1/accounts','customer');assert.equal(result.data,null);assert.equal(result.mode,'api');assert.match(result.error,/unreachable/);
});

test('an irrelevant native support receipt stays unconfirmed and recoverable',async()=>{
 const app=harness('customer');app.tamper=true;
 const report={action:'interaction',customer_id:'C1',message_id:'original-native-id',sent_at:'2026-10-22T19:00:00Z',text:'Original report'};
 assert.equal((await app.send(report)).status,502);
 assert.equal((await app.send({action:'acknowledge_interaction',message_id:report.message_id})).status,409);
 assert.equal((await loadModule('lib/request-store.ts').pendingRequests(app.login.session)).report.message_id,report.message_id);
});
