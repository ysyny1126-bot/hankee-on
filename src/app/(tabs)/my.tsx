import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Character } from '@/components/character';
import { Bars, ProgressBar, Row, Screen, SectionHeader, T } from '@/components/ui';
import { clay, color, radius, space } from '@/constants/tokens';
import { useAppState } from '@/data/store';
import { analyzePeriod, goalProgress, thisWeek, usedValue, wasteStats } from '@/logic/analysis';
import { addDays, fromDateKey, toDateKey } from '@/logic/dates';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

/** 나: 주간 리포트 · 목표 · 아낀 돈/낭비 · 장보기 · 설정 */
export default function My() {
  const s = useAppState();
  const today = toDateKey();
  const { start, end } = thisWeek();
  const a = useMemo(() => analyzePeriod(s.meals, start, end), [s.meals, start, end]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const goals = s.goals.filter((g) => g.status === 'active');
  const ws = wasteStats(s);
  const saved = usedValue(s);
  const shop = s.shopping.filter((x) => !x.done);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
        <Row>
          <Character id={s.preferences.characterId} size={44} />
          <T v="h2">{s.preferences.nickname}</T>
        </Row>
        <Pressable onPress={() => router.push('/settings')} hitSlop={10} accessibilityLabel="설정"><Text style={{ fontSize: 22 }}>⚙️</Text></Pressable>
      </Row>

      {/* 주간 리포트 */}
      <Box onPress={() => router.push('/report')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h3">이번 주</T>
          <T v="small" c={color.textMuted}>리포트 ›</T>
        </Row>
        <Bars data={days.map((d) => ({ label: WEEK[fromDateKey(d).getDay()], value: s.meals.filter((m) => m.mealDate === d).length, highlight: d === today }))} height={70} />
        <Row style={{ justifyContent: 'space-around' }}>
          <Num v={`${a.totalMeals}`} u="끼" l="식사" />
          <Num v={`${a.distinctIngredients.length}`} u="가지" l="식재료" />
          <Num v={a.nutritionPerDay ? `${Math.round(a.nutritionPerDay.calories)}` : '—'} u="kcal" l="하루 평균*" />
          <Num v={a.nutritionPerDay ? `${Math.round(a.nutritionPerDay.protein)}` : '—'} u="g" l="단백질*" />
        </Row>
        <T v="tiny" c={color.textMuted}>* 추정치</T>
      </Box>

      {/* 목표 */}
      <SectionHeader title="목표" action={goals.length ? '관리' : '만들기'} href="/goals" />
      {goals.length ? (
        <Box>
          {goals.map((g) => {
            const p = goalProgress(g, s);
            return (
              <View key={g.id} style={{ gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="bodyBold">{g.title}</T>
                  <T v="small" c={p && p.ratio >= 1 ? color.fresh : color.textSub}>{p ? `${p.value.toLocaleString()}/${g.targetValue.toLocaleString()}` : '—'}</T>
                </Row>
                {p ? <ProgressBar ratio={p.ratio} /> : null}
              </View>
            );
          })}
        </Box>
      ) : null}

      {/* 아낀 돈 · 낭비 */}
      <Row gap={space.sm}>
        <Box style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 26 }}>🍳</Text>
          <T v="h3">{saved.toLocaleString()}원</T>
          <T v="tiny" c={color.textSub}>요리로 쓴 재료*</T>
        </Box>
        <Box style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 26 }}>🗑️</Text>
          <T v="h3">{ws.wasteCount}개</T>
          <T v="tiny" c={color.textSub}>버린 재료 · {ws.wasteValue.toLocaleString()}원</T>
        </Box>
      </Row>

      {/* 장보기 */}
      <Box onPress={() => router.push('/shopping')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h3">🛒 장보기 {shop.length}</T>
          <T v="small" c={color.textMuted}>›</T>
        </Row>
        {shop.length ? <T v="small" c={color.textSub} numberOfLines={1}>{shop.slice(0, 5).map((x) => x.name).join(' · ')}</T> : null}
      </Box>
    </Screen>
  );
}

function Box({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: object }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [{ ...clay, padding: space.lg, gap: space.sm, opacity: pressed ? 0.8 : 1 }, style]}>
      {children}
    </Pressable>
  );
}

function Num({ v, u, l }: { v: string; u: string; l: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <T v="h3">{v}<T v="tiny" c={color.textSub}>{u}</T></T>
      <T v="tiny" c={color.textMuted}>{l}</T>
    </View>
  );
}
