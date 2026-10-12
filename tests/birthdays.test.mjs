import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateLedger,validateState} from '../public/finance.mjs';
import {nextBirthdayOccurrence,birthdayAlerts,formatBirthdayNotification,birthdayCalendarAppointments,isLeapYear} from '../public/birthdays.mjs';
import {dailyReminder,defaultReminderSettings} from '../public/reminders.mjs';

test('leap year detector identifies leap years correctly', () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2026), false);
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(1900), false);
});

test('nextBirthdayOccurrence computes correct target date, days remaining and turning age', () => {
  const asOf = '2026-10-12';

  // 1. Aniversário daqui a 3 dias
  const b1 = { id: 'b1', name: 'Maria Silva', date: '1995-10-15', hasYear: true };
  const occ1 = nextBirthdayOccurrence(b1, asOf);
  assert.equal(occ1.nextDate, '2026-10-15');
  assert.equal(occ1.daysRemaining, 3);
  assert.equal(occ1.turningAge, 31);
  assert.equal(occ1.isToday, false);

  // 2. Aniversário hoje
  const b2 = { id: 'b2', name: 'Carlos', date: '1990-10-12', hasYear: true };
  const occ2 = nextBirthdayOccurrence(b2, asOf);
  assert.equal(occ2.nextDate, '2026-10-12');
  assert.equal(occ2.daysRemaining, 0);
  assert.equal(occ2.turningAge, 36);
  assert.equal(occ2.isToday, true);

  // 3. Aniversário já passou neste ano (em maio) -> deve ir para 2027
  const b3 = { id: 'b3', name: 'Ana', date: '1998-05-10', hasYear: true };
  const occ3 = nextBirthdayOccurrence(b3, asOf);
  assert.equal(occ3.nextDate, '2027-05-10');
  assert.equal(occ3.turningAge, 29);
  assert.ok(occ3.daysRemaining > 0);

  // 4. Sem ano informado (hasYear: false)
  const b4 = { id: 'b4', name: 'Lucas', date: '2000-10-19', hasYear: false };
  const occ4 = nextBirthdayOccurrence(b4, asOf);
  assert.equal(occ4.nextDate, '2026-10-19');
  assert.equal(occ4.daysRemaining, 7);
  assert.equal(occ4.turningAge, null);

  // 5. Nascido em 29 de fevereiro (ano bissexto) em ano não-bissexto (2026)
  const b5 = { id: 'b5', name: 'Bissexto', date: '1996-02-29', hasYear: true };
  const occ5 = nextBirthdayOccurrence(b5, '2026-02-20');
  assert.equal(occ5.nextDate, '2026-02-28');
  assert.equal(occ5.daysRemaining, 8);
  assert.equal(occ5.turningAge, 30);
});

test('birthdayAlerts triggers accurately at 0 days, 3 days, 7 days and 30 days', () => {
  const asOf = '2026-10-12';
  const s = {
    ...emptyState(),
    birthdays: [
      { id: 'today', name: 'Aniversariante de Hoje', date: '1990-10-12', active: true },
      { id: 'three_days', name: 'Em Três Dias', date: '1995-10-15', active: true },
      { id: 'one_week', name: 'Em Uma Semana', date: '1992-10-19', active: true },
      { id: 'one_month', name: 'Em Um Mês', date: '1985-11-11', active: true }, // 30 dias de 12/10
      { id: 'far_away', name: 'Longe', date: '1990-12-25', active: true },
      { id: 'inactive', name: 'Desativado', date: '1990-10-12', active: false }
    ]
  };

  const alerts = birthdayAlerts(s, asOf);
  assert.equal(alerts.length, 4);
  assert.deepEqual(alerts.map(a => a.id), ['today', 'three_days', 'one_week', 'one_month']);
  assert.equal(alerts[0].isToday, true);
  assert.equal(alerts[1].daysRemaining, 3);
  assert.equal(alerts[2].daysRemaining, 7);
  assert.equal(alerts[3].daysRemaining, 30);
});

test('formatBirthdayNotification formats title and body for today and upcoming alerts', () => {
  // 1. Aniversário hoje
  const alertToday = [{ id: '1', name: 'Maria', isToday: true, turningAge: 30, daysRemaining: 0, nextDate: '2026-10-12' }];
  const notif1 = formatBirthdayNotification(alertToday);
  assert.ok(notif1.title.includes('Aniversário Hoje!'));
  assert.ok(notif1.body.includes('Hoje é aniversário de Maria!'));
  assert.ok(notif1.body.includes('30 anos'));

  // 2. Aniversário em 3 dias
  const alert3d = [{ id: '2', name: 'João', isToday: false, turningAge: 25, daysRemaining: 3, nextDate: '2026-10-15' }];
  const notif2 = formatBirthdayNotification(alert3d);
  assert.ok(notif2.title.includes('Lembrete de Aniversário'));
  assert.ok(notif2.body.includes('em 3 dias'));
  assert.ok(notif2.body.includes('15/10'));

  // 3. Múltiplos aniversários
  const multiAlerts = [
    { id: '1', name: 'Maria', isToday: false, daysRemaining: 3, nextDate: '2026-10-15' },
    { id: '2', name: 'Pedro', isToday: false, daysRemaining: 7, nextDate: '2026-10-19' }
  ];
  const notif3 = formatBirthdayNotification(multiAlerts);
  assert.ok(notif3.body.includes('2 aniversários'));
  assert.ok(notif3.body.includes('Maria'));
  assert.ok(notif3.body.includes('Pedro'));
});

test('dailyReminder integrates birthday notifications correctly with and without financial debts', () => {
  const settings = defaultReminderSettings();

  // Caso 1: Apenas aniversário
  const sOnlyBirthday = {
    ...emptyState(),
    birthdays: [
      { id: 'b1', name: 'Clara', date: '1995-10-12', active: true }
    ]
  };
  const msg1 = dailyReminder(sOnlyBirthday, settings, '2026-10-12');
  assert.ok(msg1);
  assert.ok(msg1.title.includes('Aniversário Hoje!'));
  assert.ok(msg1.body.includes('Clara'));
  assert.equal(msg1.url, '/?view=birthdays');

  // Caso 2: Sem aniversários e sem contas
  const sEmpty = emptyState();
  assert.equal(dailyReminder(sEmpty, settings, '2026-10-12'), null);

  // Caso 3: Ambos aniversários e contas
  const sBoth = {
    ...emptyState(),
    accounts: [{ id: 'a', name: 'Pessoal', scope: 'personal', kind: 'bank', openingBalanceCents: 100000, openingDate: '2026-01-01' }],
    entries: [{ id: 'e1', type: 'expense', status: 'planned', description: 'Conta de luz', amountCents: 15000, date: '2026-10-12', paymentMethod: 'pix', accountId: 'a', category: 'Moradia' }],
    birthdays: [{ id: 'b1', name: 'Lucas', date: '1990-10-12', active: true }]
  };
  const msg3 = dailyReminder(sBoth, settings, '2026-10-12');
  assert.ok(msg3);
  assert.ok(msg3.title.includes('Aniversário & Lembretes'));
  assert.ok(msg3.body.includes('Lucas'));
  assert.ok(msg3.body.includes('vencendo hoje'));
});

test('birthdayCalendarAppointments maps birthdays into yearly calendar events', () => {
  const s = {
    ...emptyState(),
    birthdays: [
      { id: 'b1', name: 'Renata', date: '1994-08-20', active: true, photo: 'data:image/jpeg;base64,abc' }
    ]
  };
  const appts = birthdayCalendarAppointments(s, '2026-08-01');
  assert.ok(appts.length >= 2);
  const appt2026 = appts.find(a => a.isoDate === '2026-08-20');
  assert.ok(appt2026);
  assert.equal(appt2026.title, '🎂 Aniversário · Renata');
  assert.equal(appt2026.type, 'birthday');
  assert.equal(appt2026.photo, 'data:image/jpeg;base64,abc');
  assert.equal(appt2026.description, 'Completando 32 anos');
});

test('validateState accepts valid birthdays and rejects malformed fields', () => {
  const validState = {
    ...emptyState(),
    birthdays: [
      {
        id: 'valid-id',
        name: 'Carlos Alberto',
        date: '1988-03-25',
        hasYear: true,
        phone: '11987654321',
        relationship: 'Família',
        notes: 'Gosta de ferramentas',
        notifyDays: [30, 7, 3, 0],
        active: true
      }
    ]
  };
  assert.doesNotThrow(() => validateState(validState));

  // Nome vazio deve falhar
  assert.throws(() => validateState({
    ...emptyState(),
    birthdays: [{ id: '1', name: '', date: '1990-01-01' }]
  }));

  // Data inválida deve falhar
  assert.throws(() => validateState({
    ...emptyState(),
    birthdays: [{ id: '1', name: 'Nome', date: 'data-errada' }]
  }));

  // ID duplicado deve falhar
  assert.throws(() => validateState({
    ...emptyState(),
    birthdays: [
      { id: 'rep', name: 'Pessoa 1', date: '1990-01-01' },
      { id: 'rep', name: 'Pessoa 2', date: '1992-05-05' }
    ]
  }));
});
