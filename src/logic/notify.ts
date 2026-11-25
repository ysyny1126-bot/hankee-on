import { Platform } from 'react-native';

import type { AppState } from '@/data/types';
import { addDays, fromDateKey, toDateKey } from './dates';

/**
 * 휴대폰 로컬 알림: 소비기한 임박 + 식사 기록 리마인더(사용자가 켠 것만).
 * - 사용자가 입력한 소비기한만 쓴다.
 * - 설정의 "며칠 전", "하루 최대 개수"를 지킨다.
 * - 웹에서는 휴대폰 알림을 보낼 수 없어서 앱 안의 홈 카드로만 안내한다.
 */
async function lib() {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const N = await lib();
  if (!N) return false;
  try {
    const cur = await N.getPermissionsAsync();
    if (cur.granted) return true;
    const req = await N.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

export async function syncExpiryNotifications(s: AppState) {
  const N = await lib();
  if (!N) return;
  const perm = await N.getPermissionsAsync();
  if (!perm.granted) return;
  await N.cancelAllScheduledNotificationsAsync();

  N.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });

  // 식사 기록 리마인더: 사용자가 켠 경우에만, 고른 시각마다 하루 한 번
  if (s.notifications.mealReminder) {
    for (const t of s.notifications.mealReminderTimes) {
      const [hour, minute] = t.split(':').map(Number);
      if (Number.isNaN(hour) || Number.isNaN(minute)) continue;
      await N.scheduleNotificationAsync({
        content: { title: '🍽️ 식사 기록할 시간', body: '방금 먹은 음식, 사진 한 장이나 이름만 남겨도 돼요.' },
        trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
    }
  }

  if (!s.notifications.expiry) return;

  // 알림 날짜별로 묶어서 하루 최대 개수를 지킨다.
  const byDay = new Map<string, string[]>();
  const today = toDateKey();
  for (const ing of s.ingredients) {
    if (!ing.expiryDate) continue;
    const day = addDays(ing.expiryDate, -s.notifications.expiryDaysBefore);
    const when = day < today ? today : day;
    byDay.set(when, [...(byDay.get(when) ?? []), ing.name]);
  }
  for (const [day, names] of byDay) {
    const at = fromDateKey(day);
    at.setHours(9, 0, 0, 0);
    if (at.getTime() < Date.now()) at.setTime(Date.now() + 60_000);
    const chunks = names.slice(0, Math.max(1, s.notifications.maxPerDay));
    for (const [i, name] of chunks.entries()) {
      const extra = i === chunks.length - 1 && names.length > chunks.length ? ` 외 ${names.length - chunks.length}개` : '';
      await N.scheduleNotificationAsync({
        content: { title: '⏰ 소비기한이 다가와요', body: `${name}${extra} — 오잘먹에서 활용 레시피를 확인해 보세요.` },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(at.getTime() + i * 60_000) },
      });
    }
  }
}
