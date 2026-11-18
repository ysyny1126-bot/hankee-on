/** 날짜 도우미. 날짜는 'YYYY-MM-DD' 문자열(현지 시간 기준)로 저장한다. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** 오늘 기준 남은 날 수(오늘이 소비기한이면 0, 지났으면 음수). */
export function daysUntil(key: string, today: string = toDateKey()): number {
  return Math.round((fromDateKey(key).getTime() - fromDateKey(today).getTime()) / 86400000);
}

export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000);
}

export function nowTime(d: Date = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 이번 주 월요일 */
export function weekStart(key: string = toDateKey()): string {
  const d = fromDateKey(key);
  const diff = (d.getDay() + 6) % 7;
  return addDays(key, -diff);
}

export function isValidDateKey(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toDateKey(fromDateKey(s)) === s;
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export function formatKoreanDate(key: string): string {
  const d = fromDateKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
}

export function dDayLabel(key: string): string {
  const n = daysUntil(key);
  if (n < 0) return `${-n}일 지남`;
  if (n === 0) return '오늘까지';
  return `D-${n}`;
}

/** 현재 시각으로 식사 구분 추천 */
export function guessMealType(d: Date = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = d.getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 17 && h < 22) return 'dinner';
  return 'snack';
}

export function newId(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** 한국어 조사: 받침 유무에 따라 '을/를', '이/가', '으로/로' 고르기 */
function hasBatchim(word: string): boolean {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}
export const eul = (w: string) => `${w}${hasBatchim(w) ? '을' : '를'}`;
export const iga = (w: string) => `${w}${hasBatchim(w) ? '이' : '가'}`;
export const euro = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  const rieul = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 8;
  return `${w}${hasBatchim(w) && !rieul ? '으로' : '로'}`;
};
