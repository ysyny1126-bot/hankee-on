import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Badge, Bars, Card, Chip, ProgressBar, Row, Screen, Segmented, T } from '@/components/ui';
import { color, space } from '@/constants/tokens';
import { useAppState } from '@/data/store';
import type { NutritionInfo } from '@/data/types';
import { analyzePeriod, buildInsights, DAILY_REFERENCE, goalProgress, MEAL_LABEL, SOURCE_LABEL, wasteStats } from '@/logic/analysis';
import { addDays, formatKoreanDate, fromDateKey, toDateKey, weekStart } from '@/logic/dates';

const NUT_ROWS: { key: keyof NutritionInfo; label: string; unit: string }[] = [
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'carbohydrates', label: '탄수화물', unit: 'g' },
  { key: 'fat', label: '지방', unit: 'g' },
  { key: 'fiber', label: '식이섬유', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
  { key: 'sugar', label: '당류', unit: 'g' },
];

/** 일간·주간·월간 식생활 리포트. 모든 수치에 근거와 한계를 함께 표시한다. */
export default function Report() {
  const s = useAppState();
  const today = toDateKey();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [offset, setOffset] = useState(0); // 0 = 이번 기간, 1 = 지난 기간

  const range = useMemo(() => {
    if (period === 'daily') {
      const d = addDays(today, -offset);
      return { start: d, end: d, prevStart: addDays(d, -1), prevEnd: addDays(d, -1) };
    }
    if (period === 'weekly') {
      const st = addDays(weekStart(today), -7 * offset);
      return { start: st, end: addDays(st, 6), prevStart: addDays(st, -7), prevEnd: addDays(st, -1) };
    }
    const base = fromDateKey(today);
    const first = new Date(base.getFullYear(), base.getMonth() - offset, 1);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const pFirst = new Date(first.getFullYear(), first.getMonth() - 1, 1);
    const pLast = new Date(first.getFullYear(), first.getMonth(), 0);
    return { start: toDateKey(first), end: toDateKey(last), prevStart: toDateKey(pFirst), prevEnd: toDateKey(pLast) };
  }, [period, offset, today]);

  const a = analyzePeriod(s.meals, range.start, range.end);
  const prev = analyzePeriod(s.meals, range.prevStart, range.prevEnd);
  const ins = buildInsights(a, prev);
  const ws = wasteStats(s, range.start.slice(0, 7));
  const dayKeys = period === 'weekly' ? Array.from({ length: 7 }, (_, i) => addDays(range.start, i)) : [];

  return (
    <Screen edges={['bottom']}>
      <Segmented options={[{ key: 'daily', label: '일간' }, { key: 'weekly', label: '주간' }, { key: 'monthly', label: '월간' }]} value={period} onChange={(p) => { setPeriod(p); setOffset(0); }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Chip label="‹ 이전" onPress={() => setOffset(offset + 1)} />
        <T v="bodyBold">{range.start === range.end ? formatKoreanDate(range.start) : `${range.start.slice(5).replace('-', '/')} ~ ${range.end.slice(5).replace('-', '/')}`}</T>
        <Chip label="다음 ›" onPress={() => setOffset(Math.max(0, offset - 1))} />
      </Row>

      {a.dataLevel !== 'ok' && (
        <Card tone="warn">
          <T v="small">{a.dataLevel === 'none' ? '이 기간에는 식사 기록이 없어요.' : `기록이 ${a.totalMeals}끼로 적어서 분석이 정확하지 않을 수 있어요. 3일 이상, 5끼 이상 기록하면 더 믿을 만해져요.`}</T>
        </Card>
      )}

      <Card>
        <T v="h3">기록 요약</T>
        <Row style={{ justifyContent: 'space-between' }}>
          <Stat label="총 식사" value={`${a.totalMeals}끼`} delta={a.totalMeals - prev.totalMeals} unit="끼" />
          <Stat label="기록한 날" value={`${a.recordedDays}/${a.days}일`} />
          <Stat label="식재료 다양성" value={`${a.distinctIngredients.length}가지`} delta={a.distinctIngredients.length - prev.distinctIngredients.length} unit="가지" />
        </Row>
        {dayKeys.length > 0 && <Bars data={dayKeys.map((d) => ({ label: ['일', '월', '화', '수', '목', '금', '토'][fromDateKey(d).getDay()], value: s.meals.filter((m) => m.mealDate === d).length, highlight: d === today }))} height={80} />}
        <Row wrap gap={4}>
          {(Object.keys(a.byType) as (keyof typeof a.byType)[]).map((k) => <Badge key={k} label={`${MEAL_LABEL[k]} ${a.byType[k]}`} />)}
        </Row>
      </Card>

      <Card>
        <T v="h3">식사 구성</T>
        {(Object.keys(a.bySource) as (keyof typeof a.bySource)[]).map((k) => (
          <View key={k} style={{ gap: 2 }}>
            <Row style={{ justifyContent: 'space-between' }}><T v="small">{SOURCE_LABEL[k]}</T><T v="small" c={color.textSub}>{a.bySource[k]}회</T></Row>
            <ProgressBar ratio={a.totalMeals ? a.bySource[k] / a.totalMeals : 0} tone="brand" />
          </View>
        ))}
        {a.topFoods.length > 0 && <T v="small" c={color.textSub}>자주 먹은 음식: {a.topFoods.map((f) => `${f.name}(${f.count})`).join(', ')}</T>}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h3">주요 영양소 경향</T>
          <Badge label="추정치" tone="warn" />
        </Row>
        {a.nutritionPerDay ? (
          <>
            <T v="tiny" c={color.textMuted}>기록한 날 하루 평균 ÷ 1일 영양성분 기준치(성인). 목표가 아니라 경향을 보는 참고선이에요.</T>
            {NUT_ROWS.map((n) => {
              const v = a.nutritionPerDay![n.key];
              const ratio = v / DAILY_REFERENCE[n.key];
              return (
                <View key={n.key} style={{ gap: 2 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T v="small">{n.label}</T>
                    <T v="small" c={color.textSub}>약 {Math.round(v)}{n.unit} ({Math.round(ratio * 100)}%)</T>
                  </Row>
                  <ProgressBar ratio={Math.min(ratio, 1.5) / 1.5} tone={ratio > 1.2 ? 'warn' : 'fresh'} />
                </View>
              );
            })}
            <T v="tiny" c={color.textMuted}>영양값이 있는 음식 비율 {Math.round(a.nutritionCoverage * 100)}% · 사진·음식명 기반이라 실제와 다를 수 있어요.</T>
          </>
        ) : (
          <T v="small" c={color.textSub}>영양값이 있는 기록이 없어요. 음식 이름으로 기록하면 참고값이 붙어요.</T>
        )}
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="small">채소·과일</T>
          <T v="small" c={color.textSub}>하루 약 {a.vegetablePerDay.toFixed(1)}접시(추정)</T>
        </Row>
      </Card>

      {s.goals.filter((g) => g.status === 'active').length > 0 && period === 'weekly' && offset === 0 && (
        <Card>
          <T v="h3">목표 달성 현황</T>
          {s.goals.filter((g) => g.status === 'active').map((g) => {
            const p = goalProgress(g, s);
            return (
              <View key={g.id} style={{ gap: 2 }}>
                <Row style={{ justifyContent: 'space-between' }}><T v="small">{g.title}</T><T v="small" c={color.textSub}>{p ? `${p.value.toLocaleString()} / ${g.targetValue.toLocaleString()}${g.unit}` : '-'}</T></Row>
                {p && <ProgressBar ratio={p.ratio} />}
                {p && <T v="tiny" c={color.textMuted}>{p.basis}</T>}
              </View>
            );
          })}
        </Card>
      )}

      {period === 'monthly' && (
        <Card>
          <T v="h3">식재료 낭비</T>
          <T v="small" c={color.textSub}>버린 재료 {ws.wasteCount}개 · 약 {ws.wasteValue.toLocaleString()}원 · 한끼온 레시피 요리 {ws.cookCount}회</T>
        </Card>
      )}

      {a.dataLevel !== 'none' && (
        <Card tone="fresh">
          <T v="h3">잘하고 있는 점</T>
          {ins.positives.map((p) => <T key={p} v="small">👍 {p}</T>)}
        </Card>
      )}
      {ins.suggestions.length > 0 && (
        <Card>
          <T v="h3">다음 기간 제안</T>
          {ins.suggestions.map((x) => (
            <View key={x.text} style={{ gap: 2, paddingVertical: 2 }}>
              <T v="small">💡 {x.text}</T>
              <T v="tiny" c={color.textMuted}>근거: {x.why}</T>
            </View>
          ))}
        </Card>
      )}
      <T v="tiny" c={color.textMuted} style={{ textAlign: 'center', marginTop: space.sm }}>한끼온의 분석은 건강한 습관을 위한 참고 정보이며 의료적 진단을 대신하지 않아요.</T>
    </Screen>
  );
}

function Stat({ label, value, delta, unit }: { label: string; value: string; delta?: number; unit?: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <T v="h3">{value}</T>
      <T v="tiny" c={color.textSub}>{label}</T>
      {delta !== undefined && delta !== 0 ? <T v="tiny" c={delta > 0 ? color.fresh : color.textMuted}>지난 기간 대비 {delta > 0 ? '+' : ''}{delta}{unit}</T> : null}
    </View>
  );
}
