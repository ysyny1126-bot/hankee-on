import { allergensOf, PANTRY_STAPLES, sameIngredient } from '@/data/catalog';
import type { Ingredient, Recipe, RecipeIngredient } from '@/data/types';
import { daysUntil } from './dates';

export interface IngredientMatch {
  need: RecipeIngredient;
  /** 냉장고에서 찾은 재고(없으면 null) */
  stock: Ingredient | null;
  status: 'have' | 'low' | 'unknown_amount' | 'missing' | 'staple';
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
}

/** 레시피 재료 하나를 재고와 비교 */
export function matchIngredient(need: RecipeIngredient, stock: Ingredient[]): IngredientMatch {
  const found = stock.find((s) => s.quantity > 0 && sameIngredient(s.name, need.name)) ?? null;
  if (!found) {
    const staple = PANTRY_STAPLES.some((p) => sameIngredient(p, need.name));
    return { need, stock: null, status: staple ? 'staple' : 'missing' };
  }
  if (found.unit !== need.unit) return { need, stock: found, status: 'unknown_amount' };
  return { need, stock: found, status: found.quantity >= need.amount ? 'have' : 'low' };
}

export function matchRecipe(recipe: Recipe, stock: Ingredient[], allergies: string[], scale = 1): RecipeMatch {
  const scaled = recipe.ingredients.map((i) => ({ ...i, amount: round(i.amount * scale) }));
  const matches = scaled.map((n) => matchIngredient(n, stock));
  const required = matches.filter((m) => !m.need.optional && m.status !== 'staple');
  const have = required.filter((m) => m.status !== 'missing');
  const usesExpiring = matches
    .map((m) => m.stock)
    .filter((s): s is Ingredient => !!s && !!s.expiryDate && daysUntil(s.expiryDate) <= 3);
  const recipeAllergens = recipe.allergens.length ? recipe.allergens : allergensOf(recipe.ingredients.map((i) => i.name));
  return {
    recipe,
    matches,
    haveCount: have.length,
    requiredCount: required.length,
    missingRequired: required.filter((m) => m.status === 'missing').map((m) => m.need),
    usesExpiring,
    coverage: required.length ? have.length / required.length : 1,
    blockedByAllergy: recipeAllergens.filter((a) => allergies.includes(a)),
  };
}

/**
 * 냉장고 재료 기반 레시피 순위.
 * 알레르기가 겹치는 레시피는 항상 제외한다(기획 원칙: 알레르기 최우선).
 */
export function rankRecipes(
  recipes: Recipe[],
  stock: Ingredient[],
  opts: { allergies: string[]; disliked: string[]; maxMinutes?: number; recentRecipeNames?: string[] },
): RecipeMatch[] {
  return recipes
    .map((r) => matchRecipe(r, stock, opts.allergies))
    .filter((m) => m.blockedByAllergy.length === 0)
    .filter((m) => !m.recipe.ingredients.some((i) => !i.optional && opts.disliked.some((d) => sameIngredient(d, i.name))))
    .sort((a, b) => score(b, opts) - score(a, opts));
}

function score(m: RecipeMatch, opts: { maxMinutes?: number; recentRecipeNames?: string[] }): number {
  let s = m.coverage * 100 + m.usesExpiring.length * 25 - m.missingRequired.length * 10;
  if (opts.maxMinutes && m.recipe.timeMinutes > opts.maxMinutes) s -= 20;
  if (opts.recentRecipeNames?.includes(m.recipe.name)) s -= 15; // 최근 먹은 메뉴는 살짝 뒤로(다양성)
  return s;
}

/** 요리 완료 시 재고에서 뺄 양 제안. 단위가 다르면 자동으로 빼지 않고 사용자가 정한다. */
export function proposeDeduction(m: IngredientMatch): number {
  if (!m.stock) return 0;
  if (m.stock.unit === m.need.unit) return Math.min(m.stock.quantity, m.need.amount);
  return 0;
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatAmount(amount: number, unit: string): string {
  return `${round(amount)}${unit}`;
}
