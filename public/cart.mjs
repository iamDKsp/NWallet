import {today,uid,validDate} from './finance.mjs';

export const CART_CATEGORIES = [
  'Geral',
  'Eletrônicos',
  'Casa & Decoração',
  'Vestuário & Calçados',
  'Informática & Setup',
  'Trabalho & Estudos',
  'Saúde & Beleza',
  'Lazer & Games',
  'Livros & Cursos',
  'Outros'
];

export const CART_PRIORITIES = {
  high: 'Alta prioridade',
  medium: 'Média prioridade',
  low: 'Baixa prioridade'
};

const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const text = (value, max) => typeof value === 'string' && value.length <= max;

export function cartOf(s) {
  return Array.isArray(s?.cart) ? s.cart : [];
}

export function validateCart(s, reservedIds = new Set()) {
  if (s.cart === undefined) return;
  requireValue(Array.isArray(s.cart) && s.cart.length <= 10000, 'Lista de carrinho inválida.');
  for (const item of s.cart) {
    requireValue(item && typeof item === 'object', 'Item do carrinho inválido.');
    requireValue(text(item.id, 160) && item.id.trim() && !reservedIds.has(item.id), 'Identificador de item inválido ou repetido.');
    reservedIds.add(item.id);
    requireValue(text(item.name, 160) && item.name.trim(), 'Informe o nome do item no carrinho.');
    requireValue(item.priceCents === undefined || (Number.isInteger(item.priceCents) && item.priceCents >= 0 && item.priceCents <= 1e12), 'Valor estimado inválido.');
    requireValue(!item.url || (typeof item.url === 'string' && item.url.length <= 2048), 'Link de compra inválido.');
    requireValue(!item.photo || (typeof item.photo === 'string' && item.photo.length <= 500000), 'Foto inválida.');
    requireValue(!item.status || ['pending', 'bought'].includes(item.status), 'Status do item inválido.');
    requireValue(!item.boughtAt || validDate(item.boughtAt), 'Data da compra inválida.');
    requireValue(!item.notes || (typeof item.notes === 'string' && item.notes.length <= 1000), 'Observações inválidas.');
    requireValue(!item.priority || Object.hasOwn(CART_PRIORITIES, item.priority), 'Prioridade inválida.');
    requireValue(!item.category || (typeof item.category === 'string' && item.category.length <= 100), 'Categoria inválida.');
    requireValue(!item.createdAt || validDate(item.createdAt), 'Data de criação inválida.');
  }
}

export function cartSummary(s) {
  const items = cartOf(s);
  const pending = items.filter(i => i.status !== 'bought');
  const bought = items.filter(i => i.status === 'bought');

  const totalEstimatedCents = items.reduce((sum, i) => sum + (i.priceCents || 0), 0);
  const pendingEstimatedCents = pending.reduce((sum, i) => sum + (i.priceCents || 0), 0);
  const boughtEstimatedCents = bought.reduce((sum, i) => sum + (i.priceCents || 0), 0);

  return {
    totalCount: items.length,
    pendingCount: pending.length,
    boughtCount: bought.length,
    totalEstimatedCents,
    pendingEstimatedCents,
    boughtEstimatedCents
  };
}

export function upsertCartItem(s, data) {
  const list = cartOf(s);
  const index = list.findIndex(i => i.id === data.id);
  const old = index >= 0 ? list[index] : null;

  const item = {
    ...old,
    id: old?.id || data.id || uid(),
    name: data.name.trim(),
    priceCents: Number.isInteger(data.priceCents) ? data.priceCents : 0,
    url: data.url ? data.url.trim() : null,
    photo: data.photo || null,
    status: data.status === 'bought' ? 'bought' : 'pending',
    boughtAt: data.status === 'bought' ? (data.boughtAt || old?.boughtAt || today()) : null,
    notes: data.notes ? data.notes.trim() : null,
    priority: data.priority || 'medium',
    category: data.category ? data.category.trim() : 'Geral',
    createdAt: old?.createdAt || data.createdAt || today()
  };

  validateCart({ cart: [item] });
  if (!s.cart) s.cart = [];
  if (index < 0) s.cart.push(item);
  else s.cart[index] = item;

  return item;
}

export function toggleCartItemStatus(s, id, asOf = today()) {
  const item = cartOf(s).find(i => i.id === id);
  requireValue(!!item, 'Item do carrinho não encontrado.');
  if (item.status === 'bought') {
    item.status = 'pending';
    item.boughtAt = null;
  } else {
    item.status = 'bought';
    item.boughtAt = asOf;
  }
  return item;
}

export function removeCartItem(s, id) {
  requireValue(cartOf(s).some(i => i.id === id), 'Item do carrinho não encontrado.');
  s.cart = cartOf(s).filter(i => i.id !== id);
}
