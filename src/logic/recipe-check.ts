import { findCatalog, INGREDIENT_CATALOG, sameIngredient } from '@/data/catalog';
import type { Recipe } from '@/data/types';

/**
 * 레시피 자동 점검(R7). 기본 레시피는 scripts/check-recipes.mjs가, AI 레시피는 화면이 이 규칙을 쓴다.
 * 결과는 '사람이 한 번 더 볼 점' 목록이고, 비어 있으면 통과.
 */

// 순서에 나와도 재료 목록에 없어도 되는 기본 재료
const BASIC = ['소금', '후추', '식용유', '물'];
// 1인분 기준 상식 범위
const RANGE: Record<string, [number, number]> = { 공기: [0.5, 1.5], g: [3, 400], ml: [5, 700], 큰술: [0.1, 6], 작은술: [0.1, 6], 개: [0.05, 25], 봉: [0.1, 2] };

let NAMES: { n: string; c: string }[] | null = null;
function catalogNames() {
  if (!NAMES) {
    NAMES = [];
    for (const c of INGREDIENT_CATALOG) for (const n of [c.name, ...(c.aliases ?? [])]) if (n.length >= 2) NAMES.push({ n, c: c.name });
    NAMES.sort((a, b) => b.n.length - a.n.length);
  }
  return NAMES;
}

export function auditRecipe(r: Pick<Recipe, 'ingredients' | 'steps' | 'timeMinutes' | 'servings'>): string[] {
  const out: string[] = [];
  if (!r.ingredients.length) out.push('재료 목록이 비어 있어요');
  if (r.steps.length < 2) out.push('조리 순서가 너무 짧아요');
  const text = r.steps.join(' ');
  const listed = r.ingredients.map((i) => i.name);
  const per = Math.max(1, r.servings || 1);

  // 1) 순서에 나오는데 재료 목록에 없는 재료
  let rest = text;
  const mentioned = new Set<string>();
  for (const { n, c } of catalogNames()) {
    if (rest.includes(n)) {
      mentioned.add(c);
      rest = rest.split(n).join(' ');
    }
  }
  for (const m of mentioned) {
    if (BASIC.includes(m)) continue;
    if (!listed.some((l) => sameIngredient(l, m) || l.includes(m) || m.includes(l))) out.push(`순서에 '${m}'가 나오는데 재료 목록에 없어요`);
  }

  for (const ing of r.ingredients) {
    // 2) 재료 목록에 있는데 순서에서 안 쓰이는 재료
    const c = findCatalog(ing.name);
    const keys = [ing.name, c?.name, ...(c?.aliases ?? [])].filter((k): k is string => !!k).map((k) => k.replace(/캔$/, ''));
    if (/면$/.test(ing.name)) keys.push('면');
    if (/고기$/.test(ing.name)) keys.push('고기');
    const used = keys.some((k) => text.includes(k)) || (/양념|채소|고명|재료|토핑/.test(text) && ing.optional);
    if (!used) out.push(`재료 '${ing.name}'가 순서에 안 나와요`);
    // 3) 양 범위(1인분으로 나눠서)
    const rg = RANGE[ing.unit];
    const amt = ing.amount / per;
    if (rg && (amt < rg[0] || amt > rg[1])) out.push(`'${ing.name}' ${Math.round(amt * 10) / 10}${ing.unit}는 1인분 양으로 이상해요`);
  }

  // 4) 순서의 분 합계 ≤ 총 시간
  const mins = [...text.matchAll(/(\d+)\s*분/g)].map((m) => Number(m[1])).reduce((a, b) => a + b, 0);
  if (mins > r.timeMinutes) out.push(`순서의 시간을 더하면 ${mins}분인데 총 ${r.timeMinutes}분으로 적혀 있어요`);

  // 5) 고기·해산물이 있으면 '익힘'이 순서에 있어야
  const risky = r.ingredients.some((i) => ['육류', '해산물'].includes(findCatalog(i.name)?.category ?? '') && !/멸치|미역|황태|베이컨|명란|연어|참치/.test(i.name));
  if (risky && !/익|굽|구워|구운|볶|끓|삶|데치|데우|데워|튀기|튀겨|찌|쪄|부치|부쳐/.test(text)) out.push('고기·해산물을 익히는 단계가 안 보여요');
  return out;
}
