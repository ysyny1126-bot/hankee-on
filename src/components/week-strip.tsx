import { Pressable, Text, View } from 'react-native';

import { T } from '@/components/ui';
import { color } from '@/constants/tokens';
import type { MealPlanEntry, MealRecord } from '@/data/types';
import { addDays, fromDateKey, toDateKey, weekStart } from '@/logic/dates';

const DAY = ['월', '화', '수', '목', '금', '토', '일'];
const MAIN = ['breakfast', 'lunch', 'dinner'];

/**
 * 이번 주 요일 줄: 동그라미가 그날 기록한 끼니(아침·점심·저녁, 최대 3)만큼 아래부터 채워진다.
 * 아래 작은 점 = 그날 식단 계획이 있음. 색만으로 구분하지 않도록 읽기 이름에 끼니 수를 함께 넣는다.
 * 기록이 없는 날은 빈 동그라미일 뿐, 경고나 표시를 따로 하지 않는다.
 */
export function WeekStrip({ meals, plan, selected, onSelect, today = toDateKey() }: { meals: MealRecord[]; plan: MealPlanEntry[]; selected?: string; onSelect?: (d: string) => void; today?: string }) {
  const start = weekStart(selected ?? today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {days.map((d, i) => {
        const n = new Set(meals.filter((m) => m.mealDate === d && MAIN.includes(m.mealType)).map((m) => m.mealType)).size;
        const planned = plan.some((p) => p.date === d);
        const isToday = d === today;
        const isSel = d === (selected ?? today);
        const future = d > today;
        const Wrap = onSelect && !future ? Pressable : View;
        return (
          <Wrap
            key={d}
            {...(onSelect && !future ? { onPress: () => onSelect(d), accessibilityRole: 'button' as const, accessibilityState: { selected: isSel } } : {})}
            accessibilityLabel={`${fromDateKey(d).getDate()}일 ${DAY[i]}요일${isToday ? '(오늘)' : ''}, ${future ? '다가올 날' : `${n}끼 기록`}${planned ? ', 식단 있음' : ''}`}
            style={{ alignItems: 'center', gap: 4, minWidth: 40, opacity: future ? 0.55 : 1 }}>
            <T v="tiny" c={isToday ? color.text : color.textMuted} style={{ fontWeight: isToday ? '800' : '600' }}>{isToday ? '오늘' : DAY[i]}</T>
            <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: isSel ? 2.5 : 1.5, borderColor: isSel ? color.text : color.border, backgroundColor: color.surface, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
              {n > 0 && <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${(n / 3) * 100}%`, backgroundColor: color.brand }} />}
              <Text style={{ fontFamily: 'Pretendard-Bold', fontSize: 13, color: color.text }}>{fromDateKey(d).getDate()}</Text>
            </View>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: planned ? color.info : 'transparent' }} />
          </Wrap>
        );
      })}
    </View>
  );
}
