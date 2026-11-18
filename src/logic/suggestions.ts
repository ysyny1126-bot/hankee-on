import { BUILTIN_RECIPES } from '@/data/recipes';
import type { AppState, Ingredient, Recipe } from '@/data/types';
import { sameIngredient } from '@/data/catalog';
import { analyzePeriod, goalProgress, lastNDays } from './analysis';
import { daysSince, daysUntil, eul, euro, toDateKey } from './dates';
import { rankRecipes, type RecipeMatch } from './inventory';
import { rankContext, topReasons } from './recommend';
import { isSafeIngredient, restrictionsOf } from './safety';

/**
 * "먼저 제안하는 AI"의 두뇌.
 * 사용자가 묻기 전에, 쌓인 데이터(재고·소비기한·식사 기록·목표)를 보고 할 일을 제안한다.
 * 모든 제안에는 '왜 이 제안을 하는지(reason)'가 붙는다.
 */
export type SuggestionKind = 'leftover' | 'expiring' | 'unused' | 'today_menu' | 'shopping' | 'variety' | 'goal' | 'record';

export interface Suggestion {
  id: string; // 같은 제안을 하루에 한 번만 숨길 수 있게 하는 키
  kind: SuggestionKind;
  emoji: string;
  title: string;
  body: string;
  reason: string;
  action?: { label: string; href: string };
  recipeId?: string;
  usesHistory: boolean; // 식사 기록(개인화 데이터)을 썼는지
}

export function allRecipes(s: AppState): Recipe[] {
  return [...s.customRecipes, ...BUILTIN_RECIPES];
}

export function recentMealNames(s: AppState, days = 3): string[] {
  const { start } = lastNDays(days);
  return s.meals.filter((m) => m.mealDate >= start).flatMap((m) => m.items.map((i) => i.foodName));
}

/** 사용자 맞춤 레시피 순위(점수·이유 포함). 개인화 동의가 없으면 기록은 쓰지 않는다. */
export function rankForUser(s: AppState): RecipeMatch[] {
  return rankRecipes(allRecipes(s), s.ingredients, rankContext(s));
}

function recipeUsing(ranked: RecipeMatch[], ing: Ingredient) {
  return ranked.find((m) => m.recipe.ingredients.some((i) => sameIngredient(i.name, ing.name)));
}

export function expiringIngredients(s: AppState, within = s.notifications.expiryDaysBefore): Ingredient[] {
  return s.ingredients
    .filter((i) => i.expiryDate && daysUntil(i.expiryDate) <= within)
    .sort((a, b) => (a.expiryDate! < b.expiryDate! ? -1 : 1));
}

export function buildSuggestions(s: AppState, now = new Date()): Suggestion[] {
  const out: Suggestion[] = [];
  const today = toDateKey(now);
  const n = s.notifications;
  const personal = s.consents.personalization;
  const ranked = rankForUser(s);

  // 0) 남은 음식 먼저 (1인 가구 핵심: 만들어 둔 음식부터)
  for (const lo of s.ingredients.filter((i) => i.kind === 'leftover').slice(0, 2)) {
    const d = lo.expiryDate ? daysUntil(lo.expiryDate) : null;
    out.push({
      id: `leftover:${lo.id}`,
      kind: 'leftover',
      emoji: lo.emoji,
      title: `남은 ${lo.name} ${lo.quantity}인분 있어요`,
      body: d !== null && d < 0 ? '기한이 지났어요. 상태를 확인해 주세요.' : '다시 요리하지 않고 바로 한 끼 해결!',
      reason: d === null ? `${daysSince(lo.addedAt, now)}일 전에 만든 음식` : `${lo.expiryDate}까지 드시기로 함`,
      action: { label: '먹기', href: '/fridge' },
      recipeId: lo.recipeId,
      usesHistory: false,
    });
  }

  // 1) 소비기한 임박 재료 활용
  if (n.expiry) {
    const rs = restrictionsOf(s.preferences);
    for (const ing of expiringIngredients(s).slice(0, 2)) {
      const d = daysUntil(ing.expiryDate!);
      // 알레르기·기피 재료는 메뉴로 권하지 않고 정리만 안내한다
      const safe = isSafeIngredient(ing.name, rs);
      const r = safe ? recipeUsing(ranked, ing) : undefined;
      out.push({
        id: `expiring:${ing.id}`,
        kind: 'expiring',
        emoji: '⏰',
        title: d < 0 ? `${ing.name} 소비기한이 지났어요` : `${ing.name}, ${d === 0 ? '오늘까지' : `${d}일 남았어요`}`,
        body: d < 0
          ? '상태를 확인하고 먹을 수 없다면 폐기로 기록해 주세요. 낭비 통계에 반영돼요.'
          : !safe ? '피하는 재료로 설정돼 있어요. 함께 사는 사람이 쓰거나 정리해 주세요.' : r ? `${r.recipe.emoji} ${r.recipe.name}에 쓸 수 있어요.` : '이 재료를 쓰는 메뉴를 찾아볼까요?',
        reason: `입력하신 소비기한 ${ing.expiryDate} 기준`,
        action: d < 0 ? { label: '재료 확인', href: `/ingredient/edit?id=${ing.id}` } : r ? { label: '레시피 보기', href: `/recipe/${r.recipe.id}` } : undefined,
        recipeId: r?.recipe.id,
        usesHistory: false,
      });
    }
  }

  // 2) 오래 쓰지 않은 재료
  if (n.unusedIngredient) {
    const stale = s.ingredients.find(
      (i) =>
        (!i.expiryDate || daysUntil(i.expiryDate) > n.expiryDaysBefore) &&
        daysSince(i.lastUsedAt ?? i.addedAt, now) >= 7 &&
        i.category !== '양념' &&
        i.kind !== 'leftover' &&
        isSafeIngredient(i.name, restrictionsOf(s.preferences)),
    );
    if (stale) {
      const r = recipeUsing(ranked, stale);
      out.push({
        id: `unused:${stale.id}`,
        kind: 'unused',
        emoji: '🔍',
        title: `${eul(stale.name)} ${daysSince(stale.lastUsedAt ?? stale.addedAt, now)}일째 쓰지 않았어요`,
        body: r ? `${r.recipe.emoji} ${euro(r.recipe.name)} 활용해 보세요.` : '활용할 수 있는 레시피를 찾아볼까요?',
        reason: stale.lastUsedAt ? '마지막 요리 사용일 기준' : '등록 후 요리에 쓴 기록이 없음',
        action: r ? { label: '레시피 보기', href: `/recipe/${r.recipe.id}` } : { label: '요리 찾기', href: '/cook' },
        recipeId: r?.recipe.id,
        usesHistory: false,
      });
    }
  }

  // 3) 오늘의 메뉴: 보유 재료로 바로 만들 수 있는 것
  if (n.menuSuggestion) {
    const best = ranked.find((m) => m.coverage >= 0.99) ?? ranked.find((m) => m.coverage >= 0.6);
    if (best && s.ingredients.length) {
      const h = now.getHours();
      const when = h < 10 ? '아침' : h < 15 ? '점심' : '저녁';
      out.push({
        id: `today:${best.recipe.id}`,
        kind: 'today_menu',
        emoji: '🍽️',
        title: `오늘 ${when}은 ${best.recipe.name} 어때요?`,
        body: best.missingRequired.length ? `${best.missingRequired.map((i) => i.name).join(', ')}만 있으면 돼요.` : '냉장고 재료로 바로 만들 수 있어요.',
        reason: topReasons(best, 2).join(' · '),
        action: { label: '레시피 보기', href: `/recipe/${best.recipe.id}` },
        recipeId: best.recipe.id,
        usesHistory: best.reasons.some((r) => r.personal && r.text),
      });
    }
  }

  // 4) 장보기: 1~2개만 부족한 레시피
  if (n.shopping && s.ingredients.length) {
    const near = ranked.find(
      (m) =>
        m.missingRequired.length > 0 &&
        m.missingRequired.length <= 2 &&
        !m.missingRequired.every((x) => s.shopping.some((sh) => !sh.done && sameIngredient(sh.name, x.name))),
    );
    if (near) {
      out.push({
        id: `shop:${near.recipe.id}`,
        kind: 'shopping',
        emoji: '🛒',
        title: `${near.missingRequired.map((i) => i.name).join(', ')}만 사면 ${eul(near.recipe.name)} 만들 수 있어요`,
        body: '장보기 목록에 담아 둘까요?',
        reason: `필수 재료 ${near.haveCount}/${near.requiredCount}개 보유`,
        action: { label: '레시피에서 담기', href: `/recipe/${near.recipe.id}` },
        recipeId: near.recipe.id,
        usesHistory: false,
      });
    }
  }

  // 5) 기억하는 AI: 최근 자주 먹은 메뉴와 다른 메뉴 (개인화 동의 시에만)
  if (personal && n.menuSuggestion) {
    const a = analyzePeriod(s.meals, lastNDays(7, today).start, today);
    const top = a.topFoods[0];
    if (top && top.count >= 3) {
      const alt = ranked.find((m) => m.recipe.name !== top.name && !a.distinctFoods.includes(m.recipe.name));
      if (alt) {
        out.push({
          id: `variety:${top.name}`,
          kind: 'variety',
          emoji: '✨',
          title: `최근 ${eul(top.name)} 자주 드셨네요`,
          body: `색다르게 ${alt.recipe.emoji} ${alt.recipe.name}은 어때요?`,
          reason: `최근 7일 식사 기록에서 ${top.name} ${top.count}회`,
          action: { label: '레시피 보기', href: `/recipe/${alt.recipe.id}` },
          recipeId: alt.recipe.id,
          usesHistory: true,
        });
      }
    }
    // 6) 목표 맞춤 아이디어
    for (const g of s.goals.filter((x) => x.status === 'active')) {
      const p = goalProgress(g, s);
      if (!p || p.ratio >= 1) continue;
      if (g.goalType === 'vegetables' || g.goalType === 'variety') {
        const veg = ranked.find((m) => m.recipe.tags.includes('채소듬뿍') || m.recipe.tags.includes('샐러드'));
        if (veg)
          out.push({
            id: `goal:${g.id}`,
            kind: 'goal',
            emoji: '🎯',
            title: `'${g.title}' 목표에 맞는 메뉴`,
            body: `${veg.recipe.emoji} ${euro(veg.recipe.name)} 한 걸음 더 가까워져요.`,
            reason: `${p.basis}: ${p.value}${g.unit} / 목표 ${g.targetValue}${g.unit}`,
            action: { label: '레시피 보기', href: `/recipe/${veg.recipe.id}` },
            recipeId: veg.recipe.id,
            usesHistory: true,
          });
        break;
      }
    }
  }

  // 7) 기록 안내: 오늘 점심 시간이 지났는데 기록이 없을 때
  const todayMeals = s.meals.filter((m) => m.mealDate === today);
  if (now.getHours() >= 14 && todayMeals.length === 0) {
    out.push({
      id: `record:${today}`,
      kind: 'record',
      emoji: '📸',
      title: '오늘 드신 식사를 기록해 볼까요?',
      body: '사진 한 장이나 음식 이름만으로도 충분해요.',
      reason: '오늘 식사 기록 없음',
      action: { label: '식사 기록', href: '/meal-record/edit' },
      usesHistory: false,
    });
  }

  // 중요한 순서: 기한 지난/임박 → 오늘 메뉴 → 기억 기반 → 목표 → 오래 안 쓴 재료 → 장보기 → 기록 안내
  const order: SuggestionKind[] = ['leftover', 'expiring', 'today_menu', 'variety', 'goal', 'unused', 'shopping', 'record'];
  return out
    .filter((x) => s.dismissedSuggestions[x.id] !== today)
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}
