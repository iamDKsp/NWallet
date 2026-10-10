// UI metadata only. Financial data, React state and original components stay in place.
(() => {
  const root=document.getElementById('root');
  if (!root) return;
  const navigation={'nav-home':'Início','nav-statistic':'Estatísticas','nav-wallet':'Carteira','nav-setting':'Ajustes'};
  const labels={...navigation,'notif-btn':'Notificações','desktop-notif-btn':'Notificações','add-card':'Adicionar cartão','add-card-desktop':'Adicionar cartão','ai-center-btn':'Abrir Nexus IA'};
  const iconLabels={'lucide-x':'Fechar','lucide-chevron-left':'Anterior','lucide-chevron-right':'Próximo','lucide-plus':'Adicionar','lucide-trash-2':'Excluir','lucide-pencil':'Editar'};
  let nextId=0,scheduled=false,opener=null,hadEntryPanel=false;
  function refine() {
    scheduled=false;
    for (const [id,label] of Object.entries(labels)) {
      const button=document.getElementById(id);
      if (!button) continue;
      button.setAttribute('aria-label',label);
      button.setAttribute('title',label);
      if (navigation[id]) {
        button.dataset.navLabel=label;
        const active=[...button.children].some(e=>e.classList.contains('absolute')&&e.classList.contains('bg-green-primary'));
        if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
        button.closest('nav')?.classList.add('nw-mobile-dock');
      }
    }
    root.querySelectorAll('button:not([aria-label])').forEach(button=>{
      if (button.textContent.trim()) return;
      for (const [svgClass,label] of Object.entries(iconLabels)) {
        if (!button.querySelector('svg.'+svgClass)) continue;
        button.setAttribute('aria-label',label);button.setAttribute('title',label);
        if (label==='Fechar') button.dataset.nwClose='';
        break;
      }
    });
    root.querySelectorAll('form').forEach(form=>{
      form.querySelectorAll('label').forEach(label=>{
        if (label.htmlFor) return;
        const fields=label.parentElement.querySelectorAll('input:not([type="file"]),select,textarea');
        if (fields.length!==1) return;
        const field=fields[0];field.id||=`nw-field-${++nextId}`;label.htmlFor=field.id;
      });
      const panel=form.parentElement?.parentElement,heading=panel?.querySelector('h3');
      if (!heading||!/^Nova (Despesa|Receita)$/.test(heading.textContent.trim())) return;
      panel.classList.add('nw-entry-panel');panel.parentElement.classList.add('nw-entry-overlay');
      panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
      heading.id||=`nw-dialog-${++nextId}`;panel.setAttribute('aria-labelledby',heading.id);
      const amount=form.querySelector('input[type="number"]');
      if (amount) { amount.setAttribute('aria-label','Valor do lançamento');amount.setAttribute('inputmode','decimal'); }
    });
    root.querySelectorAll('p').forEach(p=>{
      const text=p.textContent.trim();
      p.classList.toggle('nw-amount-expense',/^[-−]\s*R\$/.test(text));
      p.classList.toggle('nw-amount-income',/^\+\s*R\$/.test(text));
    });
    const hasEntryPanel=!!root.querySelector('.nw-entry-panel');
    if(hadEntryPanel&&!hasEntryPanel&&opener?.isConnected)opener.focus({preventScroll:true});
    hadEntryPanel=hasEntryPanel;
  }
  new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(refine);}}).observe(root,{childList:true,subtree:true,characterData:true});
  root.addEventListener('click',event=>{
    if(!root.querySelector('.nw-entry-panel'))opener=event.target.closest('button');
    if(!scheduled){scheduled=true;requestAnimationFrame(refine);}
  },true);
  document.addEventListener('keydown',event=>{
    const panel=root.querySelector('.nw-entry-panel');
    if (!panel) return;
    if (event.key==='Escape') {
      const close=panel.querySelector('[data-nw-close]');
      if (close) { event.preventDefault();close.click(); }
    }
    if (event.key==='Tab') {
      const fields=[...panel.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter(e=>!e.disabled&&e.tabIndex>=0&&e.getClientRects().length);
      if (!fields.length) return;
      const first=fields[0],last=fields[fields.length-1];
      if (event.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))) { event.preventDefault();last.focus(); }
      else if (!event.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))) { event.preventDefault();first.focus(); }
    }
  });
  refine();
})();
