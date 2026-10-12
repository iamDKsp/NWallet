const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {createNotificationService}=require('./notifications.cjs');
const PORT = Number(process.env.PORT || 3950);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const DATA_FILE = path.join(DATA_DIR, 'wallet.json');
const MAX_BODY = 8 * 1024 * 1024;
const MIME_TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2' };
function json(res, status, value) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
  res.end(JSON.stringify(value));
}
async function readBody(req) {
  let length = 0, chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAX_BODY) throw Object.assign(new Error('Arquivo muito grande (máximo de 8 MB).'),{status:413});
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('JSON inválido.'),{status:400}); }
}
async function createServer() {
  const {emptyState,validateLedger} = await import(pathToFileURL(path.join(PUBLIC_DIR,'finance.mjs')));
  await fsp.mkdir(DATA_DIR,{recursive:true});
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.DATA_DIR && process.env.DATA_DIR.includes('.test-data'));
  const SEED_FILE = path.resolve(process.env.SEED_FILE || path.join(__dirname, 'seed-wallet.json'));
  let stored;
  try {
    stored = JSON.parse(await fsp.readFile(DATA_FILE,'utf8'));
    validateLedger(stored.state);
    if (!Number.isSafeInteger(stored.revision) || stored.revision<0) throw new Error('Revisão inválida.');

    const shouldAutoSeed = !isTest && fs.existsSync(SEED_FILE) && (
      process.env.FORCE_SEED === 'true' ||
      !stored.state.accounts || stored.state.accounts.length === 0 ||
      !stored.state.accounts.some(a => a.id === 'account-santander') ||
      !stored.state.plans?.debts?.some(d => d.id === 'debt-consignado-1')
    );

    if (shouldAutoSeed) {
      try {
        const seed = JSON.parse(await fsp.readFile(SEED_FILE, 'utf8'));
        if (seed.state) {
          validateLedger(seed.state);
          await fsp.copyFile(DATA_FILE, path.join(DATA_DIR, 'wallet.backup-pre-nwfinance.json'));
          const nextRevision = Math.max((stored.revision || 0) + 1, seed.revision || 1);
          stored = { revision: nextRevision, state: seed.state };
          await fsp.writeFile(DATA_FILE, JSON.stringify(stored, null, 2), 'utf8');
          console.log('[NWallet] Banco de dados existente atualizado automaticamente com os dados reais do NWFINANCE!');
        }
      } catch (seedErr) {
        console.error('[NWallet] Aviso: Falha ao aplicar seed automático:', seedErr.message);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw new Error(`Não foi possível ler os dados salvos. O arquivo foi preservado: ${err.message}`);
    let seeded = false;
    if (!isTest && fs.existsSync(SEED_FILE)) {
      try {
        const seed = JSON.parse(await fsp.readFile(SEED_FILE, 'utf8'));
        if (seed.state) {
          validateLedger(seed.state);
          stored = { revision: seed.revision || 1, state: seed.state };
          await fsp.writeFile(DATA_FILE, JSON.stringify(stored, null, 2), 'utf8');
          console.log('[NWallet] Base de dados inicializada com sucesso a partir de seed-wallet.json.');
          seeded = true;
        }
      } catch (seedErr) {
        console.error('[NWallet] Aviso: Falha ao inicializar com seed:', seedErr.message);
      }
    }
    if (!seeded) {
      stored = {revision:0,state:emptyState()};
    }
  }
  let writes = Promise.resolve();
  async function save(payload) {
    const job = writes.then(async()=> {
      if (!payload || payload.revision!==stored.revision) throw Object.assign(new Error('Os dados foram alterados em outra janela. Atualize e tente novamente.'),{status:409});
      try { validateLedger(payload.state); } catch (err) { throw Object.assign(err,{status:422}); }
      const next = {revision:stored.revision+1,state:payload.state};
      const temp = path.join(DATA_DIR,'wallet.tmp');
      if (fs.existsSync(DATA_FILE)) await fsp.copyFile(DATA_FILE,path.join(DATA_DIR,'wallet.previous.json'));
      const handle = await fsp.open(temp,'w',0o600);
      try { await handle.writeFile(JSON.stringify(next,null,2)); await handle.sync(); }
      finally { await handle.close(); }
      await fsp.rename(temp,DATA_FILE);
      stored = next;
      return stored;
    });
    writes = job.catch(()=>{});
    return job;
  }
  const notifications=await createNotificationService({dataDir:DATA_DIR,readWallet:()=>stored.state});
  const server=http.createServer(async(req,res)=> {
    try {
      const url = new URL(req.url,'http://localhost');
      if (url.pathname==='/health') return json(res,200,{status:'ok'});
      if(await notifications.handle(req,res,url,readBody,json))return;
      if (url.pathname==='/api/profile') {
        const PROFILE_FILE = path.join(DATA_DIR,'profile.json');
        if (req.method==='GET') {
          try {
            const data = await fsp.readFile(PROFILE_FILE,'utf8');
            return json(res,200,JSON.parse(data));
          } catch {
            return json(res,200,{});
          }
        }
        if (req.method==='PUT'||req.method==='POST') {
          const origin = req.headers.origin;
          if (origin && new URL(origin).host!==req.headers.host) return json(res,403,{error:'Origem não permitida.'});
          if (!req.headers['content-type']?.startsWith('application/json')) return json(res,415,{error:'Envie os dados como JSON.'});
          const body = await readBody(req);
          await fsp.mkdir(DATA_DIR,{recursive:true});
          const temp = path.join(DATA_DIR,'profile.tmp');
          await fsp.writeFile(temp,JSON.stringify(body,null,2),'utf8');
          await fsp.rename(temp,PROFILE_FILE);
          return json(res,200,body);
        }
        res.setHeader('Allow','GET, POST, PUT'); return json(res,405,{error:'Método não permitido.'});
      }
      if (url.pathname==='/api/wallet') {
        if (req.method==='GET') return json(res,200,stored);
        if (req.method==='PUT') {
          const origin = req.headers.origin;
          if (origin && new URL(origin).host!==req.headers.host) return json(res,403,{error:'Origem não permitida.'});
          if (!req.headers['content-type']?.startsWith('application/json')) return json(res,415,{error:'Envie os dados como JSON.'});
          return json(res,200,await save(await readBody(req)));
        }
        res.setHeader('Allow','GET, PUT'); return json(res,405,{error:'Método não permitido.'});
      }
      if (url.pathname==='/api/wallet/reload-seed' && req.method==='POST') {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host!==req.headers.host) return json(res,403,{error:'Origem não permitida.'});
        if (!fs.existsSync(SEED_FILE)) return json(res,404,{error:'Arquivo seed-wallet.json não encontrado.'});
        try {
          const seed = JSON.parse(await fsp.readFile(SEED_FILE,'utf8'));
          validateLedger(seed.state);
          await fsp.copyFile(DATA_FILE, path.join(DATA_DIR, 'wallet.backup-pre-reload.json')).catch(()=>{});
          const next = { revision: stored.revision + 1, state: seed.state };
          await fsp.writeFile(DATA_FILE, JSON.stringify(next, null, 2), 'utf8');
          stored = next;
          return json(res,200,{ status: 'ok', revision: stored.revision, message: 'Dados recarregados do seed com sucesso!' });
        } catch (e) {
          return json(res,500,{ error: `Falha ao recarregar seed: ${e.message}` });
        }
      }
      if (url.pathname==='/api/chat' && req.method==='POST') {
        const body = JSON.stringify(await readBody(req));
        const proxy = https.request('https://mellisa-wallet-226780236788.us-west1.run.app/api/chat', {method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}}, upstream=>{
          res.writeHead(upstream.statusCode,{'Content-Type':'application/json; charset=utf-8'}); upstream.pipe(res);
        });
        proxy.setTimeout(30000,()=>proxy.destroy(new Error('Tempo esgotado.')));
        proxy.on('error',()=>{ if (!res.headersSent) json(res,502,{error:'Assistente indisponível.'}); else res.end(); });
        proxy.end(body); return;
      }
      if (url.pathname.startsWith('/api/')) return json(res,404,{error:'Rota não encontrada.'});
      if (!['GET','HEAD'].includes(req.method)) return json(res,405,{error:'Método não permitido.'});
      const pathname = decodeURIComponent(url.pathname);
      const file = path.resolve(PUBLIC_DIR,'.'+(pathname==='/'?'/index.html':pathname));
      if (!file.startsWith(PUBLIC_DIR+path.sep)) return json(res,403,{error:'Caminho não permitido.'});
      try { if (!(await fsp.stat(file)).isFile()) throw new Error(); }
      catch { return json(res,404,{error:'Página não encontrada.'}); }
      res.writeHead(200,{'Content-Type':MIME_TYPES[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
      if (req.method==='HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    } catch (err) { if (!res.headersSent) json(res,err.status||500,{error:err.status?err.message:'Não foi possível salvar ou carregar os dados. Tente novamente.'}); }
  });
  const notificationTimer=setInterval(()=>notifications.tick().catch(()=>console.error('Não foi possível atualizar os lembretes.')),60000);
  notificationTimer.unref();
  server.on('listening',()=>notifications.tick().catch(()=>console.error('Não foi possível atualizar os lembretes.')));
  server.on('close',()=>clearInterval(notificationTimer));
  return server;
}
if (require.main===module) createServer().then(server=>server.listen(PORT,()=>console.log(`NWallet: http://localhost:${PORT}`))).catch(err=>{console.error(err.message);process.exitCode=1;});
module.exports = {createServer};
