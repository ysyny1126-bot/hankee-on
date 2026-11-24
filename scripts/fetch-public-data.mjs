// 공공데이터 가져오기: node scripts/fetch-public-data.mjs
// - 식품안전나라 조리식품 레시피 DB(COOKRCP01): 키가 없으면 공개 'sample' 키(검색당 최대 5건)로 동작
// - 식약처 식품영양성분 DB(공공데이터포털 FoodNtrCpntDbInq03): DATA_GO_KR_KEY가 있을 때만
// 키는 .env에서 읽고 화면에 출력하지 않는다. 결과는 데이터/공공데이터/(git 제외)에 저장한다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
if (existsSync(join(root, '.env')))
  for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
const FS_KEY = env.FOODSAFETY_KEY || 'sample';
const DG_KEY = env.DATA_GO_KR_KEY;

// 레시피 이름 목록(recipes.ts에서 name만 읽는다)
const src = readFileSync(join(root, 'src/data/recipes.ts'), 'utf8');
const recipes = [...src.matchAll(/id: '([^']+)', name: '([^']+)'/g)].map((m) => ({ id: m[1], name: m[2] }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url) {
  for (let t = 0; t < 3; t++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const text = await res.text();
      return JSON.parse(text);
    } catch {
      await sleep(1500);
    }
  }
  return null;
}

// 이름 변형: '계란 파 라면' → ['계란 파 라면', '계란파라면', '라면']
function variants(name) {
  const v = [name, name.replace(/\s/g, '')];
  const last = name.split(/\s/).pop();
  if (last && last !== name && last.length >= 2) v.push(last);
  return [...new Set(v)];
}

const out = { fetchedAt: new Date().toISOString(), usedSampleKey: FS_KEY === 'sample', recipes: {} };
for (const r of recipes) {
  const entry = { name: r.name, cookrcp: [], nutrition: [] };
  for (const q of variants(r.name)) {
    const j = await getJson(`http://openapi.foodsafetykorea.go.kr/api/${encodeURIComponent(FS_KEY)}/COOKRCP01/json/1/5/RCP_NM=${encodeURIComponent(q)}`);
    const rows = j?.COOKRCP01?.row ?? [];
    for (const row of rows) if (!entry.cookrcp.some((x) => x.RCP_SEQ === row.RCP_SEQ)) entry.cookrcp.push(row);
    await sleep(1100); // 초당 1회 이하
    if (entry.cookrcp.length) break;
  }
  if (DG_KEY) {
    for (const q of variants(r.name)) {
      const j = await getJson(
        `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03?serviceKey=${encodeURIComponent(DG_KEY)}&pageNo=1&numOfRows=10&type=json&FOOD_NM_KR=${encodeURIComponent(q)}`,
      );
      const items = j?.body?.items ?? j?.response?.body?.items ?? [];
      entry.nutrition.push(...(Array.isArray(items) ? items : items.item ? [].concat(items.item) : []));
      await sleep(1100);
      if (entry.nutrition.length) break;
    }
  }
  out.recipes[r.id] = entry;
  process.stdout.write(`${r.name}: 레시피DB ${entry.cookrcp.length} · 영양DB ${DG_KEY ? entry.nutrition.length : '키 없음'}\n`);
}

const dir = join(root, '데이터/공공데이터');
mkdirSync(dir, { recursive: true });
const file = join(dir, `${new Date().toISOString().slice(0, 10)}_원본.json`);
writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`저장: ${file.replace(root + '/', '')}`);
