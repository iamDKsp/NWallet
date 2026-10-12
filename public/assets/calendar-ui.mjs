import {today,addMonths,money,validDate} from '../finance.mjs';
import {APPOINTMENT_KINDS,REPEATS,appointmentsOf,upsertAppointment,archiveAppointment,toggleAppointment,calendarDays,monthRange,navigateCalendar,shiftDays,weekStart,filterCalendarItems,localDateLabel,dayLabel} from '../agenda.mjs';

const paths={
  calendar:'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  plus:'M12 5v14 M5 12h14',left:'m14 6-6 6 6 6',right:'m10 6 6 6-6 6',down:'m6 9 6 6 6-6',
  check:'m5 12 4 4 10-10',close:'m6 6 12 12 M18 6 6 18',clock:'M12 8v4l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  repeat:'M20 7H4l4-4 M4 7l4 4 M4 17h16l-4-4 M20 17l-4 4',
  birthday:'M4 21v-9h16v9 M2 21h20 M7 8v4 M12 8v4 M17 8v4 M4 16c3-4 5 4 8 0s5 4 8 0 M7 4h.01 M12 4h.01 M17 4h.01',
  financial:'M3 5h18v14H3z M3 10h18 M6 15h5',
  work:'M8 6V3h8v3 M3 7h18v14H3z M3 12h18 M10 12v3h4v-3',
  edit:'m16 3 5 5-12 12H4v-5z M14 5l5 5',trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  arrow:'M5 12h14 M13 6l6 6-6 6',undo:'M9 5 4 10l5 5 M4 10h10a6 6 0 0 1 0 12'
};
const fullDate=date=>localDateLabel(date,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const sourceName=item=>item.source==='appointment'?APPOINTMENT_KINDS[item.kind]:item.source==='birthday'?'Aniversário':item.source==='financial'?(item.financialDirection==='income'?'A receber':'A pagar'):'Movimentação';
const sourceIcon=item=>item.source==='birthday'?'birthday':['financial','transaction'].includes(item.source)?'financial':item.kind==='work'?'work':'calendar';

export function createCalendarUI(React,{useWallet,Modal,Presence,calendarItems,selectWorkspaceSection,createPortal}) {
  const h=React.createElement;
  const icon=name=>h('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:paths[name]||paths.calendar}));
  const button=(label,onClick,kind='',ico,props={})=>h('button',{type:'button',className:'nc-button '+kind,onClick,...props},ico&&icon(ico),h('span',{},label));
  const field=(label,input,full=false)=>h('label',{className:'nf-field'+(full?' full':'')},h('span',{},label),input);
  const input=(name,value,type='text',props={})=>h('input',{name,defaultValue:value||'',type,...props});

  function AppointmentForm({item,date,onClose,onSave}) {
    const [repeat,setRepeat]=React.useState(item?.repeat||'none');
    return h(Modal,{title:item?'Editar compromisso':'Novo compromisso',onClose,submit:item?'Salvar alterações':'Criar compromisso',onSubmit:fd=>onSave({id:item?.id,title:fd.get('title'),date:fd.get('date'),time:fd.get('time'),location:fd.get('location'),notes:fd.get('notes'),kind:fd.get('kind'),repeat:fd.get('repeat'),endDate:fd.get('endDate')}),hint:item?.repeat!=='none'&&item?'A edição altera a série inteira. Cada ocorrência pode ser concluída separadamente.':'Deixe o horário vazio para um compromisso sem hora marcada.'},
      field('Título do compromisso',input('title',item?.title,'text',{required:true,maxLength:160,placeholder:'Ex.: Reunião com cliente'}),true),
      field('Data',input('date',item?.date||date,'date',{required:true,min:'2000-01-01',max:'2200-12-31'})),
      field('Horário (opcional)',input('time',item?.time,'time')),
      field('Categoria',h('select',{name:'kind',defaultValue:item?.kind||'personal'},Object.entries(APPOINTMENT_KINDS).map(([value,label])=>h('option',{key:value,value},label)))),
      field('Repetição',h('select',{name:'repeat',value:repeat,onChange:e=>setRepeat(e.target.value)},Object.entries(REPEATS).map(([value,label])=>h('option',{key:value,value},label)))),
      repeat!=='none'&&field('Repetir até (opcional)',input('endDate',item?.endDate,'date',{min:item?.date||date,max:'2200-12-31'}),true),
      field('Local ou link (opcional)',input('location',item?.location,'text',{maxLength:240,placeholder:'Ex.: Escritório, sala 2'}),true),
      field('Observações (opcional)',h('textarea',{name:'notes',defaultValue:item?.notes||'',rows:3,maxLength:2000,placeholder:'Detalhes que você quer lembrar'}),true));
  }

  function Calendar({isDarkMode=true,onOpenWallet}) {
    const nw=useWallet(),[selected,setSelected]=React.useState(today),[view,setView]=React.useState(()=>typeof window!=='undefined'&&window.innerWidth>=900?'month':'week');
    const [filter,setFilter]=React.useState('all'),[showCompleted,setShowCompleted]=React.useState(false),[modal,setModal]=React.useState(null),[notice,setNotice]=React.useState(null),[error,setError]=React.useState('');
    const grid=React.useRef(),focusDate=React.useRef(null);
    const days=calendarDays(selected,view==='month'?'month':'week'),range=monthRange(selected);
    const start=[days[0]<range.start?days[0]:range.start,'2000-01-01'].sort().at(-1);
    const nextWeek=shiftDays(selected,7),end=[[days.at(-1),range.end,nextWeek].sort().at(-1),'2200-12-31'].sort()[0];
    const items=React.useMemo(()=>calendarItems(nw.state,start,end,selected),[nw.state,start,end,selected]);
    const visible=filterCalendarItems(items,filter,showCompleted);
    const byDate=React.useMemo(()=>{const map=new Map();for(const item of visible){if(!map.has(item.date))map.set(item.date,[]);map.get(item.date).push(item);}return map;},[items,filter,showCompleted]);
    const dayItems=byDate.get(selected)||[],monthItems=visible.filter(i=>i.date>=range.start&&i.date<=range.end);
    const nextItems=visible.filter(i=>i.date>selected&&i.date<=nextWeek&&!i.completed&&i.source!=='transaction').slice(0,3);
    const pendingCount=items.filter(i=>i.source==='appointment'&&i.completed&&i.date===selected).length;
    const open=(kind,item)=>{setError('');setModal({kind,item,key:Date.now()});};
    const close=()=>setModal(null);
    const choose=date=>{if(validDate(date)){setSelected(date);setError('');}};
    React.useEffect(()=>{if(focusDate.current){grid.current?.querySelector(`[data-date="${focusDate.current}"]`)?.focus();focusDate.current=null;}},[selected]);
    React.useEffect(()=>{
      if(!modal||!createPortal)return;
      const root=document.getElementById('root'),wasInert=root?.inert;
      if(root)root.inert=true;
      return()=>{if(root)root.inert=wasInert;};
    },[!!modal]);
    async function mutate(change,message,undoId){
      setError('');
      try{await nw.save(change);setNotice({text:message,undoId});return true;}catch(err){setError(err.message);return false;}
    }
    async function saveAppointment(data){
      await nw.save(s=>upsertAppointment(s,data));choose(data.date);setFilter('all');setNotice({text:data.id?'Compromisso atualizado.':'Compromisso criado e salvo.'});
    }
    const goToWallet=item=>{selectWorkspaceSection(item.section||'commitments');onOpenWallet?.();};
    const complete=item=>mutate(s=>toggleAppointment(s,item.appointmentId,item.date),item.completed?'Compromisso reaberto.':'Compromisso concluído.');
    const grouped=list=>{
      const groups=new Map();for(const item of list){if(!groups.has(item.date))groups.set(item.date,[]);groups.get(item.date).push(item);}
      return Array.from(groups,([date,rows])=>h('section',{key:date,className:'nc-agenda-group'},h('h4',{},dayLabel(date),h('span',{},localDateLabel(date,{day:'2-digit',month:'2-digit'}))),rows.map(renderItem)));
    };
    function renderItem(item){
      return h('article',{key:item.id,className:`nc-event ${item.source} ${item.kind||''}${item.completed?' completed':''}`},
        item.source==='appointment'?h('button',{type:'button',className:'nc-event-check','aria-label':`${item.completed?'Reabrir':'Concluir'} ${item.title}`,'aria-pressed':item.completed,disabled:nw.saving,onClick:()=>complete(item)},item.completed?icon('check'):h('span',{className:'nc-check-ring'})):
          h('span',{className:'nc-event-icon'},icon(sourceIcon(item))),
        h('button',{type:'button',className:'nc-event-body','aria-label':`Ver detalhes de ${item.title}`,onClick:()=>open('detail',item)},
          h('span',{className:'nc-event-meta'},h('span',{className:'nc-event-category'},sourceName(item)),item.time&&h('time',{dateTime:item.time},item.time),item.source==='appointment'&&item.repeat!=='none'&&icon('repeat')),
          h('strong',{},item.title.replace(/^🎂\s*/,'')),
          (item.location||item.description)&&h('span',{className:'nc-event-description'},item.location||item.description),
          Number.isSafeInteger(item.amountCents)&&h('span',{className:'nc-event-amount'},money(item.amountCents))),
        item.completed&&h('span',{className:'nc-done'},'Concluído'));
    }
    const emptyDay=()=>h('div',{className:'nc-empty'},h('span',{className:'nc-empty-icon'},icon('calendar')),h('strong',{},filter==='all'||filter==='appointments'?'Seu dia está livre':'Nenhum evento neste filtro'),h('p',{},pendingCount&&!showCompleted?`${pendingCount} compromisso(s) concluído(s). Use “Concluídos” para ver.`:'Escolha outra data ou organize seu próximo compromisso.'),button('Adicionar compromisso',()=>open('new'),'subtle','plus'));

    function modalView(){
      if(!modal)return null;
      const item=modal.item,original=item&&appointmentsOf(nw.state).find(a=>a.id===item.appointmentId);
      if(modal.kind==='new'||modal.kind==='edit')return h(AppointmentForm,{key:modal.key,item:modal.kind==='edit'?original:undefined,date:selected,onClose:close,onSave:saveAppointment});
      if(modal.kind==='delete')return h(Modal,{key:modal.key,title:original.repeat==='none'?'Excluir compromisso':'Excluir série de compromissos',onClose:close,submit:'Excluir',onSubmit:async()=>{await nw.save(s=>archiveAppointment(s,original.id));setNotice({text:original.repeat==='none'?'Compromisso excluído.':'Série de compromissos excluída.',undoId:original.id});},hint:'Você poderá desfazer a exclusão no aviso da agenda.'},h('p',{className:'full nc-delete-copy'},original.repeat==='none'?`Excluir “${original.title}” da agenda?`:`Excluir todas as ocorrências de “${original.title}”, incluindo as futuras?`));
      return h(Modal,{key:modal.key,title:'Detalhes do evento',onClose:close,plain:true},h('div',{className:'nc-detail'},
        h('span',{className:'nc-detail-badge'},icon(sourceIcon(item)),sourceName(item)),h('h4',{},item.title.replace(/^🎂\s*/,'')),
        h('p',{},icon('calendar'),fullDate(item.date)),h('p',{},icon('clock'),item.time||'Sem horário marcado'),
        item.location&&h('p',{},icon('pin'),item.location),item.repeat&&item.repeat!=='none'&&h('p',{},icon('repeat'),REPEATS[item.repeat]),
        Number.isSafeInteger(item.amountCents)&&h('strong',{className:'nc-detail-amount'},money(item.amountCents)),
        (item.notes||item.description)&&h('p',{className:'nc-detail-notes'},item.notes||item.description),
        item.source==='appointment'?h('div',{className:'nc-detail-actions'},
          button(item.completed?'Reabrir compromisso':'Concluir compromisso',async()=>{if(await mutate(s=>toggleAppointment(s,item.appointmentId,item.date),item.completed?'Compromisso reaberto.':'Compromisso concluído.'))close();},'primary','check',{disabled:nw.saving}),
          button('Editar',()=>open('edit',item),'','edit',{disabled:nw.saving}),button('Excluir',()=>open('delete',item),'danger','trash',{disabled:nw.saving})):
          h('div',{className:'nc-detail-actions'},button(item.source==='birthday'?'Gerenciar aniversário':item.source==='transaction'?'Ver registro':'Gerenciar no financeiro',()=>goToWallet(item),'primary','arrow')),
        error&&h('p',{className:'nc-error',role:'alert'},error)));
    }
    return h('section',{className:'nf-theme nc-calendar','data-theme':isDarkMode?'dark':'light','aria-label':'Agenda de compromissos'},
      h('header',{className:'nc-header'},h('div',{},h('p',{className:'nc-eyebrow'},'Sua programação'),h('h2',{},'Agenda')),button('Novo compromisso',()=>open('new'),'primary','plus',{disabled:!nw.loaded||nw.saving})),
      !nw.loaded?h('p',{className:'nc-loading',role:'status'},nw.error||'Carregando sua agenda…'):h(React.Fragment,{},
        notice&&h('div',{className:'nc-notice',role:'status'},h('span',{},icon('check'),notice.text),notice.undoId&&button('Desfazer',()=>mutate(s=>archiveAppointment(s,notice.undoId,false),'Compromisso restaurado.'),'quiet','undo',{disabled:nw.saving}),h('button',{type:'button',className:'nc-icon-button','aria-label':'Fechar aviso',onClick:()=>setNotice(null)},icon('close'))),
        (error||nw.error)&&h('p',{className:'nc-error',role:'alert'},error||nw.error),
        h('div',{className:'nc-layout'},h('div',{className:'nc-date-panel'},
          h('div',{className:'nc-month-nav'},h('label',{className:'nc-month-picker'},h('span',{},localDateLabel(selected,{month:'long'}),h('small',{},selected.slice(0,4))),icon('down'),h('input',{type:'month','aria-label':'Ir para mês',value:selected.slice(0,7),min:'2000-01',max:'2200-12',onChange:e=>{if(e.target.value)choose(addMonths(e.target.value+'-01',0,Number(selected.slice(8))));}})),
            h('div',{className:'nc-date-actions'},button('Hoje',()=>choose(today()),'today'),h('button',{type:'button',className:'nc-icon-button','aria-label':view==='week'?'Semana anterior':'Mês anterior',onClick:()=>choose(navigateCalendar(selected,view,-1))},icon('left')),h('button',{type:'button',className:'nc-icon-button','aria-label':view==='week'?'Próxima semana':'Próximo mês',onClick:()=>choose(navigateCalendar(selected,view,1))},icon('right')))),
          h('div',{className:'nc-view-switch','aria-label':'Visualização da agenda'},[['week','Semana'],['month','Mês'],['agenda','Agenda']].map(([id,label])=>h('button',{key:id,type:'button','aria-pressed':view===id,className:view===id?'active':'',onClick:()=>setView(id)},label))),
          view!=='agenda'&&h('div',{className:'nc-days '+view,ref:grid,'aria-label':view==='month'?'Dias do mês':'Dias da semana'},
            view==='month'&&['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((label,i)=>h('span',{key:'weekday'+i,className:'nc-weekday','aria-hidden':true},label)),
            days.map(date=>{const events=byDate.get(date)||[],sources=Array.from(new Set(events.map(i=>i.source==='transaction'?'financial':i.source))).slice(0,3);return h('button',{key:date,type:'button','data-date':date,'aria-label':`${fullDate(date)}${date===today()?', hoje':''}, ${events.length} evento${events.length===1?'':'s'}`,'aria-pressed':date===selected,'aria-current':date===today()?'date':undefined,className:'nc-day'+(date===selected?' selected':'')+(date===today()?' is-today':'')+(date.slice(0,7)!==selected.slice(0,7)?' outside':''),onClick:()=>choose(date),onKeyDown:e=>{const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];if(step!==undefined){e.preventDefault();const next=shiftDays(date,step);focusDate.current=next;choose(next);}}},
              view==='week'&&h('span',{className:'nc-day-weekday'},localDateLabel(date,{weekday:'short'}).replace('.','')),h('span',{className:'nc-day-number'},Number(date.slice(8))),h('span',{className:'nc-day-dots','aria-hidden':true},sources.map(source=>h('i',{key:source,className:source}))));})),
          h('div',{className:'nc-calendar-legend','aria-label':'Legenda'},h('span',{},h('i',{className:'appointment'}),'Compromissos'),h('span',{},h('i',{className:'financial'}),'Financeiro'),h('span',{},h('i',{className:'birthday'}),'Aniversários')),
          h('div',{className:'nc-filters'},h('label',{},h('span',{},'Exibir'),h('select',{'aria-label':'Filtrar eventos',value:filter,onChange:e=>setFilter(e.target.value)},[['all','Todos os eventos'],['appointments','Meus compromissos'],['finance','Financeiro'],['birthdays','Aniversários']].map(([value,label])=>h('option',{key:value,value},label)))),button('Concluídos',()=>setShowCompleted(!showCompleted),showCompleted?'completed-filter active':'completed-filter','check',{'aria-pressed':showCompleted})),
          view==='agenda'&&h('p',{className:'nc-month-summary'},`${monthItems.length} evento${monthItems.length===1?'':'s'} em ${localDateLabel(selected,{month:'long'})}.`)),
        h('div',{className:'nc-agenda-panel'},
          h('div',{className:'nc-agenda-heading'},h('div',{},h('h3',{},view==='agenda'?'Agenda do mês':dayLabel(selected)),h('p',{},view==='agenda'?localDateLabel(selected,{month:'long',year:'numeric'}):localDateLabel(selected,{day:'numeric',month:'long'}))),h('span',{className:'nc-event-count'},`${view==='agenda'?monthItems.length:dayItems.length} ${(view==='agenda'?monthItems.length:dayItems.length)===1?'evento':'eventos'}`)),
          view==='agenda'?(monthItems.length?grouped(monthItems):emptyDay()):(dayItems.length?h('div',{className:'nc-events'},dayItems.map(renderItem)):emptyDay()),
          view!=='agenda'&&nextItems.length>0&&h('div',{className:'nc-upcoming'},h('h4',{},'Nos próximos 7 dias'),nextItems.map(item=>h('button',{key:item.id,type:'button',className:'nc-upcoming-item',onClick:()=>choose(item.date)},h('span',{},h('b',{},Number(item.date.slice(8))),localDateLabel(item.date,{month:'short'}).replace('.','')),h('strong',{},item.title.replace(/^🎂\s*/,'')),icon('right'))))))),
      createPortal?createPortal(h('div',{className:'nf-theme nc-modal-host','data-theme':isDarkMode?'dark':'light'},h(Presence,{},modalView())),document.body):h('div',{className:'nc-modal-host'},h(Presence,{},modalView())));
  }
  return {Calendar};
}
