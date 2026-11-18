import type { AppState, MealPlanEntry, MealType } from '@/data/types';
import { addDays, daysUntil, newId } from './dates';
import { rankForUser } from './suggestions';

/**
 * 식단 만들기(규칙 기반).
 * 우선순위: 알레르기 제외 → 임박 재료 먼저 소진 → 보유 재료 비율 → 조리 시간 → 메뉴가 겹치지 않게.
 * 각 끼니에 '왜 이 메뉴인지' 이유를 붙인다.
 */
export function generatePlan(s: AppState, startDate: string, days: number, mealTypes: MealType[] = ['lunch', 'dinner']): MealPlanEntry[] {
  const ranked = rankForUser(s);
  const used = new Set<string>();
  const out: MealPlanEntry[] = [];
  let slot = 0;
  for (let d = 0; d < days; d++) {
    const date = addDays(startDate, d);
    for (const type of mealTypes) {
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
      const reasons: string[] = [];
      if (pick.usesExpiring.length) reasons.push(`${pick.usesExpiring.map((i) => i.name).join('·')} 먼저 쓰기`);
      reasons.push(pick.missingRequired.length ? `${pick.missingRequired.map((i) => i.name).join('·')} 사면 가능` : '보유 재료로 가능');
      if (pick.recipe.timeMinutes <= s.preferences.maxCookMinutes) reasons.push(`${pick.recipe.timeMinutes}분`);
      out.push({ id: newId('plan_'), date, mealType: type, recipeId: pick.recipe.id, reason: reasons.join(' · ') });
    }
  }
  return out;
}
