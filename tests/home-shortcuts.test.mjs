import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinanceIntegration} from '../public/assets/finance-integration.mjs';

const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:value=>[typeof value==='function'?value():value,()=>{}],useEffect:()=>{}};
function nodes(tree){if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object')return [];return [tree,...(tree.children||[]).flatMap(nodes)];}

test('home shortcuts include only Minha agenda and Aniversários, navigating cleanly to wallet',()=>{
  const prior=globalThis.location;globalThis.location={search:''};
  try {
    let opened=0;const wallet=createFinanceIntegration(React,null,null),home=wallet.HomeConnections({onOpen:()=>opened++});
    const buttons=nodes(home).filter(n=>n.type==='button');
    assert.equal(buttons.length,2,'HomeConnections must render exactly 2 shortcuts');

    const agendaButton=buttons.find(n=>nodes(n).some(c=>c.type==='strong'&&c.children.includes('Minha agenda')));
    assert.ok(agendaButton,'Minha agenda button must exist');

    for(let i=0;i<2;i++){
      const birthdayButton=buttons.find(n=>nodes(n).some(c=>c.type==='strong'&&c.children.includes('Aniversários')));
      assert.ok(birthdayButton,'Aniversários button must exist');
      birthdayButton.props.onClick();
      const workspace=wallet.Workspace({});
      const selected=nodes(workspace).find(n=>n.type==='button'&&n.props['aria-current']==='page');
      assert.equal(selected.children[0],'Aniversários');
    }
    assert.equal(opened,2);
  }finally{globalThis.location=prior;}
});
