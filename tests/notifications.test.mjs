import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {emptyState,newPlans} from '../public/finance.mjs';
const {createNotificationService,validSubscription}=createRequire(import.meta.url)('../notifications.cjs');
const root=path.resolve('.test-data');
await fs.mkdir(root,{recursive:true});
const token='a'.repeat(64),otherToken='b'.repeat(64);
const sub={endpoint:'https://web.push.apple.com/test-device',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}};
function fixture(){return {...emptyState(),accounts:[{id:'a',name:'Conta',scope:'personal',kind:'bank',openingBalanceCents:100000,openingDate:'2026-01-01'}],plans:{...newPlans(),recurrences:[{id:'bill',name:'Pensão',type:'expense',amountMode:'fixed',amountCents:10000,accountId:'a',day:10,startMonth:'2026-10',active:true}]}};}
async function route(service,url,method,data={},device=token,origin='http://localhost:3950') {
  let result;
  const req={method,headers:{host:'localhost:3950',origin,authorization:`Bearer ${device}`,'content-type':'application/json'}};
  await service.handle(req,{},new URL(url,'http://localhost:3950'),async()=>data,(_res,status,body)=>{result={status,body};});
  return result;
}
async function remove(dir){assert.ok(path.resolve(dir).startsWith(root+path.sep));await fs.rm(dir,{recursive:true,force:true});}
test('push subscriptions reject arbitrary URLs and malformed keys',()=>{
  assert.deepEqual(validSubscription(sub),sub);
  for(const endpoint of ['http://127.0.0.1/private','https://web.push.apple.com.evil.test/x','https://example.test/x','https://web.push.apple.com:8443/x','https://user:pass@web.push.apple.com/x'])assert.throws(()=>validSubscription({...sub,endpoint}));
  assert.throws(()=>validSubscription({...sub,keys:{...sub.keys,auth:'invalid'}}));
});
test('scheduler sends once per São Paulo day per device, persists keys, stops when paid and removes expired devices',async()=>{
  const dir=await fs.mkdtemp(path.join(root,'push-'));let now=new Date('2026-10-11T11:59:00Z'),state=fixture(),sent=[];
  const options={dataDir:dir,readWallet:()=>state,now:()=>now,send:async(subscription,payload)=>{sent.push({subscription,payload});}};
  try {
    let service=await createNotificationService(options),key=service.status(token).publicKey;
    await route(service,'/api/notifications/subscribe','POST',{subscription:sub});
    await route(service,'/api/notifications/subscribe','POST',{subscription:sub});assert.equal(service.status(token).deviceCount,1);
    await assert.rejects(route(service,'/api/notifications/subscribe','POST',{subscription:sub},otherToken),/já está vinculado/);
    await service.tick();assert.equal(sent.length,0);
    now=new Date('2026-10-11T12:00:00Z');await Promise.all([service.tick(),service.tick()]);assert.equal(sent.length,1);
    assert.equal(service.status(token).lastSentDay,'2026-10-11');assert.ok(!JSON.stringify(sent[0].payload).includes('Pensão'));
    service=await createNotificationService(options);assert.equal(service.status(token).publicKey,key);await service.tick();assert.equal(sent.length,1);
    now=new Date('2026-10-12T01:00:00Z');await service.tick();assert.equal(sent.length,1);
    now=new Date('2026-10-12T12:00:00Z');await service.tick();assert.equal(sent.length,2);
    state.entries=[{id:'paid',type:'expense',status:'posted',date:'2026-10-12',amountCents:10000,accountId:'a',occurrenceKey:'recurrence:bill:2026-10'}];
    now=new Date('2026-10-13T12:00:00Z');await service.tick();assert.equal(sent.length,2);
    state.entries=[];service=await createNotificationService({...options,send:async()=>{throw Object.assign(new Error('Gone'),{statusCode:410});}});await service.tick();assert.equal(service.status(token).subscribed,false);
  }finally{await remove(dir);}
});
test('temporary delivery failures retry after 15 minutes; device controls and pause work without exposing secrets',async()=>{
  const dir=await fs.mkdtemp(path.join(root,'push-'));let now=new Date('2026-10-11T12:00:00Z'),attempts=0,failing=true;
  try{
    const service=await createNotificationService({dataDir:dir,readWallet:fixture,now:()=>now,send:async()=>{attempts++;if(failing)throw Object.assign(new Error('Unavailable'),{statusCode:503});}});
    await route(service,'/api/notifications/subscribe','POST',{subscription:sub});
    await service.tick();await service.tick();assert.equal(attempts,1);assert.ok(service.status(token).lastError);
    now=new Date('2026-10-11T12:15:00Z');failing=false;await service.tick();assert.equal(attempts,2);assert.equal(service.status(token).lastError,null);
    const status=await route(service,'/api/notifications','GET');assert.equal(status.status,200);assert.ok(!JSON.stringify(status.body).includes(sub.endpoint));assert.ok(!JSON.stringify(status.body).includes('privateKey'));
    await assert.rejects(route(service,'/api/notifications/settings','PUT',{enabled:false},token,'https://other.test'),/Origem/);
    await route(service,'/api/notifications/settings','PUT',{...service.status(token).settings,enabled:false});
    now=new Date('2026-10-12T12:00:00Z');await service.tick();assert.equal(attempts,2);
    await route(service,'/api/notifications/test','POST');assert.equal(attempts,3);await assert.rejects(route(service,'/api/notifications/test','POST'),/30 segundos/);
    await route(service,'/api/notifications/unsubscribe','POST');assert.equal(service.status(token).subscribed,false);
  }finally{await remove(dir);}
});
