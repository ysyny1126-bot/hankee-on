// 레시피·재료 데이터 자동 점검: node scripts/check-recipes.mjs
// 조리 순서와 재료 목록이 서로 맞는지, 시간·양이 상식 범위인지, 보관 정보가 빠짐없는지 검사한다.
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'hankee-check-'));
for (const f of ['recipes', 'catalog', 'types', 'keep', 'taxonomy', 'nutrition-db']) {
  let src;
  try {
    src = readFileSync(join(root, 'src/data', f + '.ts'), 'utf8');
  } catch {
    continue;
  }
  writeFileSync(join(tmp, f + '.ts'), src.replace(/from '\.\/([\w-]+)'/g, "from './$1.ts'"));
}
// 앱(AI 레시피)과 같은 점검 규칙을 쓴다: src/logic/recipe-check.ts
writeFileSync(
  join(tmp, 'recipe-check.ts'),
  readFileSync(join(root, 'src/logic/recipe-check.ts'), 'utf8').replace(/from '@\/data\/([\w-]+)'/g, "from './$1.ts'"),
);
const { auditRecipe } = await import(pathToFileURL(join(tmp, 'recipe-check.ts')).href);
const { BUILTIN_RECIPES } = await import(pathToFileURL(join(tmp, 'recipes.ts')).href);
const cat = await import(pathToFileURL(join(tmp, 'catalog.ts')).href);
const { INGREDIENT_CATALOG, findCatalog } = cat;

const problems = [];
const warn = (id, msg) => problems.push(`${id}: ${msg}`);

for (const r of BUILTIN_RECIPES) {
  // 1~5) 재료↔순서, 사전 연결, 1인분 양 범위, 시간 합계, 익힘 단계
  for (const msg of auditRecipe(r)) warn(r.id, msg);
  for (const ing of r.ingredients) if (!findCatalog(ing.name)) warn(r.id, `재료 '${ing.name}'가 재료 사전에 없음(재고 차감·알레르기 판별 불가)`);
  if (r.prep && !r.prep.trim()) warn(r.id, 'prep이 비어 있음');

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
