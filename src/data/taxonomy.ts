import type { Recipe } from './types';

/**
 * 메뉴 분류: '무엇을(종류)' 8칸 + '어떤 상황' 6개.
 * 기본 레시피는 아래 표로 직접 정하고(정확도), 사용자·AI 레시피는 태그·시간으로 추정한다.
 */
export type KindKey = 'soup' | 'stir' | 'rice' | 'noodle' | 'side' | 'easy' | 'western' | 'snack';
export type MoodKey = 'quick' | 'lunchbox' | 'light' | 'night' | 'hearty' | 'challenge';

export const KINDS: { key: KindKey; label: string; emoji: string }[] = [
  { key: 'soup', label: '국·찌개', emoji: '🍲' },
  { key: 'stir', label: '볶음·구이', emoji: '🍳' },
  { key: 'rice', label: '밥·덮밥', emoji: '🍚' },
  { key: 'noodle', label: '면', emoji: '🍜' },
  { key: 'side', label: '반찬', emoji: '🥢' },
  { key: 'easy', label: '간편식', emoji: '🥪' },
  { key: 'western', label: '양식', emoji: '🍝' },
  { key: 'snack', label: '분식·전', emoji: '🌶️' },
];

export const MOODS: { key: MoodKey; label: string; emoji: string }[] = [
  { key: 'quick', label: '15분 컷', emoji: '⚡' },
  { key: 'lunchbox', label: '도시락', emoji: '🍱' },
  { key: 'light', label: '가볍게', emoji: '🥗' },
  { key: 'night', label: '야식·안주', emoji: '🍺' },
  { key: 'hearty', label: '든든하게', emoji: '💪' },
  { key: 'challenge', label: '도전 요리', emoji: '🔥' },
];

const KIND_OF: Record<KindKey, string[]> = {
  soup: ['kimchi-stew', 'doenjang-stew', 'bean-sprout-soup', 'soft-tofu-stew', 'seaweed-soup', 'radish-beef-soup', 'egg-soup', 'dumpling-soup', 'rice-cake-soup'],
  stir: ['jeyuk', 'cabbage-stir', 'mackerel', 'mushroom-bulgogi', 'squid-stir', 'sprout-pork', 'broccoli-shrimp', 'tomato-egg', 'tofu-kimchi'],
  rice: ['egg-fried-rice', 'kimchi-fried-rice', 'tuna-mayo', 'bibimbap', 'shrimp-garlic', 'curry-rice', 'salmon-bowl', 'tuna-riceball', 'frozen-rice-upgrade', 'mentaiko-avocado', 'pork-cutlet-bowl', 'chicken-teriyaki'],
  noodle: ['udon', 'janchi-noodle', 'spicy-noodle', 'pho', 'naengmyeon', 'ramen-upgrade', 'clam-kalguksu'],
  side: ['tofu-braise', 'egg-roll', 'potato-stir', 'microwave-egg', 'eggplant-stir', 'fishcake-stir', 'potato-braise', 'spinach-namul', 'sprout-namul', 'quail-egg-braise'],
  easy: ['chicken-salad', 'egg-toast', 'oatmeal', 'french-toast', 'yogurt-bowl', 'spring-roll'],
  western: ['tomato-pasta', 'cream-pasta', 'tortilla-pizza', 'gambas'],
  snack: ['tteokbokki', 'rabokki', 'kimchi-pancake', 'chive-pancake'],
};

// quick(15분 이하)·challenge(난이도 보통 이상)는 자동. 나머지는 직접 정한다.
const MOOD_OF: Partial<Record<MoodKey, string[]>> = {
  lunchbox: ['tuna-riceball', 'egg-roll', 'kimchi-fried-rice', 'egg-fried-rice', 'chicken-teriyaki', 'tofu-braise', 'potato-stir', 'fishcake-stir', 'potato-braise', 'quail-egg-braise', 'eggplant-stir', 'spinach-namul', 'sprout-namul', 'curry-rice', 'mushroom-bulgogi', 'jeyuk', 'tomato-pasta'],
  light: ['chicken-salad', 'spring-roll', 'bibimbap', 'cabbage-stir', 'tomato-egg', 'oatmeal', 'yogurt-bowl', 'egg-soup', 'bean-sprout-soup', 'spinach-namul', 'sprout-namul', 'microwave-egg', 'doenjang-stew', 'seaweed-soup', 'broccoli-shrimp', 'eggplant-stir', 'naengmyeon'],
  night: ['tteokbokki', 'rabokki', 'kimchi-pancake', 'chive-pancake', 'gambas', 'tofu-kimchi', 'squid-stir', 'ramen-upgrade', 'tortilla-pizza', 'sprout-pork', 'janchi-noodle', 'spicy-noodle'],
  hearty: ['jeyuk', 'mushroom-bulgogi', 'curry-rice', 'pork-cutlet-bowl', 'chicken-teriyaki', 'chicken-salad', 'kimchi-stew', 'radish-beef-soup', 'sprout-pork', 'salmon-bowl', 'cream-pasta', 'shrimp-garlic', 'kimchi-fried-rice', 'bibimbap', 'mackerel', 'clam-kalguksu', 'dumpling-soup', 'rice-cake-soup', 'udon', 'pho'],
  challenge: ['gambas', 'spring-roll', 'pho', 'quail-egg-braise'],
};

/** 기본 레시피 표에 없는 레시피(사용자·AI)는 태그로 추정 */
function guessKind(r: Recipe): KindKey {
  const t = r.tags.join(' ') + ' ' + r.name;
  if (/국물|찌개|국$|탕/.test(t)) return 'soup';
  if (/면|파스타|국수|라면|우동/.test(t)) return /파스타/.test(t) ? 'western' : 'noodle';
  if (/덮밥|볶음밥|밥/.test(t)) return 'rice';
  if (/반찬|나물|조림|무침/.test(t)) return 'side';
  if (/양식|피자|스테이크/.test(t)) return 'western';
  if (/분식|떡볶이|전$|부침/.test(t)) return 'snack';
  if (/볶음|구이/.test(t)) return 'stir';
  return 'easy';
}

export function kindOf(r: Recipe): KindKey {
  const k = (Object.keys(KIND_OF) as KindKey[]).find((key) => KIND_OF[key].includes(r.id));
  return k ?? guessKind(r);
}

export function moodsOf(r: Recipe): MoodKey[] {
  const out: MoodKey[] = [];
  if (r.timeMinutes <= 15) out.push('quick');
  for (const [k, ids] of Object.entries(MOOD_OF) as [MoodKey, string[]][]) if (ids.includes(r.id)) out.push(k);
  if (r.difficulty !== '쉬움' && !out.includes('challenge')) out.push('challenge');
  if (r.tags.includes('도시락') && !out.includes('lunchbox')) out.push('lunchbox');
  return out;
}

/** 점검 스크립트용: 표에 직접 들어간 기본 레시피 id 목록 */
export function listedKindIds(): string[] {
  return Object.values(KIND_OF).flat();
}
