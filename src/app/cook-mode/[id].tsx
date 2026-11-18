import { router, Stack as RStack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, Vibration, View } from 'react-native';

import { notify } from '@/components/dialog';

import { Button, Empty, Row, Screen, T, tx } from '@/components/ui';
import { clay } from '@/constants/tokens';
import { color, MAX_WIDTH, radius, space } from '@/constants/tokens';
import { findRecipe, useAppState } from '@/data/store';

/** 단계 문장에서 시간 읽기: '5분', '3~4분' → 분(범위면 긴 쪽). 없으면 null */
function stepMinutes(step: string): number | null {
  const m = step.match(/(\d+)\s*(?:~|-)\s*(\d+)\s*분|(\d+)\s*분/);
  if (!m) return null;
  const n = Number(m[2] ?? m[3]);
  return n > 0 && n <= 180 ? n : null;
}

/** 단계별 타이머: 시간이 적힌 단계에만 나온다. 끝나면 진동 + 알림창 */
function StepTimer({ minutes }: { minutes: number | null }) {
  const [left, setLeft] = useState(minutes ? minutes * 60 : 0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (running && left === 0) {
      setRunning(false);
      if (Platform.OS !== 'web') Vibration.vibrate([0, 400, 200, 400]);
      notify('⏰ 시간이 다 됐어요', '다음 단계로 넘어가 볼까요?');
    }
  }, [left, running]);
  if (!minutes) return null;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <Row style={{ ...clay, padding: space.md, justifyContent: 'space-between', marginBottom: space.md }}>
      <View>
        <T v="tiny" c={color.textMuted}>이 단계 타이머</T>
        <Text style={tx({ fontSize: 30, fontWeight: '800', color: left === 0 ? color.fresh : color.text })} accessibilityLiveRegion="polite">{mm}:{ss}</Text>
      </View>
      <Row gap={space.sm}>
        <Button title="처음부터" kind="ghost" small onPress={() => { setRunning(false); setLeft(minutes * 60); }} />
        <Button title={running ? '일시정지' : left === 0 ? '다시' : '시작'} small onPress={() => { if (left === 0) setLeft(minutes * 60); setRunning(!running || left === 0); }} />
      </Row>
    </Row>
  );
}

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

        <StepTimer key={i} minutes={stepMinutes(recipe.steps[i])} />

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
