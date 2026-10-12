import {monthNow,debtSchedule} from './planning.mjs';
import {today,accountBalance,invoices,plansOf} from './finance.mjs';

export function outstandingInstallments(state,debt) {
  return debtSchedule(state||{entries:[],plans:{payrollRuns:[]}},debt).filter(i=>!i.paid);
}

export function debtAmounts(state,debt,month=monthNow()) {
  const remaining=outstandingInstallments(state,debt),nominalCents=remaining.reduce((v,i)=>v+i.amountCents,0);
  const quotedCents=remaining.length?debt.currentBalanceCents||0:0;
  const warnings=[];
  if(quotedCents>nominalCents)warnings.push('A quitação informada supera as parcelas restantes. Confira o valor e a data da cotação.');
  else if(quotedCents===nominalCents&&quotedCents>0&&(debt.interestRateBps||debt.cetBps))warnings.push('A quitação informada coincide com o total das parcelas. Confira se foi informada uma cotação de quitação.');
  if(quotedCents&&remaining.length<debt.installments)warnings.push('Há parcelas confirmadas após o cadastro. A cotação informada precisa ser conferida novamente.');
  return {remaining,nominalCents,quotedCents,warnings,monthlyCents:remaining.filter(i=>i.month===month).reduce((v,i)=>v+i.amountCents,0)};
}

/**
 * Computes the Present Value (Valor Presente) of a future installment
 * using a monthly compound-interest estimate, rounded per installment.
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
  const schedule=outstandingInstallments(options.state,debt);
  const count = schedule.length;
  const [refY, refM] = refMonth.split('-').map(Number);


  let cash = Math.max(0, availableCents || 0);
  let totalNominalEliminatedCents = 0;
  let totalRealPaidCents = 0;
  const eliminated = [];

  // Iterate from last installment to first (back to front)
  for (let idx = count - 1; idx >= 0; idx--) {
    // Determine the month of this installment
    const installmentDate = new Date(schedule[idx].date+'T12:00:00');
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
        number: schedule[idx].number,
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
    rateSource: debt.interestRateBps?'interest':debt.cetBps?'cet':'none',
    asOfMonth:refMonth,
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
 * Groups liabilities by observable status, then by known registered rates.
 * An open invoice alone does not establish revolving-credit interest.
 *
 * @param {Array} debts - Array of debts from s.plans.debts
 * @param {Array} accounts - Array of accounts
 * @param {Array} cards - Array of cards
 * @param {Array} [invoicesList] - Open invoices
 * @returns {Array} Ranked list of debts with recommendations
 */
export function debtPriorityRanking(debtsOrState = [], accounts = [], cards = [], invoicesList = [], options = {}) {
  const state=Array.isArray(debtsOrState)?options.state:debtsOrState;
  const debts=state?plansOf(state).debts:debtsOrState;
  const asOf=options.asOf||today();
  if(state){accounts=state.accounts;cards=state.cards;if(!invoicesList.length)invoicesList=invoices(state,asOf);}
  const items=[];
  for(const acc of accounts) {
    const balance=state?accountBalance(state,acc.id,asOf):acc.openingBalanceCents||0;
    if(acc.kind!=='bank'||balance>=0)continue;
    const rateBps=acc.overdraftRateBps||0;
    items.push({id:'account:'+acc.id,type:'overdraft',name:'Saldo negativo · '+(acc.bank||acc.name),balanceCents:-balance,
      monthlyRateBps:rateBps,annualRatePercent:annualRateFromMonthly(rateBps),urgency:'high',status:'Saldo negativo',
      reason:rateBps?'Saldo atual negativo. Taxa de cheque especial informada no cadastro.':'Saldo atual negativo. Taxa de cheque especial não informada; confira o contrato.'});
  }
  for(const inv of invoicesList) {
    if(inv.remainingCents<=0)continue;
    const overdue=Boolean(inv.date&&inv.date<asOf);
    items.push({id:'invoice:'+inv.key,type:'card_invoice',name:'Fatura '+inv.name,balanceCents:inv.remainingCents,
      date:inv.date,monthlyRateBps:0,annualRatePercent:0,urgency:overdue?'high':'medium',
      status:overdue?'Em atraso':inv.date===asOf?'Vence hoje':'A vencer',
      reason:overdue?'Fatura com vencimento anterior à data de hoje. Confira encargos e pagamento com o banco.':'Fatura a pagar no vencimento. Saldo aberto não comprova cobrança de rotativo.'});
  }
  for(const debt of debts||[]) {
    const amounts=debtAmounts(state,debt,options.month||asOf.slice(0,7));
    if(!amounts.remaining.length)continue;
    const rateBps=debt.cetBps||debt.interestRateBps||0;
    items.push({id:'debt:'+debt.id,type:debt.kind,debt,name:debt.name,creditor:debt.creditor||'',
      balanceCents:amounts.quotedCents||amounts.nominalCents,quotedCents:amounts.quotedCents,
      nominalRemainingCents:amounts.nominalCents,installmentCents:debt.installmentCents,
      installmentsRemaining:amounts.remaining.length,monthlyRateBps:rateBps,annualRatePercent:annualRateFromMonthly(rateBps),
      rateSource:debt.cetBps?'CET':'Juros',urgency:'medium',status:'Contrato',warnings:amounts.warnings,
      reason:rateBps?'Compare o custo informado e as parcelas restantes. A simulação é uma estimativa.':'Taxa não informada. Compare condições e vencimentos do contrato.'});
  }
  const weights={high:2,medium:1};
  return items.sort((a,b)=>weights[b.urgency]-weights[a.urgency]||b.monthlyRateBps-a.monthlyRateBps||(a.date||'').localeCompare(b.date||''));
}
