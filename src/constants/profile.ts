import type { FoodPreferences, FridgeSize, FridgeSpace, GoalType } from '@/data/types';

/**
 * 온보딩·설정에서 쓰는 선택지 모음.
 * 선택지를 늘리거나 바꿀 때는 이 파일만 고치면 된다(화면 코드는 그대로).
 */

// ───────── 생활 유형 ─────────
// 생활 유형은 '고정된 사람 유형'이 아니라 추천의 출발점(기본값)이다. 여러 개를 고를 수 있다.
export interface Lifestyle {
  id: string;
  emoji: string;
  label: string;
  /** 고르면 다음 질문들에 미리 채워 둘 값(사용자가 바꿀 수 있음) */
  defaults: Partial<Pick<FoodPreferences, 'householdSize' | 'maxCookMinutes' | 'cookingSkill' | 'planHabit' | 'budgetBand'>>;
}

export const LIFESTYLES: Lifestyle[] = [
  { id: 'student', emoji: '🎒', label: '자취하는 대학생', defaults: { householdSize: 1, maxCookMinutes: 20, budgetBand: 'b1' } },
  { id: 'delivery_worker', emoji: '🛵', label: '배달을 자주 먹는 1인 직장인', defaults: { householdSize: 1, maxCookMinutes: 10, planHabit: 'today' } },
  { id: 'homecook_worker', emoji: '🍚', label: '집밥을 자주 먹는 직장인', defaults: { householdSize: 1, maxCookMinutes: 20, planHabit: 'week' } },
  { id: 'beginner', emoji: '🔰', label: '요리 초보', defaults: { cookingSkill: '초보' } },
  { id: 'family', emoji: '🏠', label: '가족과 함께 살아요', defaults: { householdSize: 3 } },
  { id: 'four', emoji: '👨‍👩‍👧‍👦', label: '4인 가구', defaults: { householdSize: 4, planHabit: 'week', budgetBand: 'b4' } },
];

export function lifestyleLabels(ids: string[]): string[] {
  return ids.map((id) => LIFESTYLES.find((l) => l.id === id)?.label).filter((x): x is string => !!x);
}

// ───────── 월간 식비 ─────────
export const BUDGET_BANDS: { id: string; label: string; value: number }[] = [
  { id: 'b1', label: '20만 원 이하', value: 150000 },
  { id: 'b2', label: '20~35만 원', value: 275000 },
  { id: 'b3', label: '35~50만 원', value: 425000 },
  { id: 'b4', label: '50만 원 이상', value: 600000 },
];

export function budgetLabel(p: Pick<FoodPreferences, 'monthlyBudget' | 'budgetBand'>): string {
  if (!p.monthlyBudget) return '정하지 않음';
  const band = BUDGET_BANDS.find((b) => b.id === p.budgetBand);
  return band ? `${band.label}(대략)` : `월 ${p.monthlyBudget.toLocaleString()}원`;
}

// ───────── 냉장고 ─────────
export const FRIDGE_SIZES: { id: FridgeSize; emoji: string; label: string; sub: string }[] = [
  { id: 'mini', emoji: '🧊', label: '미니', sub: '원룸 옵션·소형' },
  { id: 'single', emoji: '🚪', label: '1~2인용', sub: '문 1~2개 일반형' },
  { id: 'standard', emoji: '🗄️', label: '가정용', sub: '양문형·4도어' },
  { id: 'large', emoji: '🏬', label: '대형', sub: '냉장고 2대·김치냉장고 포함' },
];

export const FRIDGE_SPACES: { id: FridgeSpace; emoji: string; label: string }[] = [
  { id: 'full', emoji: '😵', label: '거의 꽉 찼어요' },
  { id: 'some', emoji: '🙂', label: '조금 있어요' },
  { id: 'lots', emoji: '🌬️', label: '넉넉해요' },
];

// ───────── 요리 시간 ─────────
export const COOK_TIME_BANDS: { minutes: number; label: string }[] = [
  { minutes: 10, label: '10분 이내' },
  { minutes: 20, label: '10~20분' },
  { minutes: 40, label: '20~40분' },
  { minutes: 60, label: '40분 이상' },
];

export const SKILLS: { key: FoodPreferences['cookingSkill']; emoji: string; label: string; sub: string }[] = [
  { key: '초보', emoji: '🥚', label: '처음이에요', sub: '라면·계란 요리 정도' },
  { key: '보통', emoji: '🍳', label: '조금 해 봤어요', sub: '찌개·볶음 가능' },
  { key: '능숙', emoji: '👩‍🍳', label: '자신 있어요', sub: '레시피 없이도 OK' },
];

// ───────── 목표 ─────────
// track이 있으면 '식생활 목표' 화면의 진행률로도 만든다.
export const GOAL_OPTIONS: { label: string; emoji: string; track?: { type: GoalType; target: number; unit: string } }[] = [
  { label: '하루 세 끼 챙겨 먹기', emoji: '🍽️', track: { type: 'regular_meals', target: 5, unit: '일/주' } },
  { label: '집밥 횟수 늘리기', emoji: '🍚', track: { type: 'home_cooking', target: 5, unit: '회/주' } },
  { label: '식재료 낭비 줄이기', emoji: '♻️', track: { type: 'less_waste', target: 0, unit: '개/주' } },
  { label: '요리 실력 늘리기', emoji: '🔪' },
  { label: '감량', emoji: '📉' },
  { label: '증량', emoji: '📈' },
  { label: '현재 체중 유지', emoji: '⚖️' },
  { label: '근육량 증가', emoji: '💪' },
  { label: '체지방률 감소', emoji: '🏃' },
];

/** 몸 관련 목표 — 고르면 '신체 정보는 원할 때 설정에서' 안내를 보여 준다 */
export const BODY_GOALS = ['감량', '증량', '현재 체중 유지', '근육량 증가', '체지방률 감소'];

// ───────── 기피 음식 예시 ─────────
export const DISLIKE_OPTIONS = ['오이', '가지', '버섯', '당근', '양파', '파', '고수', '피망', '내장', '날생선', '매운 음식'];

// ───────── AI 코치 ─────────
// 코치 = 말투와 성격. 캐릭터 외형과 따로 고른다(같은 외형으로 다른 말투도 가능).
export type CoachMoment = 'start' | 'welcome_back' | 'goal_done' | 'ate_today' | 'next_menu' | 'expiring' | 'leftover';

export interface Coach {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  /** 상황별 말. {x}에는 음식·재료 이름, {n}에는 숫자가 들어간다 */
  lines: Record<CoachMoment, string>;
  /** 코치 선택 화면에서 보여 줄 대화 예시 */
  sample: { me: string; coach: string }[];
}

export const COACHES: Coach[] = [
  {
    id: 'warm',
    name: '다정한 코치',
    emoji: '🤗',
    tagline: '천천히, 부담 없이 같이 해요',
    lines: {
      start: '오늘은 뭐든 괜찮아요. 한 끼만 같이 챙겨 볼까요?',
      welcome_back: '{n}일 만이에요! 다시 와 줘서 반가워요',
      goal_done: '‘{x}’ 이번 주 목표를 채웠어요. 멋져요!',
      ate_today: '{x} 맛있게 먹었네요 😊',
      next_menu: '다음엔 {x} 어때요?',
      expiring: '{x}{을} 오늘 같이 써 봐요',
      leftover: '남겨 둔 {x}부터 먹어요',
    },
    // 예시 대화는 흔한 알레르기 재료(계란·우유·밀·대두 등)를 피해서 쓴다
    sample: [
      { me: '오늘 너무 피곤해…', coach: '그런 날엔 10분 덮밥이면 충분해요. 냉장고 재료로 바로 돼요!' },
      { me: '어제 배달만 먹었어', coach: '괜찮아요. 오늘 한 끼만 집에서 먹어 봐도 좋아요.' },
    ],
  },
  {
    id: 'brief',
    name: '똑똑한 코치',
    emoji: '🧠',
    tagline: '핵심만 짧게 알려 줘요',
    lines: {
      start: '재료를 넣으면 메뉴를 골라 드려요.',
      welcome_back: '{n}일 만이에요. 냉장고부터 확인해요.',
      goal_done: '‘{x}’ 이번 주 달성.',
      ate_today: '{x} 기록 완료.',
      next_menu: '다음 추천: {x}',
      expiring: '{x} 기한 임박. 먼저 쓰기.',
      leftover: '남은 {x} 먼저.',
    },
    sample: [
      { me: '오늘 뭐 먹지?', coach: '애호박 D-1. 애호박볶음 10분, 재료 다 있음.' },
      { me: '장 볼 거 있어?', coach: '대파 1대만 사면 이번 주 식단 완성.' },
    ],
  },
  {
    id: 'cheer',
    name: '신나는 코치',
    emoji: '🎉',
    tagline: '작은 것도 크게 칭찬해요',
    lines: {
      start: '오늘 첫 끼, 같이 시작해 볼까요? 🙌',
      welcome_back: '와! {n}일 만이에요! 보고 싶었어요 🎉',
      goal_done: '‘{x}’ 달성! 오늘 최고예요 🏆',
      ate_today: '{x} 먹었군요! 잘했어요 👏',
      next_menu: '다음은 {x}! 기대돼요 ✨',
      expiring: '{x} 구출 작전 시작! 🚀',
      leftover: '남은 {x}, 오늘 해치워요! 💪',
    },
    sample: [
      { me: '처음으로 김치찌개 끓였어', coach: '대박! 첫 찌개 성공이에요 🎉 맛은 어땠어요?' },
      { me: '양파가 남았어', coach: '양파 구출 작전! 양파볶음밥 어때요? 🚀' },
    ],
  },
];

export function getCoach(id: string | undefined): Coach {
  return COACHES.find((c) => c.id === id) ?? COACHES[0];
}
