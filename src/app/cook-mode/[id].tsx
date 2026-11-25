import { router, Stack as RStack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, Vibration, View } from 'react-native';

import { notify } from '@/components/dialog';

import { scaleStepText, StepCard } from '@/components/step-card';
import { Button, Empty, Row, Screen, T, tx } from '@/components/ui';
import { clay, color, MAX_WIDTH, radius, space } from '@/constants/tokens';
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
  const [now, setNow] = useState(() => Date.now());
  const notified = useRef(new Set<string>()); // 이미 알린 타이머(한 번만 알림)
  const latest = useRef(timers);
  useEffect(() => {
    latest.current = timers;
  }, [timers]);
  const count = timers.length;
  useEffect(() => {
    if (!count) return;
    // 0.5초마다 시계를 넘기고, 막 끝난 타이머가 있으면 그때 한 번 알린다(효과 안에서 바로 상태를 바꾸지 않음)
    const h = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const fin = latest.current.filter((x) => x.endAt <= t && !notified.current.has(x.id));
      if (!fin.length) return;
      fin.forEach((f) => notified.current.add(f.id));
      if (Platform.OS !== 'web') Vibration.vibrate([0, 400, 200, 400]);
      notify('⏰ 시간이 다 됐어요', fin.map((f) => `${f.step + 1}단계 ${f.minutes}분 타이머`).join('\n'));
    }, 500);
    return () => clearInterval(h);
  }, [count]);
  const left = (t: RunTimer) => Math.max(0, Math.ceil((t.endAt - now) / 1000));
  return {
    timers: timers.map((t) => ({ ...t, done: t.endAt <= now })),
    left,
    start: (step: number, minutes: number) => {
      const at = Date.now();
      setNow(at);
      setTimers((l) => [...l.filter((t) => t.step !== step), { id: `${step}-${at}`, step, minutes, endAt: at + minutes * 60000, done: false }]);
    },
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

        {/* 단계: 레시피 카드 한 장(누르면 다음 단계) */}
        <View style={{ flex: 1, marginVertical: space.md }}>
          <StepCard recipe={recipe} index={i} scale={Number(scale) || 1} characterId={s.preferences.characterId} onPress={last ? undefined : () => setI(i + 1)} onNext={last ? undefined : () => setI(i + 1)} onPrev={i === 0 ? undefined : () => setI(i - 1)} />
        </View>

        {/* 첫 단계엔 '미리 할 일', 마지막 단계엔 익힘·안전 확인 */}
        {i === 0 && recipe.prep ? (
          <View style={{ backgroundColor: color.infoSoft, borderRadius: radius.md, padding: space.md, marginBottom: space.sm }}>
            <T v="small">⏳ 미리: {recipe.prep}</T>
          </View>
        ) : null}
        {last && recipe.safety?.length ? (
          <View style={{ backgroundColor: color.warnSoft, borderRadius: radius.md, padding: space.md, marginBottom: space.sm, gap: 2 }}>
            {recipe.safety.map((t) => <T key={t} v="small">🔥 {t}</T>)}
          </View>
        ) : null}

        {/* 이 단계 타이머 */}
        {(() => {
          const min = stepMinutes(recipe.steps[i]);
          if (!min) return null;
          const t = tm.timers.find((x) => x.step === i);
          return (
            <Row style={{ ...clay, padding: space.md, justifyContent: 'space-between', marginBottom: space.sm }}>
              {/* 좁은 화면에서도 버튼이 밖으로 밀려나지 않게 글 쪽이 줄어들고 줄바꿈된다 */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="tiny" c={color.textMuted}>이 단계 타이머 · 다음 단계로 넘어가도 계속 돌아요</T>
                <Text style={tx({ fontSize: 30, fontWeight: '800', color: t?.done ? color.fresh : color.text })} accessibilityLiveRegion="polite">{t ? (t.done ? '끝!' : fmt(tm.left(t))) : fmt(min * 60)}</Text>
              </View>
              {t && !t.done ? <Button title="취소" kind="ghost" small onPress={() => tm.cancel(t.id)} /> : <Button title={t?.done ? '다시' : `${min}분 시작`} small onPress={() => tm.start(i, min)} />}
            </Row>
          );
        })()}

        {/* 다음 단계 미리 보기 */}
        {!last ? <T v="small" c={color.textMuted} numberOfLines={2} style={{ marginBottom: space.sm }}>다음: {scaleStepText(recipe.steps[i + 1], Number(scale) || 1)}</T> : null}

        <Row gap={space.sm}>
          <Button title="‹ 이전" kind="secondary" style={{ flex: 1 }} onPress={() => setI(Math.max(0, i - 1))} disabled={i === 0} />
          {last ? (
            <Button title="완성! 🍽️" style={{ flex: 2 }} onPress={() => router.replace(`/cook/${recipe.id}?scale=${scale ?? 1}`)} />
          ) : (
            <Button title="다음 ›" style={{ flex: 2 }} onPress={() => setI(i + 1)} />
          )}
        </Row>
        <View style={{ height: space.sm, borderRadius: radius.sm }} />
      </View>
    </Screen>
  );
}
