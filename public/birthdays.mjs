import {today,uid,validDate,addMonths} from './finance.mjs';

export const DEFAULT_NOTIFY_DAYS = [30, 7, 3, 0];

export const dayNumber = date => Date.parse(date + 'T00:00:00Z') / 86400000;

export const isLeapYear = year => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

export function birthdaysOf(s) {
  return Array.isArray(s?.birthdays) ? s.birthdays : [];
}

export function nextBirthdayOccurrence(b, asOf = today()) {
  const parts = b.date.split('-').map(Number);
  const birthY = parts[0], birthM = parts[1], birthD = parts[2];
  const asOfParts = asOf.split('-').map(Number);
  const asOfY = asOfParts[0];

  // Verifica ocorrência no ano atual
  const candidateD = (birthM === 2 && birthD === 29 && !isLeapYear(asOfY)) ? 28 : birthD;
  const candidate = `${asOfY}-${String(birthM).padStart(2, '0')}-${String(candidateD).padStart(2, '0')}`;

  let nextDate, targetYear;
  if (candidate < asOf) {
    targetYear = asOfY + 1;
    const nextD = (birthM === 2 && birthD === 29 && !isLeapYear(targetYear)) ? 28 : birthD;
    nextDate = `${targetYear}-${String(birthM).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`;
  } else {
    targetYear = asOfY;
    nextDate = candidate;
  }

  const daysRemaining = Math.round(dayNumber(nextDate) - dayNumber(asOf));
  const hasYear = b.hasYear !== false && birthY >= 1900 && birthY <= targetYear;
  const turningAge = hasYear ? (targetYear - birthY) : null;

  return {
    nextDate,
    targetYear,
    daysRemaining,
    turningAge,
    isToday: daysRemaining === 0
  };
}

export function matchesReminder(b, daysRemaining, nextDate, asOf) {
  const rules = Array.isArray(b.notifyDays) && b.notifyDays.length ? b.notifyDays : DEFAULT_NOTIFY_DAYS;
  if (rules.includes(daysRemaining)) return true;
  // Suporte a 1 mês exato por calendário (ex: 31 dias no mês anterior)
  if (rules.includes(30) && addMonths(nextDate, -1) === asOf) return true;
  return false;
}

export function birthdayAlerts(s, asOf = today()) {
  const list = [];
  for (const b of birthdaysOf(s)) {
    if (b.active === false) continue;
    const occ = nextBirthdayOccurrence(b, asOf);
    if (matchesReminder(b, occ.daysRemaining, occ.nextDate, asOf)) {
      list.push({
        id: b.id,
        name: b.name,
        date: b.date,
        nextDate: occ.nextDate,
        daysRemaining: occ.daysRemaining,
        turningAge: occ.turningAge,
        photo: b.photo || null,
        phone: b.phone || null,
        relationship: b.relationship || '',
        notes: b.notes || '',
        isToday: occ.isToday
      });
    }
  }
  return list.sort((a, b) => a.daysRemaining - b.daysRemaining || a.name.localeCompare(b.name));
}

export function birthdayCalendarAppointments(s, baseDate) {
  const appointments = [];
  const base = new Date(baseDate || today() + 'T12:00:00');
  const years = [base.getFullYear() - 1, base.getFullYear(), base.getFullYear() + 1];

  for (const b of birthdaysOf(s)) {
    if (b.active === false) continue;
    const parts = b.date.split('-').map(Number);
    const birthY = parts[0], birthM = parts[1], birthD = parts[2];

    for (const year of years) {
      const day = (birthM === 2 && birthD === 29 && !isLeapYear(year)) ? 28 : birthD;
      const dateStr = `${year}-${String(birthM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const turningAge = (b.hasYear !== false && birthY >= 1900 && birthY <= year) ? (year - birthY) : null;
      appointments.push({
        id: `bday-${b.id}-${year}`,
        title: `🎂 Aniversário · ${b.name}`,
        date: new Date(dateStr + 'T12:00:00'),
        isoDate: dateStr,
        time: '09:00',
        type: 'birthday',
        description: turningAge ? `Completando ${turningAge} anos` : 'Aniversário',
        photo: b.photo || null,
        birthdayId: b.id
      });
    }
  }
  return appointments;
}

export function formatBirthdayNotification(alerts) {
  if (!alerts.length) return null;
  const todayAlerts = alerts.filter(a => a.isToday);
  const upcomingAlerts = alerts.filter(a => !a.isToday);

  let title = 'NWallet · Lembrete de Aniversário 🎂';
  let body = '';

  if (todayAlerts.length > 0) {
    if (todayAlerts.length === 1) {
      const a = todayAlerts[0];
      title = 'NWallet · Aniversário Hoje! 🎉';
      body = `Hoje é aniversário de ${a.name}! ${a.turningAge ? `Completando ${a.turningAge} anos! ` : ''}Dê os parabéns! 🎂`;
    } else {
      title = 'NWallet · Aniversários Hoje! 🎉';
      body = `Hoje é aniversário de: ${todayAlerts.map(a => a.name).join(', ')}! 🎂`;
    }
  } else if (upcomingAlerts.length === 1) {
    const a = upcomingAlerts[0];
    const when = a.daysRemaining === 1 ? 'amanhã' :
      a.daysRemaining === 3 ? 'em 3 dias' :
      a.daysRemaining === 7 ? 'em 1 semana' :
      a.daysRemaining === 30 ? 'em 1 mês' :
      `em ${a.daysRemaining} dias`;
    const [y, m, d] = a.nextDate.split('-');
    body = `Aniversário de ${a.name} ${when} (${d}/${m})! ${a.turningAge ? `Vai completar ${a.turningAge} anos.` : ''} 🎂`.trim();
  } else {
    const names = upcomingAlerts.slice(0, 3).map(a => {
      const when = a.daysRemaining === 3 ? 'em 3d' : a.daysRemaining === 7 ? 'em 1 sem' : a.daysRemaining === 30 ? 'em 1 mês' : `em ${a.daysRemaining}d`;
      return `${a.name} (${when})`;
    }).join(', ');
    body = `${upcomingAlerts.length} aniversários próximos: ${names}.`;
  }

  return { title, body, count: alerts.length };
}
