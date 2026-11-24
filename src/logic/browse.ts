import { kindOf, moodsOf, type KindKey, type MoodKey } from '@/data/taxonomy';
import type { AppState } from '@/data/types';
import { addDays, toDateKey } from '@/logic/dates';
import type { RecipeMatch } from '@/logic/inventory';

/**
 * 분류에서 골라 추천받기.
 * ranked는 이미 알레르기·기피 음식을 뺀 추천 목록(rankForUser)이다. 여기서는 분류로 거르고 순서만 다시 정한다.
 */
export function browse(ranked: RecipeMatch[], s: AppState, kind: KindKey | null, mood: MoodKey | null): RecipeMatch[] {
  const cooked = new Set(s.cooks.map((c) => c.recipeId));
  const recent = new Set(s.cooks.filter((c) => c.date >= addDays(toDateKey(), -3)).map((c) => c.recipeId));
  return ranked
    .filter((m) => (!kind || kindOf(m.recipe) === kind) && (!mood || moodsOf(m.recipe).includes(mood)))
    .map((m, i) => ({ m, i }))
    .sort((a, b) => {
      const A = a.m;
      const B = b.m;
      // 1) 바로 만들 수 있는 것, 부족한 재료가 적은 것
      const miss = Math.min(A.missingRequired.length, 3) - Math.min(B.missingRequired.length, 3);
      if (miss) return miss;
      // 2) 먼저 쓸 재료를 쓰는 것
      const exp = Math.min(B.usesExpiring.length, 1) - Math.min(A.usesExpiring.length, 1);
      if (exp) return exp;
      // 3) 도전 요리면 안 만들어 본 것 먼저, 아니면 최근 3일 안에 만든 것은 뒤로
      if (mood === 'challenge') {
        const c = Number(cooked.has(A.recipe.id)) - Number(cooked.has(B.recipe.id));
        if (c) return c;
      } else {
        const r = Number(recent.has(A.recipe.id)) - Number(recent.has(B.recipe.id));
        if (r) return r;
      }
      // 4) 기존 추천 점수 순서 유지
      return a.i - b.i;
    })
    .map((x) => x.m);
}

/** 카드에 붙일 추천 이유 한 줄(순서를 정한 근거와 같은 말) */
export function reasonLine(m: RecipeMatch, s: AppState, mood: MoodKey | null): string {
  const miss = m.missingRequired.length;
  const first = m.usesExpiring[0]?.name;
  const parts: string[] = [];
  if (miss === 0) parts.push('내 재료로 바로');
  else parts.push(miss === 1 ? `${m.missingRequired[0].name}만 사면 돼요` : `재료 ${miss}개 더 필요`);
  if (first) parts.push(`먼저 쓸 ${first} 사용`);
  else if (mood === 'challenge' && !s.cooks.some((c) => c.recipeId === m.recipe.id)) parts.push('처음 도전해요');
  return parts.join(' · ');
}

/** 칸마다 개수: 전체 / 내 재료로 바로 */
export function kindCounts(ranked: RecipeMatch[]): Record<KindKey, { all: number; ready: number }> {
  const out = {} as Record<KindKey, { all: number; ready: number }>;
  for (const m of ranked) {
    const k = kindOf(m.recipe);
    out[k] = out[k] ?? { all: 0, ready: 0 };
    out[k].all++;
    if (!m.missingRequired.length) out[k].ready++;
  }
  return out;
}
