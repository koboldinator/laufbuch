// Trainingsarten: Farbe = Trainingsart, überall gleich.

export const TYPES = {
  easy: { label: 'Easy', color: '#2F5BD8', light: '#8BA8FA', rpe: 3, run: true },
  long: { label: 'Long Run', color: '#1F9C8B', light: '#6CCBBE', rpe: 4, run: true },
  threshold: { label: 'Schwelle', color: '#F08A24', light: '#F7B26B', rpe: 7, run: true },
  racepace: { label: '10K-Tempo', color: '#E8456B', light: '#F7A0B4', rpe: 8, run: true },
  vo2: { label: 'VO2max', color: '#7A4DE0', light: '#B39BF5', rpe: 8, run: true },
  race: { label: 'Wettkampf', color: '#D6336C', light: '#F59AB8', rpe: 9, run: true },
  run: { label: 'Lauf', color: '#5C5C66', light: '#A6A6B0', rpe: 4, run: true },
  strength: { label: 'Kraft', color: '#3A3833', light: '#5C5A55', rpe: 6, run: false },
  rest: { label: 'Ruhetag', color: '#C2C2CA', light: '#E2E2E8', rpe: 0, run: false },
};

export const RUN_TYPES = ['easy', 'long', 'threshold', 'racepace', 'vo2', 'race', 'run'];
export const SESSION_TYPES = ['easy', 'long', 'threshold', 'racepace', 'vo2', 'race', 'run', 'strength', 'rest'];

export const STRIDES = { label: 'Strides', color: '#F2C230', light: '#FFE08A' };

export function typeOf(t) {
  return TYPES[t] || TYPES.run;
}

// Kachel-Verlauf (wie im Design): Farbfleck der Art + gelber Fleck für Strides
export function tileBackground(type, strides) {
  const t = typeOf(type);
  if (type === 'rest') return 'linear-gradient(135deg, #F4F4F6, #E8E8EE)';
  if (type === 'strength') return 'linear-gradient(145deg, #5C5A55, #33312D)';
  let bg = `radial-gradient(circle at 35% 35%, ${t.color} 0%, ${hexA(t.color, 0.55)} 45%, ${hexA(t.color, 0)} 80%)`;
  if (strides) bg += `, radial-gradient(circle at 75% 78%, ${STRIDES.color} 0%, ${hexA(STRIDES.color, 0)} 55%)`;
  return `${bg}, #EEF0F8`;
}

export function orbBackground(type, strides) {
  const t = typeOf(type);
  if (type === 'strength') return 'linear-gradient(145deg, #5C5A55, #33312D)';
  if (strides) return `linear-gradient(180deg, ${STRIDES.color} 0%, ${t.light} 38%, ${t.color} 100%)`;
  return `radial-gradient(circle at 35% 30%, ${t.light}, ${t.color} 70%)`;
}

export function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Farbtöne für Blöcke
export const TINTS = {
  'orange-pink': { label: 'Orange → Pink', bg: 'linear-gradient(90deg, #F5A65B, #EE6F8D)', fg: '#FFFFFF' },
  grau: { label: 'Grau', bg: '#D9D8D4', fg: '#141416' },
  blau: { label: 'Blau', bg: 'linear-gradient(90deg, #7F9BEF, #4E74E4)', fg: '#FFFFFF' },
  'blau-violett': { label: 'Blau → Violett', bg: 'linear-gradient(90deg, #4E74E4, #8E68E8)', fg: '#FFFFFF' },
  petrol: { label: 'Petrol', bg: 'linear-gradient(90deg, #3DB3A3, #1F8C7D)', fg: '#FFFFFF' },
  violett: { label: 'Violett', bg: 'linear-gradient(90deg, #A88BF2, #7A4DE0)', fg: '#FFFFFF' },
  orange: { label: 'Orange', bg: 'linear-gradient(90deg, #F7B26B, #F08A24)', fg: '#FFFFFF' },
};

export const STRENGTH_FOCUS = ['Ganzkörper', 'Beine', 'Oberkörper', 'Core', 'Plyo', 'Mobility'];

// Überschrift „Heute“ je nach Art
export function todayHeadline(type) {
  switch (type) {
    case 'easy': return ['Heute läufst du', 'locker.'];
    case 'long': return ['Heute läufst du', 'lang.'];
    case 'threshold': return ['Heute wird’s', 'zügig.'];
    case 'vo2': return ['Heute wird’s', 'schnell.'];
    case 'racepace': return ['Heute läufst du', 'Renntempo.'];
    case 'race': return ['Heute ist', 'Renntag.'];
    case 'strength': return ['Heute steht', 'Kraft an.'];
    case 'run': return ['Heute', 'wird gelaufen.'];
    case 'rest': return ['Heute ist', 'Ruhetag.'];
    default: return ['Heute ist', 'frei.'];
  }
}
