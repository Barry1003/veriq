const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadModule}=require('./load-module.cjs');
Object.assign(process.env,{DEMO_AUTH_ENABLED:'true',VERIQ_DATA_SOURCE:'api',VERIQ_UI_ORIGIN:'http://localhost:3001',VERIQ_API_URL:'http://127.0.0.1:8610',VERIQ_SESSION_SECRET:'veriq-test-signing-secret-32-characters',VERIQ_ADMIN_USERNAME:'administrator',VERIQ_ADMIN_PASSWORD:'synthetic-admin-password',VERIQ_INVESTIGATOR_USERNAME:'investigator',VERIQ_INVESTIGATOR_PASSWORD:'synthetic-investigator-password',VERIQ_ADMIN_TOKEN:'admin-backend-secret',VERIQ_INVESTIGATOR_TOKEN:'investigator-backend-secret'});
const auth=loadModule('../../shared/server/demo-session.ts');
test('Veriq readers are selected server-side for each authenticated role',async()=>{
 for(const [username,password,token] of [['administrator','synthetic-admin-password','admin-backend-secret'],['investigator','synthetic-investigator-password','investigator-backend-secret']]){
  const login=auth.authenticate('veriq',username,password);const calls=[];
  const {sessionVeriqApi}=loadModule('services/api/session-reader.ts',{'next/server':{connection:async()=>{}},'next/headers':{cookies:async()=>({get:()=>({value:login.value})})},fetch:async(url,options)=>{calls.push({url:String(url),token:options.headers.Authorization});return{ok:true,json:async()=>({subject:'server principal'})};}});
  const api=await sessionVeriqApi();await api.snapshot('access');assert.equal(calls[0].token,`Bearer ${token}`);
  const browser=await auth.sessionResponse(new Request('http://localhost:3001/api/session'),'veriq',login.value);
  const value=await browser.text();assert.equal(value.includes('backend-secret'),false);assert.equal(value.includes(password),false);
 }
});
test('investigator cannot use administration or source-registry pages',()=>{
 const principal=auth.authenticate('veriq','investigator','synthetic-investigator-password').session;
 for(const path of ['/administration','/onboarding','/data-sources'])assert.throws(()=>auth.authorize(principal,auth.pageRoles('veriq',path)),error=>error.status===403);
 assert.doesNotThrow(()=>auth.authorize(principal,auth.pageRoles('veriq','/knowledge')));
});
test('missing session or role credential cannot produce an API reader',async()=>{
 const unauthenticated=loadModule('services/api/session-reader.ts',{'next/server':{connection:async()=>{}},'next/headers':{cookies:async()=>({get:()=>undefined})}});
 await assert.rejects(unauthenticated.sessionVeriqApi(),error=>error.status===401);
 const login=auth.authenticate('veriq','investigator','synthetic-investigator-password');
 const previous=process.env.VERIQ_INVESTIGATOR_TOKEN;delete process.env.VERIQ_INVESTIGATOR_TOKEN;
 const resolver=loadModule('services/api/session-reader.ts',{'next/server':{connection:async()=>{}},'next/headers':{cookies:async()=>({get:()=>({value:login.value})})}});
 await assert.rejects(resolver.sessionVeriqApi(),error=>error.status===503);process.env.VERIQ_INVESTIGATOR_TOKEN=previous;
});
