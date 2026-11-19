import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { IconButton, PageHeader, Row, Screen, T } from '@/components/ui';
import { clay, color, radius, space } from '@/constants/tokens';
import { useAllRecipes, useAppState } from '@/data/store';
import type { MealType } from '@/data/types';
import { addDays, formatKoreanDate, toDateKey } from '@/logic/dates';
import { mealEmoji } from '@/logic/food-emoji';

const SLOTS: { type: MealType; label: string; emoji: string }[] = [
  { type: 'breakfast', label: '아침', emoji: '🌅' },
  { type: 'lunch', label: '점심', emoji: '☀️' },
  { type: 'dinner', label: '저녁', emoji: '🌙' },
  { type: 'snack', label: '간식', emoji: '🍪' },
];

/** 기록: 하루를 아침·점심·저녁·간식 칸으로. 빈 칸을 누르면 기록. */
export default function Log() {
  const s = useAppState();
  const recipes = useAllRecipes();
  const today = toDateKey();
  const [date, setDate] = useState(today);
  const meals = s.meals.filter((m) => m.mealDate === date);

  return (
    <Screen>
      <PageHeader
        eyebrow="기록"
        title={date === today ? '오늘 먹은 것' : formatKoreanDate(date)}
        right={
          <Row gap={6}>
            <IconButton label="전날 보기" onPress={() => setDate(addDays(date, -1))}>
              <View style={{ transform: [{ scaleX: -1 }] }}><Icon name="chevron" size={20} c={color.text} /></View>
            </IconButton>
            {date < today ? (
              <IconButton label="다음 날 보기" onPress={() => setDate(addDays(date, 1))}><Icon name="chevron" size={20} c={color.text} /></IconButton>
            ) : null}
          </Row>
        }
      />
      {meals.length === 0 && (
        <T v="small" c={color.textSub}>{date === today ? '지금 먹은 것부터 편하게 기록해요. 사진이나 이름만 있어도 돼요.' : '이날은 기록이 없어요. 생각나는 게 있으면 지금 남겨도 돼요.'}</T>
      )}
      {date !== today && (
        <Pressable onPress={() => setDate(today)} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
          <T v="small" c={color.brandDark} style={{ fontWeight: '700' }}>오늘로 돌아가기</T>
        </Pressable>
      )}

      {SLOTS.map((slot) => {
        const list = meals.filter((m) => m.mealType === slot.type).sort((a, b) => a.mealTime.localeCompare(b.mealTime));
        return (
          <View key={slot.type} style={{ ...clay, padding: space.md, gap: space.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="bodyBold">{slot.emoji} {slot.label}</T>
              {list.length > 0 && (
                <Pressable onPress={() => router.push(`/meal-record/edit?type=${slot.type}&date=${date}`)} hitSlop={10}>
                  <T v="h3" c={color.brandDark}>+</T>
                </Pressable>
              )}
            </Row>
            {list.length === 0 ? (
              <Pressable
                onPress={() => router.push(`/meal-record/edit?type=${slot.type}&date=${date}`)}
                style={({ pressed }) => ({ height: 64, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.border, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? color.brandSoft : 'transparent' })}>
                <T c={color.textMuted}>+ 기록</T>
              </Pressable>
            ) : (
              list.map((m) => (
                <Pressable key={m.id} onPress={() => router.push(`/meal-record/edit?id=${m.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  {m.imageUri ? (
                    <Image source={{ uri: m.imageUri }} style={{ width: 52, height: 52, borderRadius: radius.md }} contentFit="cover" />
                  ) : (
                    <View style={{ width: 52, height: 52, borderRadius: radius.md, backgroundColor: color.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 28 }}>{mealEmoji(m, recipes)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <T v="bodyBold" numberOfLines={1}>{m.items.map((x) => x.foodName).join(', ') || m.description || '식사'}</T>
                    <T v="tiny" c={color.textMuted}>{m.mealTime}</T>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        );
      })}
    </Screen>
  );
}
