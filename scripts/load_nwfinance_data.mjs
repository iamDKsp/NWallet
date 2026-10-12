import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DATA_DIR = path.resolve('data');
const DATA_FILE = path.join(DATA_DIR, 'wallet.json');
const BACKUP_FILE = path.join(DATA_DIR, 'wallet.pre-nwfinance.json');

async function run() {
  const { validateLedger } = await import(pathToFileURL(path.resolve('public/finance.mjs')));

  // Backup existing data if present
  if (fs.existsSync(DATA_FILE)) {
    await fsp.copyFile(DATA_FILE, BACKUP_FILE);
    console.log(`Backup criado em: ${BACKUP_FILE}`);
  }

  const accounts = [
    {
      id: 'account-santander',
      name: 'Santander Conta Corrente',
      bank: 'Santander',
      scope: 'personal',
      kind: 'bank',
      agency: '4556',
      accountNumber: '01037060-3',
      openingBalanceCents: -200000, // -R$ 2.000,00 (Cheque especial utilizado)
      overdraftLimitCents: 200000, // Limite de R$ 2.000,00
      overdraftRateBps: 800, // 8.00% a.m.
      openingDate: '2026-10-12'
    },
    {
      id: 'account-nubank',
      name: 'Conta Nubank',
      bank: 'Nubank',
      scope: 'personal',
      kind: 'bank',
      openingBalanceCents: 26461, // R$ 264,61 (+ R$ 20,99 outros rendimentos)
      openingDate: '2026-10-12'
    },
    {
      id: 'account-bb',
      name: 'Banco do Brasil',
      bank: 'Banco do Brasil',
      scope: 'personal',
      kind: 'bank',
      agency: '2457-0',
      accountNumber: '22594-0',
      openingBalanceCents: 2099, // R$ 20,99
      openingDate: '2026-10-12'
    }
  ];

  const cards = [
    {
      id: 'card-santander',
      accountId: 'account-santander',
      name: 'Santander SX (Final 8021)',
      scope: 'personal',
      closingDay: 24,
      dueDay: 30,
      openingDebtCents: 18117, // R$ 181,17 (fatura aberta Out/2026)
      openingDueDate: '2026-10-30',
      display: {
        holder: 'Tarcisio Nascimento',
        bank: 'Santander',
        number: '•••• •••• •••• 8021',
        color: 'bg-red-600'
      },
      openingInvoices: [
        { id: 'inv-santander-nov26', date: '2026-11-30', amountCents: 2124, description: 'Sextacomdjroca (4/5)' },
        { id: 'inv-santander-dez26', date: '2026-12-30', amountCents: 2124, description: 'Sextacomdjroca (5/5)' }
      ]
    },
    {
      id: 'card-nubank',
      accountId: 'account-nubank',
      name: 'Nubank Mastercard',
      scope: 'personal',
      closingDay: 19,
      dueDay: 26,
      openingDebtCents: 82294, // R$ 822,94 (fatura atual Out/2026)
      openingDueDate: '2026-10-26',
      display: {
        holder: 'Tarcisio Pereira do Nascimento',
        bank: 'Nubank',
        number: '•••• •••• •••• ••••',
        color: 'bg-purple-600'
      },
      openingInvoices: [
        { id: 'inv-nubank-nov26', date: '2026-11-26', amountCents: 25153, description: 'Fatura Nov/26 (Pix Crédito Tarcisio 4/8 + Henrique Tavares + Mp Joaopedro 8/12)' },
        { id: 'inv-nubank-dez26', date: '2026-12-28', amountCents: 16353, description: 'Fatura Dez/26 (Pix Crédito Tarcisio 5/8 + Mp Joaopedro 9/12)' },
        { id: 'inv-nubank-jan27', date: '2027-01-26', amountCents: 16353, description: 'Fatura Jan/27 (Pix Crédito Tarcisio 6/8 + Mp Joaopedro 10/12)' },
        { id: 'inv-nubank-fev27', date: '2027-02-26', amountCents: 16353, description: 'Fatura Fev/27 (Pix Crédito Tarcisio 7/8 + Mp Joaopedro 11/12)' },
        { id: 'inv-nubank-mar27', date: '2027-03-29', amountCents: 16353, description: 'Fatura Mar/27 (Pix Crédito Tarcisio 8/8 + Mp Joaopedro 12/12)' }
      ]
    },
    {
      id: 'card-bb',
      accountId: 'account-bb',
      name: 'BB Ourocard',
      scope: 'personal',
      closingDay: 17,
      dueDay: 28,
      openingDebtCents: 298933, // R$ 2.989,33 (fatura Out/2026; contém R$ 2.116,93 de rotativo/atrasado)
      openingDueDate: '2026-10-28',
      display: {
        holder: 'Tarcisio',
        bank: 'Banco do Brasil',
        number: '•••• •••• •••• ••••',
        color: 'bg-blue-600'
      },
      openingInvoices: [
        { id: 'inv-bb-nov26', date: '2026-11-30', amountCents: 59551, description: 'Fatura Nov/26 (MercadoLivre, Ponto Chic, Frigelar, etc.)' },
        { id: 'inv-bb-dez26', date: '2026-12-28', amountCents: 38457, description: 'Fatura Dez/26 (MercadoLivre, Ponto Chic, Frigelar 12/12)' },
        { id: 'inv-bb-jan27', date: '2027-01-28', amountCents: 30092, description: 'Fatura Jan/27 (MercadoLivre 5/10 e 5/12, Ponto Chic 5/5)' },
        { id: 'inv-bb-fev27', date: '2027-02-28', amountCents: 18712, description: 'Fatura Fev/27 (MercadoLivre 6/10 e 6/12)' },
        { id: 'inv-bb-mar27', date: '2027-03-28', amountCents: 18712, description: 'Fatura Mar/27 (MercadoLivre 7/10 e 7/12)' },
        { id: 'inv-bb-abr27', date: '2027-04-28', amountCents: 18712, description: 'Fatura Abr/27 (MercadoLivre 8/10 e 8/12)' },
        { id: 'inv-bb-mai27', date: '2027-05-28', amountCents: 18712, description: 'Fatura Mai/27 (MercadoLivre 9/10 e 9/12)' },
        { id: 'inv-bb-jun27', date: '2027-06-28', amountCents: 18712, description: 'Fatura Jun/27 (MercadoLivre 10/10 e 10/12)' },
        { id: 'inv-bb-jul27', date: '2027-07-28', amountCents: 4622, description: 'Fatura Jul/27 (MercadoLivre 11/12)' },
        { id: 'inv-bb-ago27', date: '2027-08-28', amountCents: 4622, description: 'Fatura Ago/27 (MercadoLivre 12/12)' }
      ]
    }
  ];

  const payrolls = [
    {
      id: 'payroll-tecfag',
      name: 'TECFAG - Comércio e Importação de Máquinas Ltda (Matrícula 71)',
      accountId: 'account-santander',
      baseCents: 500000, // R$ 5.000,00 bruto CLT informado
      payDay: 5,
      startMonth: '2026-10',
      active: true,
      deductions: []
    }
  ];

  const debts = [
    {
      id: 'debt-consignado-1',
      name: 'Consignado 1 · Tecfag (96,21/mês)',
      kind: 'payroll_loan',
      creditor: 'Consignado CTPS',
      payrollId: 'payroll-tecfag',
      installmentCents: 9621,
      installments: 6, // 6 restantes de 15
      firstDueDate: '2026-10-05',
      interestRateBps: 449, // 4.49% a.m.
      cetBps: 480, // 4.80% a.m.
      originalAmountCents: 94204,
      currentBalanceCents: 42859,
      totalContractInstallments: 15,
      paidInstallments: 9
    },
    {
      id: 'debt-consignado-2',
      name: 'Consignado 2 · Tecfag (266,37/mês)',
      kind: 'payroll_loan',
      creditor: 'Consignado CTPS',
      payrollId: 'payroll-tecfag',
      installmentCents: 26637,
      installments: 18, // 18 restantes de 24
      firstDueDate: '2026-10-05',
      interestRateBps: 474, // 4.74% a.m.
      cetBps: 502, // 5.02% a.m.
      originalAmountCents: 336655,
      currentBalanceCents: 322350,
      totalContractInstallments: 24,
      paidInstallments: 6
    },
    {
      id: 'debt-consignado-3',
      name: 'Consignado 3 · Tecfag (350,99/mês)',
      kind: 'payroll_loan',
      creditor: 'Consignado CTPS',
      payrollId: 'payroll-tecfag',
      installmentCents: 35099,
      installments: 20, // 20 restantes de 24
      firstDueDate: '2026-10-05',
      interestRateBps: 462, // 4.62% a.m.
      cetBps: 489, // 4.89% a.m.
      originalAmountCents: 454098,
      currentBalanceCents: 458187,
      totalContractInstallments: 24,
      paidInstallments: 4
    },
    {
      id: 'debt-consignado-4',
      name: 'Consignado 4 · Tecfag (461,16/mês) 🚨',
      kind: 'payroll_loan',
      creditor: 'Consignado CTPS',
      payrollId: 'payroll-tecfag',
      installmentCents: 46116,
      installments: 36, // 36 restantes de 36
      firstDueDate: '2026-10-05',
      interestRateBps: 498, // 4.98% a.m.
      cetBps: 585, // 5.85% a.m.
      originalAmountCents: 610884,
      currentBalanceCents: 1660176,
      totalContractInstallments: 36,
      paidInstallments: 0
    },
    {
      id: 'debt-consignado-5',
      name: 'Consignado 5 · Tecfag (251,45/mês)',
      kind: 'payroll_loan',
      creditor: 'Consignado CTPS',
      payrollId: 'payroll-tecfag',
      installmentCents: 25145,
      installments: 35, // 35 restantes de 36
      firstDueDate: '2026-10-05',
      interestRateBps: 452, // 4.52% a.m.
      cetBps: 471, // 4.71% a.m.
      originalAmountCents: 400000,
      currentBalanceCents: 905220,
      totalContractInstallments: 36,
      paidInstallments: 1
    },
    {
      id: 'debt-bv-hb20',
      name: 'Financiamento HB20 Comfort ***1232',
      kind: 'financing',
      creditor: 'Banco BV',
      accountId: 'account-santander',
      installmentCents: 107600,
      installments: 22, // 22 restantes de 48
      firstDueDate: '2026-10-27',
      interestRateBps: 149,
      cetBps: 179,
      currentBalanceCents: 1940317, // R$ 19.403,17 para quitação antecipada
      totalContractInstallments: 48,
      paidInstallments: 26
    }
  ];

  const state = {
    schemaVersion: 1,
    accounts,
    cards,
    entries: [],
    birthdays: [],
    appointments: [],
    plans: {
      payrolls,
      debts,
      recurrences: [],
      payrollRuns: []
    }
  };

  validateLedger(state, '2026-10-12');

  const payload = {
    revision: 1,
    state
  };

  await fsp.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Dados do NWFINANCE carregados com sucesso no wallet.json!');
}

run().catch(err => {
  console.error('Erro na carga dos dados:', err);
  process.exit(1);
});
