import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { findCatalog } from './catalog';
import { BUILTIN_RECIPES } from './recipes';
import type {
  AppState,
  CookRating,
  CookRecord,
  DietaryGoal,
  Ingredient,
  MealPlanEntry,
  MealRecord,
  Recipe,
  ShoppingItem,
  WasteRecord,
} from './types';
import { newId, toDateKey } from '@/logic/dates';
import { round } from '@/logic/inventory';

/**
 * 한끼온 저장소.
 * 지금은 휴대폰(웹은 브라우저) 안에만 저장한다 → 로그인 없이 바로 쓸 수 있다.
 * 로그인을 붙이면 같은 구조를 서버(예: Supabase)로 옮기면 된다.
 */
const STORAGE_KEY = 'hankeeon.state.v1';

export const initialState: AppState = {
  version: 1,
  onboarded: false,
  preferences: {
    nickname: '',
    characterId: 'sprout',
    preferredFoods: [],
    dislikedFoods: [],
    allergies: [],
    dietaryRestrictions: [],
    weeklyBudget: null,
    maxCookMinutes: 20,
    cookingSkill: '초보',
    householdSize: 1,
  },
  consents: { personalization: false, externalAI: false, healthInfo: false, agreedAt: null },
  notifications: {
    expiry: true,
    unusedIngredient: true,
    menuSuggestion: true,
    shopping: true,
    expiryDaysBefore: 2,
    maxPerDay: 2,
  },
  ingredients: [],
  customRecipes: [],
  meals: [],
  goals: [],
  shopping: [],
  waste: [],
  cooks: [],
  mealPlan: [],
  reports: [],
  dismissedSuggestions: {},
};

type Listener = () => void;
let state: AppState = initialState;
let loaded = false;
const listeners = new Set<Listener>();

function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  listeners.forEach((l) => l());
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
}

export function getState() {
  return state;
}

async function load() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...initialState, ...JSON.parse(raw) };
  } catch {
    state = initialState;
  }
  loaded = true;
  listeners.forEach((l) => l());
}

// ───────── 동작(액션): 화면은 이 함수들로만 데이터를 바꾼다 ─────────

export type NewIngredient = Omit<Ingredient, 'id' | 'addedAt' | 'lastUsedAt' | 'emoji' | 'category'> &
  Partial<Pick<Ingredient, 'emoji' | 'category'>>;

export const actions = {
  completeOnboarding(prefs: Partial<AppState['preferences']>, consents: Omit<AppState['consents'], 'agreedAt'>) {
    setState((s) => ({
      ...s,
      onboarded: true,
      preferences: { ...s.preferences, ...prefs },
      consents: { ...consents, agreedAt: new Date().toISOString() },
    }));
  },
  updatePreferences(p: Partial<AppState['preferences']>) {
    setState((s) => ({ ...s, preferences: { ...s.preferences, ...p } }));
  },
  updateConsents(c: Partial<AppState['consents']>) {
    setState((s) => ({ ...s, consents: { ...s.consents, ...c, agreedAt: new Date().toISOString() } }));
  },
  updateNotifications(n: Partial<AppState['notifications']>) {
    setState((s) => ({ ...s, notifications: { ...s.notifications, ...n } }));
  },

  /** 재고 등록. 같은 이름·단위·소비기한 재고가 있으면 수량만 더해 중복을 막는다. */
  addIngredients(items: NewIngredient[]) {
    setState((s) => {
      const list = [...s.ingredients];
      for (const it of items) {
        const cat = findCatalog(it.name);
        const same = list.find(
          (x) => x.name === it.name && x.unit === it.unit && x.expiryDate === it.expiryDate && x.storage === it.storage,
        );
        if (same) {
          same.quantity = round(same.quantity + it.quantity);
          continue;
        }
        list.push({
          ...it,
          emoji: it.emoji ?? cat?.emoji ?? '🥫',
          category: it.category ?? cat?.category ?? '기타',
          id: newId('ing_'),
          addedAt: new Date().toISOString(),
          lastUsedAt: null,
        });
      }
      return { ...s, ingredients: list.map((x) => ({ ...x })) };
    });
  },
  updateIngredient(id: string, patch: Partial<Ingredient>) {
    setState((s) => ({ ...s, ingredients: s.ingredients.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  },
  /** 다 먹음(사용 완료) — 재고에서 빼되 폐기로 세지 않는다. */
  useUpIngredient(id: string) {
    setState((s) => ({ ...s, ingredients: s.ingredients.filter((x) => x.id !== id) }));
  },
  /** 버림(폐기) — 재고에서 빼고 폐기 기록을 남긴다. */
  discardIngredient(id: string, reason: WasteRecord['reason']) {
    setState((s) => {
      const it = s.ingredients.find((x) => x.id === id);
      if (!it) return s;
      const price = it.price ?? (findCatalog(it.name)?.avgPrice ?? 0) * it.quantity;
      const w: WasteRecord = {
        id: newId('w_'),
        ingredientName: it.name,
        quantity: it.quantity,
        unit: it.unit,
        price: Math.round(price),
        reason,
        date: toDateKey(),
      };
      return { ...s, ingredients: s.ingredients.filter((x) => x.id !== id), waste: [w, ...s.waste] };
    });
  },

  saveRecipe(r: Recipe) {
    setState((s) => ({ ...s, customRecipes: [r, ...s.customRecipes.filter((x) => x.id !== r.id)] }));
  },

  /**
   * 요리 완료: 사용자가 확인한 양만큼 재고 차감 + 요리 기록(맛 평가 포함).
   * 만든 양보다 적게 먹었으면 그 차이를 '남은 음식'으로 냉장고에 넣는다.
   * 남은 음식의 기한은 사용자가 고른 값만 쓴다(없으면 비워 둠).
   */
  completeCooking(
    recipe: Recipe,
    deductions: { ingredientId: string; amount: number }[],
    extra: { rating?: CookRating; servingsMade?: number; servingsEaten?: number; leftoverExpiry?: string | null } = {},
  ): CookRecord {
    const used: CookRecord['usedIngredients'] = [];
    const rec: CookRecord = {
      id: newId('cook_'),
      recipeId: recipe.id,
      recipeName: recipe.name,
      date: toDateKey(),
      usedIngredients: used,
      rating: extra.rating,
      servingsMade: extra.servingsMade,
      servingsEaten: extra.servingsEaten,
    };
    setState((s) => {
      const now = new Date().toISOString();
      const ingredients = s.ingredients
        .map((x) => {
          const d = deductions.find((dd) => dd.ingredientId === x.id);
          if (!d || d.amount <= 0) return x;
          used.push({ name: x.name, amount: d.amount, unit: x.unit });
          return { ...x, quantity: round(Math.max(0, x.quantity - d.amount)), lastUsedAt: now };
        })
        .filter((x) => x.quantity > 0);
      const left = round((extra.servingsMade ?? 0) - (extra.servingsEaten ?? 0));
      if (left > 0) {
        ingredients.push({
          id: newId('left_'),
          name: `${recipe.name}`,
          category: '남은 음식',
          emoji: recipe.emoji,
          quantity: left,
          unit: '인분',
          storage: 'fridge',
          location: 'fridge',
          expiryDate: extra.leftoverExpiry ?? null,
          expirySource: extra.leftoverExpiry ? 'user' : null,
          addedAt: now,
          lastUsedAt: null,
          source: 'user',
          kind: 'leftover',
          recipeId: recipe.id,
        });
      }
      return { ...s, ingredients, cooks: [rec, ...s.cooks] };
    });
    return rec;
  },

  /** 요리 기록의 맛 평가를 나중에 바꾸기 */
  rateCook(cookId: string, rating: CookRating) {
    setState((s) => ({ ...s, cooks: s.cooks.map((c) => (c.id === cookId ? { ...c, rating } : c)) }));
  },

  /** 남은 음식 한 끼 먹기: 남은 양에서 빼고 식사 기록에 남긴다 */
  eatLeftover(id: string, servings = 1, mealType: MealRecord['mealType'] = 'dinner') {
    const st = getState();
    const it = st.ingredients.find((x) => x.id === id);
    if (!it) return;
    const eat = Math.min(servings, it.quantity);
    const recipe = it.recipeId ? findRecipe(st, it.recipeId) : undefined;
    const now = new Date();
    actions.addMeal({
      mealDate: toDateKey(now),
      mealType,
      mealTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      imageUri: null,
      description: '남은 음식',
      sourceType: 'home',
      recipeId: it.recipeId,
      items: [
        {
          id: newId('item_'),
          foodName: it.name,
          quantity: eat,
          unit: '인분',
          nutrition: recipe?.nutrition ?? null,
          dataConfidence: recipe?.nutrition ? 'medium' : 'none',
          nutritionSource: recipe?.nutrition ? (recipe.origin === 'builtin' ? 'reference_estimated' : 'ai_estimated') : null,
          ingredients: recipe?.ingredients.filter((i) => !i.optional).map((i) => i.name),
        },
      ],
    });
    setState((s) => ({
      ...s,
      ingredients: s.ingredients.map((x) => (x.id === id ? { ...x, quantity: round(x.quantity - eat) } : x)).filter((x) => x.quantity > 0),
    }));
  },

  addMeal(m: Omit<MealRecord, 'id' | 'createdAt'>): MealRecord {
    const rec: MealRecord = { ...m, id: newId('meal_'), createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, meals: [rec, ...s.meals] }));
    return rec;
  },
  updateMeal(id: string, patch: Partial<MealRecord>) {
    setState((s) => ({ ...s, meals: s.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  },
  deleteMeal(id: string) {
    setState((s) => ({ ...s, meals: s.meals.filter((m) => m.id !== id) }));
  },

  /** 장보기 추가. 이미 목록에 있거나 재고가 충분하면 추가하지 않는다(중복 구매 방지). */
  addShopping(items: Omit<ShoppingItem, 'id' | 'done' | 'createdAt'>[]): number {
    let added = 0;
    setState((s) => {
      const list = [...s.shopping];
      for (const it of items) {
        if (list.some((x) => !x.done && x.name === it.name)) continue;
        list.unshift({ ...it, id: newId('shop_'), done: false, createdAt: new Date().toISOString() });
        added++;
      }
      return { ...s, shopping: list };
    });
    return added;
  },
  toggleShopping(id: string) {
    setState((s) => ({ ...s, shopping: s.shopping.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }));
  },
  removeShopping(id: string) {
    setState((s) => ({ ...s, shopping: s.shopping.filter((x) => x.id !== id) }));
  },
  clearDoneShopping() {
    setState((s) => ({ ...s, shopping: s.shopping.filter((x) => !x.done) }));
  },

  addGoal(g: Omit<DietaryGoal, 'id'>) {
    setState((s) => ({ ...s, goals: [...s.goals, { ...g, id: newId('goal_') }] }));
  },
  updateGoal(id: string, patch: Partial<DietaryGoal>) {
    setState((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  },
  removeGoal(id: string) {
    setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
  },

  setMealPlan(entries: MealPlanEntry[], replaceDates: string[]) {
    setState((s) => ({ ...s, mealPlan: [...s.mealPlan.filter((e) => !replaceDates.includes(e.date)), ...entries] }));
  },
  removeMealPlan(id: string) {
    setState((s) => ({ ...s, mealPlan: s.mealPlan.filter((e) => e.id !== id) }));
  },

  dismissSuggestion(id: string) {
    setState((s) => ({ ...s, dismissedSuggestions: { ...s.dismissedSuggestions, [id]: toDateKey() } }));
  },

  replaceAll(next: AppState) {
    setState(() => next);
  },
  resetAll() {
    setState(() => initialState);
  },
};

// ───────── 화면에서 쓰는 훅 ─────────

const Ctx = createContext<AppState>(initialState);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState(state);
  const [ready, setReady] = useState(loaded);
  useEffect(() => {
    const l = () => {
      setSnap(state);
      setReady(loaded);
    };
    listeners.add(l);
    if (!loaded) load();
    return () => {
      listeners.delete(l);
    };
  }, []);
  if (!ready) return <View style={{ flex: 1, backgroundColor: '#FAF8F5' }} />; // 불러오는 동안 빈 배경
  return <Ctx.Provider value={snap}>{children}</Ctx.Provider>;
}

export function useAppState() {
  return useContext(Ctx);
}

/** 기본 레시피 + 사용자가 만든 레시피 */
export function useAllRecipes(): Recipe[] {
  const s = useAppState();
  return useMemo(() => [...s.customRecipes, ...BUILTIN_RECIPES], [s.customRecipes]);
}

export function findRecipe(s: AppState, id: string): Recipe | undefined {
  return s.customRecipes.find((r) => r.id === id) ?? BUILTIN_RECIPES.find((r) => r.id === id);
}
