import test from 'node:test';
import assert from 'node:assert/strict';
import {presentValue, simulateAmortization, annualRateFromMonthly, debtPriorityRanking} from '../public/amortization.mjs';

test('presentValue discounts future installments correctly with compound interest', () => {
  // Parcela de R$ 1.000,00 daqui a 12 meses a 2% a.m. (200 bps)
  // VP = 1000 / (1.02)^12 = 1000 / 1.26824 = 788.49
  const pv = presentValue(100000, 200, 12);
  assert.equal(pv, 78849);

  // Parcela de R$ 461,16 daqui a 36 meses a 4.98% a.m. (498 bps)
  // VP = 461.16 / (1.0498)^36 = 461.16 / 5.75237 = 80.17
  const pvConsignado = presentValue(46116, 498, 36);
  assert.equal(pvConsignado, 8017);

  // Sem juros ou meses zerados
  assert.equal(presentValue(50000, 0, 10), 50000);
  assert.equal(presentValue(50000, 200, 0), 50000);
});

test('annualRateFromMonthly computes equivalent annual compound rate', () => {
  // 4.98% a.m. -> (1.0498)^12 - 1 = 79.03% a.a. (approx)
  const annualConsignado = annualRateFromMonthly(498);
  assert.ok(annualConsignado > 78 && annualConsignado < 81);

  // 8.00% a.m. (cheque especial) -> (1.08)^12 - 1 = 151.82% a.a.
  const annualOverdraft = annualRateFromMonthly(800);
  assert.equal(annualOverdraft, 151.82);
});

test('simulateAmortization eliminates back-to-front installments and computes interest saved', () => {
  const debt = {
    id: 'debt-consignado-4',
    name: 'Consignado 4',
    installmentCents: 46116, // R$ 461,16
    installments: 36,
    firstDueDate: '2026-10-01',
    interestRateBps: 498 // 4.98% a.m.
  };

  // Com R$ 1.000,00 (100000 centavos)
  const sim = simulateAmortization(debt, 100000, { asOfMonth: '2026-10' });
  
  assert.ok(sim.eliminatedCount >= 5); // Pelo menos 5 parcelas do final são quitadas
  assert.ok(sim.interestSavedCents > 100000); // Economizou mais de R$ 1.000 de juros puros!
  assert.ok(sim.remainingCashCents >= 0);
  assert.equal(sim.totalNominalEliminatedCents, sim.totalRealPaidCents + sim.interestSavedCents);
});

test('debtPriorityRanking orders liabilities by urgency and cost', () => {
  const accounts = [
    { id: 'acc-santander', bank: 'Santander', kind: 'bank', openingBalanceCents: -200000, overdraftRateBps: 800 }
  ];
  const debts = [
    { id: 'd1', name: 'Consignado Barato', kind: 'payroll_loan', installmentCents: 10000, installments: 10, firstDueDate:'2026-10-05', cetBps: 200 },
    { id: 'd2', name: 'Consignado Caro', kind: 'payroll_loan', installmentCents: 46116, installments: 36, firstDueDate:'2026-10-05', cetBps: 585 }
  ];
  const invoices = [
    { key: 'bb-inv', name: 'BB Ourocard', remainingCents: 298933,date:'2026-09-28' }
  ];

  const ranking = debtPriorityRanking(debts, accounts, [], invoices,{asOf:'2026-10-12'});
  
  // Saldo negativo e atraso exigem atenção, mas atraso não comprova taxa de rotativo.
  assert.equal(ranking[0].urgency, 'high');
  assert.equal(ranking[1].urgency, 'high');
  assert.equal(ranking.find(r=>r.type==='card_invoice').monthlyRateBps,0);

  // Entre os consignados, o Consignado Caro (5.85% CET) vem antes do Barato (2.00% CET)
  const consignados = ranking.filter(r => r.type === 'payroll_loan');
  assert.equal(consignados[0].name, 'Consignado Caro');
  assert.equal(consignados[1].name, 'Consignado Barato');
});
