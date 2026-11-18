import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Row, Screen, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
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
      <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
        <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={12} style={{ padding: space.sm }}><T v="h2">‹</T></Pressable>
        <Pressable onPress={() => setDate(today)}>
          <T v="h3">{date === today ? '오늘' : formatKoreanDate(date)}</T>
        </Pressable>
        <Pressable onPress={() => date < today && setDate(addDays(date, 1))} hitSlop={12} style={{ padding: space.sm, opacity: date < today ? 1 : 0.2 }}><T v="h2">›</T></Pressable>
      </Row>

      {SLOTS.map((slot) => {
        const list = meals.filter((m) => m.mealType === slot.type).sort((a, b) => a.mealTime.localeCompare(b.mealTime));
        return (
          <View key={slot.type} style={{ backgroundColor: color.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: color.border, padding: space.md, gap: space.sm }}>
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
