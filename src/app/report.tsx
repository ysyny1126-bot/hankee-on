import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Badge, Bars, Button, Card, Chip, ProgressBar, Row, Screen, Segmented, T } from '@/components/ui';
import { router } from 'expo-router';
import { color, space } from '@/constants/tokens';
import { useAppState } from '@/data/store';
import type { NutritionInfo } from '@/data/types';
import { analyzePeriod, buildInsights, DAILY_REFERENCE, goalProgress, MEAL_LABEL, pantryFlow, SOURCE_LABEL, wasteStats } from '@/logic/analysis';
import { isSafeIngredient, restrictionsOf } from '@/logic/safety';
import { addDays, eul, formatKoreanDate, fromDateKey, toDateKey, weekStart } from '@/logic/dates';

// 시연판은 에너지·단백질만 보여 준다(인터뷰 결정). 나트륨·당류 등은 데이터는 있지만 화면에서 뺐다.
const NUT_ROWS: { key: keyof NutritionInfo; label: string; unit: string }[] = [
  { key: 'calories', label: '에너지', unit: 'kcal' },
  { key: 'protein', label: '단백질', unit: 'g' },
];

/** 일간·주간·월간 식생활 리포트. 모든 수치에 근거와 한계를 함께 표시한다. */
export default function Report() {
  const s = useAppState();
  const today = toDateKey();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [offset, setOffset] = useState(0); // 0 = 이번 기간, 1 = 지난 기간
  const [showNutrition, setShowNutrition] = useState(false);

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
  const flow = pantryFlow(s, range.start, range.end);
  const monthStart = today.slice(0, 7) + '-01';
  const monthFlow = pantryFlow(s, monthStart, today);
  const budget = s.preferences.monthlyBudget;
  const homeRatio = a.totalMeals ? a.bySource.home / a.totalMeals : 0;
  const nextWeek = nextWeekIdeas(s, flow, a.bySource.home, a.totalMeals);
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

      {/* 1. 식재료 소비 패턴 */}
      <Card>
        <T v="h3">🧊 식재료 흐름</T>
        <Row style={{ justifyContent: 'space-between' }}>
          <Stat label="들인 재료" value={`${flow.added}개`} />
          <Stat label="요리에 쓴 재료" value={`${flow.usedKinds}가지`} />
          <Stat label="버린 재료" value={`${flow.wasted}개`} />
        </Row>
        <T v="tiny" c={color.textMuted}>한끼온 레시피로 요리 {flow.cookCount}회{flow.leftovers ? ` · 냉장고에 남은 음식 ${flow.leftovers}개` : ''}</T>
      </Card>

      {/* 2. 집밥 빈도 */}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h3">🍚 집밥</T>
          <T v="small" c={color.textSub}>{a.bySource.home}회 / 전체 {a.totalMeals}끼</T>
        </Row>
        <ProgressBar ratio={homeRatio} tone="brand" />
        <T v="tiny" c={color.textMuted}>배달·외식·편의점도 모두 식사예요. 비율은 참고만 하세요.</T>
      </Card>

      {/* 3. 월간 식비 */}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h3">💰 이번 달 장보기</T>
          <T v="bodyBold">약 {monthFlow.spent.toLocaleString()}원</T>
        </Row>
        {budget ? (
          <>
            <ProgressBar ratio={Math.min(1, monthFlow.spent / budget)} tone={monthFlow.spent > budget ? 'warn' : 'fresh'} />
            <T v="tiny" c={color.textMuted}>한 달 식비 약 {budget.toLocaleString()}원 기준 · 배달·외식비는 아직 세지 않아요</T>
          </>
        ) : (
          <T v="tiny" c={color.textMuted}>설정에서 한 달 식비를 정하면 예산 대비로 보여 드려요.</T>
        )}
        {monthFlow.spendCount > 0 && monthFlow.estimatedShare > 0 && <T v="tiny" c={color.textMuted}>가격을 적지 않은 재료 {Math.round(monthFlow.estimatedShare * 100)}%는 평균 가격으로 추정했어요.</T>}
        {monthFlow.spendCount === 0 && <T v="tiny" c={color.textMuted}>재료를 등록하면 그때부터 장보기 금액이 쌓여요.</T>}
      </Card>

      {/* 4. 다음 주 제안 */}
      {nextWeek.length > 0 && (
        <Card tone="brand">
          <T v="h3">🗓️ 다음 주엔 이렇게 해 봐요</T>
          {nextWeek.map((x) => <T key={x} v="small">· {x}</T>)}
          <Button title="다음 주 식단 짜기" small kind="secondary" onPress={() => router.push('/plan?view=week')} />
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

      <Chip label={showNutrition ? '영양 경향 접기 ▲' : '영양 경향 보기(추정) ▼'} onPress={() => setShowNutrition(!showNutrition)} />
      {showNutrition && (
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
      )}

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
          <T v="h3">식사 습관 제안</T>
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

/** 다음 주 식생활 제안: 체중·칼로리가 아니라 재료·집밥·식비 중심. 실제 기록에서만 만든다. */
function nextWeekIdeas(s: ReturnType<typeof useAppState>, flow: ReturnType<typeof pantryFlow>, home: number, total: number): string[] {
  const out: string[] = [];
  const today = toDateKey();
  const rs = restrictionsOf(s.preferences);
  const soon = s.ingredients.filter((i) => i.kind !== 'leftover' && i.expiryDate && i.expiryDate <= addDays(today, 7) && isSafeIngredient(i.name, rs)).map((i) => i.name);
  if (soon.length) out.push(`다음 주 안에 기한이 오는 ${soon.slice(0, 3).join('·')}${soon.length > 3 ? ` 외 ${soon.length - 3}개` : ''}부터 쓰는 메뉴로 짜 봐요.`);
  if (flow.wasted > 0) out.push(`이번에 ${flow.wasted}개를 버렸어요. 장보기 전에 냉장고 사진을 한 번 찍어 보면 겹쳐 사는 걸 줄일 수 있어요.`);
  if (total >= 3 && home < 3) out.push('집밥을 한 번만 더 해 보면 어때요? 10분 메뉴부터 시작해도 충분해요.');
  const left = s.ingredients.filter((i) => i.kind === 'leftover');
  if (left.length) out.push(`남은 ${left.length > 1 ? `${left[0].name} 등 ${left.length}개를` : eul(left[0].name)} 먼저 먹는 끼니를 넣어 봐요.`);
  if (!out.length && s.ingredients.length) out.push('냉장고 재료로 다음 주 식단을 미리 짜 두면 장보기가 가벼워져요.');
  return out.slice(0, 3);
}
