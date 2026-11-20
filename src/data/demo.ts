import { findCatalog, findFoodReference } from './catalog';
import type { AppState, Ingredient, MealRecord, MealSourceType, MealType } from './types';
import { addDays, toDateKey } from '@/logic/dates';

/**
 * 시연용 예시 데이터. 사용자가 "예시 데이터로 체험하기"를 눌렀을 때만 들어가며,
 * 설정에서 언제든 전부 지울 수 있다. (실제 사용자 기록과 섞이지 않게 처음에만 제공)
 */
export function buildDemoState(base: AppState): AppState {
  const today = toDateKey();
  const ing = (name: string, quantity: number, unit: string, expiryInDays: number | null, addedDaysAgo: number, storage?: Ingredient['storage']): Ingredient => {
    const c = findCatalog(name);
    const added = new Date();
    added.setDate(added.getDate() - addedDaysAgo);
    return {
      id: `demo_ing_${name}`,
      name,
      category: c?.category ?? '기타',
      emoji: c?.emoji ?? '🥫',
      quantity,
      unit,
      storage: storage ?? c?.storage ?? 'fridge',
      location: (storage ?? c?.storage) === 'pantry' ? 'outside' : 'fridge',
      expiryDate: expiryInDays === null ? null : addDays(today, expiryInDays),
      expirySource: expiryInDays === null ? null : 'user',
      price: c?.avgPrice ? Math.round(c.avgPrice * quantity) : undefined,
      addedAt: added.toISOString(),
      lastUsedAt: null,
      source: 'user',
    };
  };

  const ingredients: Ingredient[] = [
    ing('계란', 6, '개', 9, 3),
    ing('두부', 1, '모', 1, 4),
    ing('대파', 1, '대', 4, 5),
    ing('김치', 400, 'g', 20, 10),
    ing('돼지고기', 200, 'g', 2, 2),
    ing('양파', 2, '개', null, 8, 'pantry'),
    ing('애호박', 1, '개', 0, 6),
    ing('우유', 500, 'ml', 3, 3),
    ing('밥', 3, '공기', null, 2, 'pantry'),
    ing('된장', 10, '큰술', null, 30),
    ing('간장', 20, '큰술', null, 30, 'pantry'),
    ing('고추장', 10, '큰술', null, 30),
    ing('양배추', 0.5, '통', 6, 9),
    ing('참치캔', 2, '캔', null, 14, 'pantry'),
  ];

  const meal = (daysAgo: number, type: MealType, time: string, foods: string[], src: MealSourceType): MealRecord => {
    const date = addDays(today, -daysAgo);
    return {
      id: `demo_meal_${daysAgo}_${type}`,
      mealDate: date,
      mealType: type,
      mealTime: time,
      imageUri: null,
      description: '',
      sourceType: src,
      createdAt: new Date().toISOString(),
      items: foods.map((f, i) => {
        const ref = findFoodReference(f);
        return {
          id: `demo_item_${daysAgo}_${type}_${i}`,
          foodName: f,
          quantity: 1,
          unit: '인분',
          nutrition: ref?.nutrition ?? null,
          dataConfidence: ref ? 'medium' : 'none',
          nutritionSource: ref ? 'reference_estimated' : null,
          vegetableServings: ref?.vegetableServings,
          ingredients: ref?.ingredients,
        };
      }),
    };
  };

  const meals: MealRecord[] = [
    meal(1, 'lunch', '12:40', ['라면', '삼각김밥'], 'convenience'),
    meal(1, 'dinner', '20:10', ['김치찌개'], 'home'),
    meal(2, 'lunch', '13:30', ['라면'], 'home'),
    meal(2, 'dinner', '21:30', ['치킨'], 'delivery'),
    meal(3, 'breakfast', '08:20', ['토스트'], 'home'),
    meal(3, 'lunch', '12:10', ['비빔밥'], 'eat_out'),
    meal(3, 'dinner', '19:00', ['제육볶음'], 'eat_out'),
    meal(4, 'lunch', '14:20', ['라면'], 'home'),
    meal(4, 'dinner', '18:40', ['떡볶이', '김밥'], 'delivery'),
    meal(5, 'lunch', '12:30', ['편의점 도시락'], 'convenience'),
    meal(5, 'dinner', '20:00', ['계란볶음밥'], 'home'),
    meal(8, 'lunch', '12:00', ['짜장면'], 'delivery'),
    meal(8, 'dinner', '19:30', ['된장찌개'], 'home'),
    meal(9, 'dinner', '20:30', ['피자'], 'delivery'),
  ];

  // 예시 지출: 재료는 사전 평균가로 '추정' 표시, 배달·외식·편의점은 흔한 금액(시연용 예시)
  const spend = ingredients
    .filter((i) => i.price)
    .map((i) => ({ id: `demo_sp_${i.name}`, date: i.addedAt.slice(0, 10) <= today ? toDateKey(new Date(i.addedAt)) : today, name: i.name, amount: i.price!, estimated: true }));
  const OUT_COST = { delivery: 17000, eat_out: 11000, convenience: 5500 } as const;
  const paidMeals = meals.map((m) => (m.sourceType === 'home' ? m : { ...m, cost: OUT_COST[m.sourceType] }));

  return {
    ...base,
    ingredients,
    meals: paidMeals,
    spend,
    goals: [
      { id: 'demo_goal_veg', goalType: 'vegetables', title: '채소·과일 챙기기', targetValue: 3, unit: '접시/일', startDate: addDays(today, -7), endDate: null, status: 'active' },
      { id: 'demo_goal_home', goalType: 'home_cooking', title: '집밥 주 5회', targetValue: 5, unit: '회', startDate: addDays(today, -7), endDate: null, status: 'active' },
    ],
    waste: [
      { id: 'demo_w1', ingredientName: '상추', quantity: 10, unit: '장', price: 1000, reason: 'spoiled', date: addDays(today, -6) },
    ],
  };
}
