import { useState } from 'react';
import { View } from 'react-native';

import { confirmAsync } from '@/components/dialog';
import { Badge, Button, Card, Chip, Field, ProgressBar, Row, Screen, SectionHeader, Stepper, T } from '@/components/ui';
import { color, space } from '@/constants/tokens';
import { actions, useAppState } from '@/data/store';
import type { GoalType } from '@/data/types';
import { goalProgress } from '@/logic/analysis';
import { toDateKey } from '@/logic/dates';

const PRESETS: { type: GoalType; title: string; target: number; unit: string; desc: string }[] = [
  { type: 'variety', title: '다양한 식재료 먹기', target: 15, unit: '가지/주', desc: '한 주 동안 식사에 나온 식재료 종류' },
  { type: 'regular_meals', title: '규칙적으로 식사하기', target: 5, unit: '일/주', desc: '끼니를 2번 이상 기록한 날' },
  { type: 'vegetables', title: '채소·과일 챙기기', target: 3, unit: '접시/일', desc: '하루 평균 채소·과일 접시 수(추정)' },
  { type: 'home_cooking', title: '집밥 늘리기', target: 5, unit: '회/주', desc: '집밥으로 기록한 식사' },
  { type: 'less_waste', title: '음식물 낭비 줄이기', target: 0, unit: '개/주', desc: '버린 식재료 수 이하로' },
  { type: 'budget', title: '식비 관리', target: 70000, unit: '원/주', desc: '이번 주 장보기·재료 등록 때 남은 지출 합(다 먹어도 줄지 않아요)' },
];

export default function Goals() {
  const s = useAppState();
  const [custom, setCustom] = useState('');
  const [preset, setPreset] = useState<(typeof PRESETS)[number] | null>(null);
  const [target, setTarget] = useState(0);

  const choose = (p: (typeof PRESETS)[number]) => {
    setPreset(p);
    setTarget(p.type === 'budget' && s.preferences.weeklyBudget ? s.preferences.weeklyBudget : p.target);
  };
  const add = () => {
    if (preset) actions.addGoal({ goalType: preset.type, title: preset.title, targetValue: target, unit: preset.unit, startDate: toDateKey(), endDate: null, status: 'active' });
    else if (custom.trim()) actions.addGoal({ goalType: 'custom', title: custom.trim(), targetValue: 1, unit: '', startDate: toDateKey(), endDate: null, status: 'active' });
    setPreset(null);
    setCustom('');
  };

  return (
    <Screen edges={['bottom']}>
      <SectionHeader title="내 목표" />
      {s.goals.length === 0 && <T v="small" c={color.textSub}>아직 목표가 없어요. 아래에서 하나 골라 보세요.</T>}
      {s.goals.map((g) => {
        const p = goalProgress(g, s);
        return (
          <Card key={g.id} style={{ opacity: g.status === 'active' ? 1 : 0.6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="bodyBold" style={{ flex: 1 }}>{g.title}</T>
              {g.status === 'paused' ? <Badge label="쉬는 중" /> : p && p.ratio >= 1 ? <Badge label="이번 주 달성!" tone="fresh" /> : null}
            </Row>
            {p ? (
              <>
                <ProgressBar ratio={p.ratio} />
                <T v="small" c={color.textSub}>{p.value.toLocaleString()} / {g.targetValue.toLocaleString()}{g.unit}</T>
                <T v="tiny" c={color.textMuted}>계산 근거: {p.basis}</T>
              </>
            ) : (
              <T v="tiny" c={color.textMuted}>직접 설정한 목표는 스스로 확인해요. (자동 계산 없음)</T>
            )}
            <Row style={{ justifyContent: 'flex-end' }}>
              <Button title={g.status === 'active' ? '잠시 쉬기' : '다시 시작'} kind="ghost" small onPress={() => actions.updateGoal(g.id, { status: g.status === 'active' ? 'paused' : 'active' })} />
              <Button title="삭제" kind="danger" small onPress={async () => { if (await confirmAsync('목표 삭제', `‘${g.title}’ 목표를 지울까요?`, '삭제')) actions.removeGoal(g.id); }} />
            </Row>
          </Card>
        );
      })}

      <SectionHeader title="새 목표" />
      <Row wrap>
        {PRESETS.map((p) => <Chip key={p.type} label={p.title} selected={preset?.type === p.type} onPress={() => choose(p)} />)}
      </Row>
      {preset ? (
        <Card>
          <T v="bodyBold">{preset.title}</T>
          <T v="small" c={color.textSub}>{preset.desc}</T>
          <Row style={{ justifyContent: 'space-between' }}>
            <T>목표</T>
            <Row gap={4}><Stepper value={target} onChange={setTarget} step={preset.type === 'budget' ? 5000 : 1} /><T v="small">{preset.unit}</T></Row>
          </Row>
        </Card>
      ) : (
        <View style={{ gap: space.sm }}>
          <Field label="직접 만드는 목표" placeholder="예: 야식은 주 2회까지만" value={custom} onChangeText={setCustom} />
        </View>
      )}
      <Button title="목표 추가" onPress={add} disabled={!preset && !custom.trim()} />
      <T v="tiny" c={color.textMuted}>목표는 건강한 습관을 위한 거예요. 지키지 못해도 괜찮아요 🙂</T>
    </Screen>
  );
}
