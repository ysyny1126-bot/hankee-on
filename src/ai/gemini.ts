import type { NutritionInfo, StorageType } from '@/data/types';

/**
 * HANKEE AI — Google Gemini(무료 등급) 연결.
 * 키는 .env 파일의 EXPO_PUBLIC_GEMINI_API_KEY에 둔다(코드·깃에 넣지 않음).
 *
 * ⚠️ 시연용 구조: 지금은 앱에서 Gemini로 바로 요청한다. 이 방식은 앱 안에 키가 들어가므로
 *    실제 출시 전에는 서버(예: Supabase Edge Function)를 거치도록 바꿔야 한다.
 * ⚠️ 무료 등급은 입력 데이터가 구글의 서비스 개선에 쓰일 수 있다 → 출시 땐 유료 등급으로 전환.
 */
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
// 2026-11: 새 키는 gemini-2.5 계열을 쓸 수 없어 3.8-flash가 기본(바꾸려면 .env의 EXPO_PUBLIC_GEMINI_MODEL)
const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.8-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const AI_MODEL_NAME = MODEL;

export function hasAIKey(): boolean {
  return API_KEY.length > 10;
}

export class AIUnavailableError extends Error {}

export interface ImageInput {
  base64: string;
  mimeType: string;
}

async function generateJSON<T>(prompt: string, image?: ImageInput): Promise<T> {
  if (!hasAIKey()) throw new AIUnavailableError('AI 키가 아직 연결되지 않았어요.');
  const parts: unknown[] = [];
  if (image) parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
  parts.push({ text: prompt });
  // 네트워크가 끊기거나 너무 오래 걸리면(40초) 사용자에게 알기 쉬운 말로 알려 준다
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 40_000);
  let res: Response;
  try {
    const send = () =>
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        }),
        signal: ctrl.signal,
      });
    res = await send();
    // 혼잡(503)이면 잠깐 쉬었다가 두 번까지 다시 시도
    for (let i = 0; i < 2 && res.status === 503; i++) {
      await new Promise((r) => setTimeout(r, 2500 * (i + 1)));
      res = await send();
    }
  } catch (e) {
    throw new Error((e as Error).name === 'AbortError' ? (image ? 'AI 응답이 너무 오래 걸려요. 사진을 한 칸씩 나눠 찍거나 잠시 후 다시 시도해 주세요.' : 'AI 응답이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.') : '인터넷 연결을 확인해 주세요.');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const msg =
      res.status === 429
        ? '오늘 무료 AI 사용량을 다 썼어요. 잠시 후 다시 시도해 주세요.'
        : res.status === 503
          ? '지금 AI가 붐벼요. 잠시 후 다시 시도하거나 재료를 직접 골라 주세요.'
          : `AI 요청 실패 (${res.status})`;
    throw new Error(msg);
  }
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  try {
    return JSON.parse(text.replace(/^```json\s*|```$/g, '').trim()) as T;
  } catch {
    throw new Error('AI 응답을 읽지 못했어요. 다시 시도해 주세요.');
  }
}

const COMMON_RULES = `
- 모든 답은 한국어.
- 확실하지 않으면 confidence를 낮게 주고 추측이라고 표시한다. 없는 것을 지어내지 않는다.
- 의료적 진단·치료 표현, 음식에 대한 죄책감을 주는 표현을 쓰지 않는다.
- 반드시 지정한 JSON 형식만 출력한다.`;

// ─────────── 1) 냉장고 사진 → 식재료 후보 ───────────
export interface DetectedIngredient {
  name: string;
  quantity: number;
  unit: string;
  storage: StorageType;
  confidence: 'high' | 'medium' | 'low';
}

export interface FridgeScanResult {
  items: DetectedIngredient[];
  /** 사진 상태: ok | blurry(흐림) | dark(어두움) | far(너무 멀어 작게 보임) | not_food(식재료 사진 아님) */
  quality: 'ok' | 'blurry' | 'dark' | 'far' | 'not_food';
}

export async function analyzeFridgePhoto(image: ImageInput): Promise<FridgeScanResult> {
  const r = await generateJSON<{ items: DetectedIngredient[]; quality?: FridgeScanResult['quality'] }>(
    `냉장고(또는 식재료) 사진이다. 보이는 식재료를 찾아라.
- name: 일반적인 한국어 식재료 이름(예: 계란, 대파, 두부, 우유). 브랜드명 대신 식재료명.
- quantity/unit: 눈으로 셀 수 있는 대략 수량과 단위(개, 대, 모, 봉, 팩, 병, g 등).
- storage: fridge(냉장) | freezer(냉동) | pantry(실온) 중 사진상 보관 위치.
- confidence: 식별 확신도.
- 소비기한은 추정하지 않는다(출력하지 않음).
- 사진에 실제로 보이는 것만 적는다. 가려져서 일부만 보이거나, 불투명한 포장·용기라 내용물을 알 수 없는 것은 넣지 않거나 confidence를 low로 한다. 사진에 없는 재료를 '있을 법하다'고 추가하지 않는다.
- quality: 사진이 흐리면 blurry, 어두우면 dark, 너무 멀어 재료가 작게 보이면 far, 식재료 사진이 아니면 not_food, 괜찮으면 ok.
${COMMON_RULES}
형식: {"quality":"ok","items":[{"name":"","quantity":1,"unit":"개","storage":"fridge","confidence":"high"}]}`,
    image,
  );
  return { items: (r.items ?? []).filter((i) => i?.name), quality: r.quality ?? 'ok' };
}

// ─────────── 2) 포장지 사진 → 소비기한 읽기(OCR) ───────────
export async function readExpiryFromPackage(image: ImageInput): Promise<{ date: string | null; text: string; productName: string | null }> {
  return generateJSON(
    `식품 포장지 사진이다. 인쇄된 소비기한(또는 유통기한) 날짜 문구를 그대로 읽어라.
- 사진에 날짜가 또렷이 보일 때만 date를 YYYY-MM-DD로 준다. 안 보이거나 흐리면 null. 절대 추정하지 않는다.
- text: 읽은 원문 문구(예: "소비기한 2026.11.24까지").
- productName: 보이면 제품/식재료 이름, 아니면 null.
${COMMON_RULES}
형식: {"date":"2026-11-24","text":"","productName":null}`,
    image,
  );
}

// ─────────── 3) 음식 사진 → 레시피 ───────────
export interface RecipeCtx {
  allergies: string[];
  disliked?: string[];
  skill: string;
  maxMinutes: number;
}

/** 알레르기·기피 음식은 '제외 조건'. 대체 재료에도 쓰지 않게 분명히 적는다. */
function restrictionRules(ctx: RecipeCtx): string {
  return `- 사용자 알레르기: ${ctx.allergies.join(', ') || '없음'}. 사용자 기피 음식: ${ctx.disliked?.join(', ') || '없음'}.
- 알레르기·기피 재료는 레시피 재료와 대체 재료(substitute) 어디에도 넣지 않는다. 그 재료가 꼭 필요한 음식이면 빼고도 만들 수 있는 방법을 쓰고, 불가능하면 confidence를 low로 하고 features에 이유를 적는다.
- 같은 알레르기 계열(예: 우유 → 치즈·버터, 밀 → 면·빵가루)도 대체 재료로 쓰지 않는다.`;
}

export interface AIRecipe {
  name: string;
  emoji: string;
  features: string;
  servings: number;
  timeMinutes: number;
  difficulty: '쉬움' | '보통' | '어려움';
  ingredients: { name: string; amount: number; unit: string; optional?: boolean; substitute?: string }[];
  steps: string[];
  tags: string[];
  videoQuery: string;
  confidence: 'high' | 'medium' | 'low';
  nutrition?: NutritionInfo;
}

export async function recipeFromFoodPhoto(image: ImageInput, ctx: RecipeCtx): Promise<AIRecipe> {
  return generateJSON(
    `사용자가 먹고 싶은 음식 사진이다. 음식을 알아보고 1인분 집밥 레시피를 만들어라.
- 사용자 요리 실력: ${ctx.skill}, 선호 조리 시간: ${ctx.maxMinutes}분 이내.
${restrictionRules(ctx)}
- ingredients의 분량은 사진으로 추정한 값이다. 재료 이름은 일반적인 한국어 식재료명(예: 돼지고기, 대파, 계란).
- features: 음식 종류와 특징 1~2문장.
- videoQuery: 유튜브에서 찾을 검색어(예: "김치찌개 황금레시피").
- nutrition: 1인분 대략 영양값(추정치). calories(kcal), protein, carbohydrates, fat, fiber, sugar(g), sodium(mg).
${COMMON_RULES}
형식: {"name":"","emoji":"🍲","features":"","servings":1,"timeMinutes":20,"difficulty":"쉬움","ingredients":[{"name":"","amount":1,"unit":"개","optional":false,"substitute":""}],"steps":[""],"tags":[""],"videoQuery":"","confidence":"medium","nutrition":{"calories":0,"protein":0,"carbohydrates":0,"fat":0,"sodium":0,"fiber":0,"sugar":0}}`,
    image,
  );
}

/** 음식 이름 → 레시피(요리 검색에서 기본 레시피에 없을 때) */
export async function recipeFromName(name: string, ctx: RecipeCtx): Promise<AIRecipe> {
  return generateJSON(
    `"${name}"의 1인분 집밥 레시피를 만들어라.
- 사용자 요리 실력: ${ctx.skill}, 선호 조리 시간: ${ctx.maxMinutes}분 이내.
${restrictionRules(ctx)}
- 이 음식이 실제로 존재하지 않거나 음식이 아니면 name을 빈 문자열로.
${COMMON_RULES}
형식: {"name":"","emoji":"🍲","features":"","servings":1,"timeMinutes":20,"difficulty":"쉬움","ingredients":[{"name":"","amount":1,"unit":"개","optional":false,"substitute":""}],"steps":[""],"tags":[""],"videoQuery":"","confidence":"medium","nutrition":{"calories":0,"protein":0,"carbohydrates":0,"fat":0,"sodium":0,"fiber":0,"sugar":0}}`,
  );
}

// ─────────── 4) 식사 사진 → 음식·영양 추정 ───────────
export interface AIMealItem {
  foodName: string;
  quantity: number;
  unit: string;
  ingredients: string[];
  vegetableServings: number;
  nutrition: NutritionInfo;
  confidence: 'high' | 'medium' | 'low';
}

export async function analyzeMealPhoto(image: ImageInput): Promise<{ items: AIMealItem[]; note: string }> {
  return generateJSON(
    `사용자가 먹은 식사 사진이다. 음식별로 나눠라.
- foodName: 음식 이름, quantity/unit: 대략 분량(인분, 개, 그릇 등).
- ingredients: 보이는 주재료(식재료 다양성 분석용).
- vegetableServings: 채소·과일 대략 접시 수(0~3).
- nutrition: 표시된 분량 1단위 기준 대략 영양값. 사진만으로는 정확하지 않으므로 추정치.
- note: 분석 한계 한 줄(예: "소스·기름 양은 사진으로 알기 어려워요").
${COMMON_RULES}
형식: {"items":[{"foodName":"","quantity":1,"unit":"인분","ingredients":[""],"vegetableServings":0,"nutrition":{"calories":0,"protein":0,"carbohydrates":0,"fat":0,"sodium":0,"fiber":0,"sugar":0},"confidence":"medium"}],"note":""}`,
    image,
  );
}

export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
