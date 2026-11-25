import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState as RNAppState, View } from 'react-native';

import { findCatalog } from './catalog';
import { BUILTIN_RECIPES } from './recipes';
import type {
  AppState,
  ProfileKey,
  CookRating,
  CookRecord,
  DietaryGoal,
  Ingredient,
  MealPlanEntry,
  MealRecord,
  MealSourceType,
  MealType,
  Recipe,
  ShoppingItem,
  SpendRecord,
  WasteRecord,
} from './types';
import { addDays, newId, toDateKey } from '@/logic/dates';
import { round } from '@/logic/inventory';
import { setUserUnits } from '@/logic/units';
import { BUDGET_BANDS, LIFESTYLES } from '@/constants/profile';

/**
 * 오잘먹 저장소.
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
    lifestyles: [],
    monthlyBudget: null,
    budgetBand: null,
    fridgeSize: null,
    fridgeSpace: null,
    planHabit: 'today',
    coachId: 'warm',
    profileGoals: [],
    restrictionsLater: false,
    fridgePhotoUri: null,
    showFridgePhoto: false,
    body: null,
    myUnits: {},
    autoFilled: [],
    profileSet: [],
  },
  consents: { personalization: false, externalAI: false, healthInfo: false, agreedAt: null },
  notifications: {
    expiry: true,
    unusedIngredient: true,
    menuSuggestion: true,
    shopping: true,
    mealReminder: false,
    mealReminderTimes: ['12:30', '19:00'],
    expiryDaysBefore: 2,
    maxPerDay: 2,
  },
  ingredients: [],
  customRecipes: [],
  meals: [],
  goals: [],
  shopping: [],
  waste: [],
  spend: [],
  cooks: [],
  mealPlan: [],
  reports: [],
  dismissedSuggestions: {},
  favorites: [],
  recipeNotes: {},
  skips: [],
  visit: { last: null, previous: null },
};

/**
 * 예전 버전에서 저장한 데이터에 새로 생긴 항목을 기본값으로 채운다.
 * (얕게 합치면 preferences 안의 새 항목이 비어 버리므로 묶음별로 합친다)
 */
/** 예전에 잘못 붙였던 재료 그림(두부=버터 등)을 지금 사전 그림으로 고친다 */
const OLD_EMOJI: Record<string, string> = { 두부: '🧈', 순두부: '🧈', 김: '🟩' };
function fixEmoji(list: Ingredient[] | undefined): Ingredient[] | undefined {
  return list?.map((i) => {
    const c = i.kind === 'leftover' ? undefined : findCatalog(i.name);
    return c && OLD_EMOJI[c.name] === i.emoji ? { ...i, emoji: c.emoji } : i;
  });
}

export function migrate(raw: Partial<AppState>): AppState {
  return {
    ...initialState,
    ...raw,
    ingredients: fixEmoji(raw.ingredients) ?? initialState.ingredients,
    preferences: { ...initialState.preferences, ...raw.preferences },
    notifications: { ...initialState.notifications, ...raw.notifications },
    consents: { ...initialState.consents, ...raw.consents },
    visit: { ...initialState.visit, ...raw.visit },
  };
}

type Listener = () => void;
let state: AppState = initialState;

/**
 * C6 되돌리기: 지우기·버리기·요리 완료처럼 되돌리기 어려운 동작 직전 상태를 잠깐(8초) 기억한다.
 * 화면 아래 '되돌리기' 알림을 누르면 그 상태로 돌아간다. 저장은 하지 않는다(앱을 껐다 켜면 사라짐).
 */
export interface UndoInfo { label: string; prev: AppState; at: number }
let undoInfo: UndoInfo | null = null;
const undoListeners = new Set<Listener>();
export const UNDO_MS = 8000;
function remember(label: string) {
  undoInfo = { label, prev: state, at: Date.now() };
  undoListeners.forEach((l) => l());
}
export function getUndo() {
  return undoInfo && Date.now() - undoInfo.at < UNDO_MS ? undoInfo : null;
}
export function subscribeUndo(l: Listener) {
  undoListeners.add(l);
  return () => {
    undoListeners.delete(l);
  };
}
let loaded = false;
const listeners = new Set<Listener>();

/**
 * E19 저장: 실패하면(저장 공간 부족·사생활 보호 모드 등) 화면 위에 알리고 다시 시도할 수 있게 한다.
 * 기록은 앱을 켜 둔 동안 메모리에 남아 있으므로, 다시 시도에 성공하면 잃지 않는다.
 */
let saveFailed = false;
const saveListeners = new Set<Listener>();
export function isSaveFailed() {
  return saveFailed;
}
export function subscribeSave(l: Listener) {
  saveListeners.add(l);
  return () => {
    saveListeners.delete(l);
  };
}
function setSaveFailed(v: boolean) {
  if (saveFailed === v) return;
  saveFailed = v;
  saveListeners.forEach((l) => l());
}
export function persist() {
  let text: string;
  try {
    text = JSON.stringify(state);
  } catch {
    setSaveFailed(true);
    return;
  }
  AsyncStorage.setItem(STORAGE_KEY, text).then(() => setSaveFailed(false), () => setSaveFailed(true));
}

function setState(updater: (s: AppState) => AppState) {
  const before = state.preferences.myUnits;
  state = updater(state);
  if (state.preferences.myUnits !== before) setUserUnits(state.preferences.myUnits);
  listeners.forEach((l) => l());
  persist();
}

export function getState() {
  return state;
}

async function load() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) state = migrate(JSON.parse(raw));
    setUserUnits(state.preferences.myUnits);
  } catch {
    state = initialState;
  }
  // 방문 기록: 오늘 처음 연 것이면 직전 방문을 previous로 옮긴다
  const now = new Date().toISOString();
  const last = state.visit.last;
  const sameDay = last && toDateKey(new Date(last)) === toDateKey();
  state = { ...state, visit: { last: now, previous: sameDay ? state.visit.previous : last } };
  persist();
  loaded = true;
  listeners.forEach((l) => l());
}

/**
 * A3: 식사를 기록하면 같은 날 계획해 둔 끼니를 '먹음'으로 표시한다.
 * 같은 레시피(또는 같은 이름)인 계획을 찾고, 같은 끼니 계획을 먼저 고른다.
 */
function linkPlan(s: AppState, rec: MealRecord): MealPlanEntry[] {
  const names = rec.items.map((i) => i.foodName.replace(/\s/g, ''));
  const open = s.mealPlan.filter((e) => e.date === rec.mealDate && e.status !== 'done');
  const same = (e: MealPlanEntry) => {
    if (rec.recipeId && e.recipeId === rec.recipeId) return true;
    const r = findRecipe(s, e.recipeId);
    return !!r && names.includes(r.name.replace(/\s/g, ''));
  };
  const hit = open.find((e) => e.mealType === rec.mealType && same(e)) ?? open.find(same);
  if (!hit) return s.mealPlan;
  return s.mealPlan.map((e) => (e.id === hit.id ? { ...e, status: 'done' as const, mealId: rec.id } : e));
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
      const spend: SpendRecord[] = [];
      for (const it of items) {
        const cat = findCatalog(it.name);
        if (it.kind !== 'leftover') {
          const est = cat?.avgPrice && cat.unit === it.unit ? cat.avgPrice * it.quantity : 0;
          const amount = Math.round(it.price ?? est);
          if (amount > 0) spend.push({ id: newId('sp_'), date: toDateKey(), name: it.name, amount, estimated: it.price == null });
        }
        const same = list.find(
          (x) => x.name === it.name && x.unit === it.unit && x.expiryDate === it.expiryDate && x.storage === it.storage,
        );
        if (same) {
          same.quantity = round(same.quantity + it.quantity);
          same.fullQuantity = Math.max(same.fullQuantity ?? 0, same.quantity);
          continue;
        }
        list.push({
          ...it,
          emoji: it.emoji ?? cat?.emoji ?? '🥫',
          category: it.category ?? cat?.category ?? '기타',
          id: newId('ing_'),
          fullQuantity: it.quantity,
          addedAt: new Date().toISOString(),
          lastUsedAt: null,
        });
      }
      const adds = items
        .filter((it) => it.kind !== 'leftover')
        .map((it) => ({ name: it.name, quantity: it.quantity, unit: it.unit, storage: it.storage, date: toDateKey() }));
      return { ...s, ingredients: list.map((x) => ({ ...x })), spend: [...spend, ...(s.spend ?? [])], recentAdds: [...adds, ...(s.recentAdds ?? [])].slice(0, 60) };
    });
  },
  /** 끼니 전 선택(집밥·외식·간단히). 오래된 선택은 14일만 남긴다 */
  setMealIntent(date: string, slot: MealType, kind: MealSourceType) {
    setState((s) => {
      const keep = Object.fromEntries(Object.entries(s.mealIntents ?? {}).filter(([k]) => k.slice(0, 10) >= addDays(toDateKey(), -14)));
      return { ...s, mealIntents: { ...keep, [`${date}|${slot}`]: kind } };
    });
  },
  updateIngredient(id: string, patch: Partial<Ingredient>) {
    setState((s) => ({
      ...s,
      ingredients: s.ingredients.map((x) => {
        if (x.id !== id) return x;
        const next = { ...x, ...patch };
        // 양을 늘렸으면(새로 샀거나 정확히 고침) '가득' 기준도 함께 올린다
        if (patch.quantity != null && patch.quantity > (x.fullQuantity ?? x.quantity)) next.fullQuantity = patch.quantity;
        if (patch.unit && patch.unit !== x.unit) next.fullQuantity = next.quantity;
        return next;
      }),
    }));
  },
  /** 기한이 지났지만 '아직 괜찮아요' — 기한은 그대로 두고, 확인한 날만 남긴다(2일 뒤 다시 물어봄) */
  confirmStillGood(id: string) {
    setState((s) => ({ ...s, ingredients: s.ingredients.map((x) => (x.id === id ? { ...x, expiryCheckedOn: toDateKey() } : x)) }));
  },
  /** 아주 적게 남은 재료를 그대로 두기(정리 안내를 다시 하지 않음) */
  keepSmall(id: string) {
    setState((s) => ({ ...s, ingredients: s.ingredients.map((x) => (x.id === id ? { ...x, keepSmall: true } : x)) }));
  },
  /** E3 보관 위치 옮기기(예: 냉장 → 냉동). 소비기한은 앱이 바꾸지 않고, 화면에서 사용자가 새로 정한다 */
  moveStorage(id: string, storage: Ingredient['storage']) {
    setState((s) => ({
      ...s,
      ingredients: s.ingredients.map((x) => (x.id === id ? { ...x, storage, location: storage === 'pantry' ? 'outside' : 'fridge' } : x)),
    }));
  },
  /** E2 나눠 담기: 한 묶음을 parts개로 똑같이 나눈다. freezeRest면 첫 묶음만 남기고 나머지는 냉동 */
  splitIngredient(id: string, parts: number, freezeRest: boolean) {
    setState((s) => {
      const it = s.ingredients.find((x) => x.id === id);
      if (!it || parts < 2) return s;
      const each = round(it.quantity / parts);
      const copies: Ingredient[] = Array.from({ length: parts - 1 }, () => ({
        ...it,
        id: newId('ing_'),
        quantity: each,
        ...(freezeRest ? { storage: 'freezer' as const, location: 'fridge' as const } : {}),
      }));
      return {
        ...s,
        ingredients: [...s.ingredients.map((x) => (x.id === id ? { ...x, quantity: round(it.quantity - each * (parts - 1)) } : x)), ...copies],
      };
    });
  },
  /**
   * 설정에서 사용자가 직접 정한 값 저장: '자동' 표시를 떼고, 이후 생활 유형을 바꿔도 덮어쓰지 않는다.
   */
  setProfile(key: ProfileKey, patch: Partial<AppState['preferences']>) {
    setState((s) => ({
      ...s,
      preferences: {
        ...s.preferences,
        ...patch,
        autoFilled: (s.preferences.autoFilled ?? []).filter((k) => k !== key),
        profileSet: [...new Set([...(s.preferences.profileSet ?? []), key])],
      },
    }));
  },
  /**
   * 생활 유형 저장 + 아직 직접 정하지 않은 항목은 그 유형의 흔한 값으로 미리 채우고 '자동' 표시.
   * (여러 유형이면 뒤에 고른 것이 우선, 함께 먹는 사람은 가장 큰 값)
   */
  setLifestyles(ids: string[]) {
    setState((s) => {
      const p = s.preferences;
      const set = new Set(p.profileSet ?? []);
      const auto = new Set(p.autoFilled ?? []);
      const patch: Partial<AppState['preferences']> = { lifestyles: ids };
      for (const id of ids) {
        const d = LIFESTYLES.find((l) => l.id === id)?.defaults ?? {};
        if (d.budgetBand && !set.has('budget')) {
          const b = BUDGET_BANDS.find((x) => x.id === d.budgetBand);
          if (b) {
            Object.assign(patch, { budgetBand: b.id, monthlyBudget: b.value, weeklyBudget: Math.round(b.value / 4.3 / 1000) * 1000 });
            auto.add('budget');
          }
        }
        if (d.maxCookMinutes && !set.has('cookTime')) {
          patch.maxCookMinutes = d.maxCookMinutes;
          auto.add('cookTime');
        }
        if (d.cookingSkill && !set.has('skill')) {
          patch.cookingSkill = d.cookingSkill;
          auto.add('skill');
        }
        if (d.householdSize && !set.has('household')) {
          patch.householdSize = Math.max(patch.householdSize ?? 1, d.householdSize);
          auto.add('household');
        }
        if (d.planHabit && !set.has('planHabit')) {
          patch.planHabit = d.planHabit;
          auto.add('planHabit');
        }
      }
      return { ...s, preferences: { ...p, ...patch, autoFilled: [...auto] } };
    });
  },
  /** A7 내 단위 저장: 1 unit = perUnit × 사전 기본 단위 */
  setMyUnit(catalogName: string, unit: string, perUnit: number) {
    setState((s) => {
      const cur = { ...(s.preferences.myUnits ?? {}) };
      cur[catalogName] = { ...(cur[catalogName] ?? {}), [unit]: perUnit };
      return { ...s, preferences: { ...s.preferences, myUnits: cur } };
    });
  },
  /** 다 먹음(사용 완료) — 재고에서 빼되 폐기로 세지 않는다. */
  useUpIngredient(id: string) {
    const it = state.ingredients.find((x) => x.id === id);
    if (it) remember(`${it.name} 다 씀`);
    setState((s) => ({ ...s, ingredients: s.ingredients.filter((x) => x.id !== id) }));
  },
  /** 버림(폐기) — 재고에서 빼고 폐기 기록을 남긴다. */
  discardIngredient(id: string, reason: WasteRecord['reason']) {
    const found = state.ingredients.find((x) => x.id === id);
    if (found) remember(`${found.name} 버림`);
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
    remember(`${recipe.name} 요리 완료`);
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
    remember(`남은 ${it.name} 먹음`);
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
    setState((s) => ({ ...s, meals: [rec, ...s.meals], mealPlan: linkPlan(s, rec) }));
    return rec;
  },
  updateMeal(id: string, patch: Partial<MealRecord>) {
    setState((s) => ({ ...s, meals: s.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  },
  deleteMeal(id: string) {
    remember('식사 기록 삭제');
    // 이 기록으로 완료 처리된 식단은 다시 '계획'으로
    setState((s) => ({
      ...s,
      meals: s.meals.filter((m) => m.id !== id),
      mealPlan: s.mealPlan.map((e) => (e.mealId === id ? { ...e, status: undefined, mealId: undefined } : e)),
    }));
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
    remember('장보기 항목 삭제');
    setState((s) => ({ ...s, shopping: s.shopping.filter((x) => x.id !== id) }));
  },
  clearDoneShopping() {
    remember('산 것 정리');
    setState((s) => ({ ...s, shopping: s.shopping.filter((x) => !x.done) }));
  },

  addGoal(g: Omit<DietaryGoal, 'id'>) {
    setState((s) => ({ ...s, goals: [...s.goals, { ...g, id: newId('goal_') }] }));
  },
  updateGoal(id: string, patch: Partial<DietaryGoal>) {
    setState((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  },
  removeGoal(id: string) {
    remember('목표 삭제');
    setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
  },

  /** 식단 다시 짜기: 이미 먹은(완료) 끼니는 남기고, 그 날짜의 나머지만 바꾼다 */
  setMealPlan(entries: MealPlanEntry[], replaceDates: string[]) {
    setState((s) => {
      const kept = s.mealPlan.filter((e) => e.status === 'done' || !replaceDates.includes(e.date));
      const doneSlot = new Set(kept.filter((e) => e.status === 'done').map((e) => `${e.date}|${e.mealType}`));
      return { ...s, mealPlan: [...kept, ...entries.filter((e) => !doneSlot.has(`${e.date}|${e.mealType}`))] };
    });
  },
  /**
   * A3: 못 먹은 끼니 미루기 — 다음 날(지난 날짜면 오늘부터) 같은 끼니의 빈자리로 옮긴다.
   * 자리가 차 있으면 하루씩 더 뒤로(최대 7일).
   */
  postponePlan(id: string): string | null {
    let moved: string | null = null;
    setState((s) => {
      const e = s.mealPlan.find((x) => x.id === id);
      if (!e) return s;
      const today = toDateKey();
      let target = e.date < today ? today : addDays(e.date, 1);
      for (let i = 0; i < 7 && s.mealPlan.some((x) => x.id !== id && x.date === target && x.mealType === e.mealType); i++) target = addDays(target, 1);
      moved = target;
      return { ...s, mealPlan: s.mealPlan.map((x) => (x.id === id ? { ...x, date: target } : x)) };
    });
    return moved;
  },
  /** 오늘의 한 끼 고르기: 같은 날·같은 끼니에 있던 계획은 이 메뉴로 바꾼다(다른 끼니는 그대로) */
  chooseMeal(date: string, mealType: MealPlanEntry['mealType'], recipeId: string, reason: string) {
    // 이미 먹고 기록한 끼니에는 계획을 겹쳐 넣지 않는다(화면은 다음 끼니를 넘겨준다)
    if (state.mealPlan.some((e) => e.date === date && e.mealType === mealType && e.status === 'done')) return;
    setState((s) => ({
      ...s,
      mealPlan: [...s.mealPlan.filter((e) => !(e.date === date && e.mealType === mealType && e.status !== 'done')), { id: newId('plan_'), date, mealType, recipeId, reason }],
    }));
  },
  removeMealPlan(id: string) {
    remember('식단에서 뺌');
    setState((s) => ({ ...s, mealPlan: s.mealPlan.filter((e) => e.id !== id) }));
  },

  /** E13 추천 넘김 기억(개인화 동의가 있을 때만 점수에 씀) */
  skipRecipe(recipeId: string) {
    setState((s) => ({ ...s, skips: [{ recipeId, date: toDateKey() }, ...(s.skips ?? [])].slice(0, 50) }));
  },
  /** R8: 레시피에서 이상한 점 기록(같은 레시피·같은 내용은 한 번만, 최근 100개) */
  reportRecipe(recipeId: string, kind: string) {
    setState((s) => {
      const list = (s.recipeReports ?? []).filter((x) => !(x.recipeId === recipeId && x.kind === kind));
      return { ...s, recipeReports: [{ recipeId, kind, at: new Date().toISOString() }, ...list].slice(0, 100) };
    });
  },
  toggleFavorite(recipeId: string) {
    setState((s) => ({ ...s, favorites: s.favorites.includes(recipeId) ? s.favorites.filter((x) => x !== recipeId) : [recipeId, ...s.favorites] }));
  },
  /** 레시피 노트 저장(빈 글이면 지움) */
  setRecipeNote(recipeId: string, note: string) {
    setState((s) => {
      const notes = { ...s.recipeNotes };
      if (note.trim()) notes[recipeId] = { note: note.trim(), updatedAt: new Date().toISOString() };
      else delete notes[recipeId];
      return { ...s, recipeNotes: notes };
    });
  },

  dismissSuggestion(id: string) {
    setState((s) => ({ ...s, dismissedSuggestions: { ...s.dismissedSuggestions, [id]: toDateKey() } }));
  },

  undo() {
    const u = getUndo();
    if (!u) return;
    undoInfo = null;
    undoListeners.forEach((l) => l());
    setState(() => u.prev);
  },
  clearUndo() {
    undoInfo = null;
    undoListeners.forEach((l) => l());
  },

  /** C5 백업 불러오기: 지금 기록을 통째로 바꾼다(직후 8초 동안 되돌리기 가능) */
  restoreBackup(next: AppState, label = '백업 불러오기') {
    remember(label);
    setState(() => migrate(next));
  },
  replaceAll(next: AppState) {
    setState(() => migrate(next));
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
  const [day, setDay] = useState(toDateKey());
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
  // A8: 앱을 켜 둔 채 자정을 넘기거나, 다음 날 앱으로 돌아오면 '오늘'·D-day·임박 계산을 새로 한다
  useEffect(() => {
    const check = () => {
      const now = toDateKey();
      setDay((prev) => {
        if (prev === now) return prev;
        state = { ...state, visit: { last: new Date().toISOString(), previous: state.visit.last } };
        persist();
        setSnap(state);
        return now;
      });
    };
    const timer = setInterval(check, 60_000);
    const sub = RNAppState.addEventListener('change', (st) => st === 'active' && check());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  void day;
  // 불러오는 동안: 빈 화면 대신 작은 표시(보통 순간이라 문구 없이)
  if (!ready)
    return (
      <View style={{ flex: 1, backgroundColor: '#F7F4EE', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="불러오는 중">
        <ActivityIndicator color="#11805A" />
      </View>
    );
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
