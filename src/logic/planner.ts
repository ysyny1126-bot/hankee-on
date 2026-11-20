import type { AppState, MealPlanEntry, MealType } from '@/data/types';
import { addDays, daysUntil, newId } from './dates';
import { consumeVirtual, rankRecipes } from './inventory';
import { needsExpiryCheck } from './tidy';
import { rankContext, topReasons } from './recommend';
import { allRecipes } from './suggestions';

/**
 * 식단 만들기(규칙 기반).
 * 우선순위: 알레르기 제외 → 임박 재료 먼저 소진 → 보유 재료 비율 → 조리 시간 → 메뉴가 겹치지 않게.
 * 각 끼니에 '왜 이 메뉴인지' 이유를 붙인다.
 *
 * R4: 앞 끼니에서 쓴 재료는 '가상 재고'에서 빼고 다음 끼니를 고른다.
 * (월요일에 두부를 다 쓰면 화요일 추천에서는 두부가 없는 것으로 본다. 실제 재고는 바꾸지 않는다)
 */
export function generatePlan(s: AppState, startDate: string, days: number, mealTypes: MealType[] = ['lunch', 'dinner']): MealPlanEntry[] {
  const recipes = allRecipes(s);
  const ctx = rankContext(s);
  let stock = s.ingredients;
  const used = new Set<string>();
  const out: MealPlanEntry[] = [];
  let slot = 0;
  // A5: 남은 음식을 앞 끼니부터 먼저 채운다(1인분씩). 기한이 지나 확인 전인 것은 빼고, 기한이 가까운 것부터.
  const leftovers = s.ingredients
    .filter((i) => i.kind === 'leftover' && i.quantity >= 0.5 && !needsExpiryCheck(i))
    .sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'));
  const queue: { id: string; recipeId: string; name: string; left: number; expiry: string | null }[] = leftovers.map((l) => ({
    id: l.id,
    recipeId: l.recipeId ?? '',
    name: l.name,
    left: Math.max(1, Math.round(l.quantity)),
    expiry: l.expiryDate,
  }));
  leftovers.forEach((l) => l.recipeId && used.add(l.recipeId)); // 남은 음식과 같은 메뉴는 다시 요리하자고 하지 않음
  const done = new Set(s.mealPlan.filter((e) => e.status === 'done').map((e) => `${e.date}|${e.mealType}`));
  for (let d = 0; d < days; d++) {
    const date = addDays(startDate, d);
    for (const type of mealTypes) {
      if (done.has(`${date}|${type}`)) continue; // 이미 먹은 끼니는 그대로
      const lo = type !== 'breakfast' ? queue.find((q) => q.left > 0 && (!q.expiry || daysUntil(q.expiry, date) >= 0)) : undefined;
      if (lo) {
        lo.left--;
        out.push({ id: newId('plan_'), date, mealType: type, recipeId: lo.recipeId, leftoverId: lo.id, reason: `남은 ${lo.name} 먼저 · 다시 요리하지 않아도 돼요` });
        continue;
      }
      const ranked = rankRecipes(recipes, stock, ctx);
      // 앞쪽 날짜에는 임박 재료를 쓰는 레시피를 먼저
      const pool = ranked.filter((m) => !used.has(m.recipe.id));
      const pick =
        (d < 3 && pool.find((m) => m.usesExpiring.some((i) => i.expiryDate && daysUntil(i.expiryDate, date) >= 0))) ||
        (type === 'breakfast' && pool.find((m) => m.recipe.timeMinutes <= 10)) ||
        pool[slot % Math.max(1, Math.min(pool.length, 3))] ||
        ranked[slot % Math.max(1, ranked.length)];
      slot++;
      if (!pick) continue;
      used.add(pick.recipe.id);
      stock = consumeVirtual(stock, pick.recipe);
      const reason = topReasons(pick, 2).join(' · ');
      out.push({ id: newId('plan_'), date, mealType: type, recipeId: pick.recipe.id, reason });
    }
  }
  return out;
}
