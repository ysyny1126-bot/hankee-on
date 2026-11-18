import { router, Stack as RStack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Empty, Row, Screen, T, tx } from '@/components/ui';
import { color, MAX_WIDTH, radius, space } from '@/constants/tokens';
import { findRecipe, useAppState } from '@/data/store';

/** 요리 모드: 단계를 큰 글씨로 한 장씩. 마지막에 '완성' → 재고 차감·식사 기록 화면 */
export default function CookMode() {
  const { id, scale } = useLocalSearchParams<{ id: string; scale?: string }>();
  const s = useAppState();
  const recipe = findRecipe(s, id);
  const [i, setI] = useState(0);
  if (!recipe) return <Screen><Empty emoji="🤔" title="레시피를 찾을 수 없어요" /></Screen>;

  const total = recipe.steps.length;
  const last = i >= total - 1;

  return (
    <Screen scroll={false} edges={['bottom']}>
      <RStack.Screen options={{ title: `${recipe.emoji} ${recipe.name}` }} />
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingBottom: space.lg }}>
        {/* 진행 표시 */}
        <Row gap={4} style={{ marginTop: space.sm }}>
          {recipe.steps.map((_, k) => (
            <View key={k} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: k <= i ? color.brand : color.surfaceAlt }} />
          ))}
        </Row>
        <T v="small" c={color.textMuted} style={{ marginTop: space.sm }}>{i + 1} / {total}</T>

        {/* 단계 */}
        <Pressable onPress={() => !last && setI(i + 1)} style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={tx({ fontSize: 28, lineHeight: 42, fontWeight: '700', color: color.text })}>{recipe.steps[i]}</Text>
        </Pressable>

        <Row gap={space.sm}>
          <Button title="‹ 이전" kind="secondary" style={{ flex: 1 }} onPress={() => setI(Math.max(0, i - 1))} disabled={i === 0} />
          {last ? (
            <Button title="완성! 🍽️" kind="fresh" style={{ flex: 2 }} onPress={() => router.replace(`/cook/${recipe.id}?scale=${scale ?? 1}`)} />
          ) : (
            <Button title="다음 ›" style={{ flex: 2 }} onPress={() => setI(i + 1)} />
          )}
        </Row>
        <View style={{ height: space.sm, borderRadius: radius.sm }} />
      </View>
    </Screen>
  );
}
