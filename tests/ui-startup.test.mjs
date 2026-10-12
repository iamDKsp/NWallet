import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

// Execute the original root's actual hook initialization in strict module mode.
// Effects and rendered components are intentionally outside this small harness.
const bundle=await fs.readFile(new URL('../public/assets/index-DGDPhK2a.js',import.meta.url),'utf8');
const start=bundle.indexOf('function bie()');
const end=bundle.indexOf('if (E) {',start);
assert.ok(start>=0&&end>start,'Original root component must be present.');
const initialization=bundle.slice(start,end)+'return {tiltX:he,tiltY:fe,orientation:me,mobile:E,screen:e};}';
for(const width of [390,1280])test(`original UI initializes motion and orientation state at ${width}px without undeclared globals`,()=>{
  const hooks={useState:value=>[typeof value==='function'?value():value,()=>{}],useRef:value=>({current:value}),useEffect:()=>{}};
  const context=vm.createContext({A:hooks,pd:hooks,QC:()=>({scrollY:{}}),b$:()=>{},li:value=>({value,set(){}}),nwFinance:{useWallet:()=>({loaded:false,state:{}})},window:{innerWidth:width,navigator:{standalone:false}},location:{search:''},URLSearchParams,localStorage:{getItem:()=>null}});
  const result=vm.runInContext(`'use strict'; (${initialization})()`,context);
  assert.equal(result.tiltX.value,0);assert.equal(result.tiltY.value,0);assert.equal(result.orientation,'pending');assert.equal(result.mobile,width<768);assert.equal(result.screen,'Home');
  for(const name of ['he','fe','me','L'])assert.equal(Object.hasOwn(context,name),false,`${name} must remain local to the component`);
});
