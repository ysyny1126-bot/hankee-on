import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Button, Card, Chip, Field, Row, Screen, Segmented, Stack, T } from '@/components/ui';
import { color, space } from '@/constants/tokens';
import { ALLERGEN_OPTIONS } from '@/data/catalog';
import { buildDemoState } from '@/data/demo';
import { actions, getState } from '@/data/store';
import { requestNotificationPermission } from '@/logic/notify';

const splitList = (t: string) => t.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [liked, setLiked] = useState('');
  const [disliked, setDisliked] = useState('');
  const [minutes, setMinutes] = useState<'10' | '20' | '40'>('20');
  const [skill, setSkill] = useState<'초보' | '보통' | '능숙'>('초보');
  const [budget, setBudget] = useState('');
  const [personalization, setPersonalization] = useState(true);
  const [externalAI, setExternalAI] = useState(true);
  const [healthInfo, setHealthInfo] = useState(true);

  const finish = async (withDemo: boolean) => {
    actions.completeOnboarding(
      {
        nickname: nickname.trim() || '한끼러',
        allergies: healthInfo ? allergies : [],
        preferredFoods: splitList(liked),
        dislikedFoods: splitList(disliked),
        maxCookMinutes: Number(minutes),
        cookingSkill: skill,
        weeklyBudget: budget ? Number(budget.replace(/[^0-9]/g, '')) : null,
      },
      { personalization, externalAI, healthInfo },
    );
    if (withDemo) actions.replaceAll(buildDemoState(getState()));
    await requestNotificationPermission();
    router.replace('/');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ paddingTop: space.xl, gap: space.xs }}>
        <T v="tiny" c={color.brandDark}>HANKEE ON · {step + 1}/3</T>
        <T v="h1">{['반가워요! 🍚', '나에게 맞추기', '내 데이터, 내가 정해요'][step]}</T>
        <T c={color.textSub}>
          {[
            '한끼온은 냉장고부터 식사 기록까지 기억해서, 오늘 먹을 한 끼를 먼저 제안해요.',
            '알레르기는 모든 레시피 추천에서 가장 먼저 걸러요.',
            '동의한 범위 안에서만 기록을 기억하고 AI에 보내요. 설정에서 언제든 바꿀 수 있어요.',
          ][step]}
        </T>
      </View>

      {step === 0 && (
        <Stack>
          <Field label="뭐라고 불러 드릴까요?" placeholder="예: 한끼러" value={nickname} onChangeText={setNickname} />
          <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>평일 요리에 쓸 수 있는 시간</T>
          <Segmented options={[{ key: '10', label: '10분' }, { key: '20', label: '20분' }, { key: '40', label: '40분+' }]} value={minutes} onChange={setMinutes} />
          <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>요리 실력</T>
          <Segmented options={[{ key: '초보', label: '초보' }, { key: '보통', label: '보통' }, { key: '능숙', label: '능숙' }]} value={skill} onChange={setSkill} />
          <Field label="일주일 식비 예산 (선택)" placeholder="예: 70000" keyboardType="number-pad" value={budget} onChangeText={setBudget} hint="장보기·식비 목표에 써요" />
        </Stack>
      )}

      {step === 1 && (
        <Stack>
          <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>알레르기·피해야 할 식품</T>
          <Row wrap>
            {ALLERGEN_OPTIONS.map((a) => (
              <Chip key={a} label={a} tone="danger" selected={allergies.includes(a)} onPress={() => setAllergies((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))} />
            ))}
          </Row>
          <Field label="좋아하는 음식 (쉼표로 구분)" placeholder="예: 김치찌개, 파스타" value={liked} onChangeText={setLiked} />
          <Field label="싫어하는 재료 (쉼표로 구분)" placeholder="예: 가지, 오이" value={disliked} onChangeText={setDisliked} />
        </Stack>
      )}

      {step === 2 && (
        <Stack>
          <ConsentRow title="식생활 기억하기(개인화)" body="식사 기록·요리 기록을 바탕으로 ‘최근 자주 먹은 메뉴’ 같은 맞춤 제안을 해요. 끄면 냉장고 재료로만 추천해요." value={personalization} onChange={setPersonalization} />
          <ConsentRow title="사진을 AI로 분석하기" body="냉장고·음식 사진을 Google Gemini로 보내 분석해요. 시연판은 무료 등급을 써서 구글이 서비스 개선에 사진을 활용할 수 있어요. 끄면 직접 입력만 써요." value={externalAI} onChange={setExternalAI} />
          <ConsentRow title="알레르기 등 건강 정보 저장" body="알레르기 정보를 이 기기에만 저장하고 레시피 추천에서 걸러요." value={healthInfo} onChange={setHealthInfo} />
          <Card tone="info">
            <T v="small" c={color.textSub}>한끼온은 의료적 진단이나 치료를 대신하지 않아요. 영양 정보는 추정치이며 항상 그렇게 표시해요.</T>
          </Card>
        </Stack>
      )}

      <Stack gap={space.sm} style={{ marginTop: space.lg }}>
        {step < 2 ? (
          <Button title="다음" onPress={() => setStep(step + 1)} />
        ) : (
          <>
            <Button title="시작하기" onPress={() => finish(false)} />
            <Button title="예시 데이터로 체험하기" kind="secondary" onPress={() => finish(true)} />
            <T v="tiny" c={color.textMuted} style={{ textAlign: 'center' }}>예시 데이터는 설정 › 데이터 관리에서 언제든 지울 수 있어요.</T>
          </>
        )}
        {step > 0 && <Button title="이전" kind="ghost" onPress={() => setStep(step - 1)} />}
      </Stack>
    </Screen>
  );
}

function ConsentRow({ title, body, value, onChange }: { title: string; body: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="bodyBold" style={{ flex: 1 }}>{title}</T>
        <Switch value={value} onValueChange={onChange} trackColor={{ true: color.brand, false: color.border }} />
      </Row>
      <T v="small" c={color.textSub}>{body}</T>
    </Card>
  );
}
