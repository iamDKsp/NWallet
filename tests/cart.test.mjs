import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateLedger,validateState,today} from '../public/finance.mjs';
import {
  cartOf,
  validateCart,
  cartSummary,
  upsertCartItem,
  toggleCartItemStatus,
  removeCartItem,
  CART_CATEGORIES,
  CART_PRIORITIES
} from '../public/cart.mjs';

test('emptyState initializes cart as an empty array', () => {
  const s = emptyState();
  assert.ok(Array.isArray(s.cart));
  assert.equal(s.cart.length, 0);
  assert.equal(cartOf(s).length, 0);
});

test('validateCart accepts valid cart items and enforces rules', () => {
  const s = {
    ...emptyState(),
    cart: [
      {
        id: 'item-1',
        name: 'Fone de Ouvido Bluetooth',
        priceCents: 29990,
        url: 'https://exemplo.com.br/produto/fone',
        photo: 'data:image/jpeg;base64,samplephoto',
        status: 'pending',
        notes: 'Comprar na cor preta com cupom PROMO10',
        priority: 'high',
        category: 'Eletrônicos',
        createdAt: '2026-10-12'
      },
      {
        id: 'item-2',
        name: 'Cadeira Ergonômica',
        priceCents: 125000,
        status: 'bought',
        boughtAt: '2026-10-12',
        priority: 'medium',
        category: 'Trabalho & Estudos',
        createdAt: '2026-10-10'
      }
    ]
  };

  assert.doesNotThrow(() => validateState(s));
  assert.doesNotThrow(() => validateLedger(s));

  // Item sem nome deve falhar
  assert.throws(() => validateCart({ cart: [{ id: '1', name: '' }] }), /Informe o nome/);

  // Valor negativo deve falhar
  assert.throws(() => validateCart({ cart: [{ id: '1', name: 'Item', priceCents: -50 }] }), /Valor estimado inválido/);

  // Status inválido deve falhar
  assert.throws(() => validateCart({ cart: [{ id: '1', name: 'Item', status: 'unknown' }] }), /Status do item inválido/);

  // IDs duplicados devem falhar
  assert.throws(() => {
    const ids = new Set();
    validateCart({ cart: [{ id: 'dup', name: 'A' }, { id: 'dup', name: 'B' }] }, ids);
  }, /Identificador de item inválido ou repetido/);
});

test('cartSummary computes counts and estimated totals accurately', () => {
  const s = {
    ...emptyState(),
    cart: [
      { id: '1', name: 'Item 1', priceCents: 10000, status: 'pending' },
      { id: '2', name: 'Item 2', priceCents: 25000, status: 'pending' },
      { id: '3', name: 'Item 3', priceCents: 15000, status: 'bought', boughtAt: '2026-10-12' }
    ]
  };

  const summary = cartSummary(s);
  assert.equal(summary.totalCount, 3);
  assert.equal(summary.pendingCount, 2);
  assert.equal(summary.boughtCount, 1);
  assert.equal(summary.totalEstimatedCents, 50000);
  assert.equal(summary.pendingEstimatedCents, 35000);
  assert.equal(summary.boughtEstimatedCents, 15000);
});

test('upsertCartItem adds new items and edits existing items without losing data', () => {
  const s = emptyState();

  // 1. Criar novo item
  const item = upsertCartItem(s, {
    name: 'Monitor UltraWide 34"',
    priceCents: 249900,
    url: 'https://loja.com/monitor',
    priority: 'high',
    category: 'Informática & Setup',
    notes: 'Modelo IPS 144Hz'
  });

  assert.ok(item.id);
  assert.equal(item.name, 'Monitor UltraWide 34"');
  assert.equal(item.priceCents, 249900);
  assert.equal(item.status, 'pending');
  assert.equal(item.boughtAt, null);
  assert.equal(s.cart.length, 1);

  // 2. Editar item existente
  const updated = upsertCartItem(s, {
    id: item.id,
    name: 'Monitor UltraWide 34" Curvo',
    priceCents: 239900,
    url: 'https://loja.com/monitor-curvo',
    priority: 'high',
    category: 'Informática & Setup',
    notes: 'Pegar na promoção de Black Friday'
  });

  assert.equal(updated.id, item.id);
  assert.equal(updated.name, 'Monitor UltraWide 34" Curvo');
  assert.equal(updated.priceCents, 239900);
  assert.equal(s.cart.length, 1);
  assert.doesNotThrow(() => validateLedger(s));
});

test('toggleCartItemStatus switches between pending and bought with date tracking', () => {
  const s = emptyState();
  const item = upsertCartItem(s, { name: 'Teclado Mecânico', priceCents: 35000 });
  assert.equal(item.status, 'pending');
  assert.equal(item.boughtAt, null);

  // Dar baixa como comprado
  const bought = toggleCartItemStatus(s, item.id, '2026-10-12');
  assert.equal(bought.status, 'bought');
  assert.equal(bought.boughtAt, '2026-10-12');
  assert.equal(s.cart[0].status, 'bought');

  // Reabrir (voltar para pendente)
  const reopened = toggleCartItemStatus(s, item.id);
  assert.equal(reopened.status, 'pending');
  assert.equal(reopened.boughtAt, null);
  assert.equal(s.cart[0].status, 'pending');
});

test('removeCartItem deletes an item from the cart', () => {
  const s = emptyState();
  const i1 = upsertCartItem(s, { name: 'Item A', priceCents: 1000 });
  const i2 = upsertCartItem(s, { name: 'Item B', priceCents: 2000 });
  assert.equal(s.cart.length, 2);

  removeCartItem(s, i1.id);
  assert.equal(s.cart.length, 1);
  assert.equal(s.cart[0].id, i2.id);

  // Excluir ID inexistente lança erro
  assert.throws(() => removeCartItem(s, 'non-existent'), /Item do carrinho não encontrado/);
});

test('workspaceSection handles ?view=cart and HomeConnections triggers Carrinho section', async () => {
  const {createFinanceIntegration,workspaceSection} = await import('../public/assets/finance-integration.mjs');
  assert.equal(workspaceSection('?view=cart'), 'cart');

  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: value => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {}
  };

  function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!tree || typeof tree !== 'object') return [];
    return [tree, ...(tree.children || []).flatMap(nodes)];
  }

  const prior = globalThis.location;
  globalThis.location = { search: '' };
  try {
    let opened = 0;
    const wallet = createFinanceIntegration(React, null, null);
    const home = wallet.HomeConnections({ onOpen: () => opened++ });
    const cartButton = nodes(home).find(n => n.type === 'button' && nodes(n).some(c => c.type === 'strong' && c.children.includes('Carrinho')));
    assert.ok(cartButton, 'Carrinho button must exist in HomeConnections');

    cartButton.props.onClick();
    assert.equal(opened, 1);

    const workspace = wallet.Workspace({});
    const selected = nodes(workspace).find(n => n.type === 'button' && n.props['aria-current'] === 'page');
    assert.equal(selected.children[0], 'Carrinho');
  } finally {
    globalThis.location = prior;
  }
});

