import { findCatalogExact, sameIngredient } from '@/data/catalog';
import { kindOf, type KindKey } from '@/data/taxonomy';
import type { RecipeMatch } from './inventory';

/**
 * 메뉴·재료 검색(R1~R4). 메뉴 탭 검색과 냉장고 털기가 함께 쓴다.
 * - 띄어쓰기·대소문자 무시
 * - 같은 음식 다른 이름(달걀=계란, 돼지불고기=제육볶음 …)
 * - 초성 검색(ㅁㅍㄷㅂ)
 * - 비슷한 소리 허용: 된소리·거센소리를 예사소리로(뽁=볶, 투=두), ㅐ=ㅔ, 그 뒤 한두 글자 틀림까지
 *   단, 2글자 이하 검색어에는 오타 허용을 쓰지 않는다(엉뚱한 결과 방지).
 */

export const norm = (s: string) => s.replace(/[\s·,+\-_/]/g, '').toLowerCase();

/** 같은 음식·재료의 다른 이름 → 앱에서 쓰는 이름 */
const ALIASES: Record<string, string> = {
  달걀: '계란',
  돼지불고기: '제육볶음',
  고추장불고기: '제육볶음',
  제육: '제육볶음',
  스파게티: '파스타',
  까르보나라: '크림파스타',
  감바스알아히요: '감바스',
  오무라이스: '오므라이스',
  돈가스: '돈까스',
  가츠동: '돈까스덮밥',
  카츠동: '돈까스덮밥',
  멸치국수: '잔치국수',
  쫄면: '비빔국수',
  냉면: '물냉면',
  카레: '카레라이스',
  포: '쌀국수',
  떡만둣국: '떡국',
  만둣국: '만두국',
  계란후라이: '계란',
  스크램블: '계란',
  파전: '부추전',
  김치부침개: '김치전',
  부침개: '전',
  마파두부덮밥: '마파두부',
  리조토: '리조또',
  피자: '또띠아피자',
  샐러드: '닭가슴살샐러드',
};

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
/** 비슷하게 들리는 소리는 하나로(된소리·거센소리 → 예사소리, ㅐ/ㅔ 등) */
const LOOSE: Record<string, string> = {
  ㄲ: 'ㄱ', ㅋ: 'ㄱ', ㄸ: 'ㄷ', ㅌ: 'ㄷ', ㅃ: 'ㅂ', ㅍ: 'ㅂ', ㅆ: 'ㅅ', ㅉ: 'ㅈ', ㅊ: 'ㅈ',
  ㅐ: 'ㅔ', ㅒ: 'ㅖ', ㅙ: 'ㅞ', ㅚ: 'ㅞ',
};

const isSyllable = (c: string) => c >= '가' && c <= '힣';

/** 글자를 자음·모음 조각으로(느슨하게) */
function looseJamo(s: string): string[] {
  const out: string[] = [];
  for (const c of s) {
    if (!isSyllable(c)) { out.push(LOOSE[c] ?? c); continue; }
    const code = c.charCodeAt(0) - 0xac00;
    const parts = [CHO[Math.floor(code / 588)], JUNG[Math.floor((code % 588) / 28)], JONG[code % 28]];
    for (const p of parts) if (p) out.push(LOOSE[p] ?? p);
  }
  return out;
}

/** 초성만 뽑기: 마파두부 → ㅁㅍㄷㅂ */
export function choseong(s: string): string {
  return [...s].map((c) => (isSyllable(c) ? CHO[Math.floor((c.charCodeAt(0) - 0xac00) / 588)] : c)).join('');
}
const isChoseongOnly = (s: string) => s.length >= 2 && [...s].every((c) => CHO.includes(c));

function editDistance(a: string[], b: string[]): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** 검색어가 이름의 어느 부분과 가장 비슷한지(자음·모음 단위로 틀린 개수) */
function closeness(word: string, name: string): number {
  const w = [...word];
  const n = [...name];
  let best = Infinity;
  for (let len = Math.max(1, w.length - 1); len <= w.length + 1; len++) {
    for (let i = 0; i + len <= n.length; i++) {
      best = Math.min(best, editDistance(looseJamo(word), looseJamo(n.slice(i, i + len).join(''))));
    }
  }
  if (n.length < w.length - 1) best = Math.min(best, editDistance(looseJamo(word), looseJamo(name)));
  return best;
}

/** 오타 허용 범위: 2글자 이하 0, 3~4글자 1, 5글자 이상 2 (자음·모음 단위) */
const allowed = (word: string) => ([...word].length <= 2 ? 0 : [...word].length <= 4 ? 1 : 2);

/** 별칭을 앱 이름으로 바꾸기(검색어 안에 들어 있어도: 달걀볶음밥 → 계란볶음밥) */
export function canonical(word: string): string {
  const w = norm(word);
  if (ALIASES[w]) return norm(ALIASES[w]);
  for (const [k, v] of Object.entries(ALIASES)) if (k.length >= 2 && w.includes(k) && !w.includes(norm(v))) return w.replace(k, norm(v));
  return w;
}

export type HitHow = 'name' | 'alias' | 'sound' | 'choseong' | 'ingredient';

/** 한 단어가 메뉴에 맞는지와 어떻게 맞았는지(점수가 낮을수록 정확) */
function hit(m: RecipeMatch, raw: string): { score: number; how: HitHow } | null {
  const w = norm(raw);
  if (!w) return null;
  const name = norm(m.recipe.name);
  if (isChoseongOnly(w)) return choseong(name).includes(w) ? { score: 1, how: 'choseong' } : null;
  if (name.includes(w)) return { score: 0, how: 'name' };
  const c = canonical(w);
  if (c !== w && name.includes(c)) return { score: 0.5, how: 'alias' };
  const lim = allowed(c);
  if (lim > 0) {
    const d = closeness(c, name);
    if (d <= lim) return { score: 1 + d, how: 'sound' };
  }
  // 재료: 이름 일부가 같거나, 검색어 '전체'가 사전의 재료·별칭과 같을 때만(마파투부의 '파' ≠ 대파)
  const asIngredient = [raw, c].find((x) => findCatalogExact(x));
  if (m.recipe.ingredients.some((i) => norm(i.name).includes(w) || (asIngredient && sameIngredient(i.name, asIngredient))))
    return { score: 3, how: 'ingredient' };
  return null;
}

/** 재료 검색에도 쓰는 단어 일치(냉장고 털기: 고른 재료가 모두 들어가는지) */
export const uses = (m: RecipeMatch, word: string) => hit(m, word) !== null;

export interface SearchResult {
  results: RecipeMatch[];
  /** 검색어가 재료일 때 이유 한 줄용: 그 재료가 들어간 메뉴 수·지금 바로 만들 수 있는 수 */
  ingredient?: { word: string; total: number; ready: number };
  /** 오타·별칭으로 찾았을 때 "‘마파두부’로 찾았어요" */
  correctedTo?: string;
  /** 띄어 쓴 단어를 하나씩 모두 넣어 찾았는지(두부 애호박) */
  byWords?: boolean;
}

/** 메뉴 검색: 붙여 쓴 검색어 → 띄어 쓴 단어 모두 순서로 시도. 정확한 것부터, 같은 점수면 원래 추천 순서. */
export function searchRecipes(ranked: RecipeMatch[], q: string): SearchResult {
  const whole = norm(q);
  if (!whole) return { results: ranked };
  const words = q.split(/[\s,+·]+/).map((t) => t.trim()).filter(Boolean);
  const scoreAll = (ws: string[]) =>
    ranked
      .map((m, i) => {
        const hs = ws.map((w) => hit(m, w));
        if (hs.some((h) => !h)) return null;
        return { m, i, score: Math.max(...hs.map((h) => h!.score)), hows: hs.map((h) => h!.how) };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => a.score - b.score || a.i - b.i);

  // '마파 두부'처럼 띄어 써도 한 이름으로 먼저 찾기
  // 검색어가 재료 이름이면(두부, 달걀) 재료로 찾기
  const allIngredients = words.every((w) => findCatalogExact(w) || findCatalogExact(canonical(w)));
  let found = allIngredients ? [] : scoreAll([whole]).filter((x) => x.hows[0] !== 'ingredient');
  let byWords = false;
  if (!found.length) { found = scoreAll(words.length > 1 ? words : [whole]); byWords = words.length > 1; }

  const results = found.map((x) => x.m);
  const out: SearchResult = { results, byWords };
  if (found.length && (allIngredients || found.every((x) => x.hows.every((h) => h === 'ingredient')))) {
    out.ingredient = { word: words.join(' + '), total: results.length, ready: results.filter((m) => m.missingRequired.length === 0).length };
  } else if (found.length && found[0].hows.every((h) => h === 'sound' || h === 'alias')) {
    out.correctedTo = found[0].m.recipe.name;
  }
  return out;
}

/** 결과가 없을 때: 가장 가까운 이름 하나("혹시 ○○?") + 비슷한 메뉴 3개 */
export function suggestFor(ranked: RecipeMatch[], q: string): { didYouMean?: string; similar: RecipeMatch[] } {
  const w = canonical(q);
  if ([...w].length < 2) return { similar: [] };
  let didYouMean: string | undefined;
  let best = Infinity;
  for (const m of ranked) {
    const d = closeness(w, norm(m.recipe.name));
    if (d < best) { best = d; didYouMean = m.recipe.name; }
  }
  // 자음·모음 조각 기준 30% 이하로 틀렸을 때만 제안
  if (best > Math.max(2, Math.floor(looseJamo(w).length * 0.3))) didYouMean = undefined;

  // 비슷한 메뉴: 같은 종류(마라탕 → 국·찌개) > 검색어 속 재료(참치김치찌개 → 참치·김치) > 같은 글자 2개 이상
  const family = familyOf(w);
  const qs = new Set([...w].filter(isSyllable));
  const similar = ranked
    .map((m, i) => {
      const name = norm(m.recipe.name);
      const shared = [...new Set([...name])].filter((c) => qs.has(c)).length;
      let score = shared >= 2 ? shared : 0;
      if (family && kindOf(m.recipe) === family) score += 3;
      for (const ing of m.recipe.ingredients) if ([...norm(ing.name)].length >= 2 && w.includes(norm(ing.name))) score += 2;
      return { m, i, score };
    })
    .filter((x) => x.score > 0 && x.m.recipe.name !== didYouMean)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, 3)
    .map((x) => x.m);
  return { didYouMean, similar };
}

/** 이름 끝말로 음식 종류 짐작(없는 메뉴의 비슷한 메뉴 찾기용) */
function familyOf(w: string): KindKey | undefined {
  if (/(탕|국|찌개|전골|스튜)$/.test(w)) return 'soup';
  if (/(면|국수|라면|우동|짬뽕|짜장|소바|모밀)$/.test(w)) return 'noodle';
  if (/(파스타|피자|리조또|스테이크|그라탕)$/.test(w)) return 'western';
  if (/(밥|덮밥|동|죽)$/.test(w)) return 'rice';
  if (/(볶음|구이|조림|무침|나물)$/.test(w)) return /볶음|구이/.test(w) ? 'stir' : 'side';
  if (/(전|부침개|튀김|떡볶이|순대|김밥)$/.test(w)) return 'snack';
  return undefined;
}
