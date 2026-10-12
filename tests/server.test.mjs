import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {emptyState,today} from '../public/finance.mjs';
import {upsertAppointment} from '../public/agenda.mjs';
const testRoot=path.resolve('.test-data');
await fs.mkdir(testRoot,{recursive:true});
const dataDir=await fs.mkdtemp(path.join(testRoot,'api-'));
process.env.DATA_DIR=dataDir;
const {createServer}=createRequire(import.meta.url)('../server.js');
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${server.address().port}`)));
const stop=server=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);});
test('API validates, saves, detects conflicting writes, restores on restart and protects files',async()=>{
  let server=await createServer(),url=await listen(server);
  try {
    const blank=await (await fetch(url+'/api/wallet')).json();assert.deepEqual(blank,{revision:0,state:emptyState()});
    const state={...emptyState(),accounts:[{id:'a',name:'Minha conta',bank:'Itaú',scope:'personal',kind:'bank',openingBalanceCents:12345,openingDate:today()}],cards:['Físico','Virtual'].map((name,i)=>({id:`card-${i}`,name,accountId:'a',scope:'personal',closingDay:25,dueDay:5,openingDebtCents:0,openingDueDate:today()}))};
    upsertAppointment(state,{title:'Reunião persistida',date:today(),time:'14:00',kind:'work',repeat:'weekly'});
    const put=(revision,state,extra={})=>fetch(url+'/api/wallet',{method:'PUT',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify({revision,state})});
    let response=await put(0,state);assert.equal(response.status,200);assert.equal((await response.json()).revision,1);
    response=await put(0,emptyState());assert.equal(response.status,409);
    response=await put(1,{...state,accounts:[{...state.accounts[0],openingBalanceCents:1.1}]});assert.equal(response.status,422);
    response=await put(1,{...state,accounts:[]});assert.equal(response.status,422);
    response=await put(1,{...state,appointments:[{...state.appointments[0],time:'25:00'}]});assert.equal(response.status,422);
    response=await put(1,state,{Origin:'https://other.example'});assert.equal(response.status,403);
    response=await put(1,state);assert.equal(response.status,200);
    assert.equal(JSON.parse(await fs.readFile(path.join(dataDir,'wallet.previous.json'),'utf8')).revision,1);
    const concurrent=await Promise.all([put(2,state),put(2,state)]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
    await stop(server);server=await createServer();url=await listen(server);
    const stored=await (await fetch(url+'/api/wallet')).json();assert.equal(stored.revision,3);assert.deepEqual(stored.state,state);
    assert.equal((await fetch(url+'/data/wallet.json')).status,404);
    // Test profile API
    const emptyProfile = await (await fetch(url+'/api/profile')).json();
    assert.deepEqual(emptyProfile, {});
    const profileRes = await fetch(url+'/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tarcisio', email: 'test@example.com', avatar: 'data:image/jpeg;base64,abc' })
    });
    assert.equal(profileRes.status, 200);
    const savedProfile = await profileRes.json();
    assert.equal(savedProfile.name, 'Tarcisio');
    const crossOrigin = await fetch(url+'/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.com' },
      body: JSON.stringify({ name: 'Hacked' })
    });
    assert.equal(crossOrigin.status, 403);
    const reloadedProfile = await (await fetch(url+'/api/profile')).json();
    assert.equal(reloadedProfile.avatar, 'data:image/jpeg;base64,abc');
    assert.equal((await fetch(url+'/%2e%2e%2fserver.js')).status,403);
    assert.equal((await fetch(url+'/finance.mjs')).headers.get('content-type'),'text/javascript; charset=utf-8');
    assert.equal((await fetch(url+'/prototipo.html')).status,200);
    const financePage=await fetch(url+'/financeiro.html');assert.equal(financePage.status,200);assert.match(await financePage.text(),/app.mjs/);
    assert.equal((await fetch(url+'/')).status,200);
    await stop(server);server=null;
    await fs.writeFile(path.join(dataDir,'wallet.json'),'invalid json');
    await assert.rejects(()=>createServer(),/arquivo foi preservado/);
    assert.equal(await fs.readFile(path.join(dataDir,'wallet.json'),'utf8'),'invalid json');
  } finally {
    if(server)await stop(server);
    const resolved=path.resolve(dataDir);
    assert.ok(resolved.startsWith(testRoot+path.sep));
    await fs.rm(resolved,{recursive:true,force:true});
  }
});
