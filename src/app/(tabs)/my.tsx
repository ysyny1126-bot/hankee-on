import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Character } from '@/components/character';
import { Icon, type IconName } from '@/components/icon';
import { WeekStrip } from '@/components/week-strip';
import { IconButton, PageHeader, ProgressBar, Row, Screen, SectionHeader, T } from '@/components/ui';
import { clay, color, space } from '@/constants/tokens';
import { useAppState } from '@/data/store';
import { analyzePeriod, goalProgress, thisWeek, usedValue, wasteStats } from '@/logic/analysis';
import { toDateKey } from '@/logic/dates';


/** 나: 주간 리포트 · 목표 · 아낀 돈/낭비 · 장보기 · 설정 */
export default function My() {
  const s = useAppState();
  const today = toDateKey();
  const { start, end } = thisWeek();
  const a = useMemo(() => analyzePeriod(s.meals, start, end), [s.meals, start, end]);
  const goals = s.goals.filter((g) => g.status === 'active');
  const ws = wasteStats(s);
  const saved = usedValue(s);
  const shop = s.shopping.filter((x) => !x.done);

  return (
    <Screen>
      <PageHeader
        eyebrow="나"
        title={
          <Row gap={10}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: color.scene, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <Character id={s.preferences.characterId} size={40} />
            </View>
            <T v="h1" numberOfLines={1} style={{ flexShrink: 1 }}>{s.preferences.nickname}님</T>
          </Row>
        }
        right={<IconButton label="설정" onPress={() => router.push('/settings')}><Icon name="settings" size={20} c={color.textSub} /></IconButton>}
      />

      {/* 주간 리포트 */}
      <Box onPress={() => router.push('/report')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h3">이번 주</T>
          <T v="small" c={color.textMuted}>리포트 ›</T>
        </Row>
        {/* 홈·기록 탭과 같은 요일 줄(기록한 끼니만큼 채움) */}
        <WeekStrip meals={s.meals} plan={s.mealPlan} />
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

      {/* 바로 가기: 같은 모양의 줄로(카드를 여러 개 늘어놓지 않음) */}
      <View style={{ ...clay, overflow: 'hidden' }}>
        <LinkRow icon="list" label="식사 기록 모아보기" sub={`${s.meals.length}끼`} href="/meals" first />
        <LinkRow icon="calendar" label="이번 주 식단" sub={s.mealPlan.filter((e) => e.date >= today).length ? `${s.mealPlan.filter((e) => e.date >= today && e.status !== 'done').length}끼 계획` : '원할 때만'} href="/plan" />
        <LinkRow icon="cart" label="장보기 목록" sub={shop.length ? `살 것 ${shop.length}개` : '비어 있어요'} href="/shopping" />
        <LinkRow icon="target" label="식생활 목표" sub={goals.length ? `${goals.length}개 진행 중` : '없어도 괜찮아요'} href="/goals" />
        <LinkRow icon="settings" label="설정" sub="캐릭터·식비·알레르기" href="/settings" />
      </View>
    </Screen>
  );
}

function LinkRow({ icon, label, sub, href, first }: { icon: IconName; label: string; sub: string; href: Href; first?: boolean }) {
  return (
    <Pressable onPress={() => router.push(href)} accessibilityRole="button" accessibilityLabel={`${label}, ${sub}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg, minHeight: 56, borderTopWidth: first ? 0 : 1, borderTopColor: color.border, backgroundColor: pressed ? color.surfaceAlt : 'transparent' })}>
      <Icon name={icon} size={20} c={color.textSub} />
      <T v="bodyBold" style={{ flex: 1 }}>{label}</T>
      <T v="small" c={color.textMuted}>{sub}</T>
      <Icon name="chevron" size={16} c={color.textMuted} />
    </Pressable>
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
