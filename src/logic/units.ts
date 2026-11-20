import { findCatalog } from '@/data/catalog';

/**
 * 단위 변환(R3).
 * 재고는 '팩', 레시피는 '모'처럼 단위가 달라도 같은 양으로 비교·차감할 수 있게 한다.
 *
 * 1) 같은 종류끼리: g ↔ kg ↔ 근, ml ↔ L ↔ 컵 ↔ 큰술 ↔ 작은술, 개 ↔ 알
 * 2) 재료별로 정해진 것: 두부 팩=모, 대파 뿌리=대, 밥 그릇=공기, 계란 판=30개 …
 * 3) 재료별 1개(1단위) 무게: 양파 1개 ≈ 200g 처럼 '개 ↔ g'
 * 바꿀 수 없으면 null — 그때는 화면에서 사용자가 직접 양을 정한다(추측하지 않음).
 * 무게 값은 대략적인 평균이라, 변환으로 나온 양은 항상 사용자가 고칠 수 있게 둔다.
 */

/** 같은 차원(무게·부피·개수) 안의 기본 단위와 배수 */
const DIM: Record<string, { base: 'g' | 'ml' | 'ea'; f: number }> = {
  g: { base: 'g', f: 1 },
  그램: { base: 'g', f: 1 },
  kg: { base: 'g', f: 1000 },
  킬로: { base: 'g', f: 1000 },
  근: { base: 'g', f: 600 },
  ml: { base: 'ml', f: 1 },
  l: { base: 'ml', f: 1000 },
  리터: { base: 'ml', f: 1000 },
  컵: { base: 'ml', f: 200 },
  큰술: { base: 'ml', f: 15 },
  작은술: { base: 'ml', f: 5 },
  개: { base: 'ea', f: 1 },
  알: { base: 'ea', f: 1 },
};

/** 재료별 다른 이름의 같은 단위(→ 사전 기본 단위 기준 배수) */
const ITEM_UNITS: Record<string, Record<string, number>> = {
  두부: { 팩: 1, 모: 1 },
  대파: { 뿌리: 1, 대: 1 },
  밥: { 그릇: 1, 공기: 1 },
  계란: { 판: 30, 구: 1 },
  김: { 봉지: 1, 팩: 1 },
  라면: { 봉지: 1, 개: 1 },
  우유: { 팩: 1000, 통: 1000 },
  햄: { 장: 20, 캔: 200 },
  치즈: { 장: 1 },
  김치: { 포기: 2000 },
  만두: { 봉: 20, 봉지: 20 },
};

/**
 * A7 '내 단위': 사용자가 정한 변환(예: 우리 집 두부 1팩 = 0.5모).
 * 재료 사전 이름 → { 단위: 사전 기본 단위로 몇 개 }. 저장소(store)가 불러올 때·바뀔 때 넣어 준다.
 */
let USER_UNITS: Record<string, Record<string, number>> = {};
export function setUserUnits(map: Record<string, Record<string, number>> | undefined) {
  USER_UNITS = map ?? {};
}

/** 이 재료의 단위를 사전 기본 단위로 바꿀 수 있는지(내 단위 정하기 화면을 보여 줄지 판단용) */
export function catalogUnitOf(name: string): string | null {
  return findCatalog(name)?.unit ?? null;
}

/** 재료별 사전 기본 단위 1개의 대략 무게(g) — '개 ↔ g' 변환용 */
const GRAMS_PER_UNIT: Record<string, number> = {
  계란: 55,
  양파: 200,
  감자: 150,
  당근: 150,
  애호박: 300,
  두부: 300,
  대파: 100,
  밥: 210,
  토마토: 150,
  파프리카: 150,
  사과: 250,
  바나나: 120,
  오이: 200,
};

const norm = (u: string) => u.trim().toLowerCase().replace('리터', 'l');

/** 재료 사전 이름(별칭 정리) */
function key(name: string): string {
  return findCatalog(name)?.name ?? name;
}

/** 이 재료에서 unit 1이 '사전 기본 단위' 몇 개인지(모르면 null) */
function toCatalogUnit(name: string, unit: string): { amountPerUnit: number; catalogUnit: string } | null {
  const c = findCatalog(name);
  if (!c) return null;
  const u = norm(unit);
  if (u === norm(c.unit)) return { amountPerUnit: 1, catalogUnit: c.unit };
  const mine = USER_UNITS[c.name];
  if (mine && mine[unit] != null && mine[unit] > 0) return { amountPerUnit: mine[unit], catalogUnit: c.unit };
  const item = ITEM_UNITS[c.name];
  if (item && item[unit] != null) return { amountPerUnit: item[unit], catalogUnit: c.unit };
  return null;
}

/**
 * amount(from 단위) → to 단위. 바꿀 수 없으면 null.
 * 예: convert(1, '팩', '모', '두부') = 1, convert(1, 'kg', 'g', '돼지고기') = 1000, convert(2, '개', 'g', '양파') = 400
 */
export function convert(amount: number, from: string, to: string, name: string): number | null {
  if (!from || !to) return null;
  if (norm(from) === norm(to)) return amount;

  // 1) 같은 차원
  const a = DIM[norm(from)];
  const b = DIM[norm(to)];
  if (a && b && a.base === b.base) return (amount * a.f) / b.f;

  // 2) 재료별 같은 단위 → 사전 기본 단위로 모은 뒤 다시 풀기
  const fromC = toCatalogUnit(name, from);
  const toC = toCatalogUnit(name, to);
  if (fromC && toC) return (amount * fromC.amountPerUnit) / toC.amountPerUnit;

  // 3) 개수 ↔ 무게(재료별 1개 무게)
  const grams = GRAMS_PER_UNIT[key(name)];
  if (grams) {
    const asGrams = (amt: number, unit: string): number | null => {
      const d = DIM[norm(unit)];
      if (d?.base === 'g') return amt * d.f;
      const c = toCatalogUnit(name, unit) ?? (d?.base === 'ea' ? { amountPerUnit: 1, catalogUnit: '개' } : null);
      if (!c) return null;
      return amt * c.amountPerUnit * grams;
    };
    const g = asGrams(amount, from);
    if (g != null) {
      const d = DIM[norm(to)];
      if (d?.base === 'g') return g / d.f;
      const c = toCatalogUnit(name, to) ?? (d?.base === 'ea' ? { amountPerUnit: 1, catalogUnit: '개' } : null);
      if (c) return g / (c.amountPerUnit * grams);
    }
  }
  return null;
}

/** 소수 둘째 자리까지 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * E9 계량 도구가 없을 때: 큰술·작은술·ml를 밥숟가락·종이컵으로 대략 바꿔 보여 준다.
 * 밥숟가락 ≈ 10ml, 종이컵 ≈ 180ml(대략치). 바꿀 필요가 없으면 null.
 */
export function handyMeasure(amount: number, unit: string): string | null {
  const ml = unit === '큰술' ? amount * 15 : unit === '작은술' ? amount * 5 : unit === 'ml' ? amount : unit === '컵' ? amount * 200 : null;
  if (ml == null || ml <= 0) return null;
  const half = (n: number) => Math.max(0.5, Math.round(n * 2) / 2);
  if (ml >= 90) return `종이컵 약 ${half(ml / 180)}컵`;
  if (ml < 4) return '조금(한 꼬집)';
  return `밥숟가락 약 ${half(ml / 10)}`;
}
