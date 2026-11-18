import { findCatalogExact, sameIngredient } from '@/data/catalog';
import type { AppState, CookRating, FoodPreferences, Recipe } from '@/data/types';
import { addDays, toDateKey } from './dates';
import type { RecipeMatch } from './inventory';

/**
 * 추천 점수와 '추천 이유'를 계산하는 단 하나의 곳.
 * 홈·요리 탭·식단·제안이 모두 이 결과를 그대로 쓰므로 화면마다 말이 달라지지 않는다.
 *
 * 각 이유(Reason)는 점수에 더하거나 빼는 값(weight)과, 사용자에게 보여 줄 문장(text)을 함께 가진다.
 * text가 없는 이유는 점수에만 반영되고 화면에는 나오지 않는다(예: 별로라고 한 메뉴 감점).
 */
export interface Reason {
  key: 'coverage' | 'expiring' | 'missing' | 'time' | 'skill' | 'preferred' | 'liked' | 'disliked_before' | 'recent' | 'fresh';
  weight: number;
  text?: string;
  personal?: boolean; // 사용자 기록(개인화 동의)을 써서 나온 이유
}

export interface Memory {
  /** 레시피별 맛 평가 기록 */
  ratings: Record<string, { good: number; ok: number; bad: number; last?: CookRating }>;
  /** 최근 먹은 음식 이름 */
  recentNames: string[];
}

export interface RankContext {
  allergies: string[];
  disliked: string[];
  prefs: Pick<FoodPreferences, 'preferredFoods' | 'maxCookMinutes' | 'cookingSkill'>;
  memory: Memory | null; // 개인화 동의가 없으면 null → 기록을 쓰지 않음
}

const SKILL_PENALTY: Record<FoodPreferences['cookingSkill'], Record<Recipe['difficulty'], number>> = {
  초보: { 쉬움: 5, 보통: -12, 어려움: -35 },
  보통: { 쉬움: 0, 보통: 0, 어려움: -10 },
  능숙: { 쉬움: 0, 보통: 0, 어려움: 0 },
};

/** 기록으로부터 '기억'을 만든다. 동의가 없으면 null. */
export function buildMemory(s: AppState): Memory | null {
  if (!s.consents.personalization) return null;
  const ratings: Memory['ratings'] = {};
  // 오래된 기록부터 쌓아 last가 가장 최근 평가가 되게
  for (const c of [...s.cooks].reverse()) {
    if (!c.rating) continue;
    const r = (ratings[c.recipeId] ??= { good: 0, ok: 0, bad: 0 });
    r[c.rating]++;
    r.last = c.rating;
  }
  const start = addDays(toDateKey(), -2); // 최근 3일
  const recentNames = s.meals.filter((m) => m.mealDate >= start).flatMap((m) => m.items.map((i) => i.foodName));
  return { ratings, recentNames };
}

export function isPreferred(recipe: Recipe, preferred: string[]): boolean {
  return preferred.some((p) => {
    const q = p.trim();
    if (!q) return false;
    // 1) 음식 이름끼리 비교 (예: '김치찌개' ↔ 김치찌개)
    if (recipe.name.includes(q) || q.includes(recipe.name)) return true;
    // 2) 입력이 재료 이름 그 자체일 때만 재료로 비교 (예: '두부' → 두부 들어간 요리). '계란말이'는 재료가 아니므로 제외
    const asIngredient = findCatalogExact(q);
    return !!asIngredient && recipe.ingredients.some((i) => !i.optional && sameIngredient(i.name, asIngredient.name));
  });
}

/** 한 레시피의 점수와 이유 */
export function scoreMatch(m: RecipeMatch, ctx: RankContext): { score: number; reasons: Reason[] } {
  const r = m.recipe;
  const reasons: Reason[] = [];

  reasons.push({
    key: 'coverage',
    weight: m.coverage * 100,
    text: m.missingRequired.length ? `${m.missingRequired.map((i) => i.name).join('·')}만 있으면 돼요` : '냉장고 재료로 바로',
  });
  if (m.missingRequired.length) reasons.push({ key: 'missing', weight: -10 * m.missingRequired.length });
  if (m.usesExpiring.length) reasons.push({ key: 'expiring', weight: 25 * m.usesExpiring.length, text: `${m.usesExpiring.map((i) => i.name).join('·')} 먼저 쓰기` });

  if (r.timeMinutes > ctx.prefs.maxCookMinutes) reasons.push({ key: 'time', weight: -20 });
  else if (r.timeMinutes <= 10) reasons.push({ key: 'time', weight: 3, text: `${r.timeMinutes}분이면 끝` });

  const sk = SKILL_PENALTY[ctx.prefs.cookingSkill]?.[r.difficulty] ?? 0;
  if (sk) reasons.push({ key: 'skill', weight: sk, text: sk > 0 ? '초보도 쉬워요' : undefined });

  if (isPreferred(r, ctx.prefs.preferredFoods)) reasons.push({ key: 'preferred', weight: 20, text: '좋아하는 음식' });

  const mem = ctx.memory;
  if (mem) {
    const rt = mem.ratings[r.id];
    if (rt) {
      if (rt.last === 'good') reasons.push({ key: 'liked', weight: 15 + Math.min(rt.good, 3) * 3, text: '전에 맛있다고 한 메뉴', personal: true });
      if (rt.last === 'bad') reasons.push({ key: 'disliked_before', weight: -40, personal: true });
    }
    if (mem.recentNames.includes(r.name)) reasons.push({ key: 'recent', weight: -15, personal: true });
    else if (mem.recentNames.length) reasons.push({ key: 'fresh', weight: 3, text: '최근 안 먹은 메뉴', personal: true });
  }

  const score = reasons.reduce((a, x) => a + x.weight, 0);
  return { score, reasons };
}

/** 화면에 보여 줄 이유 문장(중요한 것부터 n개) */
export function topReasons(m: { reasons: Reason[] }, n = 2): string[] {
  const order: Reason['key'][] = ['expiring', 'liked', 'preferred', 'coverage', 'fresh', 'skill', 'time'];
  return m.reasons
    .filter((x) => x.text)
    .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
    .slice(0, n)
    .map((x) => x.text!);
}

export function rankContext(s: AppState): RankContext {
  return {
    allergies: s.preferences.allergies,
    disliked: s.preferences.dislikedFoods,
    prefs: s.preferences,
    memory: buildMemory(s),
  };
}
