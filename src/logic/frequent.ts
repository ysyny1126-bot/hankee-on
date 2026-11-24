import { findCatalog, sameIngredient } from '@/data/catalog';
import type { AppState, StorageType } from '@/data/types';
import { fullOf } from '@/logic/amount';
import { addDays, toDateKey } from '@/logic/dates';

export interface FrequentItem { name: string; quantity: number; unit: string; storage: StorageType; emoji: string; count: number }

/**
 * 자주 넣는 재료: 최근 30일 등록 기록(없으면 지출 기록 이름)으로 많이 넣은 순 6개.
 * 지금 냉장고에 반 이상 남아 있는 재료는 뺀다(또 살 필요가 적으니까).
 */
export function frequentAdds(s: AppState, limit = 6): FrequentItem[] {
  const since = addDays(toDateKey(), -30);
  const map = new Map<string, FrequentItem>();
  for (const a of s.recentAdds ?? []) {
    if (a.date < since) continue;
    const f = map.get(a.name);
    if (f) f.count++;
    else map.set(a.name, { ...a, emoji: findCatalog(a.name)?.emoji ?? '🥫', count: 1 });
  }
  // 등록 기록이 적으면: 지출·요리·버림 기록의 재료 이름 + 재료 사전 기본값
  if (map.size < limit) {
    const names = [
      ...(s.spend ?? []).filter((x) => x.date >= since).map((x) => x.name),
      ...s.cooks.filter((c) => c.date >= since).flatMap((c) => c.usedIngredients.map((u) => u.name)),
      ...s.waste.filter((w) => w.date >= since).map((w) => w.ingredientName),
    ];
    for (const n of names) {
      if (!n) continue; // 예전 기록에 이름이 비어 있을 수 있다
      const c = findCatalog(n);
      if (!c || c.category === '양념') continue;
      const f = map.get(c.name);
      if (f) f.count++;
      else map.set(c.name, { name: c.name, quantity: ['g', 'ml'].includes(c.unit) ? 100 : 1, unit: c.unit, storage: c.storage, emoji: c.emoji, count: 1 });
    }
  }
  const plenty = (name: string) =>
    s.ingredients.some((i) => i.kind !== 'leftover' && sameIngredient(i.name, name) && i.quantity / (fullOf(i) || 1) >= 0.5);
  return [...map.values()]
    .filter((f) => !plenty(f.name))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
