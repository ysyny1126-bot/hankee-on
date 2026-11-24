import type { Ingredient } from '@/data/types';
import { formatAmount, round } from '@/logic/inventory';

/**
 * 눈대중 양: 저울 없이 '얼마나 남았는지'만 고르게 한다.
 * g·ml·큰술처럼 재기 어려운 단위는 처음 넣은 양(fullQuantity)을 기준으로
 * '거의 그대로 · 반 넘게 · 반쯤 · 조금 · 아주 조금' 다섯 단계로 고르고, 내부에서는 대략적인 숫자로 바꿔 계산한다.
 * 개·장·캔처럼 셀 수 있는 단위는 그대로 숫자로 센다.
 */
export interface Level {
  key: 'full' | 'most' | 'half' | 'little' | 'tiny';
  label: string;
  ratio: number;
}

export const LEVELS: Level[] = [
  { key: 'full', label: '거의 그대로', ratio: 1 },
  { key: 'most', label: '반 넘게', ratio: 0.75 },
  { key: 'half', label: '반쯤', ratio: 0.5 },
  { key: 'little', label: '조금', ratio: 0.25 },
  { key: 'tiny', label: '아주 조금', ratio: 0.1 },
];

const MEASURED = ['g', 'kg', 'ml', 'L', '큰술', '작은술', '컵'];

/** 저울·계량이 필요한 단위인지(→ 눈대중 단계로 고른다). 0.3개처럼 나눠 쓰는 것도 눈대중 */
export function isRough(i: Pick<Ingredient, 'unit' | 'quantity'>): boolean {
  return MEASURED.includes(i.unit) || (i.quantity % 1 !== 0 && i.quantity < 3);
}

export function fullOf(i: Pick<Ingredient, 'quantity' | 'fullQuantity'> & { unit?: string }): number {
  // 예전에 넣은 재료(기준 없음): 0.7개처럼 나눠 쓴 것은 1개를 기준으로, 무게·부피는 지금 양을 기준으로 본다
  const base = i.fullQuantity ?? (i.unit && !MEASURED.includes(i.unit) ? Math.ceil(i.quantity) : i.quantity);
  return Math.max(base, i.quantity);
}

/** 지금 양이 어느 단계에 가까운지 */
export function levelOf(i: Pick<Ingredient, 'quantity' | 'fullQuantity'> & { unit?: string }): Level {
  const r = i.quantity / (fullOf(i) || 1);
  return LEVELS.reduce((best, l) => (Math.abs(l.ratio - r) < Math.abs(best.ratio - r) ? l : best), LEVELS[0]);
}

/** 단계를 골랐을 때 저장할 대략적인 양 */
export function quantityFor(i: Pick<Ingredient, 'quantity' | 'fullQuantity' | 'unit'>, level: Level): number {
  const q = fullOf(i) * level.ratio;
  return ['g', 'ml'].includes(i.unit) ? Math.max(1, Math.round(q / 5) * 5) : Math.max(0.05, round(q));
}

/** 한 단계 아래(없으면 null → 다 씀) */
export function lowerLevel(i: Pick<Ingredient, 'quantity' | 'fullQuantity'> & { unit?: string }): Level | null {
  const idx = LEVELS.findIndex((l) => l.key === levelOf(i).key);
  return LEVELS[idx + 1] ?? null;
}

/** 좁은 자리용: 눈대중이면 '반쯤', 셀 수 있으면 '3개' */
export function shortAmount(i: Pick<Ingredient, 'quantity' | 'fullQuantity' | 'unit'>): string {
  return isRough(i) ? `${levelOf(i).label} 남음` : formatAmount(i.quantity, i.unit);
}

/** 화면 표시: 눈대중이면 '반쯤 (약 150g)', 셀 수 있으면 '3개' */
export function amountText(i: Pick<Ingredient, 'quantity' | 'fullQuantity' | 'unit'>): string {
  if (!isRough(i)) return formatAmount(i.quantity, i.unit);
  return `${levelOf(i).label} (약 ${formatAmount(i.quantity, i.unit)})`;
}

/** 마트에서 흔한 포장 크기(등록할 때 숫자를 몰라도 고르기만 하게). 포장지에 적힌 양이 제일 정확하다 */
const PACKS: Record<string, number[]> = {
  돼지고기: [300, 500, 600], 소고기: [200, 300, 500], 닭가슴살: [100, 500, 1000], 우유: [200, 900], 김치: [500, 1000],
  콩나물: [200, 300], 숙주: [200, 300], 시금치: [200, 300], 떡: [300, 500], 파스타면: [500], 새우: [200, 500],
  쌀: [1000, 4000], 요거트: [400], 생크림: [250, 500], 토마토소스: [350, 600], 햄: [200, 340], 소면: [500, 900],
};

export function packSizes(name: string, unit: string): number[] {
  const p = Object.entries(PACKS).find(([k]) => name.includes(k))?.[1];
  if (p && ['g', 'ml'].includes(unit)) return p;
  if (unit === 'g') return [100, 200, 300, 500];
  if (unit === 'ml') return [200, 500, 1000];
  return [];
}

/** 사전에 등록된 '흔한 포장 크기'만(일반 추정값 제외). 근거 없는 조언을 하지 않기 위해 */
export function knownPacks(name: string): number[] | null {
  return Object.entries(PACKS).find(([k]) => name.includes(k))?.[1] ?? null;
}
