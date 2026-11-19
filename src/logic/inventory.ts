import { PANTRY_STAPLES, sameIngredient } from '@/data/catalog';
import type { Ingredient, Recipe, RecipeIngredient } from '@/data/types';
import { daysUntil } from './dates';
import { scoreMatch, type RankContext, type Reason } from './recommend';
import { checkRecipe } from './safety';
import { convert } from './units';

export interface IngredientMatch {
  need: RecipeIngredient;
  /** 가장 먼저 써야 할 묶음(소비기한이 가장 가까운 것). 없으면 null */
  stock: Ingredient | null;
  /** 같은 재료의 모든 묶음 — 소비기한이 가까운 순(기한 모름은 맨 뒤) */
  stocks: Ingredient[];
  /** 모든 묶음을 레시피 단위로 바꿔 합친 양. 단위를 바꿀 수 없는 묶음은 빼고 센다(전부 못 바꾸면 null) */
  have: number | null;
  status: 'have' | 'low' | 'unknown_amount' | 'missing' | 'staple';
}

/** 먼저 써야 할 순서: 소비기한 가까운 것 → 기한 모름 / 같으면 먼저 들어온 것 */
export function fifo(a: Ingredient, b: Ingredient): number {
  const ea = a.expiryDate ?? '9999-12-31';
  const eb = b.expiryDate ?? '9999-12-31';
  return ea === eb ? a.addedAt.localeCompare(b.addedAt) : ea.localeCompare(eb);
}

export interface RecipeMatch {
  recipe: Recipe;
  matches: IngredientMatch[];
  haveCount: number;
  requiredCount: number;
  missingRequired: RecipeIngredient[];
  usesExpiring: Ingredient[]; // 이 레시피가 써 주는 임박 재료
  coverage: number; // 0~1 필수 재료 보유 비율
  blockedByAllergy: string[]; // 사용자 알레르기와 겹치는 항목
  score: number; // 추천 점수(recommend.ts에서 계산)
  reasons: Reason[]; // 추천 이유
}

/** 레시피 재료 하나를 재고와 비교 */
export function matchIngredient(need: RecipeIngredient, stock: Ingredient[]): IngredientMatch {
  // 남은 음식(예: 김치찌개 남은 것)은 재료로 치지 않는다
  const stocks = stock.filter((s) => s.kind !== 'leftover' && s.quantity > 0 && sameIngredient(s.name, need.name)).sort(fifo);
  if (!stocks.length) {
    const staple = PANTRY_STAPLES.some((p) => sameIngredient(p, need.name));
    return { need, stock: null, stocks, have: null, status: staple ? 'staple' : 'missing' };
  }
  // R1: 여러 묶음을 모두 합친다 · R3: 단위가 달라도 바꿀 수 있으면 바꿔서 합친다
  let have: number | null = null;
  for (const b of stocks) {
    const v = convert(b.quantity, b.unit, need.unit, need.name);
    if (v != null) have = (have ?? 0) + v;
  }
  const status = have == null ? 'unknown_amount' : have + 1e-9 >= need.amount ? 'have' : 'low';
  return { need, stock: stocks[0], stocks, have: have == null ? null : round(have), status };
}

/**
 * 요리할 때 뺄 양(선입선출): 소비기한이 가까운 묶음부터 필요한 만큼 뺀다.
 * 양은 각 묶음의 단위로 돌려준다. 단위를 바꿀 수 없는 묶음은 0(사용자가 직접 정함).
 */
export function planDeduction(m: IngredientMatch): { ingredient: Ingredient; amount: number }[] {
  let remaining = m.need.amount;
  return m.stocks.map((b) => {
    const avail = convert(b.quantity, b.unit, m.need.unit, m.need.name);
    if (avail == null || remaining <= 0) return { ingredient: b, amount: 0 };
    const take = Math.min(avail, remaining);
    remaining -= take;
    const inBatchUnit = convert(take, m.need.unit, b.unit, m.need.name) ?? 0;
    return { ingredient: b, amount: round(Math.min(b.quantity, inBatchUnit)) };
  });
}

export function matchRecipe(recipe: Recipe, stock: Ingredient[], allergies: string[], scale = 1): RecipeMatch {
  const scaled = recipe.ingredients.map((i) => ({ ...i, amount: round(i.amount * scale) }));
  const matches = scaled.map((n) => matchIngredient(n, stock));
  const required = matches.filter((m) => !m.need.optional && m.status !== 'staple');
  const have = required.filter((m) => m.status !== 'missing');
  // 이 레시피가 실제로 꺼내 쓸 묶음 중 임박한 것(선입선출 기준)
  const usesExpiring = matches
    .flatMap((m) => (m.need.optional && m.status === 'missing' ? [] : planDeduction(m).filter((d) => d.amount > 0 || m.status === 'unknown_amount').map((d) => d.ingredient)))
    .filter((s) => !!s.expiryDate && daysUntil(s.expiryDate) <= 3);
  // 같은 재료 이름이 두 번 들어가면 한 번만
  const uniqueExpiring = usesExpiring.filter((x, i) => usesExpiring.findIndex((y) => y.id === x.id) === i);
  return {
    recipe,
    matches,
    haveCount: have.length,
    requiredCount: required.length,
    missingRequired: required.filter((m) => m.status === 'missing').map((m) => m.need),
    usesExpiring: uniqueExpiring,
    score: 0,
    reasons: [],
    coverage: required.length ? have.length / required.length : 1,
    blockedByAllergy: checkRecipe(recipe, { allergies, disliked: [] }).allergy,
  };
}

/**
 * 냉장고 재료 기반 레시피 순위.
 * 알레르기·기피 음식에 걸리는 레시피는 항상 제외한다(safety.ts, 기획 원칙: 제외 조건 최우선).
 * 점수와 이유는 recommend.ts의 scoreMatch 한곳에서만 계산한다.
 */
export function rankRecipes(recipes: Recipe[], stock: Ingredient[], ctx: RankContext): RecipeMatch[] {
  return recipes
    .map((r) => matchRecipe(r, stock, ctx.allergies))
    .filter((m) => !checkRecipe(m.recipe, { allergies: ctx.allergies, disliked: ctx.disliked }).excluded)
    .map((m) => ({ ...m, ...scoreMatch(m, ctx) }))
    .sort((a, b) => b.score - a.score);
}

/** 요리 완료 시 재고에서 뺄 양 제안. 단위가 다르면 자동으로 빼지 않고 사용자가 정한다. */
export function proposeDeduction(m: IngredientMatch): number {
  return planDeduction(m)[0]?.amount ?? 0;
}

/** 재고 목록에서 레시피 한 번 만들 만큼 뺀 '가상 재고'(식단 짜기용, 실제 저장은 안 함) */
export function consumeVirtual(stock: Ingredient[], recipe: Recipe): Ingredient[] {
  const next = stock.map((x) => ({ ...x }));
  for (const need of recipe.ingredients) {
    if (need.optional) continue;
    const m = matchIngredient(need, next);
    for (const d of planDeduction(m)) {
      const it = next.find((x) => x.id === d.ingredient.id);
      if (it) it.quantity = round(Math.max(0, it.quantity - d.amount));
    }
  }
  return next.filter((x) => x.quantity > 0);
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatAmount(amount: number, unit: string): string {
  return `${round(amount)}${unit}`;
}
