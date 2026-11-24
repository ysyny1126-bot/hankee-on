import { allergensOf, findFoodReference } from './catalog';
import { NUTRITION_DB } from './nutrition-db';
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
    steps: ['김치와 햄을 잘게 썰어요.', '기름 두른 팬에 송송 썬 대파를 1분 볶아 파기름을 낸 뒤 김치와 햄을 넣고 3분 볶아요.', '밥을 넣고 고루 볶아요.', '계란 프라이를 올려 완성해요.'],
  },
  {
    id: 'jeyuk', name: '제육볶음', emoji: '🥩', timeMinutes: 25, difficulty: '보통', tags: ['볶음', '한식'],
    ingredients: [I('돼지고기', 150, 'g'), I('양파', 0.5, '개'), I('고추장', 1.5, '큰술'), I('고춧가루', 0.5, '큰술'), I('대파', 0.5, '대'), I('설탕', 0.5, '큰술'), I('간장', 1, '큰술')],
    steps: ['고추장·고춧가루·설탕·간장을 섞어 양념을 만들어요.', '돼지고기를 양념에 10분 재워요.', '팬에 고기를 볶다가 양파를 넣어요.', '대파를 넣고 1분 더 볶아요.'],
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
    ingredients: [I('밥', 1, '공기'), I('참치캔', 1, '캔'), I('김', 1, '봉', { optional: true }), I('양파', 0.2, '개', { optional: true }), I('간장', 0.5, '큰술'), I('마요네즈', 1, '큰술')],
    steps: ['참치 기름을 빼고, 양파는 잘게 다져 찬물에 헹궈 물기를 빼요.', '참치에 양파·마요네즈·간장을 섞어요.', '밥 위에 참치를 올려요.', '김을 부숴 올려 완성해요.'],
  },
  {
    id: 'tomato-pasta', name: '토마토 파스타', emoji: '🍝', timeMinutes: 20, difficulty: '쉬움', tags: ['양식', '면'],
    ingredients: [I('파스타면', 100, 'g'), I('토마토소스', 150, 'g'), I('양파', 0.3, '개'), I('마늘', 1, '큰술'), I('버섯', 0.3, '봉', { optional: true }), I('햄', 40, 'g', { optional: true })],
    steps: ['소금물에 면을 8분 삶아요.', '마늘·양파를 볶다가 버섯·햄을 넣어요.', '토마토소스와 면수 3큰술을 넣어요.', '면을 넣고 1분 버무려요.'],
  },
  {
    id: 'chicken-salad', name: '닭가슴살 샐러드', emoji: '🥗', timeMinutes: 10, difficulty: '쉬움', tags: ['샐러드', '초간단'],
    ingredients: [I('닭가슴살', 100, 'g'), I('상추', 5, '장', { substitute: '양배추' }), I('토마토', 1, '개', { optional: true }), I('오이', 0.5, '개', { optional: true }), I('파프리카', 0.5, '개', { optional: true })],
    steps: ['닭가슴살을 데우거나 구워 한입 크기로 썰어요.', '상추와 다른 채소를 씻어 물기를 빼고 한입 크기로 썰어요.', '그릇에 담고 좋아하는 드레싱을 곁들여요.'],
  },
  {
    id: 'tteokbokki', name: '떡볶이', emoji: '🌶️', timeMinutes: 20, difficulty: '쉬움', tags: ['분식'],
    ingredients: [I('떡', 200, 'g'), I('어묵', 2, '장'), I('고추장', 1.5, '큰술'), I('대파', 0.5, '대'), I('설탕', 1, '큰술'), I('고춧가루', 0.5, '큰술', { optional: true }), I('계란', 1, '개', { optional: true })],
    steps: ['물 300ml에 고추장·설탕·고춧가루를 풀어요.', '끓으면 떡과 어묵을 넣어요.', '국물이 졸아들 때까지 7분 끓여요.', '대파와 삶은 계란을 넣어요.'],
  },
  {
    id: 'bean-sprout-soup', name: '콩나물국', emoji: '🌱', timeMinutes: 15, difficulty: '쉬움', tags: ['국물', '한식'],
    ingredients: [I('콩나물', 150, 'g'), I('대파', 0.3, '대'), I('마늘', 0.5, '큰술'), I('청양고추', 1, '개', { optional: true })],
    steps: ['물 500ml에 콩나물을 넣고 뚜껑을 덮어 끓여요.', '끓으면 5분 더 끓이고 다진 마늘을 넣어요.', '소금으로 간하고 대파·고추를 넣어요.'],
  },
  {
    id: 'egg-toast', name: '계란토스트', emoji: '🍞', timeMinutes: 10, difficulty: '쉬움', tags: ['간편식', '아침'],
    ingredients: [I('식빵', 2, '장'), I('계란', 1, '개'), I('양배추', 0.1, '통', { optional: true }), I('치즈', 1, '장', { optional: true }), I('햄', 1, '장', { optional: true }), I('케첩', 1, '큰술', { optional: true }), I('설탕', 0.3, '큰술', { optional: true })],
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
    steps: ['양배추를 한입 크기로 썰어요.', '계란을 먼저 스크램블해 덜어 둬요.', '양배추와 대파를 숨이 죽을 때까지 볶아요.', '계란과 간장을 넣어 섞어요.'],
  },
  {
    id: 'udon', name: '어묵우동', emoji: '🍜', timeMinutes: 12, difficulty: '쉬움', tags: ['국물', '면'],
    ingredients: [I('우동면', 1, '봉'), I('어묵', 2, '장'), I('대파', 0.3, '대'), I('간장', 1, '큰술')],
    steps: ['물 400ml에 간장과 동봉 스프를 넣고 끓여요.', '어묵을 썰어 넣고 2분 끓여요.', '우동면을 넣고 2분 더 끓여요.', '대파를 올려요.'],
  },
  {
    id: 'mackerel', name: '고등어구이', emoji: '🐟', timeMinutes: 15, difficulty: '쉬움', tags: ['한식', '생선'],
    ingredients: [I('고등어', 1, '마리'), I('밥', 1, '공기', { optional: true })],
    steps: ['고등어 물기를 키친타월로 닦아요.', '팬에 기름을 두르고 껍질 쪽부터 5분 구워요.', '뒤집어 4분 더 구워 살이 하얗게 익으면 밥과 함께 차려요.'],
  },
  {
    id: 'shrimp-garlic', name: '새우 마늘볶음밥', emoji: '🦐', timeMinutes: 15, difficulty: '보통', tags: ['볶음'],
    ingredients: [I('밥', 1, '공기'), I('새우', 80, 'g'), I('마늘', 1, '큰술'), I('계란', 1, '개'), I('파프리카', 0.3, '개', { optional: true }), I('간장', 0.5, '큰술')],
    steps: ['해동한 새우의 물기를 빼요.', '마늘을 볶아 향을 내고 새우를 넣어요.', '계란을 스크램블하고 밥·파프리카를 넣어요.', '간장으로 간해요.'],
  },
  {
    id: 'mushroom-bulgogi', name: '버섯불고기', emoji: '🍄', timeMinutes: 25, difficulty: '보통', tags: ['한식'],
    ingredients: [I('소고기', 120, 'g'), I('버섯', 0.5, '봉'), I('양파', 0.3, '개'), I('간장', 2, '큰술'), I('설탕', 0.5, '큰술'), I('마늘', 0.5, '큰술'), I('참기름', 0.5, '큰술'), I('대파', 0.3, '대', { optional: true })],
    steps: ['간장·설탕·다진 마늘·참기름으로 양념을 만들어요.', '소고기를 양념에 15분 재워요.', '팬에 고기·양파·버섯을 함께 볶아요.', '대파를 넣어 마무리해요.'],
  },
  // ── B1: 레시피 확장(1인분 · 10분 · 전자레인지 · 냉동식품 활용) ──
  {
    id: 'soft-tofu-stew', name: '순두부찌개', emoji: '🍲', timeMinutes: 15, difficulty: '쉬움', tags: ['국물', '한식'],
    ingredients: [I('순두부', 1, '봉'), I('계란', 1, '개'), I('대파', 0.3, '대'), I('고춧가루', 1, '큰술'), I('간장', 0.5, '큰술'), I('바지락', 50, 'g', { optional: true }), I('돼지고기', 40, 'g', { optional: true, substitute: '참치캔' })],
    steps: ['냄비에 기름 1큰술과 고춧가루를 넣고 약불에서 30초 볶아 매운 기름을 내요(타지 않게).', '물 250ml와 간장을 넣고 끓으면 바지락·돼지고기를 넣고 고기가 다 익을 때까지 끓여요.', '순두부를 숟가락으로 크게 떠 넣고 3분 끓여요.', '계란을 깨 넣고 대파를 올려 1분 더 끓여요. 싱거우면 소금으로 맞춰요.'],
  },
  {
    id: 'seaweed-soup', name: '미역국', emoji: '🥣', timeMinutes: 25, difficulty: '쉬움', tags: ['국물', '한식'],
    ingredients: [I('미역', 5, 'g'), I('소고기', 50, 'g', { substitute: '참치캔' }), I('간장', 1, '큰술'), I('참기름', 0.5, '큰술'), I('마늘', 0.5, '큰술', { optional: true })],
    steps: ['마른 미역을 찬물에 10분 불린 뒤 물기를 짜고 한입 크기로 잘라요(5g이 불면 한 그릇 분량이 돼요).', '냄비에 참기름을 두르고 소고기를 볶다가 미역을 넣어 2분 더 볶아요.', '물 400ml를 붓고 중불에서 10분 끓여요.', '간장과 마늘로 간해요. 부족하면 소금 조금.'],
  },
  {
    id: 'radish-beef-soup', name: '소고기무국', emoji: '🍲', timeMinutes: 25, difficulty: '쉬움', tags: ['국물', '한식'],
    ingredients: [I('무', 0.15, '개'), I('소고기', 60, 'g'), I('대파', 0.3, '대'), I('간장', 1, '큰술'), I('참기름', 0.5, '큰술', { optional: true })],
    steps: ['무를 얇게 나박 썰어요(손바닥 반만큼).', '참기름에 소고기를 볶다가 무를 넣고 2분 더 볶아요.', '물 400ml를 붓고 무가 투명해질 때까지 12분 끓여요.', '간장으로 간하고 대파를 넣어요.'],
  },
  {
    id: 'squid-stir', name: '오징어볶음', emoji: '🦑', timeMinutes: 20, difficulty: '보통', tags: ['볶음', '한식'],
    ingredients: [I('오징어', 1, '마리'), I('양파', 0.5, '개'), I('고추장', 1, '큰술'), I('고춧가루', 0.5, '큰술'), I('대파', 0.3, '대'), I('설탕', 0.5, '큰술'), I('간장', 0.5, '큰술'), I('당근', 0.2, '개', { optional: true })],
    steps: ['오징어는 내장을 빼고 몸통에 칼집을 낸 뒤 한입 크기로 썰어요.', '고추장·고춧가루·설탕·간장 조금으로 양념을 만들어요.', '센불에 양파·당근을 1분 볶고 오징어와 양념을 넣어 2~3분만 볶아요(오래 볶으면 질겨져요).', '대파를 넣고 불을 꺼요.'],
  },
  {
    id: 'egg-soup', name: '계란국', emoji: '🥚', timeMinutes: 10, difficulty: '쉬움', tags: ['국물', '한식', '초간단'],
    ingredients: [I('계란', 2, '개'), I('대파', 0.3, '대'), I('간장', 0.5, '큰술'), I('액젓', 0.5, '큰술', { optional: true })],
    steps: ['물 400ml를 끓여요.', '간장(또는 액젓)으로 간해요.', '끓는 물에 푼 계란을 천천히 돌려 부어요. 바로 젓지 말고 10초 기다려요.', '대파를 넣고 불을 꺼요.'],
  },
  {
    id: 'kimchi-pancake', name: '김치전', emoji: '🥞', timeMinutes: 15, difficulty: '쉬움', tags: ['전', '한식'],
    ingredients: [I('김치', 100, 'g'), I('부침가루', 70, 'g'), I('양파', 0.2, '개', { optional: true }), I('청양고추', 1, '개', { optional: true })],
    steps: ['김치를 잘게 썰어요.', '부침가루에 물 100ml와 김치 국물 1큰술을 넣고 섞어요.', '김치·양파·송송 썬 고추를 넣고 반죽해요.', '기름을 넉넉히 두른 팬에 얇게 펴서 앞뒤로 3분씩 바삭하게 부쳐요.'],
  },
  {
    id: 'chive-pancake', name: '부추전', emoji: '🥞', timeMinutes: 15, difficulty: '쉬움', tags: ['전', '한식'],
    ingredients: [I('부추', 80, 'g', { substitute: '쪽파' }), I('부침가루', 70, 'g'), I('청양고추', 1, '개', { optional: true }), I('새우', 40, 'g', { optional: true })],
    steps: ['부추를 5cm 길이로 썰어요.', '부침가루에 찬물 100ml를 넣어 묽게 섞어요.', '부추·새우·송송 썬 고추를 넣어 살짝만 버무려요.', '기름 두른 팬에 얇게 펴 앞뒤로 3분씩 부쳐요.'],
  },
  {
    id: 'janchi-noodle', name: '잔치국수', emoji: '🍜', timeMinutes: 20, difficulty: '쉬움', tags: ['국물', '면', '한식'],
    ingredients: [I('소면', 90, 'g'), I('애호박', 0.2, '개', { optional: true }), I('계란', 1, '개', { optional: true }), I('간장', 1, '큰술'), I('멸치', 10, 'g', { optional: true }), I('김', 0.2, '봉', { optional: true })],
    steps: ['물 500ml에 멸치를 넣고 10분 끓여 건져 내고 간장으로 간해요(멸치가 없으면 간장·소금만).', '애호박을 채 썰어 국물에 1분 데쳐요.', '다른 냄비에 소면을 3분 삶아 찬물에 헹궈요.', '그릇에 면을 담고 국물을 붓고 계란 지단·김을 올려요.'],
  },
  {
    id: 'spicy-noodle', name: '비빔국수', emoji: '🍜', timeMinutes: 15, difficulty: '쉬움', tags: ['면', '한식'],
    ingredients: [I('소면', 90, 'g'), I('고추장', 1.5, '큰술'), I('오이', 0.3, '개', { optional: true }), I('김치', 50, 'g', { optional: true }), I('식초', 1, '큰술', { optional: true }), I('설탕', 0.5, '큰술'), I('참기름', 0.5, '큰술'), I('계란', 1, '개', { optional: true })],
    steps: ['고추장·식초·설탕·참기름으로 양념장을 만들어요.', '소면을 3분 삶아 찬물에 여러 번 헹궈 물기를 빼요.', '오이와 김치를 채 썰어요.', '면에 양념장과 채소를 넣고 비벼 삶은 계란을 올려요.'],
  },
  {
    id: 'curry-rice', name: '카레라이스', emoji: '🍛', timeMinutes: 25, difficulty: '쉬움', tags: ['덮밥'],
    ingredients: [I('밥', 1, '공기'), I('카레가루', 25, 'g'), I('감자', 0.5, '개'), I('양파', 0.5, '개'), I('당근', 0.3, '개', { optional: true }), I('돼지고기', 60, 'g', { optional: true, substitute: '닭가슴살' })],
    steps: ['감자·양파·당근·고기를 깍둑 썰어요.', '기름에 고기와 양파를 3분 볶다가 감자·당근을 넣어요.', '물 200ml를 붓고 감자가 익을 때까지 10분 끓여요.', '불을 줄이고 카레가루를 풀어 3분 저어 가며 끓인 뒤 밥에 올려요.'],
  },
  {
    id: 'dumpling-soup', name: '만두국', emoji: '🥟', timeMinutes: 15, difficulty: '쉬움', tags: ['국물', '냉동식품'],
    ingredients: [I('만두', 6, '개'), I('계란', 1, '개', { optional: true }), I('대파', 0.3, '대'), I('간장', 1, '큰술'), I('떡', 80, 'g', { optional: true })],
    steps: ['물 450ml에 간장을 넣고 끓여요.', '냉동 만두(와 떡)를 그대로 넣고 6분 끓여요.', '푼 계란을 둘러 넣고 대파를 올려요.', '소금으로 간을 맞춰요.'],
  },
  {
    id: 'microwave-egg', name: '전자레인지 계란찜', emoji: '🥚', timeMinutes: 5, difficulty: '쉬움', tags: ['반찬', '초간단', '전자레인지'],
    ingredients: [I('계란', 2, '개'), I('대파', 0.1, '대', { optional: true }), I('소금', 0.3, '작은술')],
    steps: ['전자레인지용 그릇에 계란 2개와 물 100ml, 소금을 넣고 잘 풀어요.', '송송 썬 대파를 넣어요.', '랩을 씌우고 구멍을 2~3개 뚫어요.', '전자레인지에 2분 30초 돌려요. 덜 익었으면 20초씩 더 돌려요.'],
  },
  {
    id: 'salmon-bowl', name: '연어덮밥', emoji: '🍣', timeMinutes: 10, difficulty: '쉬움', tags: ['덮밥', '초간단'],
    ingredients: [I('연어', 100, 'g'), I('밥', 1, '공기'), I('양파', 0.2, '개', { optional: true }), I('간장', 1, '큰술'), I('깻잎', 3, '장', { optional: true })],
    steps: ['양파는 얇게 썰어 찬물에 5분 담가 매운맛을 빼요.', '연어를 도톰하게 썰어요.', '밥 위에 깻잎·양파·연어를 올려요.', '간장을 곁들여 바로 먹어요.'],
  },
  {
    id: 'cream-pasta', name: '베이컨 크림파스타', emoji: '🍝', timeMinutes: 20, difficulty: '보통', tags: ['양식', '면'],
    ingredients: [I('파스타면', 90, 'g'), I('베이컨', 50, 'g', { substitute: '햄' }), I('우유', 200, 'ml'), I('치즈', 1, '장'), I('마늘', 0.5, '큰술', { optional: true }), I('버섯', 0.3, '봉', { optional: true })],
    steps: ['소금 넣은 물에 면을 봉지 시간보다 1분 짧게 삶아요.', '팬에 베이컨·마늘·버섯을 3분 볶아요.', '우유와 치즈를 넣고 약불에서 걸쭉해질 때까지 저어요(센불이면 우유가 분리돼요).', '면을 넣고 1분 버무린 뒤 후추로 마무리해요.'],
  },
  {
    id: 'tortilla-pizza', name: '또띠아 피자', emoji: '🍕', timeMinutes: 15, difficulty: '쉬움', tags: ['양식', '간편식'],
    ingredients: [I('또띠아', 1, '장'), I('토마토소스', 40, 'g', { substitute: '케첩' }), I('치즈', 2, '장'), I('햄', 30, 'g', { optional: true }), I('파프리카', 0.2, '개', { optional: true }), I('양파', 0.1, '개', { optional: true })],
    steps: ['또띠아에 토마토소스를 얇게 펴 발라요.', '햄·파프리카·양파를 올리고 치즈를 덮어요.', '프라이팬에 올려 뚜껑을 덮고 약불에서 6~8분 구워요(전자레인지는 2분, 바삭함은 덜해요).', '치즈가 녹으면 잘라서 먹어요.'],
  },
  {
    id: 'oatmeal', name: '오트밀 바나나죽', emoji: '🥣', timeMinutes: 5, difficulty: '쉬움', tags: ['간편식', '아침', '전자레인지', '초간단'],
    ingredients: [I('오트밀', 40, 'g'), I('우유', 150, 'ml', { substitute: '두유' }), I('바나나', 0.5, '개', { optional: true }), I('블루베리', 30, 'g', { optional: true })],
    steps: ['큰 그릇에 오트밀과 우유를 넣어요.', '전자레인지에 1분 30초 돌리고 한 번 저어요(넘칠 수 있어 큰 그릇이 좋아요).', '30초 더 돌려요.', '바나나·블루베리를 올려요.'],
  },
  {
    id: 'sprout-pork', name: '숙주 돼지고기볶음', emoji: '🥢', timeMinutes: 15, difficulty: '쉬움', tags: ['볶음'],
    ingredients: [I('숙주', 150, 'g', { substitute: '콩나물' }), I('돼지고기', 100, 'g'), I('굴소스', 1, '큰술', { substitute: '간장' }), I('대파', 0.3, '대', { optional: true }), I('마늘', 0.5, '큰술', { optional: true })],
    steps: ['숙주를 씻어 물기를 빼요.', '팬에 마늘·대파를 볶다가 돼지고기를 넣어 익혀요.', '굴소스로 간해요.', '숙주를 넣고 센불에서 30초만 볶아 아삭하게 마무리해요.'],
  },
  {
    id: 'eggplant-stir', name: '가지볶음', emoji: '🍆', timeMinutes: 15, difficulty: '쉬움', tags: ['반찬', '볶음'],
    ingredients: [I('가지', 1, '개'), I('간장', 1, '큰술'), I('대파', 0.3, '대'), I('마늘', 0.5, '큰술', { optional: true }), I('설탕', 0.3, '큰술', { optional: true })],
    steps: ['가지를 반 갈라 어슷 썰어요.', '팬에 기름을 두르고 대파·마늘을 볶아 향을 내요.', '가지를 넣고 중불에서 4분 볶아요(기름을 다 먹어도 더 넣지 말고 물 1큰술).', '간장·설탕을 넣고 1분 더 볶아요.'],
  },
  {
    id: 'broccoli-shrimp', name: '브로콜리 새우볶음', emoji: '🥦', timeMinutes: 15, difficulty: '쉬움', tags: ['볶음'],
    ingredients: [I('브로콜리', 0.5, '개'), I('새우', 80, 'g'), I('마늘', 0.5, '큰술'), I('굴소스', 1, '큰술', { substitute: '간장' }), I('밥', 1, '공기', { optional: true })],
    steps: ['브로콜리를 한입 크기로 잘라 끓는 물에 1분 데쳐요.', '팬에 마늘을 볶다가 새우를 넣어 색이 바뀔 때까지 볶아요.', '브로콜리와 굴소스를 넣고 1분 볶아요.', '밥 위에 올리면 덮밥이 돼요.'],
  },
  {
    id: 'tuna-riceball', name: '참치마요 주먹밥', emoji: '🍙', timeMinutes: 10, difficulty: '쉬움', tags: ['간편식', '초간단', '도시락'],
    ingredients: [I('밥', 1, '공기'), I('참치캔', 0.5, '캔'), I('마요네즈', 1, '큰술'), I('김', 0.3, '봉', { optional: true }), I('깻잎', 2, '장', { optional: true }), I('참기름', 0.3, '큰술')],
    steps: ['참치 기름을 빼고 마요네즈와 섞어요.', '밥에 참기름·소금 조금을 넣어 섞어요.', '밥을 손바닥에 펴고 참치마요를 넣어 동그랗게 뭉쳐요.', '부순 김에 굴리거나 깻잎으로 감싸요.'],
  },
  {
    id: 'frozen-rice-upgrade', name: '냉동볶음밥 한 끗 업그레이드', emoji: '🍳', timeMinutes: 10, difficulty: '쉬움', tags: ['볶음', '냉동식품', '초간단'],
    ingredients: [I('냉동볶음밥', 1, '봉'), I('계란', 1, '개'), I('김치', 40, 'g', { optional: true }), I('대파', 0.2, '대', { optional: true }), I('치즈', 1, '장', { optional: true })],
    steps: ['팬에 기름을 두르고 대파·김치를 1분 볶아요.', '냉동볶음밥을 넣고 중불에서 5분 볶아요.', '한쪽에 계란 프라이를 해요.', '치즈를 올려 녹이고 계란을 얹어요.'],
  },
  // ── B1 2차: 반찬·한 그릇·간단 아침 ──
  {
    id: 'mentaiko-avocado', name: '명란 아보카도 덮밥', emoji: '🥑', timeMinutes: 10, difficulty: '쉬움', tags: ['덮밥', '초간단'],
    ingredients: [I('밥', 1, '공기'), I('명란', 30, 'g'), I('아보카도', 0.5, '개'), I('참기름', 0.5, '큰술'), I('계란', 1, '개', { optional: true }), I('김', 0.2, '봉', { optional: true })],
    steps: ['아보카도를 반 갈라 씨를 빼고 얇게 썰어요(잘 익어 말랑한 것이 좋아요).', '명란은 껍질에 칼집을 내 속만 긁어내요.', '밥 위에 아보카도·명란을 올려요.', '참기름을 두르고 계란 노른자·김을 올려 비벼 먹어요.'],
  },
  {
    id: 'tomato-egg', name: '토마토 계란볶음', emoji: '🍅', timeMinutes: 10, difficulty: '쉬움', tags: ['볶음', '초간단'],
    ingredients: [I('토마토', 1, '개'), I('계란', 2, '개'), I('대파', 0.2, '대', { optional: true }), I('소금', 0.3, '작은술'), I('설탕', 0.3, '큰술', { optional: true })],
    steps: ['토마토를 한입 크기로 썰고 계란은 소금 조금 넣어 풀어요.', '센불에 계란을 반쯤 익혀 덜어 둬요.', '같은 팬에 대파·토마토를 1분 볶아 즙이 나오게 해요.', '계란을 다시 넣고 설탕·소금으로 간해 30초 섞어요.'],
  },
  {
    id: 'fishcake-stir', name: '어묵볶음', emoji: '🍢', timeMinutes: 10, difficulty: '쉬움', tags: ['반찬', '볶음', '초간단'],
    ingredients: [I('어묵', 3, '장'), I('양파', 0.3, '개'), I('간장', 1, '큰술'), I('올리고당', 0.5, '큰술', { substitute: '설탕' }), I('당근', 0.1, '개', { optional: true }), I('참깨', 0.3, '큰술', { optional: true })],
    steps: ['어묵을 길게 썰어 뜨거운 물을 한 번 부어 기름을 빼요.', '팬에 양파·당근을 1분 볶아요.', '어묵을 넣고 간장·올리고당·물 2큰술을 넣어 2분 볶아요.', '참깨를 뿌려 마무리해요. 냉장 3일 반찬으로 좋아요.'],
  },
  {
    id: 'potato-braise', name: '감자조림', emoji: '🥔', timeMinutes: 20, difficulty: '쉬움', tags: ['반찬'],
    ingredients: [I('감자', 2, '개'), I('간장', 2, '큰술'), I('올리고당', 1, '큰술', { substitute: '설탕' }), I('양파', 0.3, '개', { optional: true })],
    steps: ['감자를 깍둑 썰어 찬물에 5분 담가 전분을 빼요.', '냄비에 감자·양파·물 150ml·간장을 넣고 중불에서 10분 끓여요.', '국물이 반쯤 줄면 올리고당을 넣어요.', '뒤적이며 윤기가 날 때까지 3분 더 졸여요.'],
  },
  {
    id: 'spinach-namul', name: '시금치나물', emoji: '🥬', timeMinutes: 10, difficulty: '쉬움', tags: ['반찬', '초간단'],
    ingredients: [I('시금치', 150, 'g'), I('참기름', 0.5, '큰술'), I('소금', 0.3, '작은술'), I('마늘', 0.3, '큰술', { optional: true }), I('참깨', 0.3, '큰술', { optional: true })],
    steps: ['시금치 뿌리를 다듬고 깨끗이 씻어요.', '끓는 물에 소금 조금 넣고 30초만 데쳐요.', '찬물에 헹궈 물기를 꼭 짜요.', '참기름·소금·마늘·참깨로 조물조물 무쳐요.'],
  },
  {
    id: 'sprout-namul', name: '콩나물무침', emoji: '🌱', timeMinutes: 10, difficulty: '쉬움', tags: ['반찬', '초간단'],
    ingredients: [I('콩나물', 150, 'g'), I('참기름', 0.5, '큰술'), I('소금', 0.3, '작은술'), I('대파', 0.1, '대', { optional: true }), I('고춧가루', 0.3, '큰술', { optional: true })],
    steps: ['콩나물을 씻어 냄비에 물 100ml와 함께 넣고 뚜껑을 덮어요.', '중불에서 5분 익혀요(중간에 뚜껑을 열면 비린내가 나요).', '체에 밭쳐 한 김 식혀요.', '참기름·소금·대파(·고춧가루)로 무쳐요.'],
  },
  {
    id: 'rice-cake-soup', name: '떡국', emoji: '🥣', timeMinutes: 20, difficulty: '쉬움', tags: ['국물', '한식'],
    ingredients: [I('떡', 150, 'g'), I('계란', 1, '개'), I('대파', 0.3, '대'), I('간장', 1, '큰술'), I('소고기', 50, 'g', { optional: true }), I('김', 0.2, '봉', { optional: true }), I('참기름', 0.5, '큰술', { optional: true })],
    prep: '떡을 찬물에 10분 불려 두세요(냉동 떡은 20분).',
    steps: ['소고기를 참기름에 볶다가 물 450ml를 붓고 끓여요(고기가 없으면 물만).', '떡을 넣고 떠오를 때까지 4분 끓이고 간장으로 간해요.', '계란을 풀어 넣고 대파·김을 올려요.'],
  },
  {
    id: 'pork-cutlet-bowl', name: '돈까스 덮밥', emoji: '🍱', timeMinutes: 20, difficulty: '보통', tags: ['덮밥', '냉동식품'],
    ingredients: [I('돈까스', 1, '장'), I('밥', 1, '공기'), I('양파', 0.5, '개'), I('계란', 1, '개'), I('간장', 1, '큰술'), I('설탕', 0.5, '큰술'), I('대파', 0.2, '대', { optional: true })],
    steps: ['냉동 돈까스를 기름에 앞뒤로 4분씩 굽고 썰어요(에어프라이어 180도 12분도 좋아요).', '작은 팬에 물 100ml·간장·설탕·양파를 넣고 3분 끓여요.', '돈까스를 올리고 푼 계란을 둘러 뚜껑 덮고 1분.', '밥 위에 그대로 미끄러뜨려 올리고 대파를 뿌려요.'],
  },
  {
    id: 'chicken-teriyaki', name: '닭가슴살 간장덮밥', emoji: '🍗', timeMinutes: 15, difficulty: '쉬움', tags: ['덮밥', '고단백'],
    ingredients: [I('닭가슴살', 120, 'g'), I('밥', 1, '공기'), I('양파', 0.3, '개'), I('간장', 1.5, '큰술'), I('올리고당', 1, '큰술', { substitute: '설탕' }), I('대파', 0.2, '대', { optional: true })],
    steps: ['닭가슴살을 한입 크기로 썰어요.', '팬에 기름을 두르고 닭가슴살을 4분 익혀요.', '양파를 넣고 간장·올리고당·물 2큰술을 넣어 윤기 나게 졸여요.', '밥 위에 올리고 대파를 뿌려요.'],
  },
  {
    id: 'pho', name: '간단 쌀국수', emoji: '🍜', timeMinutes: 20, difficulty: '쉬움', tags: ['국물', '면'],
    ingredients: [I('쌀국수면', 80, 'g'), I('숙주', 80, 'g'), I('액젓', 1, '큰술', { substitute: '간장' }), I('양파', 0.2, '개', { optional: true }), I('소고기', 60, 'g', { optional: true }), I('레몬', 0.2, '개', { optional: true })],
    steps: ['쌀국수면을 미지근한 물에 15분 불려요.', '물 500ml에 액젓·소금으로 간한 국물을 끓이고 얇게 썬 소고기를 넣어 익혀요.', '불린 면을 끓는 물에 30초 데쳐 그릇에 담아요.', '숙주·양파를 올리고 뜨거운 국물을 부은 뒤 레몬을 짜요.'],
  },
  {
    id: 'spring-roll', name: '월남쌈', emoji: '🥗', timeMinutes: 20, difficulty: '쉬움', tags: ['샐러드', '채소'],
    ingredients: [I('라이스페이퍼', 6, '장'), I('파프리카', 0.5, '개'), I('오이', 0.5, '개'), I('맛살', 2, '개', { optional: true, substitute: '닭가슴살' }), I('깻잎', 4, '장', { optional: true }), I('칠리소스', 2, '큰술', { substitute: '간장' })],
    steps: ['파프리카·오이와 깻잎을 가늘게 채 썰어요.', '맛살도 길게 찢어요.', '라이스페이퍼를 따뜻한 물에 2초 담갔다 꺼내요.', '재료를 올려 돌돌 말고 칠리소스에 찍어 먹어요.'],
  },
  {
    id: 'naengmyeon', name: '물냉면', emoji: '🍜', timeMinutes: 10, difficulty: '쉬움', tags: ['면', '초간단'],
    ingredients: [I('냉면', 1, '봉'), I('오이', 0.3, '개', { optional: true }), I('계란', 1, '개', { optional: true }), I('식초', 1, '큰술', { optional: true })],
    prep: '동봉된 육수를 30분쯤 냉동실에 넣어 두면 살얼음이 생겨 더 시원해요.',
    steps: ['면을 풀어 끓는 물에 40초 삶아 찬물에 여러 번 헹궈요.', '오이를 채 썰고 삶은 계란을 반 갈라요.', '그릇에 면·육수·고명을 담고 식초를 둘러요.'],
  },
  {
    id: 'rabokki', name: '라볶이', emoji: '🌶️', timeMinutes: 15, difficulty: '쉬움', tags: ['분식'],
    ingredients: [I('라면', 1, '봉'), I('떡', 100, 'g'), I('고추장', 1.5, '큰술'), I('어묵', 1, '장', { optional: true }), I('대파', 0.3, '대', { optional: true }), I('설탕', 0.5, '큰술')],
    steps: ['물 400ml에 고추장·설탕을 풀어 끓여요.', '떡·어묵을 넣고 4분 끓여요.', '라면 사리를 넣고 2분 30초 끓여요(스프는 반만 넣어도 돼요).', '국물이 졸면 대파를 넣고 불을 꺼요.'],
  },
  {
    id: 'ramen-upgrade', name: '계란 파 라면', emoji: '🍜', timeMinutes: 7, difficulty: '쉬움', tags: ['면', '초간단'],
    ingredients: [I('라면', 1, '봉'), I('계란', 1, '개'), I('대파', 0.3, '대'), I('김치', 50, 'g', { optional: true }), I('콩나물', 50, 'g', { optional: true })],
    steps: ['물 550ml에 스프와 콩나물을 넣고 끓여요.', '면을 넣고 2분 끓여요.', '계란을 깨 넣고 젓지 말고 1분.', '대파를 듬뿍 올리고 김치를 곁들여요. 국물은 반만 마시면 나트륨이 줄어요.'],
  },
  {
    id: 'gambas', name: '감바스', emoji: '🍤', timeMinutes: 15, difficulty: '쉬움', tags: ['양식'],
    ingredients: [I('새우', 100, 'g'), I('마늘', 1.5, '큰술'), I('식용유', 5, '큰술'), I('청양고추', 1, '개', { optional: true }), I('식빵', 2, '장', { optional: true }), I('버섯', 0.3, '봉', { optional: true })],
    steps: ['새우 물기를 닦고 소금·후추를 뿌려요.', '작은 팬에 기름(올리브유면 더 좋아요)과 편 썬 마늘을 넣고 약불에서 3분 익혀 향을 내요.', '새우·버섯·고추를 넣고 새우가 붉어질 때까지 3분 익혀요.', '구운 식빵을 기름에 찍어 함께 먹어요.'],
  },
  {
    id: 'clam-kalguksu', name: '바지락 칼국수', emoji: '🍜', timeMinutes: 25, difficulty: '보통', tags: ['국물', '면'],
    ingredients: [I('칼국수면', 150, 'g'), I('바지락', 100, 'g'), I('애호박', 0.3, '개', { optional: true }), I('대파', 0.3, '대'), I('마늘', 0.5, '큰술', { optional: true }), I('간장', 0.5, '큰술')],
    prep: '바지락은 소금물에 담가 어두운 곳에서 30분 해감해 두세요(해감된 제품은 생략).',
    steps: ['바지락을 흐르는 물에 비벼 씻어요.', '물 600ml에 바지락을 넣고 입이 벌어질 때까지 끓여 건져요.', '면에 붙은 가루를 털고 국물에 넣어 5분 끓여요. 애호박도 함께.', '바지락을 다시 넣고 마늘·대파·간장으로 맞춰요.'],
  },
  {
    id: 'french-toast', name: '프렌치토스트', emoji: '🍞', timeMinutes: 10, difficulty: '쉬움', tags: ['간편식', '아침', '초간단'],
    ingredients: [I('식빵', 2, '장'), I('계란', 1, '개'), I('우유', 50, 'ml'), I('설탕', 0.5, '큰술', { optional: true }), I('버터', 10, 'g', { optional: true, substitute: '식용유' })],
    steps: ['계란·우유·설탕을 잘 섞어요.', '식빵을 앞뒤로 10초씩 담가 적셔요.', '약불에 버터를 녹이고 앞뒤로 2분씩 노릇하게 구워요.', '과일이나 잼을 곁들여요.'],
  },
  {
    id: 'yogurt-bowl', name: '요거트볼', emoji: '🥣', timeMinutes: 3, difficulty: '쉬움', tags: ['간편식', '아침', '초간단'],
    ingredients: [I('요거트', 1, '개'), I('시리얼', 30, 'g', { substitute: '오트밀' }), I('바나나', 0.5, '개', { optional: true }), I('블루베리', 30, 'g', { optional: true }), I('견과류', 10, 'g', { optional: true })],
    steps: ['그릇에 요거트를 담아요.', '바나나를 동그랗게 썰어 올려요.', '시리얼·블루베리·견과류를 뿌려요.', '바로 먹어야 시리얼이 바삭해요.'],
  },
  {
    id: 'tofu-kimchi', name: '두부김치', emoji: '🥢', timeMinutes: 15, difficulty: '쉬움', tags: ['한식', '볶음'],
    ingredients: [I('두부', 0.5, '모'), I('김치', 120, 'g'), I('돼지고기', 60, 'g', { optional: true }), I('대파', 0.2, '대', { optional: true }), I('설탕', 0.3, '큰술', { optional: true })],
    steps: ['두부를 끓는 물에 3분 데쳐 도톰하게 썰어요(전자레인지 1분도 괜찮아요).', '팬에 돼지고기를 볶다가 김치를 넣어 4분 볶아요.', '신 김치면 설탕을 조금 넣어요.', '접시에 두부를 두르고 가운데 김치볶음을 올려 대파를 뿌려요.'],
  },
  {
    id: 'quail-egg-braise', name: '메추리알 장조림', emoji: '🥚', timeMinutes: 20, difficulty: '쉬움', tags: ['반찬'],
    ingredients: [I('메추리알', 20, '개', { substitute: '계란' }), I('간장', 3, '큰술'), I('올리고당', 1, '큰술', { substitute: '설탕' }), I('마늘', 0.5, '큰술', { optional: true }), I('청양고추', 1, '개', { optional: true })],
    prep: '안 깐 메추리알은 7분 삶아 찬물에 담가 까 두세요.',
    steps: ['깐 메추리알을 찬물에 헹궈요.', '냄비에 간장·물 150ml·마늘·고추를 넣고 끓여요.', '메추리알을 넣고 중약불에서 12분 졸여요.', '올리고당을 넣고 2분 더 졸여요. 냉장 5일 반찬.'],
  },
  // ── 2026-11-24 보강: 양식·분식 (1인분, 정확도 점검 스크립트 통과 기준) ──
  {
    id: 'aglio-olio', name: '알리오 올리오', emoji: '🍝', timeMinutes: 15, difficulty: '쉬움', tags: ['양식', '면'],
    ingredients: [I('파스타면', 100, 'g'), I('마늘', 1.5, '큰술'), I('식용유', 3, '큰술'), I('청양고추', 1, '개', { optional: true })],
    steps: ['소금물에 파스타면을 8분 삶고, 면수 4큰술을 남겨 둬요.', '팬에 식용유(올리브유면 더 좋아요)와 마늘을 넣고 약불에서 2분, 타지 않게 향을 내요.', '고추를 송송 썰어 넣고 삶은 면과 면수를 넣어 1분 버무려요.', '소금·후추로 간해요.'],
  },
  {
    id: 'mushroom-risotto', name: '버섯 우유 리조또', emoji: '🥘', timeMinutes: 15, difficulty: '쉬움', tags: ['양식'],
    ingredients: [I('밥', 1, '공기'), I('버섯', 0.5, '봉'), I('양파', 0.3, '개'), I('우유', 150, 'ml'), I('치즈', 1, '장'), I('버터', 10, 'g', { optional: true, substitute: '식용유' })],
    steps: ['양파는 잘게 다지고 버섯은 한입 크기로 썰어요.', '팬에 버터를 녹여 양파를 2분, 버섯을 넣어 2분 볶아요.', '밥과 우유를 넣고 저어 가며 중약불에서 4분 졸여요.', '치즈를 올려 녹이고 소금·후추로 간해요.'],
  },
  {
    id: 'omurice', name: '오므라이스', emoji: '🍳', timeMinutes: 15, difficulty: '보통', tags: ['양식', '덮밥'],
    ingredients: [I('밥', 1, '공기'), I('계란', 2, '개'), I('양파', 0.3, '개'), I('케첩', 2, '큰술'), I('햄', 30, 'g', { optional: true })],
    steps: ['양파와 햄을 잘게 다져 기름 두른 팬에 2분 볶아요.', '밥과 케첩 1큰술을 넣어 고루 볶아 접시에 담아요.', '계란을 풀어 약불 팬에 얇게 펴고, 윗면이 살짝 익으면 볶음밥 위에 덮어요.', '남은 케첩을 뿌려요.'],
  },
  {
    id: 'chicken-steak', name: '닭가슴살 스테이크', emoji: '🍗', timeMinutes: 20, difficulty: '보통', tags: ['양식', '고단백'],
    ingredients: [I('닭가슴살', 150, 'g'), I('양파', 0.3, '개'), I('간장', 1, '큰술'), I('올리고당', 0.5, '큰술', { substitute: '설탕' }), I('버섯', 0.3, '봉', { optional: true })],
    steps: ['닭가슴살 두께를 고르게 펴고(두꺼우면 반으로 갈라요) 소금·후추를 뿌려요.', '기름 두른 팬에 중불로 앞뒤 4분씩, 뚜껑을 덮어 속까지 익혀요.', '닭을 덜어 두고 같은 팬에 양파·버섯을 2분 볶아요.', '간장·올리고당·물 3큰술을 넣어 1분 졸인 뒤 닭에 끼얹어요.'],
  },
  {
    id: 'eomuk-tang', name: '어묵탕', emoji: '🍢', timeMinutes: 20, difficulty: '쉬움', tags: ['분식', '국물'],
    ingredients: [I('어묵', 3, '장'), I('무', 0.1, '개'), I('대파', 0.3, '대'), I('간장', 1, '큰술'), I('청양고추', 1, '개', { optional: true })],
    steps: ['무를 얇게 나박 썰어 물 500ml에 넣고 10분 끓여요.', '어묵을 한입 크기로 썰어 넣고 5분 끓여요.', '간장으로 간하고 대파·고추를 썰어 넣어요.'],
  },
  {
    id: 'potato-pancake', name: '감자전', emoji: '🥔', timeMinutes: 20, difficulty: '보통', tags: ['전', '분식'],
    ingredients: [I('감자', 2, '개'), I('부침가루', 10, 'g', { optional: true }), I('식용유', 3, '큰술')],
    steps: ['감자 껍질을 벗겨 강판에 갈아요.', '체에 밭쳐 물기를 빼고, 바닥에 가라앉은 하얀 전분은 다시 섞어요(쫀득해져요). 부침가루와 소금 조금을 넣어요.', '식용유를 넉넉히 두른 팬에 얇게 펴서 중불에 앞뒤로 3분씩 바삭하게 부쳐요.'],
  },
  {
    id: 'gun-mandu', name: '군만두', emoji: '🥟', timeMinutes: 10, difficulty: '쉬움', tags: ['분식', '냉동식품'],
    ingredients: [I('만두', 6, '개'), I('식용유', 1, '큰술'), I('간장', 1, '큰술', { optional: true }), I('식초', 0.5, '큰술', { optional: true })],
    steps: ['팬에 식용유를 두르고 얼린 만두를 중불에서 2분, 바닥이 노릇해질 때까지 구워요.', '물 3큰술을 붓고 뚜껑을 덮어 4분 쪄요.', '뚜껑을 열고 남은 물을 날리며 1분 더 구워요.', '간장에 식초를 섞어 찍어 먹어요.'],
  },
  {
    id: 'tteok-kkochi', name: '떡꼬치', emoji: '🍡', timeMinutes: 15, difficulty: '쉬움', tags: ['분식'],
    ingredients: [I('떡', 150, 'g'), I('고추장', 1, '큰술'), I('케첩', 1, '큰술'), I('설탕', 0.5, '큰술'), I('식용유', 1, '큰술')],
    steps: ['굳은 떡은 끓는 물에 1분 데쳐 말랑하게 해요.', '식용유 두른 팬에 떡을 굴려 가며 4분 노릇하게 구워요.', '고추장·케첩·설탕·물 1큰술을 섞어 넣고 1분 버무려 졸여요.'],
  },
];

const NUTRITION_REF: Record<string, string> = {
  'egg-roll': '계란말이', 'tofu-braise': '두부조림', 'tuna-mayo': '참치마요덮밥', udon: '우동',
  'egg-toast': '토스트', 'bean-sprout-soup': '콩나물국', 'mushroom-bulgogi': '불고기', 'shrimp-garlic': '볶음밥',
  'microwave-egg': '계란찜', 'cream-pasta': '크림파스타', 'tortilla-pizza': '또띠아 피자', oatmeal: '오트밀죽',
  'sprout-pork': '숙주볶음', 'tuna-riceball': '참치 주먹밥', 'frozen-rice-upgrade': '냉동볶음밥',
  'chicken-teriyaki': '닭가슴살 덮밥', pho: '쌀국수', naengmyeon: '냉면', 'ramen-upgrade': '라면',
};

/**
 * 남은 음식 보관·다시 데우기·안전 팁.
 * 기준: 식약처 '조리 음식은 2시간 안에 냉장, 다시 데울 땐 속까지(75℃ 이상)', 고기·해산물 중심온도 75℃ 1분 이상.
 * 레시피 종류(태그)와 들어가는 재료로 정하고, 특별한 경우만 아래 KEEP_OVERRIDE로 바꾼다.
 */
const KEEP_OVERRIDE: Record<string, Partial<Pick<Recipe, 'leftover' | 'reheat'>>> = {
  'salmon-bowl': { leftover: '날생선이 들어가 남기지 말고 바로 먹어요', reheat: '' },
  'quail-egg-braise': { leftover: '식혀서 밀폐 용기에 담아 냉장 4~5일', reheat: '그대로 먹거나 전자레인지 30초' },
  'naengmyeon': { leftover: '면이 불어서 남기지 않는 게 좋아요. 육수만 냉장 2일', reheat: '' },
  'yogurt-bowl': { leftover: '시리얼이 눅눅해져요. 먹을 만큼만 만들어요', reheat: '' },
  'french-toast': { leftover: '식혀서 냉장 1일 · 냉동 2주', reheat: '팬이나 토스터에 앞뒤로 데워요' },
  'tuna-mayo': { leftover: '마요네즈가 들어가 바로 먹는 게 좋아요. 남으면 냉장 1일', reheat: '' },
  'tuna-riceball': { leftover: '실온에 두지 말고 냉장 1일 안에 먹어요(마요네즈)', reheat: '전자레인지 30초~1분' },
};

function keepOf(d: Draft): Pick<Recipe, 'leftover' | 'reheat' | 'safety'> {
  const t = new Set(d.tags);
  const has = (re: RegExp) => d.ingredients.some((i) => re.test(i.name));
  let leftover: string;
  let reheat: string;
  if (t.has('면') && t.has('국물')) {
    leftover = '면은 불어서 보관하기 어려워요. 국물만 따로 냉장 1~2일';
    reheat = '국물을 팔팔 끓인 뒤 면을 새로 넣어요';
  } else if (t.has('면')) {
    leftover = '면이 불어서 바로 먹는 게 좋아요. 남으면 냉장 1일';
    reheat = '물을 1~2큰술 뿌려 전자레인지나 팬에 데워요';
  } else if (t.has('국물')) {
    leftover = '식으면 바로 냉장 2일 · 한 번 먹을 양씩 냉동 2~3주';
    reheat = '먹을 만큼 덜어 팔팔 끓어오를 때까지 데워요';
  } else if (t.has('전')) {
    leftover = '식혀서 냉장 2일 · 한 장씩 랩에 싸 냉동 2주';
    reheat = '기름 없이 팬에 앞뒤로 데우면 다시 바삭해요';
  } else if (t.has('반찬')) {
    leftover = '식혀서 밀폐 용기에 냉장 3~4일 · 깨끗한 젓가락으로 덜어 먹어요';
    reheat = '그대로 먹거나 전자레인지에 살짝 데워요';
  } else if (t.has('샐러드')) {
    leftover = '드레싱·소스를 넣기 전이면 냉장 1일, 넣은 뒤엔 바로 먹어요';
    reheat = '';
  } else if (t.has('간편식') || t.has('아침')) {
    leftover = '만든 직후가 가장 맛있어요. 남으면 냉장 1일';
    reheat = '토스터나 팬에 살짝 데워요';
  } else {
    leftover = '식혀서 밀폐 용기에 냉장 1~2일';
    reheat = '전자레인지에 속까지 뜨겁게(1~2분, 중간에 한 번 섞기)';
  }
  const o = KEEP_OVERRIDE[d.id];
  if (o?.leftover !== undefined) leftover = o.leftover;
  if (o?.reheat !== undefined) reheat = o.reheat;
  if (!/바로 먹|남기지/.test(leftover)) leftover += ' · 조리 후 2시간 안에 냉장해요';

  const safety: string[] = [];
  if (has(/돼지|베이컨|오리/)) safety.push('돼지고기는 속까지 분홍빛이 없게 완전히 익혀요');
  if (has(/닭/)) safety.push('닭고기는 속살이 하얗고 육즙이 투명해질 때까지 익혀요(중심 75℃ 1분 이상)');
  if (has(/소고기/)) safety.push('다진 소고기는 속까지 갈색이 되게 익혀요');
  if (has(/새우|꽃게/)) safety.push('새우는 전체가 붉어지고 살이 하얗게 될 때까지 익혀요');
  if (has(/바지락|굴/)) safety.push('조개는 익혀도 입이 안 벌어진 것은 먹지 말고 버려요');
  if (has(/오징어|낙지/)) safety.push('오징어는 살이 하얗게 불투명해지면 다 익은 거예요');
  if (has(/고등어|꽁치|갈치|삼치/)) safety.push('생선은 살이 하얗고 뼈에서 쉽게 떨어질 때까지 구워요');
  if (has(/^만두$|돈까스|치킨너겟|동그랑땡|김말이/)) safety.push('냉동 제품은 속까지 뜨겁게 익혀요');
  if (has(/연어/)) safety.push('날로 먹는 연어는 생식용(회용) 표시가 있는 것만 써요');
  return { leftover, reheat: reheat || undefined, safety: safety.length ? safety : undefined };
}

export const BUILTIN_RECIPES: Recipe[] = DRAFTS.map((d) => {
  const ref = findFoodReference(NUTRITION_REF[d.id] ?? d.name);
  // 식약처 식품영양성분 DB 값이 있으면 그걸 쓰고, 없으면 기존 추정값
  const db = NUTRITION_DB[d.id];
  return {
    ...d,
    ...keepOf(d),
    nutritionSource: db ? { kind: 'mfds', dbName: db.dbName, servingGram: db.servingGram } : ref ? { kind: 'estimate' } : undefined,
    servings: 1,
    origin: 'builtin',
    nutrition: db?.nutrition ?? ref?.nutrition,
    allergens: allergensOf(d.ingredients.map((i) => i.name)),
  };
});
