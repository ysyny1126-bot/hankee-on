import { allergensOf, findFoodReference } from './catalog';
import type { Recipe, RecipeIngredient } from './types';

/**
 * 기본 레시피(1인 가구용, 1인분 기준).
 * AI 없이도 "냉장고 재료 → 레시피 추천 → 요리 → 재고 차감 → 식사 기록" 흐름이 실제로 돌아가게 하는 기반 데이터.
 */
type Draft = Omit<Recipe, 'allergens' | 'origin' | 'servings' | 'nutrition'> & { ref?: string };

const I = (name: string, amount: number, unit: string, extra?: Partial<RecipeIngredient>): RecipeIngredient => ({
  name,
  amount,
  unit,
  ...extra,
});

const DRAFTS: Draft[] = [
  {
    id: 'kimchi-stew', name: '김치찌개', emoji: '🍲', timeMinutes: 25, difficulty: '쉬움', tags: ['국물', '한식'],
    ingredients: [I('김치', 150, 'g'), I('돼지고기', 80, 'g', { substitute: '참치캔' }), I('두부', 0.5, '모', { optional: true }), I('대파', 0.5, '대'), I('고춧가루', 0.5, '큰술', { optional: true })],
    steps: ['냄비에 돼지고기와 김치를 넣고 중불에서 3분 볶아요.', '물 300ml를 붓고 끓어오르면 10분 더 끓여요.', '두부와 대파를 썰어 넣고 5분 더 끓여요.', '싱거우면 고춧가루나 김치 국물로 간을 맞춰요.'],
  },
  {
    id: 'doenjang-stew', name: '된장찌개', emoji: '🥘', timeMinutes: 20, difficulty: '쉬움', tags: ['국물', '한식'],
    ingredients: [I('된장', 1.5, '큰술'), I('두부', 0.5, '모'), I('애호박', 0.3, '개', { substitute: '양파' }), I('양파', 0.3, '개'), I('버섯', 0.3, '봉', { optional: true }), I('청양고추', 1, '개', { optional: true })],
    steps: ['물 300ml에 된장을 풀어 끓여요.', '애호박·양파·버섯을 한입 크기로 썰어 넣어요.', '5분 뒤 두부를 넣고 3분 더 끓여요.', '청양고추를 넣어 마무리해요.'],
  },
  {
    id: 'egg-fried-rice', name: '계란볶음밥', emoji: '🍳', timeMinutes: 10, difficulty: '쉬움', tags: ['볶음', '한식', '초간단'],
    ingredients: [I('밥', 1, '공기'), I('계란', 2, '개'), I('대파', 0.3, '대'), I('간장', 0.5, '큰술'), I('당근', 0.2, '개', { optional: true })],
    steps: ['기름에 송송 썬 대파를 볶아 파기름을 내요.', '계란을 풀어 스크램블해요.', '밥과 잘게 썬 당근을 넣고 센불에 볶아요.', '팬 가장자리에 간장을 둘러 향을 내요.'],
  },
  {
    id: 'kimchi-fried-rice', name: '김치볶음밥', emoji: '🍛', timeMinutes: 15, difficulty: '쉬움', tags: ['볶음', '한식'],
    ingredients: [I('밥', 1, '공기'), I('김치', 100, 'g'), I('햄', 50, 'g', { optional: true, substitute: '참치캔' }), I('계란', 1, '개'), I('대파', 0.3, '대', { optional: true })],
    steps: ['김치와 햄을 잘게 썰어요.', '기름 두른 팬에 김치와 햄을 3분 볶아요.', '밥을 넣고 고루 볶아요.', '계란 프라이를 올려 완성해요.'],
  },
  {
    id: 'jeyuk', name: '제육볶음', emoji: '🥩', timeMinutes: 25, difficulty: '보통', tags: ['볶음', '한식'],
    ingredients: [I('돼지고기', 150, 'g'), I('양파', 0.5, '개'), I('고추장', 1.5, '큰술'), I('고춧가루', 0.5, '큰술'), I('대파', 0.5, '대'), I('설탕', 0.5, '큰술')],
    steps: ['고추장·고춧가루·설탕·간장 약간을 섞어 양념을 만들어요.', '돼지고기를 양념에 10분 재워요.', '팬에 고기를 볶다가 양파를 넣어요.', '대파를 넣고 1분 더 볶아요.'],
  },
  {
    id: 'tofu-braise', name: '두부조림', emoji: '🧈', timeMinutes: 20, difficulty: '쉬움', tags: ['반찬', '한식'],
    ingredients: [I('두부', 1, '모'), I('간장', 2, '큰술'), I('고춧가루', 0.5, '큰술'), I('대파', 0.3, '대'), I('설탕', 0.3, '큰술')],
    steps: ['두부를 1cm 두께로 썰어 노릇하게 부쳐요.', '간장·고춧가루·설탕·물 4큰술을 섞어요.', '양념을 붓고 약불에서 5분 졸여요.', '대파를 올려 마무리해요.'],
  },
  {
    id: 'egg-roll', name: '계란말이', emoji: '🥚', timeMinutes: 10, difficulty: '보통', tags: ['반찬'],
    ingredients: [I('계란', 3, '개'), I('대파', 0.2, '대'), I('당근', 0.1, '개', { optional: true })],
    steps: ['계란을 풀고 다진 대파·당근을 섞어요.', '약불 팬에 얇게 붓고 반쯤 익으면 말아요.', '남은 계란물을 부어 이어서 말아요.', '한 김 식힌 뒤 썰어요.'],
  },
  {
    id: 'tuna-mayo', name: '참치마요덮밥', emoji: '🍙', timeMinutes: 7, difficulty: '쉬움', tags: ['덮밥', '초간단'],
    ingredients: [I('밥', 1, '공기'), I('참치캔', 1, '캔'), I('김', 1, '봉', { optional: true }), I('양파', 0.2, '개', { optional: true }), I('간장', 0.5, '큰술')],
    steps: ['참치 기름을 빼요.', '참치에 마요네즈 1큰술과 간장을 섞어요.', '밥 위에 참치를 올려요.', '김을 부숴 올려 완성해요.'],
  },
  {
    id: 'tomato-pasta', name: '토마토 파스타', emoji: '🍝', timeMinutes: 20, difficulty: '쉬움', tags: ['양식', '면'],
    ingredients: [I('파스타면', 100, 'g'), I('토마토소스', 150, 'g'), I('양파', 0.3, '개'), I('마늘', 1, '큰술'), I('버섯', 0.3, '봉', { optional: true }), I('햄', 40, 'g', { optional: true })],
    steps: ['소금물에 면을 8분 삶아요.', '마늘·양파를 볶다가 버섯·햄을 넣어요.', '토마토소스와 면수 3큰술을 넣어요.', '면을 넣고 1분 버무려요.'],
  },
  {
    id: 'chicken-salad', name: '닭가슴살 샐러드', emoji: '🥗', timeMinutes: 10, difficulty: '쉬움', tags: ['샐러드', '초간단'],
    ingredients: [I('닭가슴살', 100, 'g'), I('상추', 5, '장', { substitute: '양배추' }), I('토마토', 1, '개', { optional: true }), I('오이', 0.5, '개', { optional: true }), I('파프리카', 0.5, '개', { optional: true })],
    steps: ['닭가슴살을 데우거나 구워 한입 크기로 썰어요.', '채소를 씻어 물기를 빼고 썰어요.', '그릇에 담고 좋아하는 드레싱을 곁들여요.'],
  },
  {
    id: 'tteokbokki', name: '떡볶이', emoji: '🌶️', timeMinutes: 20, difficulty: '쉬움', tags: ['분식'],
    ingredients: [I('떡', 200, 'g'), I('어묵', 2, '장'), I('고추장', 1.5, '큰술'), I('대파', 0.5, '대'), I('설탕', 1, '큰술'), I('계란', 1, '개', { optional: true })],
    steps: ['물 300ml에 고추장·설탕·고춧가루를 풀어요.', '끓으면 떡과 어묵을 넣어요.', '국물이 졸아들 때까지 7분 끓여요.', '대파와 삶은 계란을 넣어요.'],
  },
  {
    id: 'bean-sprout-soup', name: '콩나물국', emoji: '🌱', timeMinutes: 15, difficulty: '쉬움', tags: ['국물', '한식'],
    ingredients: [I('콩나물', 150, 'g'), I('대파', 0.3, '대'), I('마늘', 0.5, '큰술'), I('청양고추', 1, '개', { optional: true })],
    steps: ['물 500ml에 콩나물을 넣고 뚜껑을 덮어 끓여요.', '끓으면 5분 더 끓이고 다진 마늘을 넣어요.', '소금으로 간하고 대파·고추를 넣어요.'],
  },
  {
    id: 'egg-toast', name: '계란토스트', emoji: '🍞', timeMinutes: 10, difficulty: '쉬움', tags: ['간편식', '아침'],
    ingredients: [I('식빵', 2, '장'), I('계란', 1, '개'), I('양배추', 0.1, '통', { optional: true }), I('치즈', 1, '장', { optional: true }), I('햄', 1, '장', { optional: true })],
    steps: ['양배추를 채 썰어 계란과 섞어요.', '팬에 네모나게 부쳐요.', '구운 식빵에 계란·햄·치즈를 올려요.', '설탕이나 케첩을 살짝 곁들여요.'],
  },
  {
    id: 'bibimbap', name: '비빔밥', emoji: '🥢', timeMinutes: 20, difficulty: '보통', tags: ['한식', '채소듬뿍'],
    ingredients: [I('밥', 1, '공기'), I('계란', 1, '개'), I('시금치', 50, 'g', { optional: true }), I('콩나물', 50, 'g', { optional: true }), I('당근', 0.3, '개', { optional: true }), I('애호박', 0.3, '개', { optional: true }), I('고추장', 1, '큰술'), I('참기름', 0.5, '큰술')],
    steps: ['채소를 각각 살짝 데치거나 볶아요.', '밥 위에 채소를 둘러 담아요.', '계란 프라이를 올려요.', '고추장과 참기름을 넣어 비벼요.'],
  },
  {
    id: 'potato-stir', name: '감자볶음', emoji: '🥔', timeMinutes: 15, difficulty: '쉬움', tags: ['반찬'],
    ingredients: [I('감자', 1, '개'), I('양파', 0.3, '개', { optional: true }), I('당근', 0.2, '개', { optional: true })],
    steps: ['감자를 채 썰어 물에 5분 담가 전분을 빼요.', '팬에 감자를 볶다가 양파·당근을 넣어요.', '소금·후추로 간해요.'],
  },
  {
    id: 'cabbage-stir', name: '양배추 계란볶음', emoji: '🥬', timeMinutes: 10, difficulty: '쉬움', tags: ['볶음', '채소듬뿍', '초간단'],
    ingredients: [I('양배추', 0.2, '통'), I('계란', 2, '개'), I('간장', 0.5, '큰술'), I('대파', 0.2, '대', { optional: true })],
    steps: ['양배추를 한입 크기로 썰어요.', '계란을 먼저 스크램블해 덜어 둬요.', '양배추를 숨이 죽을 때까지 볶아요.', '계란과 간장을 넣어 섞어요.'],
  },
  {
    id: 'udon', name: '어묵우동', emoji: '🍜', timeMinutes: 12, difficulty: '쉬움', tags: ['국물', '면'],
    ingredients: [I('우동면', 1, '봉'), I('어묵', 2, '장'), I('대파', 0.3, '대'), I('간장', 1, '큰술')],
    steps: ['물 400ml에 간장과 동봉 스프를 넣고 끓여요.', '어묵을 썰어 넣고 2분 끓여요.', '우동면을 넣고 2분 더 끓여요.', '대파를 올려요.'],
  },
  {
    id: 'mackerel', name: '고등어구이', emoji: '🐟', timeMinutes: 15, difficulty: '쉬움', tags: ['한식', '생선'],
    ingredients: [I('고등어', 1, '마리'), I('밥', 1, '공기', { optional: true })],
    steps: ['고등어 물기를 키친타월로 닦아요.', '팬에 기름을 두르고 껍질 쪽부터 5분 구워요.', '뒤집어 4분 더 구워요.'],
  },
  {
    id: 'shrimp-garlic', name: '새우 마늘볶음밥', emoji: '🦐', timeMinutes: 15, difficulty: '보통', tags: ['볶음'],
    ingredients: [I('밥', 1, '공기'), I('새우', 80, 'g'), I('마늘', 1, '큰술'), I('계란', 1, '개'), I('파프리카', 0.3, '개', { optional: true }), I('간장', 0.5, '큰술')],
    steps: ['해동한 새우의 물기를 빼요.', '마늘을 볶아 향을 내고 새우를 넣어요.', '계란을 스크램블하고 밥·파프리카를 넣어요.', '간장으로 간해요.'],
  },
  {
    id: 'mushroom-bulgogi', name: '버섯불고기', emoji: '🍄', timeMinutes: 25, difficulty: '보통', tags: ['한식'],
    ingredients: [I('소고기', 120, 'g'), I('버섯', 0.5, '봉'), I('양파', 0.3, '개'), I('간장', 2, '큰술'), I('설탕', 0.5, '큰술'), I('대파', 0.3, '대', { optional: true })],
    steps: ['간장·설탕·다진 마늘·참기름으로 양념을 만들어요.', '소고기를 양념에 15분 재워요.', '팬에 고기·양파·버섯을 함께 볶아요.', '대파를 넣어 마무리해요.'],
  },
];

const NUTRITION_REF: Record<string, string> = {
  'egg-roll': '계란말이', 'tofu-braise': '두부조림', 'tuna-mayo': '참치마요덮밥', udon: '우동',
  'egg-toast': '토스트', 'bean-sprout-soup': '콩나물국', 'mushroom-bulgogi': '불고기', 'shrimp-garlic': '볶음밥',
};

export const BUILTIN_RECIPES: Recipe[] = DRAFTS.map((d) => {
  const ref = findFoodReference(NUTRITION_REF[d.id] ?? d.name);
  return {
    ...d,
    servings: 1,
    origin: 'builtin',
    nutrition: ref?.nutrition,
    allergens: allergensOf(d.ingredients.map((i) => i.name)),
  };
});
