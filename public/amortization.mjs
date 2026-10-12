import {monthNow} from './planning.mjs';

/**
 * Computes the Present Value (Valor Presente) of a future installment
 * under compound interest according to BACEN Resolution 3.516/2007.
 *
 * @param {number} installmentCents - Amount of the installment in centavos
 * @param {number} rateBps - Monthly interest rate or CET in basis points (e.g. 498 for 4.98%)
 * @param {number} monthsAhead - Number of months from settlement date to installment due date
 * @returns {number} Present value in centavos
 */
export function presentValue(installmentCents, rateBps, monthsAhead) {
  if (!Number.isSafeInteger(installmentCents) || installmentCents <= 0) return 0;
  if (!rateBps || rateBps <= 0 || !monthsAhead || monthsAhead <= 0) return installmentCents;
  const i = rateBps / 10000;
  const factor = Math.pow(1 + i, monthsAhead);
  return Math.round(installmentCents / factor);
}

/**
 * Simulates amortizing installments from back to front (última para a primeira)
 * using an available cash amount.
 *
 * @param {object} debt - Debt object from s.plans.debts
 * @param {number} availableCents - Available cash for amortization in centavos
 * @param {object} [options]
 * @param {string} [options.asOfMonth] - Reference month (YYYY-MM)
 * @returns {object} Detailed simulation result
 */
export function simulateAmortization(debt, availableCents, options = {}) {
  if (!debt || !debt.installmentCents || !debt.installments) {
    throw new Error('Contrato de dívida inválido para simulação.');
  }
  const refMonth = options.asOfMonth || monthNow();
  const rateBps = debt.interestRateBps || debt.cetBps || 0;
  const count = debt.installments;
  const [refY, refM] = refMonth.split('-').map(Number);

  // Parse first due date
  const [startY, startM] = (debt.firstDueDate || (refMonth + '-01')).slice(0, 7).split('-').map(Number);

  let cash = Math.max(0, availableCents || 0);
  let totalNominalEliminatedCents = 0;
  let totalRealPaidCents = 0;
  const eliminated = [];

  // Iterate from last installment to first (back to front)
  for (let idx = count - 1; idx >= 0; idx--) {
    // Determine the month of this installment
    const installmentDate = new Date(startY, startM - 1 + idx, 1);
    const instY = installmentDate.getFullYear();
    const instM = installmentDate.getMonth() + 1;
    const monthsAhead = Math.max(0, (instY - refY) * 12 + (instM - refM));

    const pv = rateBps > 0 && monthsAhead > 0
      ? presentValue(debt.installmentCents, rateBps, monthsAhead)
      : debt.installmentCents;

    if (pv <= cash) {
      cash -= pv;
      totalRealPaidCents += pv;
      totalNominalEliminatedCents += debt.installmentCents;
      eliminated.push({
        number: idx + 1,
        monthsAhead,
        month: `${instY}-${String(instM).padStart(2, '0')}`,
        nominalCents: debt.installmentCents,
        presentValueCents: pv,
        interestSavedCents: debt.installmentCents - pv
      });
    } else {
      // Cannot eliminate full installment
      break;
    }
  }

  const interestSavedCents = totalNominalEliminatedCents - totalRealPaidCents;
  const remainingInstallments = count - eliminated.length;

  return {
    debtId: debt.id,
    debtName: debt.name,
    rateBps,
    totalInstallmentsRemaining: count,
    eliminatedCount: eliminated.length,
    remainingInstallments,
    totalNominalEliminatedCents,
    totalRealPaidCents,
    interestSavedCents,
    remainingCashCents: cash,
    monthsReduced: eliminated.length,
    discountPercentage: totalNominalEliminatedCents > 0
      ? Math.round((interestSavedCents / totalNominalEliminatedCents) * 10000) / 100
      : 0,
    eliminated
  };
}

/**
 * Calculates annual equivalent rate from monthly basis points.
 * @param {number} monthlyRateBps 
 * @returns {number} Annual percentage (e.g. 75.5 for 75.5% a.a.)
 */
export function annualRateFromMonthly(monthlyRateBps) {
  if (!monthlyRateBps || monthlyRateBps <= 0) return 0;
  const i = monthlyRateBps / 10000;
  return Math.round((Math.pow(1 + i, 12) - 1) * 10000) / 100;
}

/**
 * Analyzes and ranks all liabilities (debts, overdraft, overdue cards)
 * according to the Avalanche method (highest interest cost first).
 *
 * @param {Array} debts - Array of debts from s.plans.debts
 * @param {Array} accounts - Array of accounts
 * @param {Array} cards - Array of cards
 * @param {Array} [invoicesList] - Open invoices
 * @returns {Array} Ranked list of debts with recommendations
 */
export function debtPriorityRanking(debtsOrState = [], accounts = [], cards = [], invoicesList = []) {
  let debts = debtsOrState;
  if (debtsOrState && !Array.isArray(debtsOrState) && typeof debtsOrState === 'object') {
    const state = debtsOrState;
    debts = state.plans?.debts || [];
    accounts = accounts.length ? accounts : (state.accounts || []);
    cards = cards.length ? cards : (state.cards || []);
    invoicesList = invoicesList.length ? invoicesList : [];
  }
  if (!Array.isArray(debts)) debts = [];
  if (!Array.isArray(accounts)) accounts = [];
  if (!Array.isArray(cards)) cards = [];
  if (!Array.isArray(invoicesList)) invoicesList = [];

  const items = [];

  // 1. Cheque Especial (Overdraft)
  for (const acc of accounts) {
    if (acc.kind === 'bank') {
      const balance = acc.openingBalanceCents || 0; // Or live balance
      if (balance < 0) {
        const rateBps = acc.overdraftRateBps || 800; // Standard 8.00% a.m.
        items.push({
          id: `account:${acc.id}`,
          type: 'overdraft',
          name: `Cheque Especial · ${acc.bank || acc.name}`,
          balanceCents: Math.abs(balance),
          monthlyRateBps: rateBps,
          annualRatePercent: annualRateFromMonthly(rateBps),
          urgency: 'critical',
          reason: 'Cobrança diária de juros compostos altíssimos (~8% a.m.). Prioridade imediata de quitação.'
        });
      }
    }
  }

  // 2. Cartões de crédito com atraso ou rotativo
  for (const inv of invoicesList) {
    // If invoice indicates overdue balance or high total
    if (inv.remainingCents > 0) {
      items.push({
        id: `invoice:${inv.key}`,
        type: 'card_invoice',
        name: `Fatura ${inv.name}`,
        balanceCents: inv.remainingCents,
        monthlyRateBps: 1450, // Typical rotativo rate 14.5% a.m.
        annualRatePercent: annualRateFromMonthly(1450),
        urgency: 'critical',
        reason: 'Rotativo de cartão possui juros que superam 400% ao ano. Quitação urgente evita bola de neve.'
      });
    }
  }

  // 3. Contratos de Empréstimo e Financiamento
  for (const debt of debts) {
    const rateBps = debt.cetBps || debt.interestRateBps || (debt.kind === 'financing' ? 180 : 350);
    const nominalRemainingCents = (debt.installmentCents || 0) * (debt.installments || 0);
    const balanceCents = debt.currentBalanceCents || nominalRemainingCents;
    
    let urgency = 'medium';
    let reason = 'Amortização de trás para frente reduz juros e adianta o término.';

    if (debt.kind === 'payroll_loan' && rateBps >= 450) {
      urgency = 'high';
      reason = `Taxa alta para consignado (${(rateBps / 100).toFixed(2)}% a.m.). Amortizar as últimas parcelas gera economia massiva de juros.`;
    } else if (debt.kind === 'financing') {
      urgency = 'high';
      reason = 'Financiamento com garantia de veículo. Manter sempre em dia para proteger o patrimônio.';
    }

    items.push({
      id: `debt:${debt.id}`,
      type: debt.kind,
      debt,
      name: debt.name,
      creditor: debt.creditor || '',
      balanceCents,
      nominalRemainingCents,
      installmentCents: debt.installmentCents,
      installmentsRemaining: debt.installments,
      monthlyRateBps: rateBps,
      annualRatePercent: annualRateFromMonthly(rateBps),
      urgency,
      reason
    });
  }

  // Sort by urgency ('critical' > 'high' > 'medium') then by monthlyRateBps descending
  const urgencyWeight = { critical: 3, high: 2, medium: 1 };
  items.sort((a, b) => {
    const weightDiff = (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0);
    if (weightDiff !== 0) return weightDiff;
    return (b.monthlyRateBps || 0) - (a.monthlyRateBps || 0);
  });

  return items;
}
