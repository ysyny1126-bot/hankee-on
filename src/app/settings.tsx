import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Switch, View } from 'react-native';

import { AI_MODEL_NAME, hasAIKey } from '@/ai/gemini';
import { confirmAsync, notify } from '@/components/dialog';
import { Badge, Button, Card, Chip, Field, Row, Screen, SectionHeader, Segmented, Stepper, T } from '@/components/ui';
import { color, space } from '@/constants/tokens';
import { ALLERGEN_OPTIONS } from '@/data/catalog';
import { buildDemoState } from '@/data/demo';
import { actions, getState, initialState, useAppState } from '@/data/store';
import { requestNotificationPermission } from '@/logic/notify';

const join = (l: string[]) => l.join(', ');
const split = (t: string) => t.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

export default function Settings() {
  const s = useAppState();
  const p = s.preferences;
  const [liked, setLiked] = useState(join(p.preferredFoods));
  const [disliked, setDisliked] = useState(join(p.dislikedFoods));

  const toggleAllergy = (a: string) => actions.updatePreferences({ allergies: p.allergies.includes(a) ? p.allergies.filter((x) => x !== a) : [...p.allergies, a] });

  return (
    <Screen edges={['bottom']}>
      <SectionHeader title="나의 취향" />
      <Card>
        <Field label="이름" value={p.nickname} onChangeText={(t) => actions.updatePreferences({ nickname: t })} />
        <Field label="좋아하는 음식" value={liked} onChangeText={setLiked} onBlur={() => actions.updatePreferences({ preferredFoods: split(liked) })} />
        <Field label="싫어하는 재료" value={disliked} onChangeText={setDisliked} onBlur={() => actions.updatePreferences({ dislikedFoods: split(disliked) })} hint="이 재료가 꼭 필요한 레시피는 추천에서 빠져요" />
        <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>요리 실력</T>
        <Segmented options={[{ key: '초보', label: '초보' }, { key: '보통', label: '보통' }, { key: '능숙', label: '능숙' }]} value={p.cookingSkill} onChange={(k) => actions.updatePreferences({ cookingSkill: k })} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T>평일 조리 시간</T>
          <Row gap={4}><Stepper value={p.maxCookMinutes} onChange={(n) => actions.updatePreferences({ maxCookMinutes: n })} step={5} min={5} /><T v="small">분</T></Row>
        </Row>
        <Field label="주간 식비 예산(원)" keyboardType="number-pad" value={p.weeklyBudget ? String(p.weeklyBudget) : ''} onChangeText={(t) => actions.updatePreferences({ weeklyBudget: t ? Number(t.replace(/[^0-9]/g, '')) : null })} />
      </Card>

      <SectionHeader title="알레르기·식품 주의" />
      <Card>
        {!s.consents.healthInfo ? (
          <T v="small" c={color.textSub}>건강 정보 저장에 동의하면 알레르기를 레시피 추천에서 걸러 드려요. (아래 개인정보에서 켜기)</T>
        ) : (
          <>
            <Row wrap>{ALLERGEN_OPTIONS.map((a) => <Chip key={a} label={a} tone="danger" selected={p.allergies.includes(a)} onPress={() => toggleAllergy(a)} />)}</Row>
            <T v="tiny" c={color.textMuted}>선택한 성분이 든 기본 레시피는 추천·식단에서 빠지고, AI 레시피에는 경고가 표시돼요.</T>
          </>
        )}
      </Card>

      <SectionHeader title="알림" />
      <Card>
        <Toggle label="소비기한 임박" value={s.notifications.expiry} onChange={async (v) => { actions.updateNotifications({ expiry: v }); if (v) await requestNotificationPermission(); }} />
        <Toggle label="오래 안 쓴 재료" value={s.notifications.unusedIngredient} onChange={(v) => actions.updateNotifications({ unusedIngredient: v })} />
        <Toggle label="오늘의 메뉴 제안" value={s.notifications.menuSuggestion} onChange={(v) => actions.updateNotifications({ menuSuggestion: v })} />
        <Toggle label="장보기 제안" value={s.notifications.shopping} onChange={(v) => actions.updateNotifications({ shopping: v })} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T>소비기한 며칠 전에 알릴까요?</T>
          <Row gap={4}><Stepper value={s.notifications.expiryDaysBefore} onChange={(n) => actions.updateNotifications({ expiryDaysBefore: n })} min={0} /><T v="small">일</T></Row>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <T>하루 최대 알림</T>
          <Row gap={4}><Stepper value={s.notifications.maxPerDay} onChange={(n) => actions.updateNotifications({ maxPerDay: n })} min={1} /><T v="small">개</T></Row>
        </Row>
        <T v="tiny" c={color.textMuted}>{Platform.OS === 'web' ? '웹에서는 휴대폰 알림 대신 홈 화면 카드로 알려 드려요.' : '휴대폰 알림은 소비기한 임박만 보내고, 나머지는 홈 화면 카드로 보여 드려요.'}</T>
      </Card>

      <SectionHeader title="개인정보·AI" />
      <Card>
        <Toggle label="식생활 기억하기(개인화)" value={s.consents.personalization} onChange={(v) => actions.updateConsents({ personalization: v })} sub="식사·요리 기록을 맞춤 제안에 사용" />
        <Toggle label="사진을 AI로 분석하기" value={s.consents.externalAI} onChange={(v) => actions.updateConsents({ externalAI: v })} sub="사진을 Google Gemini(무료 등급)로 전송" />
        <Toggle label="건강 정보(알레르기) 저장" value={s.consents.healthInfo} onChange={(v) => { actions.updateConsents({ healthInfo: v }); if (!v) actions.updatePreferences({ allergies: [] }); }} sub="끄면 저장된 알레르기 정보를 지워요" />
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="small" c={color.textSub}>AI 연결 상태</T>
          {hasAIKey() ? <Badge label={`연결됨 · ${AI_MODEL_NAME}`} tone="fresh" /> : <Badge label="미연결(키 필요)" tone="warn" />}
        </Row>
        <T v="tiny" c={color.textMuted}>모든 기록은 지금 이 기기에만 저장돼요. 로그인 기능이 생기면 동의를 받고 서버로 옮겨요.</T>
      </Card>

      <SectionHeader title="데이터 관리" />
      <Card>
        <T v="small" c={color.textSub}>재료 {s.ingredients.length} · 식사 {s.meals.length} · 요리 {s.cooks.length} · 목표 {s.goals.length} · 장보기 {s.shopping.length}</T>
        <Button
          title="예시 데이터 넣기(시연용)"
          kind="secondary"
          small
          onPress={async () => {
            if (await confirmAsync('예시 데이터', '지금 재료·식사·목표를 예시 데이터로 바꿔요. 기존 기록은 사라져요.', '바꾸기')) {
              actions.replaceAll(buildDemoState(getState()));
              router.replace('/');
            }
          }}
        />
        <Button
          title="모든 기록 지우기"
          kind="danger"
          small
          onPress={async () => {
            if (await confirmAsync('모든 기록 지우기', '재료·식사·목표·설정이 모두 지워지고 되돌릴 수 없어요.', '모두 지우기')) {
              actions.replaceAll({ ...initialState });
              notify('모두 지웠어요');
              router.replace('/onboarding');
            }
          }}
        />
      </Card>
      <View style={{ height: space.lg }} />
    </Screen>
  );
}

function Toggle({ label, value, onChange, sub }: { label: string; value: boolean; onChange: (v: boolean) => void; sub?: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <T>{label}</T>
        {sub ? <T v="tiny" c={color.textMuted}>{sub}</T> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: color.brand, false: color.border }} />
    </Row>
  );
}
