import { ALLERGEN_OPTIONS, allergensOf, sameIngredient } from '@/data/catalog';
import type { Recipe } from '@/data/types';

/**
 * 알레르기·기피 음식 = '추천 선호'가 아니라 '제외 조건'.
 * 메뉴 추천·식단·레시피 화면·대체 재료·코치 말 모두 이 파일의 판단만 쓴다.
 *
 * - 알레르기: 레시피에 그 성분이 조금이라도(선택 재료 포함) 들어가면 제외
 * - 기피 음식: 꼭 필요한 재료이거나 음식 이름에 들어가면 제외, 선택 재료면 '빼고 만들기'로 안내
 * - 목록에 없는 알레르기(직접 입력, 예: '오이')는 재료 이름으로 비교
 */
export interface Restrictions {
  allergies: string[];
  disliked: string[];
}

const norm = (s: string) => s.replace(/\s/g, '').toLowerCase();

/** 직접 입력한 단어가 재료 이름과 같은 재료인지(부분 일치 포함) */
function nameHits(word: string, name: string): boolean {
  const w = norm(word);
  if (!w) return false;
  return sameIngredient(word, name) || norm(name).includes(w);
}

/** '매운 음식'처럼 재료가 아닌 기피 항목을 재료 목록으로 풀어 쓴다 */
const DISLIKE_EXPAND: Record<string, string[]> = {
  '매운 음식': ['고춧가루', '청양고추', '고추장', '불닭'],
  날생선: ['회', '연어회', '생연어'],
  내장: ['곱창', '막창', '순대'],
};

function dislikeWords(d: string): string[] {
  return DISLIKE_EXPAND[d] ?? [d];
}

export interface RestrictionCheck {
  /** 걸린 알레르기(있으면 무조건 제외) */
  allergy: string[];
  /** 꼭 필요한 재료나 음식 이름에 걸린 기피 음식(있으면 제외) */
  disliked: string[];
  /** 선택 재료에만 걸린 기피 음식 → '빼고 만들기' 안내 */
  omit: string[];
  excluded: boolean;
}

export function checkRecipe(recipe: Pick<Recipe, 'name' | 'ingredients' | 'allergens'>, r: Restrictions): RestrictionCheck {
  const names = recipe.ingredients.map((i) => i.name);
  const listed = r.allergies.filter((a) => ALLERGEN_OPTIONS.includes(a));
  const custom = r.allergies.filter((a) => !ALLERGEN_OPTIONS.includes(a));
  const recipeAllergens = new Set([...(recipe.allergens ?? []), ...allergensOf(names)]);
  const allergy = [
    ...listed.filter((a) => recipeAllergens.has(a)),
    ...custom.filter((a) => names.some((n) => nameHits(a, n)) || norm(recipe.name).includes(norm(a))),
  ];

  const disliked: string[] = [];
  const omit: string[] = [];
  for (const d of r.disliked) {
    const words = dislikeWords(d);
    const inName = words.some((w) => norm(recipe.name).includes(norm(w)));
    const required = recipe.ingredients.some((i) => !i.optional && words.some((w) => nameHits(w, i.name)));
    const optional = recipe.ingredients.some((i) => i.optional && words.some((w) => nameHits(w, i.name)));
    if (inName || required) disliked.push(d);
    else if (optional) omit.push(d);
  }
  return { allergy, disliked, omit, excluded: allergy.length > 0 || disliked.length > 0 };
}

/** 대체 재료가 안전한지(알레르기·기피에 걸리면 제안하지 않는다) */
export function isSafeIngredient(name: string, r: Restrictions): boolean {
  if (!name.trim()) return false;
  const listed = r.allergies.filter((a) => ALLERGEN_OPTIONS.includes(a));
  if (allergensOf([name]).some((a) => listed.includes(a))) return false;
  if (r.allergies.some((a) => !ALLERGEN_OPTIONS.includes(a) && nameHits(a, name))) return false;
  if (r.disliked.some((d) => dislikeWords(d).some((w) => nameHits(w, name)))) return false;
  return true;
}

/** 대체 재료 문자열(예: '참치캔', '양배추·양상추')에서 안전한 것만 */
export function safeSubstitutes(substitute: string | undefined, r: Restrictions): string[] {
  if (!substitute) return [];
  return substitute
    .split(/[,·/]| 또는 /)
    .map((x) => x.trim())
    .filter((x) => isSafeIngredient(x, r));
}

export function restrictionsOf(p: { allergies: string[]; dislikedFoods: string[] }): Restrictions {
  return { allergies: p.allergies, disliked: p.dislikedFoods };
}
