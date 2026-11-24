import { sameIngredient } from '@/data/catalog';
import type { AppState, MealSourceType, MealType, Recipe } from '@/data/types';
import { goalProgress } from '@/logic/analysis';
import { addDays, daysUntil, iga, toDateKey } from '@/logic/dates';
import { rankForUser } from '@/logic/suggestions';
import { isUsable } from '@/logic/tidy';

/**
 * 끼니 전 선택에 따른 추천 방향.
 * - 집밥: 기존 '오늘의 한 끼' 카드(냉장고 재료 레시피)
 * - 외식·간단히(편의점): 메뉴를 고르는 기준 2~3줄 + 냉장고에서 곧 상할 재료는 내일 집밥으로 넘겨 주기
 * 문장은 일반적인 식생활 안내만(의학적 조언 아님). 근거가 없는 줄은 만들지 않는다.
 */
export type Intent = MealSourceType; // 'home' | 'eat_out' | 'convenience' | 'delivery'

export const INTENTS: { key: Intent; label: string; emoji: string }[] = [
  { key: 'home', label: '집밥', emoji: '🍳' },
  { key: 'eat_out', label: '외식', emoji: '🍽️' },
  { key: 'convenience', label: '간단히', emoji: '🏪' },
];

export function intentOf(s: AppState, date: string, slot: MealType): Intent {
  return s.mealIntents?.[`${date}|${slot}`] ?? 'home';
}

export interface OutsideAdvice {
  lines: string[];
  /** 곧 상할 재료를 내일 집밥으로 넘기는 제안(없으면 undefined) */
  tomorrow?: { recipe: Recipe; ingredient: string; date: string; slot: MealType; line: string };
}

export function outsideAdvice(s: AppState, kind: Intent, now = new Date()): OutsideAdvice {
  const today = toDateKey(now);
  const lines: string[] = [];

  // 1) 오늘 앞 끼니에 채소가 있었나(기록에 채소 접시 수가 있을 때만 판단)
  const todayMeals = s.meals.filter((m) => m.mealDate === today);
  const veg = todayMeals.reduce((a, m) => a + m.items.reduce((b, i) => b + (i.vegetableServings ?? 0), 0), 0);
  const lowVeg = todayMeals.length > 0 && veg < 1;

  if (kind === 'eat_out') {
    lines.push(lowVeg ? '오늘 채소가 적었어요 → 비빔밥·쌈밥·샤브샤브처럼 채소가 많은 메뉴' : '밥·고기·채소가 같이 나오는 백반·정식 메뉴가 고르기 쉬워요');
    lines.push('국물 요리는 국물을 반만 먹으면 짠맛을 줄일 수 있어요');
  } else {
    lines.push('주식 하나 + 단백질 하나 + 채소 하나로: 삼각김밥·도시락에 삶은 계란, 샐러드나 컵과일');
    const home = ['계란', '김치', '두부', '김'].filter((n) => s.ingredients.some((i) => i.kind !== 'leftover' && isUsable(i) && sameIngredient(i.name, n)));
    lines.push(home.length ? `라면이면 국물은 반만, 냉장고의 ${home.slice(0, 2).join('·')}를 더해요` : '라면이면 국물은 반만, 계란 하나를 더하면 든든해요');
    if (lowVeg) lines[0] = '오늘 채소가 적었어요 → 샐러드나 컵과일을 꼭 하나 더해요';
  }

  // 2) 이번 주 식비 목표가 있으면 남은 돈
  const budget = s.goals.find((g) => g.goalType === 'budget' && g.status === 'active');
  const gp = budget ? goalProgress(budget, s) : null;
  if (budget && gp) {
    const left = budget.targetValue - gp.value;
    lines.push(left > 0 ? `이번 주 식비 ${left.toLocaleString()}원 남았어요` : '이번 주 식비 목표를 넘었어요 · 가볍게 골라요');
  }

  // 3) 오늘·내일까지인 재료 → 내일 집밥 한 끼로 넘기기
  const urgent = s.ingredients
    .filter((i) => i.kind !== 'leftover' && isUsable(i) && i.expiryDate && daysUntil(i.expiryDate, today) <= 1 && daysUntil(i.expiryDate, today) >= 0)
    .sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''));
  let tomorrow: OutsideAdvice['tomorrow'];
  if (urgent.length) {
    const planned = new Set(s.mealPlan.filter((e) => e.date === today).map((e) => e.recipeId));
    const ranked = rankForUser(s).filter((m) => m.missingRequired.length <= 1 && !planned.has(m.recipe.id));
    for (const ing of urgent) {
      const m = ranked.find((x) => x.recipe.ingredients.some((r) => !r.optional && sameIngredient(r.name, ing.name)));
      if (!m) continue;
      const date = addDays(today, 1);
      const taken = new Set(s.mealPlan.filter((e) => e.date === date).map((e) => e.mealType));
      const tSlot: MealType = !taken.has('lunch') ? 'lunch' : 'dinner';
      tomorrow = { recipe: m.recipe, ingredient: ing.name, date, slot: tSlot, line: `${iga(ing.name)} ${daysUntil(ing.expiryDate!, today) === 0 ? '오늘' : '내일'}까지예요 → 내일 ${tSlot === 'lunch' ? '점심' : '저녁'}은 ${m.recipe.name} 어때요?` };
      break;
    }
  }
  return { lines: lines.slice(0, 3), tomorrow };
}
