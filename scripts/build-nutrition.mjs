// 식약처 식품영양성분 DB로 레시피 영양값 만들기: node scripts/build-nutrition.mjs
// - 레시피마다 식약처 DB 음식 이름(정확히 같은 이름)을 순서대로 찾아 1인분(식품중량) 값으로 바꾼다.
// - 결과: src/data/nutrition-db.ts(앱에서 씀), docs/출처기록.md(대조표)
// - 키는 .env의 DATA_GO_KR_KEY. 값은 출력하지 않는다.
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  (existsSync(join(root, '.env')) ? readFileSync(join(root, '.env'), 'utf8') : '')
    .split('\n')
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const KEY = env.DATA_GO_KR_KEY;
if (!KEY) {
  console.log('DATA_GO_KR_KEY가 .env에 없어요.');
  process.exit(1);
}

// 레시피 id → 식약처 DB 음식 이름 후보(앞에서부터, 이름이 '정확히' 같은 것만 쓴다). 맞는 음식이 없으면 비워 둔다.
const MAP = {
  'kimchi-stew': ['김치찌개_돼지고기', '김치찌개'],
  'doenjang-stew': ['된장찌개_두부_호박', '된장찌개'],
  'egg-fried-rice': ['볶음밥_달걀', '달걀볶음밥', '계란볶음밥'],
  'kimchi-fried-rice': ['볶음밥_배추김치', '김치볶음밥'],
  jeyuk: ['제육볶음', '돼지고기볶음(제육볶음)'],
  'tofu-braise': ['두부조림'],
  'egg-roll': ['달걀말이', '계란말이'],
  'tuna-mayo': ['참치마요덮밥', '덮밥_참치마요'],
  'tomato-pasta': ['스파게티_토마토', '토마토스파게티', '스파게티'],
  'chicken-salad': ['닭가슴살 샐러드_드레싱'],
  tteokbokki: ['떡볶이'],
  'bean-sprout-soup': ['콩나물국'],
  'egg-toast': ['토스트_달걀', '달걀토스트', '토스트'],
  bibimbap: ['비빔밥'],
  'potato-stir': ['감자볶음'],
  'cabbage-stir': ['양배추볶음'],
  udon: ['우동_어묵', '어묵우동', '우동'],
  mackerel: ['고등어구이'],
  'shrimp-garlic': ['볶음밥_새우볶음밥', '새우볶음밥'],
  'mushroom-bulgogi': ['불고기_버섯', '버섯불고기', '소불고기', '불고기'],
  'soft-tofu-stew': ['순두부찌개', '순두부찌개_모듬'],
  'seaweed-soup': ['미역국'],
  'radish-beef-soup': ['쇠고기무국', '소고기무국', '무국_쇠고기', '무국_소고기', '쇠고기뭇국'],
  'squid-stir': ['오징어볶음'],
  'egg-soup': ['달걀국', '계란국'],
  'kimchi-pancake': ['김치전'],
  'chive-pancake': ['부추전'],
  'janchi-noodle': ['잔치국수'],
  'spicy-noodle': ['비빔국수'],
  'curry-rice': ['카레라이스_돼지고기', '카레라이스'],
  'dumpling-soup': ['만두국'],
  'microwave-egg': ['달걀찜', '계란찜'],
  'salmon-bowl': ['연어덮밥', '덮밥_연어'],
  'cream-pasta': ['스파게티_크림', '크림스파게티', '까르보나라'],
  'tortilla-pizza': ['또띠아피자', '피자_또띠아'],
  'sprout-pork': ['돼지고기볶음'],
  'eggplant-stir': ['가지볶음_가지', '가지볶음'],
  'broccoli-shrimp': ['새우볶음'],
  'tuna-riceball': ['주먹밥_참치', '참치주먹밥', '주먹밥'],
  'tomato-egg': ['토마토달걀볶음', '토마토 달걀볶음'],
  'fishcake-stir': ['어묵볶음'],
  'potato-braise': ['감자조림'],
  'spinach-namul': ['시금치나물'],
  'sprout-namul': ['콩나물무침'],
  'rice-cake-soup': ['떡국'],
  'pork-cutlet-bowl': ['돈가스덮밥', '덮밥_돈가스', '가츠동'],
  'chicken-teriyaki': ['덮밥_닭고기', '닭고기 덮밥'],
  pho: ['쌀국수'],
  'spring-roll': ['월남쌈'],
  naengmyeon: ['물냉면', '냉면_물냉면'],
  rabokki: ['라볶이'],
  'ramen-upgrade': ['라면_달걀', '라면'],
  gambas: ['감바스', '감바스 알 아히요'],
  'clam-kalguksu': ['칼국수_바지락', '바지락칼국수', '칼국수'],
  'french-toast': ['프렌치토스트'],
  'tofu-kimchi': ['두부김치'],
  'quail-egg-braise': ['메추리알장조림', '장조림_메추리알'],
  'aglio-olio': ['스파게티_알리오올리오', '알리오올리오'],
  'mushroom-risotto': ['리조또_버섯', '버섯리조또', '리조또'],
  omurice: ['오므라이스'],
  'eomuk-tang': ['어묵탕', '어묵국'],
  'potato-pancake': ['감자전'],
  'gun-mandu': ['군만두'],
  'tteok-kkochi': ['떡꼬치'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (v) => (v === '' || v == null ? null : Number(v));
async function query(name) {
  const url = `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03?serviceKey=${encodeURIComponent(KEY)}&pageNo=1&numOfRows=100&type=json&FOOD_NM_KR=${encodeURIComponent(name)}`;
  for (let t = 0; t < 3; t++) {
    try {
      const j = await (await fetch(url, { signal: AbortSignal.timeout(25000) })).json();
      return (j?.body?.items ?? []).filter((i) => i.DB_GRP_NM === '음식');
    } catch {
      await sleep(2000);
    }
  }
  return [];
}

// 같은 이름이 여러 건(조사 연도별)이면 가장 최근 조사값
function pick(items, name) {
  const same = items.filter((i) => i.FOOD_NM_KR === name && num(i.AMT_NUM1) != null && /g$/.test(i.Z10500 ?? ''));
  same.sort((a, b) => (b.RESEARCH_YMD ?? '').localeCompare(a.RESEARCH_YMD ?? ''));
  return same[0];
}

// 기존 추정값(비교용)
const tmp = mkdtempSync(join(tmpdir(), 'hankee-nut-'));
for (const f of ['catalog', 'types', 'keep', 'recipes', 'nutrition-db', 'taxonomy']) {
  const p = join(root, 'src/data', f + '.ts');
  if (existsSync(p)) writeFileSync(join(tmp, f + '.ts'), readFileSync(p, 'utf8').replace(/from '\.\/([\w-]+)'/g, "from './$1.ts'"));
}
if (!existsSync(join(tmp, 'nutrition-db.ts'))) writeFileSync(join(tmp, 'nutrition-db.ts'), 'export const NUTRITION_DB = {};');
const { BUILTIN_RECIPES } = await import(pathToFileURL(join(tmp, 'recipes.ts')).href);
const { kindOf } = await import(pathToFileURL(join(tmp, 'taxonomy.ts')).href);

const result = {};
const rows = [];
for (const r of BUILTIN_RECIPES) {
  let hit = null;
  for (const name of MAP[r.id] ?? []) {
    const item = pick(await query(name), name);
    await sleep(500);
    if (item) {
      hit = { name, item };
      break;
    }
  }
  const old = r.nutrition;
  if (!hit) {
    rows.push(`| ${r.name} | ${old ? `${old.calories}kcal (추정)` : '—'} | 맞는 음식 없음 | 비워 둠(추정값이 있으면 '추정' 표시 유지) |`);
    console.log(`${r.name}: 없음`);
    continue;
  }
  const i = hit.item;
  const g = parseFloat(i.Z10500);
  // DB 무게가 100g 이하인데 반찬이 아니면 '한 그릇'이 아니라 100g 기준값일 뿐 → 1인분으로 쓰면 틀린다
  if (g <= 100 && kindOf(r) !== 'side') {
    rows.push(`| ${r.name} | ${old ? `${old.calories}kcal (추정)` : '—'} | ${i.FOOD_NM_KR} 100g당 ${Math.round(num(i.AMT_NUM1))}kcal(1인분 무게 없음) | 1인분 환산 불가 → 기존 추정 유지 |`);
    console.log(`${r.name}: ${i.FOOD_NM_KR} ${g}g 기준뿐 → 제외`);
    continue;
  }
  const per = (v) => (num(v) == null ? 0 : Math.round((num(v) * g) / 100 * 10) / 10);
  const n = {
    calories: Math.round(per(i.AMT_NUM1)),
    protein: per(i.AMT_NUM3),
    fat: per(i.AMT_NUM4),
    carbohydrates: per(i.AMT_NUM6),
    sugar: per(i.AMT_NUM7),
    fiber: per(i.AMT_NUM8),
    sodium: Math.round(per(i.AMT_NUM13)),
  };
  result[r.id] = { dbName: i.FOOD_NM_KR, foodCode: i.FOOD_CD, servingGram: g, researched: i.RESEARCH_YMD, nutrition: n };
  const diff = old ? Math.round(((n.calories - old.calories) / old.calories) * 100) : null;
  rows.push(
    `| ${r.name} | ${old ? `${old.calories}kcal (추정)` : '—'} | ${i.FOOD_NM_KR} ${g}g → ${n.calories}kcal · 단백질 ${n.protein}g · 나트륨 ${n.sodium}mg | 식약처 값 사용${diff != null && Math.abs(diff) >= 30 ? ` ⚠️ 기존과 ${diff > 0 ? '+' : ''}${diff}%` : ''} |`,
  );
  console.log(`${r.name}: ${i.FOOD_NM_KR} ${g}g ${n.calories}kcal`);
}

writeFileSync(
  join(root, 'src/data/nutrition-db.ts'),
  `// 자동 생성 파일(scripts/build-nutrition.mjs). 직접 고치지 말고 스크립트를 다시 돌린다.
// 출처: 식품의약품안전처 식품영양성분 DB(공공데이터포털, 이용허락범위 제한 없음). 1인분 = DB의 식품중량 기준.
import type { NutritionInfo } from './types';

export interface DbNutrition {
  dbName: string;
  foodCode: string;
  servingGram: number;
  researched: string;
  nutrition: NutritionInfo;
}

export const NUTRITION_DB: Record<string, DbNutrition> = ${JSON.stringify(result, null, 2)};
`,
);

const matched = Object.keys(result).length;
writeFileSync(
  join(root, 'docs/출처기록.md'),
  `# 출처 기록 · 영양값 대조표

> ${new Date().toISOString().slice(0, 10)} 생성(scripts/build-nutrition.mjs). 식약처 식품영양성분 DB에서 **이름이 정확히 같은 음식**만 썼다.
> 1인분은 DB의 '식품중량'(한 그릇 무게) 기준이라, 오잘먹 레시피의 실제 양과 조금 다를 수 있다.
> 레시피 ${BUILTIN_RECIPES.length}개 중 **${matched}개** 식약처 값 연결, 나머지는 맞는 음식이 없어 비워 두거나 '추정'으로 남김.
> ⚠️ 표시는 기존 추정값과 30% 이상 차이 나는 항목.

| 레시피 | 기존 값 | 식약처 DB | 결정 |
|---|---|---|---|
${rows.join('\n')}
`,
);
console.log(`\n연결 ${matched}/${BUILTIN_RECIPES.length} · src/data/nutrition-db.ts, docs/출처기록.md 저장`);
