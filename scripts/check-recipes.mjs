// 레시피·재료 데이터 자동 점검: node scripts/check-recipes.mjs
// 조리 순서와 재료 목록이 서로 맞는지, 시간·양이 상식 범위인지, 보관 정보가 빠짐없는지 검사한다.
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'hankee-check-'));
for (const f of ['recipes', 'catalog', 'types', 'keep', 'taxonomy']) {
  let src;
  try {
    src = readFileSync(join(root, 'src/data', f + '.ts'), 'utf8');
  } catch {
    continue;
  }
  writeFileSync(join(tmp, f + '.ts'), src.replace(/from '\.\/(\w+)'/g, "from './$1.ts'"));
}
const { BUILTIN_RECIPES } = await import(pathToFileURL(join(tmp, 'recipes.ts')).href);
const cat = await import(pathToFileURL(join(tmp, 'catalog.ts')).href);
const { INGREDIENT_CATALOG, findCatalog, sameIngredient } = cat;

// 순서에 나와도 재료 목록에 없어도 되는 기본 재료
const BASIC = ['소금', '후추', '식용유', '물'];
const problems = [];
const warn = (id, msg) => problems.push(`${id}: ${msg}`);

// 사전의 이름·별칭 전부(2글자 이상) → 순서 문장에서 찾기
const names = [];
for (const c of INGREDIENT_CATALOG) {
  for (const n of [c.name, ...(c.aliases ?? [])]) if (n.length >= 2) names.push({ n, c: c.name });
}
names.sort((a, b) => b.n.length - a.n.length);

const RANGE = { 공기: [0.5, 1.5], g: [3, 400], ml: [5, 700], 큰술: [0.1, 6], 작은술: [0.1, 6], 개: [0.05, 25], 봉: [0.1, 2] };

for (const r of BUILTIN_RECIPES) {
  const text = r.steps.join(' ');
  const listed = r.ingredients.map((i) => i.name);

  // 1) 순서에 나오는데 재료 목록에 없는 재료
  let rest = text;
  const mentioned = new Set();
  for (const { n, c } of names) {
    if (rest.includes(n)) {
      mentioned.add(c);
      rest = rest.split(n).join(' ');
    }
  }
  for (const m of mentioned) {
    if (BASIC.includes(m)) continue;
    if (!listed.some((l) => sameIngredient(l, m) || l.includes(m) || m.includes(l))) warn(r.id, `순서에 '${m}'가 나오는데 재료 목록에 없음`);
  }

  // 2) 재료 목록에 있는데 순서에서 안 쓰이는 재료
  for (const ing of r.ingredients) {
    const c = findCatalog(ing.name);
    const keys = [ing.name, c?.name, ...(c?.aliases ?? [])].filter(Boolean).map((k) => k.replace(/캔$/, ''));
    if (/면$/.test(ing.name)) keys.push('면');
    if (/고기$/.test(ing.name)) keys.push('고기');
    const used = keys.some((k) => text.includes(k)) || /양념|채소|고명|재료|토핑/.test(text) && ing.optional;
    if (!used) warn(r.id, `재료 '${ing.name}'가 순서에서 쓰이지 않음`);
    // 3) 사전 연결
    if (!c) warn(r.id, `재료 '${ing.name}'가 재료 사전에 없음(재고 차감·알레르기 판별 불가)`);
    // 4) 양 범위
    const rg = RANGE[ing.unit];
    if (rg && (ing.amount < rg[0] || ing.amount > rg[1])) warn(r.id, `'${ing.name}' ${ing.amount}${ing.unit}가 1인분 범위를 벗어남`);
  }

  // 5) 순서의 분 합계 ≤ 총 시간(재우기·해감·냉동 같은 기다림은 따로 표시해야 함)
  if (r.prep && !r.prep.trim()) warn(r.id, 'prep이 비어 있음');
  const mins = [...text.matchAll(/(\d+)\s*분/g)].map((m) => Number(m[1])).reduce((a, b) => a + b, 0);
  if (mins > r.timeMinutes) warn(r.id, `순서의 시간 합 ${mins}분 > 총 ${r.timeMinutes}분`);

  // 6) 고기·해산물 안전 문구
  const risky = r.ingredients.some((i) => ['육류', '해산물'].includes(findCatalog(i.name)?.category) && !/멸치|미역|황태|베이컨|명란/.test(i.name));
  if (risky && !r.safety?.length)
    warn(r.id, `고기·해산물 레시피인데 안전 팁(safety)이 없음`);
  // 7) 남은 음식 보관
  if (!r.leftover) warn(r.id, `남은 음식 보관(leftover) 정보가 없음`);
}

// 8) 메뉴 분류: 기본 레시피는 종류 표에 정확히 한 번, 상황 하나 이상
const tax = await import(pathToFileURL(join(tmp, 'taxonomy.ts')).href);
const listed = tax.listedKindIds();
for (const r of BUILTIN_RECIPES) {
  const n = listed.filter((id) => id === r.id).length;
  if (n !== 1) warn(r.id, `종류 표에 ${n}번 들어 있음(정확히 1번이어야 함)`);
  if (!tax.moodsOf(r).length) warn(r.id, '상황 분류가 하나도 없음');
}
for (const id of listed) if (!BUILTIN_RECIPES.some((r) => r.id === id)) warn(id, '종류 표에 있지만 레시피가 없음');

// 9) 재료 사전 보관 정보
const KEEP = cat.KEEP_DATA ?? {};
for (const c of INGREDIENT_CATALOG) {
  const k = KEEP[c.name];
  if (!k) warn('재료 ' + c.name, '보관 정보(KEEP_DATA)가 없음');
  else if (!k.signs) warn('재료 ' + c.name, '상한 신호가 없음');
}

console.log(`레시피 ${BUILTIN_RECIPES.length}개 · 재료 ${INGREDIENT_CATALOG.length}개 점검`);
if (problems.length) {
  console.log(`문제 ${problems.length}개`);
  for (const p of problems) console.log(' - ' + p);
  process.exitCode = 1;
} else console.log('문제 없음');
