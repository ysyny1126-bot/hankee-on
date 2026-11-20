/**
 * 한끼온 공용 데이터 구조.
 * 모든 화면(냉장고·요리·식단·식사기록·리포트)이 이 한 가지 구조를 함께 읽고 쓴다.
 * 기획서 7장의 테이블(Meal Records, Meal Items, Dietary Goals, Food Preferences, Dietary Reports)과 이름을 맞췄다.
 */

export type StorageType = 'fridge' | 'freezer' | 'pantry'; // 냉장 · 냉동 · 실온
export type IngredientLocation = 'fridge' | 'outside'; // 냉장고 안 · 냉장고 밖(찬장, 베란다 등)

/** 데이터 출처: 사용자가 확인했는지, AI가 추정했는지를 항상 구분한다. */
export type DataSource = 'user' | 'ai_estimated' | 'reference_estimated' | 'verified';

export interface Ingredient {
  id: string;
  name: string;
  category: string; // 채소, 육류, 유제품 ...
  emoji: string;
  quantity: number;
  unit: string; // 개, g, ml, 봉 ...
  storage: StorageType;
  location: IngredientLocation;
  /** 소비기한(YYYY-MM-DD). 사용자가 입력·확인한 값만 저장한다. 모르면 null. */
  expiryDate: string | null;
  expirySource: 'user' | 'package' | null; // 직접 입력 · 포장지에서 읽음
  price?: number; // 구매 가격(원), 아낀 금액 계산용
  addedAt: string; // ISO
  lastUsedAt: string | null; // 마지막으로 요리에 쓴 시각
  source: DataSource; // 등록 경로(직접 입력 또는 AI 인식 후 사용자 확인)
  /** 'leftover' = 요리하고 남은 음식(재료 비교에는 쓰지 않음) */
  kind?: 'ingredient' | 'leftover';
  recipeId?: string; // 남은 음식이면 어떤 레시피에서 나왔는지
  /** 기한이 지난 뒤 사용자가 '아직 괜찮아요'라고 확인한 날(YYYY-MM-DD). 기한 자체는 바꾸지 않는다 */
  expiryCheckedOn?: string;
  /** 아주 적게 남았지만 사용자가 '남겨 두기'를 고름 → 정리 안내를 다시 하지 않음 */
  keepSmall?: boolean;
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  optional?: boolean;
  substitute?: string; // 대체 재료
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  servings: number; // 기본 1인분
  timeMinutes: number;
  difficulty: '쉬움' | '보통' | '어려움';
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: string[]; // 국물, 볶음, 한식 ...
  /** 1인분 기준 참고 영양값(추정). */
  nutrition?: NutritionInfo;
  allergens: string[]; // 계란, 우유, 땅콩, 밀, 대두, 갑각류 ...
  origin: 'builtin' | 'ai_photo' | 'user';
  createdAt?: string;
  videoQuery?: string; // 조리 영상 검색어
  features?: string; // AI가 분석한 음식 특징
  aiConfidence?: 'high' | 'medium' | 'low';
  imageUri?: string; // 분석에 쓴 음식 사진
}

export interface NutritionInfo {
  calories: number;
  protein: number; // g
  carbohydrates: number; // g
  fat: number; // g
  sodium: number; // mg
  fiber: number; // g
  sugar: number; // g
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealSourceType = 'home' | 'delivery' | 'eat_out' | 'convenience'; // 집밥 · 배달 · 외식 · 편의점

export interface MealItem {
  id: string;
  foodName: string;
  quantity: number;
  unit: string; // 인분, g, 개 ...
  nutrition: NutritionInfo | null;
  /** 영양값의 근거. 사진만으로 확정하지 않는다. */
  dataConfidence: 'high' | 'medium' | 'low' | 'none';
  nutritionSource: DataSource | null;
  vegetableServings?: number; // 채소 섭취 대략치(접시 수)
  ingredients?: string[]; // 다양성 분석용 주재료
}

export interface MealRecord {
  id: string;
  mealDate: string; // YYYY-MM-DD
  mealType: MealType;
  mealTime: string; // HH:MM
  imageUri: string | null;
  description: string; // 메모
  sourceType: MealSourceType;
  recipeId?: string; // 직접 요리한 경우 연결된 레시피
  items: MealItem[];
  createdAt: string;
}

export type GoalType =
  | 'variety' // 다양한 식재료
  | 'regular_meals' // 규칙적인 식사
  | 'vegetables' // 채소·과일 늘리기
  | 'less_waste' // 음식물 낭비 줄이기
  | 'budget' // 식비 관리
  | 'home_cooking' // 집밥 늘리기
  | 'custom';

export interface DietaryGoal {
  id: string;
  goalType: GoalType;
  title: string;
  targetValue: number; // 주간 목표값(의미는 goalType별로 다름)
  unit: string;
  startDate: string;
  endDate: string | null;
  status: 'active' | 'done' | 'paused';
}

export interface FoodPreferences {
  nickname: string;
  characterId?: string; // 선택한 캐릭터(constants/characters.ts)
  preferredFoods: string[];
  dislikedFoods: string[];
  allergies: string[];
  dietaryRestrictions: string[];
  weeklyBudget: number | null; // 원
  maxCookMinutes: number; // 평일 조리 가능 시간
  cookingSkill: '초보' | '보통' | '능숙';
  householdSize: number;

  // ── 온보딩 프로필(모두 '대략적인 값'으로 시작, 설정에서 언제든 수정) ──
  /** 생활 유형 id 목록(constants/profile.ts). 여러 개 고를 수 있고, 추천의 기본값으로만 쓴다. */
  lifestyles: string[];
  /** 월간 식비(원). 구간을 고르면 구간의 대표값, 직접 입력하면 그 값. 모르면 null */
  monthlyBudget: number | null;
  budgetBand: string | null; // 고른 구간 id(직접 입력이면 'custom')
  fridgeSize: FridgeSize | null;
  fridgeSpace: FridgeSpace | null;
  /** 홈을 '오늘 한 끼' 중심으로 볼지, '이번 주 식단' 중심으로 볼지 */
  planHabit: 'today' | 'week';
  /** AI 코치 말투(constants/profile.ts). 캐릭터 외형(characterId)과는 따로 고른다. */
  coachId: string;
  /** 고른 목표(예시 선택 + 직접 입력). 비워도 앱은 모두 쓸 수 있다. */
  profileGoals: string[];
  /** 알레르기·기피 음식을 '나중에 설정'으로 넘겼는지 */
  restrictionsLater: boolean;
  /** 실제 냉장고 사진(이 기기에만 저장). showFridgePhoto가 켜져 있을 때만 홈에 보인다. */
  fridgePhotoUri: string | null;
  showFridgePhoto: boolean;
  /** 맞춤 영양 계산용 신체 정보(선택). 가입 때 묻지 않는다. */
  body: BodyInfo | null;
}

export type FridgeSize = 'mini' | 'single' | 'standard' | 'large';
export type FridgeSpace = 'full' | 'some' | 'lots';

export interface BodyInfo {
  heightCm: number | null;
  weightKg: number | null;
  birthYear: number | null;
  updatedAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: number | null;
  unit: string;
  reason: string; // 왜 담겼는지 (예: "김치찌개 부족 재료")
  recipeId?: string;
  done: boolean;
  createdAt: string;
}

export interface WasteRecord {
  id: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  price?: number;
  reason: 'expired' | 'spoiled' | 'other';
  date: string; // YYYY-MM-DD
}

/** 재료를 들일 때의 지출 기록. 재료를 다 먹어도 남는다(식비는 '산 시점' 기준) */
export interface SpendRecord {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  amount: number; // 원
  estimated: boolean; // true = 가격을 안 적어서 재료 사전 평균가로 추정
}

export type CookRating = 'good' | 'ok' | 'bad'; // 😋 맛있어요 · 🙂 괜찮아요 · 😕 별로

export interface CookRecord {
  id: string;
  recipeId: string;
  recipeName: string;
  date: string;
  usedIngredients: { name: string; amount: number; unit: string }[];
  rating?: CookRating; // 요리 후 맛 평가(다음 추천에 반영)
  servingsMade?: number; // 만든 양(인분)
  servingsEaten?: number; // 먹은 양 — 차이만큼 남은 음식
}

export interface MealPlanEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  recipeId: string;
  reason: string; // 추천 이유
  /** A3: 'done' = 이 끼니를 실제로 먹고 기록함(mealId로 연결) */
  status?: 'done';
  mealId?: string;
  /** A5: 남은 음식으로 채운 끼니(냉장고의 남은 음식 id) */
  leftoverId?: string;
}

export interface NotificationSettings {
  expiry: boolean; // 소비기한 임박
  unusedIngredient: boolean; // 오래 안 쓴 재료
  menuSuggestion: boolean; // 오늘의 메뉴
  shopping: boolean; // 장보기 제안
  mealReminder: boolean; // 식사 기록 리마인더
  mealReminderTimes: string[]; // 'HH:MM' 목록
  expiryDaysBefore: number; // 며칠 전에 알릴지
  maxPerDay: number; // 하루 최대 알림 수
}

export interface Consents {
  /** 식생활 기록을 개인화(기억하는 AI)에 쓰는 데 동의 */
  personalization: boolean;
  /** 사진·기록을 외부 AI(Gemini)로 보내 분석하는 데 동의 */
  externalAI: boolean;
  /** 알레르기 등 건강 관련 정보 저장에 동의 */
  healthInfo: boolean;
  agreedAt: string | null;
}

export interface DietaryReport {
  id: string;
  reportPeriod: 'daily' | 'weekly' | 'monthly';
  periodStart: string;
  analysisSummary: string;
  improvementSuggestions: string[];
  createdAt: string;
}

export interface AppState {
  version: number;
  onboarded: boolean;
  preferences: FoodPreferences;
  consents: Consents;
  notifications: NotificationSettings;
  ingredients: Ingredient[];
  customRecipes: Recipe[]; // 사진 분석으로 만든 레시피 등
  meals: MealRecord[];
  goals: DietaryGoal[];
  shopping: ShoppingItem[];
  waste: WasteRecord[];
  spend: SpendRecord[];
  cooks: CookRecord[];
  mealPlan: MealPlanEntry[];
  reports: DietaryReport[];
  dismissedSuggestions: Record<string, string>; // 제안 id → 숨긴 날짜
  /** 앱을 연 기록. previous는 이번에 열기 직전의 마지막 방문(오랜만에 돌아온 사용자 반기기용) */
  visit: { last: string | null; previous: string | null };
}
