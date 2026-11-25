import { findCatalog, PANTRY_STAPLES, sameIngredient } from '@/data/catalog';
import type { Recipe } from '@/data/types';

/**
 * 4단계 레시피 정보(데이터를 새로 쓰지 않고 재료 목록에서 규칙으로 만든다).
 * R12 맛 조절 · R17 장보기 한 번에 3끼
 */

const has = (r: Recipe, names: string[]) => r.ingredients.filter((i) => names.some((n) => sameIngredient(i.name, n) || i.name === n)).map((i) => i.name);

/** R12: 덜 맵게 · 싱겁게 — 레시피에 실제로 있는 양념만 말한다(최대 2줄) */
export function tasteTips(r: Recipe): string[] {
  const out: string[] = [];
  const hot = has(r, ['고춧가루', '청양고추', '고추장', '칠리소스']);
  if (hot.length) {
    const parts: string[] = [];
    if (hot.includes('청양고추')) parts.push('청양고추는 빼고');
    if (hot.includes('고춧가루')) parts.push('고춧가루는 절반만');
    if (hot.includes('고추장')) parts.push(has(r, ['간장']).length ? '고추장은 절반만' : '고추장은 절반에 간장 조금');
    if (hot.includes('칠리소스')) parts.push('칠리소스는 빼고 케첩으로');
    out.push(`🌶 덜 맵게: ${parts.join(', ')}`);
  }
  const salty = has(r, ['간장', '된장', '고추장', '액젓', '굴소스', '쌈장']);
  const soup = r.tags.some((t) => t === '국물') || /국|찌개|탕/.test(r.name);
  if (salty.length) {
    // 짠맛은 간장·된장부터(고추장은 위 '덜 맵게'에서 이미 줄였으면 생략)
    const first = ['간장', '된장', '액젓', '굴소스', '쌈장', '고추장'].map((n) => salty.find((x) => x === n || sameIngredient(x, n))).find(Boolean)!;
    if (first === '고추장' && hot.includes('고추장')) return out.slice(0, 2);
    out.push(soup ? `🧂 싱겁게: ${first}을(를) 2/3만 넣고 물 50ml 더, 마지막에 맛보며 더해요` : `🧂 싱겁게: ${first}을(를) 2/3만 넣고 마지막에 맛보며 더해요`);
  }
  return out.slice(0, 2).map((x) => x.replace(/([가-힣])을\(를\)/g, (_, c: string) => c + ((c.charCodeAt(0) - 0xac00) % 28 ? '을' : '를')));
}

/** 장보기에서 '남기 쉬운' 재료인지(양념·기본 재료 제외) */
function perishable(name: string) {
  if (PANTRY_STAPLES.some((p) => sameIngredient(p, name))) return false;
  const c = findCatalog(name);
  return !!c && !['양념', '곡류'].includes(c.category);
}

/**
 * R17: 이 레시피 재료가 많이 겹치는 다음 메뉴 2개 — 산 재료(대파·두부 …)를 남기지 않게.
 * 겹치는 '남기 쉬운' 재료가 많은 순, 같으면 원래 순서(추천 순).
 */
export function nextMeals(r: Recipe, pool: Recipe[]): { recipe: Recipe; shared: string[] }[] {
  const mine = r.ingredients.filter((i) => !i.optional && perishable(i.name)).map((i) => i.name);
  if (!mine.length) return [];
  const picked: { recipe: Recipe; shared: string[] }[] = [];
  const scored = pool
    .filter((x) => x.id !== r.id && x.name !== r.name)
    .map((x, i) => ({ x, i, shared: mine.filter((n) => x.ingredients.some((j) => sameIngredient(j.name, n))) }))
    .filter((s) => s.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || a.i - b.i);
  // 두 메뉴가 서로 다른 재료를 쓰면 더 많이 소진 → 이미 고른 것과 겹치는 재료만 같은 메뉴는 뒤로
  for (const s of scored) {
    if (picked.length >= 2) break;
    if (picked.length && s.shared.every((n) => picked[0].shared.includes(n)) && scored.some((o) => o !== s && !picked.some((p) => p.recipe.id === o.x.id) && o.shared.some((n) => !picked[0].shared.includes(n)))) continue;
    picked.push({ recipe: s.x, shared: s.shared });
  }
  for (const s of scored) if (picked.length < 2 && !picked.some((p) => p.recipe.id === s.x.id)) picked.push({ recipe: s.x, shared: s.shared });
  return picked;
}
