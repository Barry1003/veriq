const { test } = require('node:test');
const assert = require('node:assert/strict');
const { configure, session }=require('./session-fixture.cjs');
const { loadModule }=require('./load-module.cjs');
configure();
test('each Cedar role has a separate page boundary and no backend credential in session',()=>{
 for(const role of ['customer','staff','operator']){
  const {auth,...login}=session(role);const principal=auth.readSession('cedar',login.value);
  assert.equal(principal.role,role);
  for(const [path,wanted] of [['/banking','customer'],['/staff/transactions','staff'],['/operator','operator']]) {
   if(role===wanted)assert.doesNotThrow(()=>auth.authorize(principal,auth.pageRoles('cedar',path)));
   else assert.throws(()=>auth.authorize(principal,auth.pageRoles('cedar',path)),error=>error.status===403);
  }
  assert.equal(Buffer.from(login.value.split('.')[0],'base64url').toString().includes('bearer'),false);
 }
});
test('session tampering, expiry, other application and password rotation fail closed',()=>{
 const login=session();const auth=login.auth;
 assert.throws(()=>auth.readSession('cedar',login.value+'x'));
 const body=JSON.parse(Buffer.from(login.value.split('.')[0],'base64url'));
 body.role='operator';const forged=Buffer.from(JSON.stringify(body)).toString('base64url')+'.'+login.value.split('.')[1];
 assert.throws(()=>auth.readSession('cedar',forged));
 const previous=process.env.CEDAR_CUSTOMER_PASSWORD;process.env.CEDAR_CUSTOMER_PASSWORD='rotated-password-123';
 assert.throws(()=>auth.readSession('cedar',login.value));process.env.CEDAR_CUSTOMER_PASSWORD=previous;
});
test('login cookie works over configured localhost HTTP and requires explicit setup',async()=>{
 const {auth}=session();
 const response=await auth.sessionResponse(new Request('http://localhost:3000/api/session',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify({username:'customer',password:'synthetic-CUSTOMER-password'})}),'cedar');
 assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);assert.doesNotMatch(cookie,/; Secure/);
 assert.equal(JSON.stringify(await response.json()).includes('bearer'),false);
 const old=process.env.CEDAR_SESSION_SECRET;delete process.env.CEDAR_SESSION_SECRET;
 assert.throws(()=>auth.readSession('cedar'),error=>error.status===503);process.env.CEDAR_SESSION_SECRET=old;
});
test('customer server reads cannot select staff or feed credentials',async()=>{
 const login=session('customer');
 const api=loadModule('lib/cedar-api.ts',{'next/headers':{cookies:async()=>({get:()=>({value:login.value})})},fetch:async()=>{throw new Error('Bank should not be called');}});
 await assert.rejects(api.bankGet('/v1/institutional/documents'),error=>error.status===403);
 await assert.rejects(api.bankGetRecentOperationalFeed(),error=>error.status===403);
});

test('expired sessions cannot be used, including after browser restart',()=>{
 const login=session();const later=Date.now()+5*60*60*1000;
 const auth=loadModule('../../shared/server/demo-session.ts',{Date:class extends Date{static now(){return later;}}});
 assert.throws(()=>auth.readSession('cedar',login.value),error=>error.status===401);
});
