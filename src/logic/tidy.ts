import type { Ingredient } from '@/data/types';
import { daysUntil, toDateKey } from './dates';
import { convert } from './units';

/**
 * 냉장고 정리(A2·A4).
 * - 소비기한이 지난 재료는 '상태를 확인하기 전까지' 추천·식단에 쓰지 않는다.
 *   사용자가 "아직 괜찮아요"라고 하면 2일 동안은 다시 묻지 않고 재료로 쓴다(앱이 기한을 늘리지는 않음).
 * - 요리하고 남은 아주 적은 양(0.1개, 5g 등)은 '있음'으로 세지 않고 정리할지 묻는다.
 */

export const RECHECK_DAYS = 2;

/** 기한이 지났고, 최근에 '아직 괜찮아요'로 확인하지 않은 재료 */
export function needsExpiryCheck(i: Ingredient, today = toDateKey()): boolean {
  if (!i.expiryDate || daysUntil(i.expiryDate, today) >= 0) return false;
  if (i.expiryCheckedOn && -daysUntil(i.expiryCheckedOn, today) < RECHECK_DAYS) return false;
  return true;
}

/** 아주 적게 남은 재료인지(양념·남은 음식은 제외, 사용자가 '남겨 두기'를 골랐으면 제외) */
export function isTiny(i: Ingredient): boolean {
  if (i.kind === 'leftover' || i.category === '양념' || i.keepSmall) return false;
  const g = convert(i.quantity, i.unit, 'g', i.name);
  if (g != null && ['g', 'kg', '근', '그램', '킬로'].includes(i.unit)) return g < 15;
  const ml = convert(i.quantity, i.unit, 'ml', i.name);
  if (ml != null && ['ml', 'l', 'L', '리터', '컵'].includes(i.unit)) return ml < 15;
  if (['큰술', '작은술'].includes(i.unit)) return i.quantity < 0.5;
  return i.quantity < 0.25; // 개·모·대·공기·봉 …
}

/** 추천·식단 계산에 쓸 수 있는 재료인지 */
export function isUsable(i: Ingredient, today = toDateKey()): boolean {
  return i.quantity > 0 && !needsExpiryCheck(i, today) && !isTiny(i);
}

/** 정리할 재료 목록: 기한 지난 것 먼저, 그다음 아주 적게 남은 것 */
export function tidyList(stock: Ingredient[], today = toDateKey()) {
  const expired = stock.filter((i) => needsExpiryCheck(i, today)).sort((a, b) => a.expiryDate!.localeCompare(b.expiryDate!));
  const tiny = stock.filter((i) => !needsExpiryCheck(i, today) && isTiny(i));
  return { expired, tiny, total: expired.length + tiny.length };
}
