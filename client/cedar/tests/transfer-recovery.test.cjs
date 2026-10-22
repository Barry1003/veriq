const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./load-module.cjs');
const { configure, session } = require('./session-fixture.cjs');
configure();
const instruction = { account_id: 'A1', route_id: 'R1', amount_minor: 5000000, idempotency_key: 'original-request' };
const recovery = loadModule('lib/transfer-recovery.ts');
const normalize = value => JSON.parse(JSON.stringify(value));
function harness(role='customer') {
  configure();
  let loseResponse=false, calls=0;
  const login=session(role), ledger=new Map(), submitted=[];
  const dependencies={
    'next/server': { NextResponse: { json: (body, opts={})=>({body,status:opts.status??200}) } },
    fetch: async (_url, opts)=>{
      calls++; const body=JSON.parse(opts.body); submitted.push(body);
      if(!ledger.has(body.idempotency_key)) ledger.set(body.idempotency_key,{id:'record-1',data:{...body,transaction_id:'TX-1',status:'pending'}});
      if(loseResponse) throw new Error('Lost response after bank commit');
      return {ok:true,status:201,text:async()=>JSON.stringify(ledger.get(body.idempotency_key))};
    },
  };
  let api=loadModule('app/api/cedar/route.ts',dependencies);
  return {
    send: (action, body=instruction, csrf=login.session.csrf, origin='http://localhost:3000')=>api.POST({headers:new Map([['origin',origin],['content-type','application/json'],['x-csrf-token',csrf]]),cookies:{get:name=>name==='cedar-demo-session'?{value:login.value}:undefined},text:async()=>JSON.stringify({action,...body})}),
    pending:()=>loadModule('lib/request-store.ts').pendingRequests(login.session),
    reload:()=>{api=loadModule('app/api/cedar/route.ts',dependencies);},
    set lose(value){loseResponse=value;},get calls(){return calls;},get ledger(){return ledger;},get submitted(){return submitted;},
  };
}
test('sealed recovery preserves exact instruction and rejects tampering',()=>{
 const sealed=recovery.sealTransfer(instruction);
 assert.deepEqual(normalize(recovery.recoverTransfer(sealed)),instruction);
 const bytes=Buffer.from(sealed,'base64url');bytes[30]^=1;
 assert.throws(()=>recovery.recoverTransfer(bytes.toString('base64url')));
 assert.equal(recovery.transferCookieOptions.httpOnly,true);
 assert.equal(recovery.transferCookieOptions.secure,false,'localhost HTTP must not require a Secure cookie');
});
test('bank cannot receive a transfer before durable staging',async()=>{
 const app=harness();assert.equal((await app.send('transfer')).status,409);assert.equal(app.calls,0);
 assert.equal((await app.send('prepare_transfer')).status,200);assert.equal(app.calls,0);
});
test('lost response and server reload retain exact request and one ledger entry',async()=>{
 const app=harness();await app.send('prepare_transfer');app.lose=true;
 assert.equal((await app.send('transfer')).status,502);assert.equal(app.ledger.size,1);
 app.reload();app.lose=false;
 assert.deepEqual(normalize((await app.pending()).transfer),instruction);
 assert.equal((await app.send('transfer')).body.data.transaction_id,'TX-1');
 assert.equal(app.ledger.size,1);assert.deepEqual(app.submitted[0],app.submitted[1]);
 assert.equal((await app.send('acknowledge_transfer')).status,200);
 assert.equal((await app.pending()).transfer,null);
});
test('changed instruction remains blocked and cannot be prematurely acknowledged',async()=>{
 const app=harness();await app.send('prepare_transfer');
 assert.equal((await app.send('acknowledge_transfer')).status,409);
 for(const change of [{account_id:'A2'},{route_id:'R2'},{amount_minor:2000},{idempotency_key:'new-key'}]){
  assert.equal((await app.send('prepare_transfer',{...instruction,...change})).status,409);
  assert.equal((await app.send('transfer',{...instruction,...change})).status,409);
 }
 assert.equal(app.calls,0);
});
test('concurrent duplicate submissions retain one backend identity',async()=>{
 const app=harness();await app.send('prepare_transfer');
 const responses=await Promise.all([app.send('transfer'),app.send('transfer')]);
 assert.ok(responses.every(response=>response.body.data.transaction_id==='TX-1'));assert.equal(app.ledger.size,1);
});
test('two tabs cannot stage competing transfers',async()=>{
 const app=harness();const responses=await Promise.all([app.send('prepare_transfer'),app.send('prepare_transfer',{...instruction,idempotency_key:'second-tab'})]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(app.calls,0);
});
test('origin and CSRF rejection happen before any bank call',async()=>{
 const app=harness();assert.equal((await app.send('prepare_transfer',instruction,'bad')).status,403);
 assert.equal((await app.send('prepare_transfer',instruction,undefined,'https://evil.invalid')).status,403);assert.equal(app.calls,0);
});
test('staff cannot stage customer financial instructions',async()=>{
 const app=harness('staff');assert.equal((await app.send('prepare_transfer')).status,403);assert.equal(app.calls,0);
});

test('credential rotation cannot hide an unresolved transfer and permit a replacement',async()=>{
 const app=harness();await app.send('prepare_transfer');const previous=process.env.CEDAR_CUSTOMER_TOKEN;
 try {
  process.env.CEDAR_CUSTOMER_TOKEN='rotated-customer-credential';
  assert.equal((await app.send('prepare_transfer',{...instruction,idempotency_key:'replacement'})).status,503);
  assert.equal(app.calls,0);
 } finally {process.env.CEDAR_CUSTOMER_TOKEN=previous;}
});
