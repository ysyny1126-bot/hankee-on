import { BUILTIN_RECIPES } from '@/data/recipes';
import type { MealRecord, Recipe } from '@/data/types';

const KEYWORDS: [string, string][] = [
  ['라면', '🍜'], ['우동', '🍜'], ['국수', '🍜'], ['짜장', '🍜'], ['파스타', '🍝'], ['스파게티', '🍝'],
  ['치킨', '🍗'], ['닭', '🍗'], ['피자', '🍕'], ['버거', '🍔'], ['햄버거', '🍔'], ['김밥', '🍙'], ['삼각김밥', '🍙'],
  ['샐러드', '🥗'], ['토스트', '🍞'], ['빵', '🍞'], ['샌드위치', '🥪'], ['떡볶이', '🌶️'], ['찌개', '🍲'], ['국', '🍲'], ['탕', '🍲'],
  ['볶음밥', '🍳'], ['덮밥', '🍛'], ['카레', '🍛'], ['비빔밥', '🍚'], ['도시락', '🍱'], ['고기', '🥩'], ['불고기', '🥩'], ['제육', '🥩'],
  ['생선', '🐟'], ['고등어', '🐟'], ['초밥', '🍣'], ['사과', '🍎'], ['바나나', '🍌'], ['요거트', '🥣'], ['시리얼', '🥣'], ['커피', '☕'], ['계란', '🍳'],
];

/** 음식 이름 → 대표 이모지(레시피 이모지를 먼저, 없으면 키워드, 그래도 없으면 🍽️) */
export function foodEmoji(name: string, recipes: Recipe[] = BUILTIN_RECIPES): string {
  const r = recipes.find((x) => x.name === name);
  if (r) return r.emoji;
  return KEYWORDS.find(([k]) => name.includes(k))?.[1] ?? '🍽️';
}

export function mealEmoji(m: MealRecord, recipes?: Recipe[]): string {
  const first = m.items[0]?.foodName;
  return first ? foodEmoji(first, recipes) : '🍽️';
}
