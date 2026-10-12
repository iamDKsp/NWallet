const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const webpush=require('web-push');
const problem=(message,status=400)=>Object.assign(new Error(message),{status});
function validSubscription(sub) {
  let url;try{url=new URL(sub?.endpoint);}catch{throw problem('Inscrição push inválida.');}
  const host=url.hostname;
  const isApple=host==='web.push.apple.com'||host==='api.push.apple.com'||host==='push.apple.com'||host.endsWith('.push.apple.com');
  const isGoogle=host==='fcm.googleapis.com'||host==='android.googleapis.com'||host.endsWith('.fcm.googleapis.com');
  const isMozilla=host==='updates.push.services.mozilla.com'||host.endsWith('.push.services.mozilla.com');
  const isWindows=host.endsWith('.notify.windows.com');
  if(url.protocol!=='https:'||url.port||url.username||url.password||url.hash||sub.endpoint.length>4096||!(isApple||isGoogle||isMozilla||isWindows))throw problem('Servidor de push não reconhecido.');
  if(!sub.keys||typeof sub.keys.p256dh!=='string'||typeof sub.keys.auth!=='string')throw problem('Chaves de inscrição inválidas.');
  const p256dh=sub.keys.p256dh.trim(),auth=sub.keys.auth.trim();
  if(!/^[-_A-Za-z0-9+/]{86,88}={0,2}$/.test(p256dh)||!/^[-_A-Za-z0-9+/]{21,24}={0,2}$/.test(auth))throw problem('Chaves de inscrição inválidas.');
  return {endpoint:sub.endpoint,keys:{p256dh,auth}};
}
const tokenHash=token=>crypto.createHash('sha256').update(token).digest('hex');
const validToken=token=>typeof token==='string'&&/^[a-f0-9]{64}$/.test(token);
async function createNotificationService({dataDir,readWallet,send,now=()=>new Date()}) {
  const {defaultReminderSettings,validateReminderSettings,dailyReminder,saoPauloClock}=await import(pathToFileURL(path.join(__dirname,'public/reminders.mjs')));
  const file=path.join(dataDir,'notifications.json');
  let store;
  try{store=JSON.parse(await fs.readFile(file,'utf8'));validateReminderSettings(store.settings);if(!store.keys?.privateKey||!store.keys.publicKey||!Array.isArray(store.devices))throw new Error('Formato inválido.');}
  catch(err){if(err.code!=='ENOENT')throw new Error('O arquivo de notificações foi preservado, mas não pôde ser lido.');store={settings:defaultReminderSettings(),keys:webpush.generateVAPIDKeys(),devices:[]};await fs.writeFile(file,JSON.stringify(store),{mode:0o600});}
  let queue=Promise.resolve();
  function mutate(fn){const job=queue.then(async()=>{const next=structuredClone(store),result=await fn(next);const tmp=file+'.tmp';await fs.writeFile(tmp,JSON.stringify(next),{mode:0o600});await fs.rename(tmp,file);store=next;return result;});queue=job.catch(()=>{});return job;}
  const sender=send||((subscription,payload)=>webpush.sendNotification(subscription,JSON.stringify(payload),{vapidDetails:{subject:process.env.VAPID_SUBJECT||'mailto:contato@nwallet.teltech.com.br',...store.keys},TTL:3600,timeout:10000,urgency:'normal'}));
  function deviceFor(state,token){if(!validToken(token))return;return state.devices.find(d=>d.tokenHash===tokenHash(token));}
  const status=token=>{const d=deviceFor(store,token);return {publicKey:store.keys.publicKey,settings:store.settings,subscribed:!!d,lastSentDay:d?.lastSentDay||null,lastError:d?.lastError||null,deviceCount:store.devices.length,timeZone:'America/Sao_Paulo'};};
  async function handle(req,res,url,body,json) {
    if(!url.pathname.startsWith('/api/notifications'))return false;
    if(req.method==='GET'&&url.pathname==='/api/notifications'){json(res,200,status(req.headers.authorization?.replace(/^Bearer /,'')));return true;}
    if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw problem('Origem não permitida.',403);
    if(!req.headers['content-type']?.startsWith('application/json'))throw problem('Envie os dados como JSON.',415);
    const data=await body(req),token=req.headers.authorization?.replace(/^Bearer /,'');
    if(!validToken(token))throw problem('Identificador do aparelho inválido.',401);
    if(req.method==='PUT'&&url.pathname==='/api/notifications/settings'){
      const settings=validateReminderSettings(data);await mutate(state=>{state.settings=settings;});json(res,200,status(token));return true;
    }
    if(req.method==='POST'&&url.pathname==='/api/notifications/subscribe'){
      const subscription=validSubscription(data.subscription);
      await mutate(state=>{
        const existing=deviceFor(state,token),owner=state.devices.find(d=>d.subscription.endpoint===subscription.endpoint);
        if(owner&&owner!==existing)throw problem('Este aparelho já está vinculado. Desative os avisos antes de vinculá-lo novamente.',409);
        if(existing)existing.subscription=subscription;
        else {if(state.devices.length>=20)throw problem('Limite de aparelhos atingido.');state.devices.push({tokenHash:tokenHash(token),subscription,lastSentDay:null,nextAttempt:0});}
      });json(res,200,status(token));return true;
    }
    if(req.method==='POST'&&url.pathname==='/api/notifications/unsubscribe'){
      await mutate(state=>{state.devices=state.devices.filter(d=>d.tokenHash!==tokenHash(token));});json(res,200,status(token));return true;
    }
    if(req.method==='POST'&&url.pathname==='/api/notifications/test'){
      await mutate(async state=>{
        const d=deviceFor(state,token);if(!d)throw problem('Ative as notificações neste aparelho primeiro.');
        if(d.lastTest&&now().getTime()-d.lastTest<30000)throw problem('Aguarde 30 segundos antes de testar novamente.',429);
        try{await sender(d.subscription,{title:'NWallet · Teste de notificação',body:'Este aparelho está pronto para receber seus lembretes financeiros.',tag:'nwallet-test',url:'/?view=notifications'});d.lastTest=now().getTime();d.lastError=null;}
        catch{throw problem('O serviço push não aceitou o teste. Confira a conexão e tente novamente.',502);}
      });json(res,200,{accepted:true});return true;
    }
    if(req.method==='POST'&&url.pathname==='/api/notifications/test-birthday'){
      await mutate(async state=>{
        const d=deviceFor(state,token);if(!d)throw problem('Ative as notificações neste aparelho primeiro.');
        if(d.lastTest&&now().getTime()-d.lastTest<30000)throw problem('Aguarde 30 segundos antes de testar novamente.',429);
        try{await sender(d.subscription,{title:'NWallet · Aniversário Hoje! 🎉',body:'🎂 Hoje é aniversário de teste! Notificações de aniversário ativas no seu iPhone.',tag:'nwallet-test-bday',url:'/?view=birthdays'});d.lastTest=now().getTime();d.lastError=null;}
        catch{throw problem('O serviço push não aceitou o teste. Confira a conexão e tente novamente.',502);}
      });json(res,200,{accepted:true});return true;
    }
    json(res,404,{error:'Rota de notificações não encontrada.'});return true;
  }
  async function tick(){
    if(!store.settings.enabled||!store.devices.length)return;
    const time=now(),clock=saoPauloClock(time);
    if(clock.time<store.settings.time)return;
    const payload=dailyReminder(readWallet(),store.settings,clock.date);if(!payload)return;
    await mutate(async state=>{
      for(const d of [...state.devices]){
        if(d.lastSentDay>=clock.date||d.nextAttempt>time.getTime())continue;
        const currentPayload=dailyReminder(readWallet(),state.settings,clock.date);if(!currentPayload||clock.time<state.settings.time)return;
        try{await sender(d.subscription,currentPayload);d.lastSentDay=clock.date;d.lastError=null;d.nextAttempt=0;}
        catch(err){
          if([404,410].includes(err.statusCode))state.devices=state.devices.filter(other=>other!==d);
          else{d.lastError='Não foi possível entregar o último aviso. Nova tentativa em 15 minutos.';d.nextAttempt=time.getTime()+15*60000;}
        }
      }
    });
  }
  return {handle,tick,status};
}
module.exports={createNotificationService,validSubscription};
