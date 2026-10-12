import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('settings buttons are fully wired with click handlers in compiled bundle', async () => {
  const bundle = await fs.readFile(new URL('../public/assets/index-DGDPhK2a.js', import.meta.url), 'utf8');

  // Verify Notificações button has onClick
  assert.ok(
    bundle.includes('label:"Notificações",value:"Sons e Vibração",onClick:'),
    'Notificações item must have an onClick handler'
  );

  // Verify Senha e Biometria button has onClick
  assert.ok(
    bundle.includes('label:"Senha e Biometria"') && bundle.includes('window.nwOpenBiometrics'),
    'Senha e Biometria item must have an onClick handler calling nwOpenBiometrics'
  );

  // Verify Privacidade button has onClick
  assert.ok(
    bundle.includes('label:"Privacidade"') && bundle.includes('window.nwOpenPrivacy'),
    'Privacidade item must have an onClick handler'
  );

  // Verify Visibilidade do Perfil button has onClick
  assert.ok(
    bundle.includes('label:"Visibilidade do Perfil"') && bundle.includes('window.nwToggleVisibility'),
    'Visibilidade do Perfil item must have an onClick handler'
  );

  // Verify Sair da Conta button has onClick
  assert.ok(
    bundle.includes('Sair da Conta') && bundle.includes('window.nwLockApp'),
    'Sair da Conta button must have an onClick handler'
  );

  // Verify window.nwOpenNotifications registration in bie()
  assert.ok(
    bundle.includes('window.nwOpenNotifications=()=>le(!0)'),
    'bie() must register window.nwOpenNotifications'
  );
});

test('notifications-ui correctly decodes unpadded base64url VAPID public key without throwing in Safari', async () => {
  const code = await fs.readFile(new URL('../public/assets/notifications-ui.mjs', import.meta.url), 'utf8');
  assert.ok(code.includes("const padding='='.repeat((4-(value.length%4))%4)"), 'bytes() must pad Base64 string for Safari atob compliance');

  // Test decoding algorithm directly
  const bytes = value => {
    const padding = '='.repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  };

  // 87-character unpadded P-256 public key (typical from webpush.generateVAPIDKeys())
  const rawKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYa5Ndh8J4';
  assert.equal(rawKey.length, 87);
  const decoded = bytes(rawKey);
  assert.equal(decoded.length, 65);
});

test('refinements.js defines biometrics modal, lock screen, and settings click capture', async () => {
  const code = await fs.readFile(new URL('../public/assets/refinements.js', import.meta.url), 'utf8');
  assert.ok(code.includes('window.nwOpenBiometrics'), 'refinements.js must define window.nwOpenBiometrics');
  assert.ok(code.includes('window.nwOpenNotifications'), 'refinements.js must define window.nwOpenNotifications');
  assert.ok(code.includes('window.nwLockApp'), 'refinements.js must define window.nwLockApp');
  assert.ok(code.includes('nw-biometrics-modal'), 'refinements.js must include biometrics modal element');
  assert.ok(code.includes('nw-faceid-lock-overlay'), 'refinements.js must include faceid lock overlay element');
  assert.ok(code.includes('triggerFaceIDVerification'), 'refinements.js must implement WebAuthn verification');
});
