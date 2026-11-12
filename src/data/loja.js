// Horário da loja (0 = domingo). Usado na nav, na seção "A loja" e no rodapé.
export const HOURS = [
  { day: 'Domingo', open: 0, close: 0 },
  { day: 'Segunda', open: 8, close: 19 },
  { day: 'Terça', open: 8, close: 19 },
  { day: 'Quarta', open: 8, close: 19 },
  { day: 'Quinta', open: 8, close: 19 },
  { day: 'Sexta', open: 8, close: 19 },
  { day: 'Sábado', open: 8, close: 19 },
];
export const ORDER = [1, 2, 3, 4, 5, 6, 0]; // a tabela começa na segunda

export function hoursToday(now) {
  const d = now.getDay();
  const h = now.getHours() + now.getMinutes() / 60;
  const t = HOURS[d];
  const open = t.open > 0 && h >= t.open && h < t.close;
  let nextLabel;
  if (t.open > 0 && h < t.open) nextLabel = `hoje às ${t.open}h`;
  else {
    let next = 1;
    while (next <= 7 && !HOURS[(d + next) % 7].open) next++;
    const nextHours = HOURS[(d + next) % 7];
    const dayText = next === 1 ? 'amanhã' : next === 7 ? 'hoje' : `em ${next} dias`;
    if (d === 0 || (d === 6 && next > 1)) nextLabel = `Próximo horário divulgado: ${nextHours.day.toLowerCase()} às ${nextHours.open}h`; else nextLabel = '';
    if (!nextLabel) nextLabel = `${dayText} às ${nextHours.open}h`;
  }
  return { day: d, open, closeLabel: `${t.close}h`, nextLabel };
}
