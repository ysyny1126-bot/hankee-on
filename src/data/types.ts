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

export interface CookRecord {
  id: string;
  recipeId: string;
  recipeName: string;
  date: string;
  usedIngredients: { name: string; amount: number; unit: string }[];
}

export interface MealPlanEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  recipeId: string;
  reason: string; // 추천 이유
}

export interface NotificationSettings {
  expiry: boolean; // 소비기한 임박
  unusedIngredient: boolean; // 오래 안 쓴 재료
  menuSuggestion: boolean; // 오늘의 메뉴
  shopping: boolean; // 장보기 제안
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
  cooks: CookRecord[];
  mealPlan: MealPlanEntry[];
  reports: DietaryReport[];
  dismissedSuggestions: Record<string, string>; // 제안 id → 숨긴 날짜
}
