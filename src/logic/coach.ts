import { getCoach, type CoachMoment } from '@/constants/profile';
import type { AppState } from '@/data/types';
import { goalProgress } from './analysis';
import { daysSince, eul, toDateKey } from './dates';
import { isSafeIngredient, restrictionsOf } from './safety';
import { expiringIngredients } from './suggestions';

/**
 * 홈 캐릭터(AI 코치)의 지금 상태.
 * 모두 실제 앱 데이터에서만 정한다(지어낸 말 없음). 규칙 기반이라 AI 키가 없어도 동작한다.
 *
 * 우선순위: 오랜만에 돌아옴 → 목표 달성 → 남은 음식 → 임박 재료 → 오늘 먹은 음식 → 다음 추천 → 기본
 */
export interface CoachState {
  moment: CoachMoment;
  text: string;
  mood: 'happy' | 'idle';
  /** 캐릭터가 들고 있을 음식(오늘 먹은 음식) */
  holdingName?: string;
}

/** 진행률이 '해낸 만큼 올라가는' 목표만 축하한다(낭비·식비처럼 0일 때 달성인 목표는 제외) */
const CELEBRATE = ['regular_meals', 'home_cooking', 'variety', 'vegetables'];

export function fill(template: string, x = '', n = 0): string {
  return template.replace('{x}{을}', eul(x)).replace(/\{x\}/g, x).replace(/\{n\}/g, String(n));
}

export function coachState(s: AppState, nextMenuName?: string | null, now = new Date()): CoachState {
  const coach = getCoach(s.preferences.coachId);
  const say = (moment: CoachMoment, x = '', n = 0, mood: CoachState['mood'] = 'happy', holdingName?: string): CoachState => ({
    moment,
    text: fill(coach.lines[moment], x, n),
    mood,
    holdingName,
  });
  const today = toDateKey(now);

  const prev = s.visit?.previous;
  if (prev) {
    const gap = daysSince(prev, now);
    if (gap >= 3) return say('welcome_back', '', gap);
  }

  for (const g of s.goals.filter((x) => x.status === 'active' && CELEBRATE.includes(x.goalType))) {
    const p = goalProgress(g, s);
    if (p && p.value > 0 && p.ratio >= 1) return say('goal_done', g.title);
  }

  const leftover = s.ingredients.find((i) => i.kind === 'leftover');
  if (leftover) return say('leftover', leftover.name);

  // 알레르기·기피 재료는 코치가 '써 보자'고 권하지 않는다
  const rs = restrictionsOf(s.preferences);
  const expiring = expiringIngredients(s).filter((i) => i.kind !== 'leftover' && isSafeIngredient(i.name, rs));
  if (expiring.length) return say('expiring', expiring[0].name, 0, 'idle');

  const todayMeals = s.meals.filter((m) => m.mealDate === today).sort((a, b) => b.mealTime.localeCompare(a.mealTime));
  const ate = todayMeals[0]?.items[0]?.foodName;
  if (ate) return say('ate_today', ate, 0, 'happy', ate);

  if (nextMenuName) return say('next_menu', nextMenuName, 0, 'idle');
  return say('start', '', 0, 'idle');
}
