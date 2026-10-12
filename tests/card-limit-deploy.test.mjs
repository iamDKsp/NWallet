import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';

test('server restart initializes approved limits once using a backup and preserves existing financial records',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'nwallet-credit-deploy-'));
  const seeded=JSON.parse(await fs.readFile(new URL('../seed-wallet.json',import.meta.url),'utf8'));
  const legacy=structuredClone(seeded);legacy.revision=41;
  for(const card of legacy.state.cards)delete card.creditLimitCents;
  legacy.state.cards[1].creditLimitCents=0;
  await fs.writeFile(path.join(dir,'wallet.json'),JSON.stringify(legacy));
  process.env.DATA_DIR=dir;process.env.SEED_FILE=path.resolve('seed-wallet.json');process.env.NODE_ENV='production';
  const {createServer}=createRequire(import.meta.url)('../server.js');
  const server=await createServer();server.close();
  const updated=JSON.parse(await fs.readFile(path.join(dir,'wallet.json'),'utf8'));
  assert.equal(updated.revision,42);assert.equal(updated.state.cards[0].creditLimitCents,10000);assert.equal(updated.state.cards[1].creditLimitCents,0);assert.equal(updated.state.cards[2].creditLimitCents,500000);
  assert.deepEqual(updated.state.accounts,legacy.state.accounts);assert.deepEqual(updated.state.entries,legacy.state.entries);assert.deepEqual(updated.state.plans,legacy.state.plans);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir,'wallet.previous.json'),'utf8')),legacy);
  const again=await createServer();again.close();
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir,'wallet.json'),'utf8')),updated);
});
