import type { NutritionInfo, StorageType } from './types';

/**
 * 식재료 기본 정보 사전.
 * 등록할 때 이모지·분류·기본 단위를 자동으로 채워 입력을 줄이기 위한 것.
 * 보관 방법은 "추천값"일 뿐 사용자가 바꿀 수 있고, 소비기한은 여기서 정하지 않는다(기획 원칙).
 * 가격은 아낀 금액을 보여 주기 위한 대략적인 참고값이다.
 */
export interface CatalogEntry {
  name: string;
  aliases?: string[];
  emoji: string;
  category: string;
  storage: StorageType;
  unit: string;
  avgPrice?: number; // 단위당 대략 가격(원)
}

export const INGREDIENT_CATALOG: CatalogEntry[] = [
  { name: '계란', aliases: ['달걀'], emoji: '🥚', category: '유제품·계란', storage: 'fridge', unit: '개', avgPrice: 300 },
  { name: '우유', emoji: '🥛', category: '유제품·계란', storage: 'fridge', unit: 'ml', avgPrice: 3 },
  { name: '치즈', aliases: ['슬라이스치즈'], emoji: '🧀', category: '유제품·계란', storage: 'fridge', unit: '장', avgPrice: 400 },
  { name: '두부', emoji: '🧈', category: '콩·두부', storage: 'fridge', unit: '모', avgPrice: 1500 },
  { name: '대파', aliases: ['파'], emoji: '🌿', category: '채소', storage: 'fridge', unit: '대', avgPrice: 700 },
  { name: '양파', emoji: '🧅', category: '채소', storage: 'pantry', unit: '개', avgPrice: 600 },
  { name: '마늘', aliases: ['다진마늘'], emoji: '🧄', category: '채소', storage: 'fridge', unit: '큰술', avgPrice: 200 },
  { name: '감자', emoji: '🥔', category: '채소', storage: 'pantry', unit: '개', avgPrice: 700 },
  { name: '당근', emoji: '🥕', category: '채소', storage: 'fridge', unit: '개', avgPrice: 800 },
  { name: '애호박', aliases: ['호박'], emoji: '🥒', category: '채소', storage: 'fridge', unit: '개', avgPrice: 1500 },
  { name: '오이', emoji: '🥒', category: '채소', storage: 'fridge', unit: '개', avgPrice: 800 },
  { name: '양배추', emoji: '🥬', category: '채소', storage: 'fridge', unit: '통', avgPrice: 3000 },
  { name: '상추', emoji: '🥬', category: '채소', storage: 'fridge', unit: '장', avgPrice: 100 },
  { name: '시금치', emoji: '🥬', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 15 },
  { name: '버섯', aliases: ['느타리버섯', '팽이버섯', '표고버섯', '새송이버섯'], emoji: '🍄', category: '채소', storage: 'fridge', unit: '봉', avgPrice: 1500 },
  { name: '토마토', aliases: ['방울토마토'], emoji: '🍅', category: '채소', storage: 'fridge', unit: '개', avgPrice: 900 },
  { name: '파프리카', aliases: ['피망'], emoji: '🫑', category: '채소', storage: 'fridge', unit: '개', avgPrice: 1200 },
  { name: '청양고추', aliases: ['고추'], emoji: '🌶️', category: '채소', storage: 'fridge', unit: '개', avgPrice: 200 },
  { name: '콩나물', emoji: '🌱', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 5 },
  { name: '김치', aliases: ['배추김치'], emoji: '🥬', category: '반찬', storage: 'fridge', unit: 'g', avgPrice: 8 },
  { name: '돼지고기', aliases: ['삼겹살', '앞다리살', '목살', '돼지고기 다짐육'], emoji: '🥩', category: '육류', storage: 'fridge', unit: 'g', avgPrice: 20 },
  { name: '소고기', aliases: ['다진소고기', '불고기용 소고기'], emoji: '🥩', category: '육류', storage: 'fridge', unit: 'g', avgPrice: 40 },
  { name: '닭가슴살', aliases: ['닭고기', '닭다리살'], emoji: '🍗', category: '육류', storage: 'freezer', unit: 'g', avgPrice: 12 },
  { name: '햄', aliases: ['스팸', '소시지'], emoji: '🥓', category: '가공식품', storage: 'fridge', unit: 'g', avgPrice: 15 },
  { name: '참치캔', aliases: ['참치'], emoji: '🐟', category: '가공식품', storage: 'pantry', unit: '캔', avgPrice: 2500 },
  { name: '어묵', emoji: '🍢', category: '가공식품', storage: 'fridge', unit: '장', avgPrice: 500 },
  { name: '새우', aliases: ['냉동새우'], emoji: '🦐', category: '해산물', storage: 'freezer', unit: 'g', avgPrice: 25 },
  { name: '고등어', emoji: '🐟', category: '해산물', storage: 'freezer', unit: '마리', avgPrice: 4000 },
  { name: '밥', aliases: ['즉석밥', '햇반', '쌀밥'], emoji: '🍚', category: '곡류', storage: 'pantry', unit: '공기', avgPrice: 1200 },
  { name: '쌀', emoji: '🌾', category: '곡류', storage: 'pantry', unit: 'g', avgPrice: 4 },
  { name: '라면', emoji: '🍜', category: '곡류', storage: 'pantry', unit: '봉', avgPrice: 900 },
  { name: '파스타면', aliases: ['스파게티면'], emoji: '🍝', category: '곡류', storage: 'pantry', unit: 'g', avgPrice: 6 },
  { name: '식빵', aliases: ['빵'], emoji: '🍞', category: '곡류', storage: 'pantry', unit: '장', avgPrice: 300 },
  { name: '떡', aliases: ['떡볶이떡'], emoji: '🍡', category: '곡류', storage: 'fridge', unit: 'g', avgPrice: 8 },
  { name: '우동면', emoji: '🍜', category: '곡류', storage: 'fridge', unit: '봉', avgPrice: 1000 },
  { name: '고추장', emoji: '🫙', category: '양념', storage: 'fridge', unit: '큰술', avgPrice: 100 },
  { name: '된장', emoji: '🫙', category: '양념', storage: 'fridge', unit: '큰술', avgPrice: 100 },
  { name: '간장', emoji: '🫙', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 50 },
  { name: '고춧가루', emoji: '🌶️', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 100 },
  { name: '참기름', emoji: '🫗', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 150 },
  { name: '설탕', emoji: '🧂', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 20 },
  { name: '토마토소스', aliases: ['파스타소스'], emoji: '🥫', category: '양념', storage: 'fridge', unit: 'g', avgPrice: 10 },
  { name: '사과', emoji: '🍎', category: '과일', storage: 'fridge', unit: '개', avgPrice: 1500 },
  { name: '바나나', emoji: '🍌', category: '과일', storage: 'pantry', unit: '개', avgPrice: 500 },
  { name: '요거트', aliases: ['요구르트'], emoji: '🥣', category: '유제품·계란', storage: 'fridge', unit: '개', avgPrice: 1000 },
  { name: '김', aliases: ['조미김'], emoji: '🟩', category: '반찬', storage: 'pantry', unit: '봉', avgPrice: 500 },
];

const norm = (s: string) => s.replace(/\s/g, '').toLowerCase();

/** 이름으로 사전 항목 찾기(별칭 포함, 부분 일치 허용). */
export function findCatalog(name: string): CatalogEntry | undefined {
  const n = norm(name);
  if (!n) return undefined;
  return (
    INGREDIENT_CATALOG.find((c) => norm(c.name) === n || c.aliases?.some((a) => norm(a) === n)) ??
    INGREDIENT_CATALOG.find(
      (c) => n.includes(norm(c.name)) || c.aliases?.some((a) => n.includes(norm(a))),
    )
  );
}

/** 재고 이름과 레시피 재료 이름이 같은 재료인지 판단(예: "삼겹살" = "돼지고기"). */
export function sameIngredient(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true;
  const ca = findCatalog(a);
  const cb = findCatalog(b);
  return !!ca && !!cb && ca.name === cb.name;
}

/** 양념처럼 대부분의 집에 있고 수량 관리가 어려운 재료(부족 재료 계산에서 '선택'으로 취급). */
export const PANTRY_STAPLES = ['소금', '후추', '설탕', '식용유', '간장', '참기름', '물', '깨', '다진마늘', '마늘'];

/**
 * 자주 먹는 음식의 1인분 참고 영양값.
 * 출처: 일반적인 1인분 기준 대략치(검증 데이터 아님) → 화면에 항상 "참고값(추정)"으로 표시한다.
 * TODO(출시 전): 식품의약품안전처 식품영양성분 DB(공공데이터포털, 무료)로 교체하고 'verified'로 표시.
 */
export interface FoodReference {
  name: string;
  aliases?: string[];
  nutrition: NutritionInfo;
  vegetableServings: number;
  ingredients: string[];
  tags: string[]; // 국물, 가공식품, 튀김 ...
}

const N = (
  calories: number,
  protein: number,
  carbohydrates: number,
  fat: number,
  sodium: number,
  fiber: number,
  sugar: number,
): NutritionInfo => ({ calories, protein, carbohydrates, fat, sodium, fiber, sugar });

export const FOOD_REFERENCES: FoodReference[] = [
  { name: '김치찌개', nutrition: N(320, 18, 14, 20, 1800, 3, 4), vegetableServings: 1, ingredients: ['김치', '돼지고기', '두부', '대파'], tags: ['국물', '한식'] },
  { name: '된장찌개', nutrition: N(180, 12, 14, 8, 1500, 4, 4), vegetableServings: 1.5, ingredients: ['된장', '두부', '애호박', '양파'], tags: ['국물', '한식'] },
  { name: '계란볶음밥', aliases: ['볶음밥'], nutrition: N(520, 16, 72, 18, 900, 2, 3), vegetableServings: 0.5, ingredients: ['밥', '계란', '대파'], tags: ['볶음', '한식'] },
  { name: '김치볶음밥', nutrition: N(560, 15, 78, 20, 1300, 3, 5), vegetableServings: 0.5, ingredients: ['밥', '김치', '계란'], tags: ['볶음', '한식'] },
  { name: '라면', aliases: ['신라면', '컵라면'], nutrition: N(500, 10, 79, 16, 1790, 3, 4), vegetableServings: 0, ingredients: ['라면'], tags: ['국물', '가공식품', '면'] },
  { name: '비빔밥', nutrition: N(560, 18, 85, 15, 1000, 6, 8), vegetableServings: 2.5, ingredients: ['밥', '계란', '시금치', '콩나물', '당근', '고추장'], tags: ['한식'] },
  { name: '제육볶음', nutrition: N(480, 28, 18, 32, 1300, 2, 12), vegetableServings: 1, ingredients: ['돼지고기', '양파', '고추장', '대파'], tags: ['볶음', '한식'] },
  { name: '불고기', nutrition: N(420, 30, 18, 24, 1000, 1, 12), vegetableServings: 0.5, ingredients: ['소고기', '양파', '간장'], tags: ['한식'] },
  { name: '닭가슴살 샐러드', aliases: ['샐러드'], nutrition: N(300, 32, 14, 12, 500, 5, 6), vegetableServings: 3, ingredients: ['닭가슴살', '양상추', '토마토'], tags: ['샐러드'] },
  { name: '떡볶이', nutrition: N(480, 9, 96, 5, 1500, 3, 18), vegetableServings: 0.3, ingredients: ['떡', '어묵', '고추장', '대파'], tags: ['분식'] },
  { name: '김밥', nutrition: N(480, 13, 78, 12, 1100, 3, 5), vegetableServings: 1, ingredients: ['밥', '김', '계란', '당근', '햄'], tags: ['분식'] },
  { name: '토마토 파스타', aliases: ['파스타', '스파게티'], nutrition: N(600, 18, 92, 16, 900, 5, 10), vegetableServings: 1, ingredients: ['파스타면', '토마토소스', '양파', '마늘'], tags: ['양식', '면'] },
  { name: '치킨', aliases: ['후라이드치킨', '양념치킨'], nutrition: N(900, 55, 40, 58, 1900, 1, 8), vegetableServings: 0, ingredients: ['닭고기'], tags: ['튀김', '배달'] },
  { name: '피자', nutrition: N(750, 30, 80, 32, 1600, 4, 8), vegetableServings: 0.5, ingredients: ['밀가루', '치즈', '토마토소스'], tags: ['배달', '양식'] },
  { name: '햄버거', aliases: ['버거'], nutrition: N(600, 28, 50, 30, 1100, 3, 9), vegetableServings: 0.5, ingredients: ['빵', '소고기', '양상추'], tags: ['패스트푸드'] },
  { name: '짜장면', nutrition: N(800, 20, 120, 25, 2300, 5, 15), vegetableServings: 0.5, ingredients: ['면', '돼지고기', '양파'], tags: ['중식', '면', '배달'] },
  { name: '편의점 도시락', aliases: ['도시락'], nutrition: N(750, 25, 100, 26, 1700, 3, 10), vegetableServings: 0.5, ingredients: ['밥', '햄'], tags: ['가공식품'] },
  { name: '삼각김밥', nutrition: N(200, 5, 38, 3, 500, 1, 2), vegetableServings: 0, ingredients: ['밥', '김'], tags: ['가공식품'] },
  { name: '토스트', aliases: ['계란토스트'], nutrition: N(380, 14, 40, 18, 650, 2, 8), vegetableServings: 0.3, ingredients: ['식빵', '계란', '양배추'], tags: ['간편식'] },
  { name: '시리얼', nutrition: N(250, 8, 42, 5, 250, 3, 14), vegetableServings: 0, ingredients: ['시리얼', '우유'], tags: ['간편식'] },
  { name: '요거트', nutrition: N(120, 6, 16, 3, 70, 0, 12), vegetableServings: 0, ingredients: ['요거트'], tags: ['간식'] },
  { name: '사과', nutrition: N(95, 0.5, 25, 0.3, 2, 4, 19), vegetableServings: 1, ingredients: ['사과'], tags: ['과일'] },
  { name: '바나나', nutrition: N(105, 1.3, 27, 0.4, 1, 3, 14), vegetableServings: 1, ingredients: ['바나나'], tags: ['과일'] },
  { name: '계란말이', nutrition: N(220, 14, 3, 16, 450, 0.5, 1), vegetableServings: 0.3, ingredients: ['계란', '대파', '당근'], tags: ['반찬'] },
  { name: '두부조림', nutrition: N(210, 15, 9, 13, 800, 2, 4), vegetableServings: 0.3, ingredients: ['두부', '간장', '대파'], tags: ['반찬'] },
  { name: '참치마요덮밥', nutrition: N(620, 22, 80, 22, 900, 1, 4), vegetableServings: 0.3, ingredients: ['밥', '참치캔', '김'], tags: ['덮밥'] },
  { name: '콩나물국', nutrition: N(60, 5, 6, 2, 900, 2, 1), vegetableServings: 1, ingredients: ['콩나물', '대파', '마늘'], tags: ['국물', '한식'] },
  { name: '어묵탕', nutrition: N(250, 13, 26, 9, 1700, 1, 5), vegetableServings: 0.5, ingredients: ['어묵', '무', '대파'], tags: ['국물', '가공식품'] },
  { name: '우동', nutrition: N(450, 13, 85, 5, 2000, 2, 5), vegetableServings: 0.3, ingredients: ['우동면', '어묵', '대파'], tags: ['국물', '면'] },
  { name: '고등어구이', nutrition: N(350, 30, 0, 25, 600, 0, 0), vegetableServings: 0, ingredients: ['고등어'], tags: ['한식', '생선'] },
];

export function findFoodReference(name: string): FoodReference | undefined {
  const n = norm(name);
  if (!n) return undefined;
  return (
    FOOD_REFERENCES.find((f) => norm(f.name) === n || f.aliases?.some((a) => norm(a) === n)) ??
    FOOD_REFERENCES.find(
      (f) => n.includes(norm(f.name)) || f.aliases?.some((a) => n.includes(norm(a))),
    )
  );
}

/** 알레르기 선택지(식품 알레르기 표시 대상 기준 일부). */
export const ALLERGEN_OPTIONS = ['계란', '우유', '밀', '대두', '땅콩', '견과류', '갑각류', '생선', '돼지고기', '소고기', '닭고기', '복숭아', '토마토'];

/** 재료 이름 → 알레르기 분류. 레시피 추천 전에 항상 이걸로 걸러낸다. */
const ALLERGEN_MAP: Record<string, string[]> = {
  계란: ['계란', '달걀', '마요네즈'],
  우유: ['우유', '치즈', '버터', '요거트', '생크림'],
  밀: ['밀가루', '식빵', '빵', '라면', '파스타면', '우동면', '짜장', '간장', '부침가루', '면'],
  대두: ['두부', '된장', '간장', '콩'],
  땅콩: ['땅콩'],
  견과류: ['호두', '아몬드', '잣', '캐슈넛'],
  갑각류: ['새우', '게', '랍스터'],
  생선: ['고등어', '참치', '어묵', '멸치', '연어'],
  돼지고기: ['돼지고기', '삼겹살', '햄', '스팸', '소시지', '베이컨'],
  소고기: ['소고기'],
  닭고기: ['닭가슴살', '닭고기', '닭다리살'],
  복숭아: ['복숭아'],
  토마토: ['토마토', '토마토소스'],
};

export function allergensOf(ingredientNames: string[]): string[] {
  const found = new Set<string>();
  for (const [allergen, words] of Object.entries(ALLERGEN_MAP)) {
    if (ingredientNames.some((n) => words.some((w) => norm(n).includes(norm(w))))) found.add(allergen);
  }
  return [...found];
}
