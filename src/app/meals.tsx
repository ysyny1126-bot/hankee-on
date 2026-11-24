import { Image } from 'expo-image';

import { Button, Card, Empty, ListItem, Screen, T } from '@/components/ui';
import { color, radius } from '@/constants/tokens';
import { useAppState } from '@/data/store';
import { MEAL_LABEL, SOURCE_LABEL } from '@/logic/analysis';
import { formatKoreanDate } from '@/logic/dates';

export default function Meals() {
  const s = useAppState();
  const sorted = s.meals.slice().sort((a, b) => (b.mealDate + b.mealTime).localeCompare(a.mealDate + a.mealTime));
  const dates = [...new Set(sorted.map((m) => m.mealDate))];
  return (
    <Screen edges={['bottom']}>
      <Button title="식사 기록 추가" icon="📸" href="/meal-record/edit" />
      {dates.length === 0 && <Empty emoji="🍱" title="지금 먹은 것부터 편하게 기록해요" body="사진 한 장이나 음식 이름만 있어도 돼요." />}
      {dates.map((d) => (
        <Card key={d}>
          <T v="bodyBold">{formatKoreanDate(d)}</T>
          {sorted.filter((m) => m.mealDate === d).map((m) => {
            const kcal = m.items.reduce((a, i) => a + (i.nutrition?.calories ?? 0) * (i.quantity || 1), 0);
            return (
              <ListItem
                key={m.id}
                href={`/meal-record/edit?id=${m.id}`}
                left={m.imageUri ? <Image source={{ uri: m.imageUri }} style={{ width: 44, height: 44, borderRadius: radius.sm }} /> : <T v="h2">{m.sourceType === 'home' ? '🍚' : m.sourceType === 'delivery' ? '🛵' : m.sourceType === 'eat_out' ? '🍽️' : '🏪'}</T>}
                title={`${MEAL_LABEL[m.mealType]} ${m.mealTime} · ${m.items.map((i) => i.foodName).join(', ') || m.description}`}
                sub={`${SOURCE_LABEL[m.sourceType]}${kcal ? ` · 약 ${Math.round(kcal)}kcal(추정)` : ''}${m.description ? ` · ${m.description}` : ''}`}
                right={<T c={color.textMuted}>›</T>}
              />
            );
          })}
        </Card>
      ))}
    </Screen>
  );
}
