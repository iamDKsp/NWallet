import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('refinements.js implements fluid mobile dock auto-hide on scroll down and reveal on scroll up', async () => {
  const code = await fs.readFile(new URL('../public/assets/refinements.js', import.meta.url), 'utf8');
  assert.ok(code.includes('setDockHidden'), 'refinements.js must define setDockHidden');
  assert.ok(code.includes('nw-dock-hidden'), 'refinements.js must toggle nw-dock-hidden class');
  assert.ok(code.includes('touchstart') && code.includes('touchmove'), 'refinements.js must support touch gesture detection');
  assert.ok(code.includes('scrollRAF') || code.includes('requestAnimationFrame'), 'scroll tracking must use animation frame throttling');
});

test('refinements.css positions mobile dock lower and applies fluid spring hide/show animations', async () => {
  const css = await fs.readFile(new URL('../public/assets/refinements.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.nw-mobile-dock.nw-dock-hidden'), 'refinements.css must define hidden state for mobile dock');
  assert.ok(css.includes('calc(100% + 48px)') || css.includes('calc(100% + 40px)'), 'hidden dock must translate completely off-screen');
  assert.ok(css.includes('cubic-bezier(0.16, 1, 0.3, 1)'), 'dock transition must use Apple HIG spring curve');
  assert.ok(css.includes('max(6px') || css.includes('max(4px'), 'dock must sit lower towards the bottom edge');
});

test('mobile.css ensures true edge-to-edge fullscreen without 100dvh truncation or black border gaps', async () => {
  const css = await fs.readFile(new URL('../public/assets/mobile.css', import.meta.url), 'utf8');
  assert.ok(!css.includes('max-height: 100dvh'), 'mobile.css must not constrain root with max-height: 100dvh');
  assert.ok(css.includes('background-color: #05080d'), 'mobile.css must set uniform background color');
  assert.ok(css.includes('inset: 0'), 'mobile.css must anchor viewport to inset: 0');
});

test('index-DGDPhK2a.js root mobile container harmonizes background and eliminates black border', async () => {
  const js = await fs.readFile(new URL('../public/assets/index-DGDPhK2a.js', import.meta.url), 'utf8');
  assert.ok(!js.includes('fixed inset-0 flex flex-col bg-black text-white'), 'mobile root must not use hard-coded bg-black');
  assert.ok(js.includes('fixed inset-0 flex flex-col bg-[#05080d] text-white'), 'mobile root must use system dark tone bg-[#05080d]');
  assert.ok(!js.includes('"env(safe-area-inset-bottom, 34px)"'), 'safe area fallback must not force artificial 34px space');
});
