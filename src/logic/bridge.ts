import { sameIngredient } from '@/data/catalog';
import type { AppState, MealType, Recipe } from '@/data/types';
import { fullOf, shortAmount } from '@/logic/amount';
import { addDays, toDateKey } from '@/logic/dates';
import { rankForUser } from '@/logic/suggestions';
import { isUsable } from '@/logic/tidy';

export interface Bridge { line: string; recipe: Recipe; date: string; mealType: MealType }

/**
 * 남은 재료 이어주기: 방금 요리에 쓰고 반 이하로 남은 재료로 내일 만들 메뉴 1개.
 * 부족한 재료가 1개 이하이고, 최근 3일 안에 만들지 않은 메뉴만. 없으면 null(아무것도 안 띄움).
 */
export function nextUse(s: AppState, usedNames: string[], cookedId: string): Bridge | null {
  const left = s.ingredients.filter(
    (i) => i.kind !== 'leftover' && isUsable(i) && usedNames.some((n) => sameIngredient(n, i.name)) && i.quantity / (fullOf(i) || 1) <= 0.5,
  );
  if (!left.length) return null;
  const recent = new Set(s.cooks.filter((c) => c.date >= addDays(toDateKey(), -3)).map((c) => c.recipeId));
  const ranked = rankForUser(s).filter((m) => m.recipe.id !== cookedId && !recent.has(m.recipe.id) && m.missingRequired.length <= 1);
  for (const ing of left) {
    const m = ranked.find((x) => x.recipe.ingredients.some((r) => !r.optional && sameIngredient(r.name, ing.name)));
    if (!m) continue;
    const date = addDays(toDateKey(), 1);
    const taken = new Set(s.mealPlan.filter((e) => e.date === date).map((e) => e.mealType));
    const mealType: MealType = !taken.has('lunch') ? 'lunch' : !taken.has('dinner') ? 'dinner' : 'breakfast';
    return { line: `남은 ${ing.name}(${shortAmount(ing).replace(' 남음', '')}) → 내일 ${m.recipe.name} 어때요?`, recipe: m.recipe, date, mealType };
  }
  return null;
}
