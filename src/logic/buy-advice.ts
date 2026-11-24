import { keepData, sameIngredient } from '@/data/catalog';
import { findRecipe } from '@/data/store';
import type { AppState, ShoppingItem } from '@/data/types';
import { knownPacks } from '@/logic/amount';
import { toDateKey } from '@/logic/dates';
import { formatAmount } from '@/logic/inventory';

/**
 * 1인 구매량 조언: 앞으로 잡힌 식단(먹기 전)에서 이 재료가 얼마나 필요한지 더하고,
 * 마트의 흔한 포장 크기와 비교해 한 줄로 알려 준다. 식단 근거가 없으면 null(아무것도 안 보임).
 */
export function buyAdvice(s: AppState, item: ShoppingItem): string | null {
  const today = toDateKey();
  let need = 0;
  let unit = item.unit;
  for (const p of s.mealPlan) {
    if (p.date < today || p.status === 'done' || p.leftoverId) continue;
    const r = findRecipe(s, p.recipeId);
    const ing = r?.ingredients.find((i) => sameIngredient(i.name, item.name));
    if (!ing) continue;
    if (need && ing.unit !== unit) return null; // 단위가 섞이면 조언하지 않는다
    unit = ing.unit;
    need += ing.amount;
  }
  if (!need) return null;
  const head = `이번 주 식단에 ${formatAmount(need, unit)}`;
  const packs = ['g', 'ml'].includes(unit) ? knownPacks(item.name) : null;
  // 포장 정보가 없고 목록에 적힌 양과 같으면 같은 숫자를 두 번 보여 줄 뿐이라 생략
  if (!packs?.length) return item.amount != null && Math.abs(item.amount - need) < 0.01 ? null : head;
  const fit = packs.find((p) => p >= need);
  const canFreeze = !!keepData(item.name)?.freezer;
  if (packs[0] >= need * 1.5) return `${head} · 가장 작은 ${formatAmount(packs[0], unit)}도 남아요${canFreeze ? ', 남는 건 나눠서 냉동' : ''}`;
  return fit ? `${head} · ${formatAmount(fit, unit)} 한 팩이면 충분해요` : head;
}
