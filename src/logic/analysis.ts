import { findCatalog, findFoodReference } from '@/data/catalog';
import type { AppState, DietaryGoal, MealRecord, MealType, NutritionInfo } from '@/data/types';
import { addDays, toDateKey, weekStart } from './dates';

/**
 * 식생활 분석. 근거가 된 데이터(기록 수, 영양값이 있는 비율)를 함께 돌려주어
 * 화면에서 "어떤 데이터로 분석했는지, 어디까지 믿을 수 있는지"를 항상 보여 준다.
 */

/** 식품 등의 표시기준 1일 영양성분 기준치(성인). 평가가 아니라 '경향'을 보는 참고선으로만 쓴다. */
export const DAILY_REFERENCE: NutritionInfo = {
  calories: 2000,
  protein: 55,
  carbohydrates: 324,
  fat: 54,
  sodium: 2000,
  fiber: 25,
  sugar: 100,
};

export const MEAL_LABEL: Record<MealType, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식' };
export const SOURCE_LABEL = { home: '집밥', delivery: '배달', eat_out: '외식', convenience: '편의점' } as const;

export interface PeriodAnalysis {
  start: string;
  end: string;
  days: number;
  recordedDays: number;
  totalMeals: number;
  byType: Record<MealType, number>;
  bySource: Record<keyof typeof SOURCE_LABEL, number>;
  nutritionPerDay: NutritionInfo | null; // 영양값이 있는 날만 평균
  nutritionCoverage: number; // 영양값이 있는 음식 비율 0~1
  vegetablePerDay: number;
  distinctIngredients: string[];
  distinctFoods: string[];
  topFoods: { name: string; count: number }[];
  soupCount: number;
  processedCount: number;
  breakfastDays: number;
  mealTimeSpreadMinutes: Partial<Record<MealType, number>>; // 같은 끼니 시간의 흩어짐(작을수록 규칙적)
  dataLevel: 'none' | 'low' | 'ok';
}

const ZERO: NutritionInfo = { calories: 0, protein: 0, carbohydrates: 0, fat: 0, sodium: 0, fiber: 0, sugar: 0 };

function minutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function spread(values: number[]) {
  if (values.length < 2) return undefined;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(Math.sqrt(values.reduce((a, v) => a + (v - avg) ** 2, 0) / values.length));
}

export function analyzePeriod(meals: MealRecord[], start: string, end: string): PeriodAnalysis {
  const inRange = meals.filter((m) => m.mealDate >= start && m.mealDate <= end);
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  const byType = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 } as Record<MealType, number>;
  const bySource = { home: 0, delivery: 0, eat_out: 0, convenience: 0 };
  const dayNutrition = new Map<string, NutritionInfo>();
  const foodCount = new Map<string, number>();
  const ingredients = new Set<string>();
  const times: Partial<Record<MealType, number[]>> = {};
  let items = 0;
  let itemsWithNutrition = 0;
  let veg = 0;
  let soup = 0;
  let processed = 0;

  for (const m of inRange) {
    byType[m.mealType]++;
    bySource[m.sourceType]++;
    (times[m.mealType] ??= []).push(minutes(m.mealTime));
    for (const it of m.items) {
      items++;
      foodCount.set(it.foodName, (foodCount.get(it.foodName) ?? 0) + 1);
      const ref = findFoodReference(it.foodName);
      (it.ingredients ?? ref?.ingredients ?? []).forEach((i) => ingredients.add(i));
      veg += it.vegetableServings ?? ref?.vegetableServings ?? 0;
      if (ref?.tags.includes('국물')) soup++;
      if (ref?.tags.includes('가공식품')) processed++;
      if (it.nutrition) {
        itemsWithNutrition++;
        const cur = dayNutrition.get(m.mealDate) ?? { ...ZERO };
        for (const k of Object.keys(ZERO) as (keyof NutritionInfo)[]) cur[k] += (it.nutrition[k] ?? 0) * (it.quantity || 1);
        dayNutrition.set(m.mealDate, cur);
      }
    }
  }

  let nutritionPerDay: NutritionInfo | null = null;
  if (dayNutrition.size) {
    nutritionPerDay = { ...ZERO };
    for (const n of dayNutrition.values())
      for (const k of Object.keys(ZERO) as (keyof NutritionInfo)[]) nutritionPerDay[k] += n[k] / dayNutrition.size;
  }

  const recordedDays = new Set(inRange.map((m) => m.mealDate)).size;
  const mealTimeSpreadMinutes: PeriodAnalysis['mealTimeSpreadMinutes'] = {};
  for (const t of ['breakfast', 'lunch', 'dinner'] as MealType[]) {
    const s = spread(times[t] ?? []);
    if (s !== undefined) mealTimeSpreadMinutes[t] = s;
  }

  return {
    start,
    end,
    days,
    recordedDays,
    totalMeals: inRange.length,
    byType,
    bySource,
    nutritionPerDay,
    nutritionCoverage: items ? itemsWithNutrition / items : 0,
    vegetablePerDay: recordedDays ? veg / recordedDays : 0,
    distinctIngredients: [...ingredients],
    distinctFoods: [...foodCount.keys()],
    topFoods: [...foodCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
    soupCount: soup,
    processedCount: processed,
    breakfastDays: new Set(inRange.filter((m) => m.mealType === 'breakfast').map((m) => m.mealDate)).size,
    mealTimeSpreadMinutes,
    dataLevel: inRange.length === 0 ? 'none' : inRange.length < 5 || recordedDays < 3 ? 'low' : 'ok',
  };
}

export function thisWeek(today = toDateKey()) {
  const start = weekStart(today);
  return { start, end: addDays(start, 6) };
}

export function lastNDays(n: number, today = toDateKey()) {
  return { start: addDays(today, -(n - 1)), end: today };
}

/** 긍정적인 부분 + 실천 가능한 제안. 평가·비난·제한 표현을 쓰지 않는다. */
export function buildInsights(a: PeriodAnalysis, prev?: PeriodAnalysis) {
  const positives: string[] = [];
  const suggestions: { text: string; why: string }[] = [];
  if (a.dataLevel === 'none') return { positives, suggestions };

  if (a.totalMeals >= a.days * 2) positives.push(`${a.days}일 동안 ${a.totalMeals}끼를 기록했어요. 꾸준히 남기고 계세요!`);
  else positives.push(`식사 ${a.totalMeals}끼를 기록했어요. 기록이 쌓일수록 분석이 정확해져요.`);
  if (a.bySource.home > 0) positives.push(`직접 차려 먹은 식사가 ${a.bySource.home}번 있었어요.`);
  if (a.distinctIngredients.length >= 12) positives.push(`${a.distinctIngredients.length}가지 식재료를 골고루 드셨어요.`);
  if (a.vegetablePerDay >= 3) positives.push('채소·과일을 넉넉히 챙기고 있어요.');
  if (prev && prev.dataLevel !== 'none' && a.distinctIngredients.length > prev.distinctIngredients.length)
    positives.push(`지난 기간보다 식재료가 ${a.distinctIngredients.length - prev.distinctIngredients.length}가지 늘었어요.`);

  if (a.vegetablePerDay < 2)
    suggestions.push({
      text: '한 끼에 채소 반찬 하나를 곁들여 보면 어때요? 양배추 계란볶음이나 비빔밥처럼 간단한 메뉴도 좋아요.',
      why: `기록된 날 평균 채소·과일 약 ${a.vegetablePerDay.toFixed(1)}접시(추정)`,
    });
  if (a.distinctIngredients.length < 10)
    suggestions.push({
      text: '이번 주에 새로운 식재료 한두 가지를 시도해 보세요. 버섯·두부·콩나물은 1인분으로 쓰기 쉬워요.',
      why: `기록에 나온 식재료 ${a.distinctIngredients.length}가지`,
    });
  if (a.soupCount + a.processedCount >= Math.max(3, a.totalMeals * 0.4))
    suggestions.push({
      text: '국물 요리나 간편식을 자주 드셨네요. 국물은 건더기 위주로 즐기거나, 사이사이 구이·샐러드 메뉴를 섞어 보는 것도 방법이에요.',
      why: `국물 ${a.soupCount}번 · 가공·간편식 ${a.processedCount}번`,
    });
  const lunchSpread = a.mealTimeSpreadMinutes.lunch ?? 0;
  const dinnerSpread = a.mealTimeSpreadMinutes.dinner ?? 0;
  if (Math.max(lunchSpread, dinnerSpread) >= 90)
    suggestions.push({
      text: '식사 시간이 날마다 꽤 달라요. 점심·저녁 시간을 대략 정해 두면 몸이 편해질 수 있어요.',
      why: `같은 끼니의 시간 차이 약 ${Math.round(Math.max(lunchSpread, dinnerSpread) / 60 * 10) / 10}시간`,
    });
  if (a.breakfastDays === 0 && a.recordedDays >= 3)
    suggestions.push({
      text: '아침 기록이 없어요. 드시지 않았다면 요거트·바나나·토스트처럼 가벼운 메뉴부터 시작해 볼 수 있어요.',
      why: '이번 기간 아침 기록 0회',
    });
  if (a.nutritionPerDay && a.nutritionPerDay.protein < DAILY_REFERENCE.protein * 0.7)
    suggestions.push({
      text: '단백질 식품을 다양하게 써 보세요. 계란·두부·닭가슴살·생선을 번갈아 쓰면 질리지 않아요.',
      why: `하루 평균 단백질 약 ${Math.round(a.nutritionPerDay.protein)}g(추정)`,
    });
  return { positives, suggestions: suggestions.slice(0, 4) };
}

/** 목표 진행률(이번 주 기준). 계산 근거 문장도 함께 돌려준다. */
export function goalProgress(goal: DietaryGoal, s: AppState): { value: number; ratio: number; basis: string } | null {
  const { start, end } = thisWeek();
  const a = analyzePeriod(s.meals, start, end);
  switch (goal.goalType) {
    case 'variety':
      return { value: a.distinctIngredients.length, ratio: a.distinctIngredients.length / goal.targetValue, basis: '이번 주 식사 기록에 나온 식재료 수' };
    case 'vegetables':
      return { value: round1(a.vegetablePerDay), ratio: a.vegetablePerDay / goal.targetValue, basis: '기록된 날의 하루 평균 채소·과일 접시 수(추정)' };
    case 'regular_meals': {
      const days = new Set(
        [...new Set(s.meals.filter((m) => m.mealDate >= start && m.mealDate <= end).map((m) => m.mealDate))].filter(
          (d) => s.meals.filter((m) => m.mealDate === d && m.mealType !== 'snack').length >= 2,
        ),
      ).size;
      return { value: days, ratio: days / goal.targetValue, basis: '이번 주 끼니(간식 제외)를 2번 이상 기록한 날 수' };
    }
    case 'home_cooking':
      return { value: a.bySource.home, ratio: a.bySource.home / goal.targetValue, basis: '이번 주 집밥으로 기록한 식사 수' };
    case 'less_waste': {
      const n = s.waste.filter((w) => w.date >= start && w.date <= end).length;
      return { value: n, ratio: n <= goal.targetValue ? 1 : goal.targetValue / n, basis: '이번 주 버린 식재료 수(적을수록 달성)' };
    }
    case 'budget': {
      const spent = s.ingredients
        .filter((i) => i.addedAt.slice(0, 10) >= start && i.price)
        .reduce((a2, i) => a2 + (i.price ?? 0), 0);
      return { value: spent, ratio: spent <= goal.targetValue ? 1 : goal.targetValue / spent, basis: '이번 주 등록한 재료의 가격 합(가격을 입력한 재료만)' };
    }
    default:
      return null;
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 아낀 금액: 버리지 않고 요리에 쓴 재료의 대략 가치 vs 폐기 금액(이번 달) */
export function wasteStats(s: AppState, monthKey = toDateKey().slice(0, 7)) {
  const waste = s.waste.filter((w) => w.date.startsWith(monthKey));
  const wasteValue = waste.reduce((a, w) => a + (w.price ?? 0), 0);
  const cooks = s.cooks.filter((c) => c.date.startsWith(monthKey));
  return { wasteCount: waste.length, wasteValue, cookCount: cooks.length, waste };
}

/**
 * 요리에 써서 버리지 않은 재료의 대략적인 값(이번 달).
 * 재료 사전의 평균 가격 × 사용량, 단위가 사전과 같을 때만 센다(아니면 0 → 과장하지 않음).
 */
export function usedValue(s: AppState, monthKey = toDateKey().slice(0, 7)): number {
  let sum = 0;
  for (const c of s.cooks.filter((x) => x.date.startsWith(monthKey))) {
    for (const u of c.usedIngredients) {
      const cat = findCatalog(u.name);
      if (cat?.avgPrice && cat.unit === u.unit) sum += cat.avgPrice * u.amount;
    }
  }
  return Math.round(sum / 10) * 10;
}
