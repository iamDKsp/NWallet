import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinanceIntegration} from '../public/assets/finance-integration.mjs';

const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:value=>[typeof value==='function'?value():value,()=>{}],useEffect:()=>{}};
function nodes(tree){if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object')return [];return [tree,...(tree.children||[]).flatMap(nodes)];}

test('home shortcuts select their own wallet section before navigation, including repeated visits',()=>{
  const prior=globalThis.location;globalThis.location={search:''};
  try {
    let opened=0;const wallet=createFinanceIntegration(React,null,null),home=wallet.HomeConnections({onOpen:()=>opened++});
    for(const [label,target] of [['Aniversários','Aniversários'],['Minha empresa','Empresa'],['CLT e folha','CLT e folha'],['Aniversários','Aniversários']]) {
      const button=nodes(home).find(n=>n.type==='button'&&nodes(n).some(child=>child.type==='strong'&&child.children.includes(label)));
      assert.ok(button);button.props.onClick();const workspace=wallet.Workspace({});
      const selected=nodes(workspace).find(n=>n.type==='button'&&n.props['aria-current']==='page');assert.equal(selected.children[0],target);
    }
    assert.equal(opened,4);
  }finally{globalThis.location=prior;}
});
