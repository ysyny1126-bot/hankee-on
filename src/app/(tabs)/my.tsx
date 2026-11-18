import { useMemo } from 'react';
import { View } from 'react-native';

import { Badge, Bars, Button, Card, Emoji, ListItem, ProgressBar, Row, Screen, SectionHeader, T } from '@/components/ui';
import { color, space } from '@/constants/tokens';
import { useAppState } from '@/data/store';
import { analyzePeriod, buildInsights, goalProgress, lastNDays } from '@/logic/analysis';
import { addDays, fromDateKey, toDateKey } from '@/logic/dates';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

/** MY — 나의 식생활(MY FOOD LIFE)을 중심에 둔 화면 */
export default function My() {
  const s = useAppState();
  const today = toDateKey();
  const { start } = lastNDays(7);
  const a = useMemo(() => analyzePeriod(s.meals, start, today), [s.meals, start, today]);
  const ins = buildInsights(a);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const activeGoals = s.goals.filter((g) => g.status === 'active');

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
        <T v="h1">나의 식생활</T>
        <Button title="설정" kind="secondary" small icon="⚙️" href="/settings" />
      </Row>

      <Card tone="brand">
        <T v="small" c={color.brandDark} style={{ fontWeight: '700' }}>최근 7일</T>
        <Row style={{ justifyContent: 'space-between' }}>
          <Mini label="식사 기록" value={`${a.totalMeals}끼`} />
          <Mini label="식재료 종류" value={`${a.distinctIngredients.length}가지`} />
          <Mini label="집밥" value={`${a.bySource.home}회`} />
          <Mini label="채소·과일/일" value={`${a.vegetablePerDay.toFixed(1)}`} />
        </Row>
        <Bars
          data={days.map((d) => ({ label: WEEK[fromDateKey(d).getDay()], value: s.meals.filter((m) => m.mealDate === d).length, highlight: d === today }))}
          height={80}
        />
        <T v="tiny" c={color.textSub}>막대 = 하루 기록한 끼니 수</T>
      </Card>

      <Row gap={space.sm}>
        <Button title="식사 기록" icon="📸" style={{ flex: 1 }} href="/meal-record/edit" />
        <Button title="리포트" icon="📊" kind="secondary" style={{ flex: 1 }} href="/report" />
      </Row>

      <SectionHeader title="HANKEE AI 분석" action="자세히" href="/report" />
      <Card>
        {a.dataLevel === 'none' ? (
          <T v="small" c={color.textSub}>식사를 기록하면 식생활 패턴을 분석해 드려요.</T>
        ) : (
          <>
            {a.dataLevel === 'low' && <Badge label="기록이 적어 분석이 부정확할 수 있어요" tone="warn" />}
            {ins.positives.slice(0, 2).map((p) => <T key={p} v="small">👍 {p}</T>)}
            {ins.suggestions.slice(0, 2).map((x) => (
              <View key={x.text} style={{ gap: 2 }}>
                <T v="small">💡 {x.text}</T>
                <T v="tiny" c={color.textMuted}>근거: {x.why}</T>
              </View>
            ))}
          </>
        )}
      </Card>

      <SectionHeader title="식생활 목표" action="관리" href="/goals" />
      <Card>
        {activeGoals.length === 0 ? (
          <>
            <T v="small" c={color.textSub}>작은 목표 하나로 시작해 보세요. 예: 채소 챙기기, 집밥 주 3회</T>
            <Button title="목표 만들기" kind="secondary" small href="/goals" />
          </>
        ) : (
          activeGoals.map((g) => {
            const p = goalProgress(g, s);
            return (
              <View key={g.id} style={{ gap: 4, paddingVertical: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="bodyBold">{g.title}</T>
                  <T v="small" c={color.textSub}>{p ? `${p.value.toLocaleString()} / ${g.targetValue.toLocaleString()}${g.unit}` : '직접 확인'}</T>
                </Row>
                {p && <ProgressBar ratio={p.ratio} />}
              </View>
            );
          })
        )}
      </Card>

      <SectionHeader title="기록과 관리" />
      <Card>
        <ListItem href="/meals" left={<Emoji size={20}>🍱</Emoji>} title="식사 기록 모아보기" sub={`전체 ${s.meals.length}개`} right={<T c={color.textMuted}>›</T>} />
        <ListItem href="/shopping" left={<Emoji size={20}>🛒</Emoji>} title="장보기 목록" sub={`살 것 ${s.shopping.filter((x) => !x.done).length}개`} right={<T c={color.textMuted}>›</T>} />
        <ListItem href="/settings" left={<Emoji size={20}>🔒</Emoji>} title="취향·알레르기·개인정보" sub={s.consents.personalization ? '식생활 기억하기 켜짐' : '식생활 기억하기 꺼짐'} right={<T c={color.textMuted}>›</T>} />
      </Card>
    </Screen>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <T v="h3">{value}</T>
      <T v="tiny" c={color.textSub}>{label}</T>
    </View>
  );
}
