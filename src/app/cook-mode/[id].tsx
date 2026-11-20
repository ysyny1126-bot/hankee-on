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

interface RunTimer { id: string; step: number; minutes: number; endAt: number; done: boolean }

const fmt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

/**
 * E10 여러 타이머: 단계를 넘겨도 타이머는 계속 돈다(예: 면 삶는 동안 소스 만들기).
 * 위쪽에 돌고 있는 타이머가 모두 보이고, 끝나면 진동 + 알림.
 */
function useTimers() {
  const [timers, setTimers] = useState<RunTimer[]>([]);
  const [now, setNow] = useState(Date.now());
  const active = timers.some((t) => !t.done);
  useEffect(() => {
    if (!active) return;
    const h = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(h);
  }, [active]);
  useEffect(() => {
    const fin = timers.filter((t) => !t.done && t.endAt <= now);
    if (!fin.length) return;
    setTimers((l) => l.map((t) => (fin.some((f) => f.id === t.id) ? { ...t, done: true } : t)));
    if (Platform.OS !== 'web') Vibration.vibrate([0, 400, 200, 400]);
    notify('⏰ 시간이 다 됐어요', fin.map((f) => `${f.step + 1}단계 ${f.minutes}분 타이머`).join('\n'));
  }, [now, timers]);
  const left = (t: RunTimer) => Math.max(0, Math.ceil((t.endAt - now) / 1000));
  return {
    timers,
    left,
    start: (step: number, minutes: number) => setTimers((l) => [...l.filter((t) => t.step !== step), { id: `${step}-${Date.now()}`, step, minutes, endAt: Date.now() + minutes * 60000, done: false }]),
    cancel: (id: string) => setTimers((l) => l.filter((t) => t.id !== id)),
  };
}

/** 요리 모드: 단계를 큰 글씨로 한 장씩. 마지막에 '완성' → 재고 차감·식사 기록 화면 */
export default function CookMode() {
  const { id, scale } = useLocalSearchParams<{ id: string; scale?: string }>();
  const s = useAppState();
  const recipe = findRecipe(s, id);
  const [i, setI] = useState(0);
  const tm = useTimers();
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

        {/* 돌고 있는 타이머(다른 단계 포함) */}
        {tm.timers.length > 0 && (
          <Row wrap gap={6} style={{ marginTop: space.sm }}>
            {tm.timers.map((t) => (
              <Pressable key={t.id} onPress={() => tm.cancel(t.id)} accessibilityRole="button" accessibilityLabel={`${t.step + 1}단계 타이머 ${t.done ? '끝남' : fmt(tm.left(t))}, 눌러서 지우기`}
                style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, minHeight: 36, borderRadius: 999, backgroundColor: t.done ? color.brandSoft : color.warnSoft }}>
                <T v="small" style={{ fontWeight: '800' }}>⏱ {t.step + 1}단계 {t.done ? '끝!' : fmt(tm.left(t))}</T>
                <T v="tiny" c={color.textMuted}>✕</T>
              </Pressable>
            ))}
          </Row>
        )}

        {/* 단계 */}
        <Pressable onPress={() => !last && setI(i + 1)} style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={tx({ fontSize: 28, lineHeight: 42, fontWeight: '700', color: color.text })}>{recipe.steps[i]}</Text>
        </Pressable>

        {/* 이 단계 타이머 */}
        {(() => {
          const min = stepMinutes(recipe.steps[i]);
          if (!min) return null;
          const t = tm.timers.find((x) => x.step === i);
          return (
            <Row style={{ ...clay, padding: space.md, justifyContent: 'space-between', marginBottom: space.sm }}>
              <View>
                <T v="tiny" c={color.textMuted}>이 단계 타이머 · 다음 단계로 넘어가도 계속 돌아요</T>
                <Text style={tx({ fontSize: 30, fontWeight: '800', color: t?.done ? color.fresh : color.text })} accessibilityLiveRegion="polite">{t ? (t.done ? '끝!' : fmt(tm.left(t))) : fmt(min * 60)}</Text>
              </View>
              {t && !t.done ? <Button title="취소" kind="ghost" small onPress={() => tm.cancel(t.id)} /> : <Button title={t?.done ? '다시' : `${min}분 시작`} small onPress={() => tm.start(i, min)} />}
            </Row>
          );
        })()}

        {/* 다음 단계 미리 보기 */}
        {!last ? <T v="small" c={color.textMuted} numberOfLines={2} style={{ marginBottom: space.sm }}>다음: {recipe.steps[i + 1]}</T> : null}

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
