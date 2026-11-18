import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Image } from 'expo-image';

import { Character } from '@/components/character';
import { CoachPicker } from '@/components/coach-picker';
import { CHARACTERS } from '@/constants/characters';
import { BUDGET_BANDS, COOK_TIME_BANDS, DISLIKE_OPTIONS, FRIDGE_SIZES, FRIDGE_SPACES, LIFESTYLES } from '@/constants/profile';

import { AI_MODEL_NAME, hasAIKey } from '@/ai/gemini';
import { confirmAsync, notify } from '@/components/dialog';
import { Badge, Button, Card, Chip, Field, Row, Screen, SectionHeader, Segmented, Stepper, T, OnOff, TagPicker } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
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
  const [budgetText, setBudgetText] = useState(p.budgetBand === 'custom' && p.monthlyBudget ? String(Math.round(p.monthlyBudget / 10000)) : '');
  const [body, setBody] = useState({ h: p.body?.heightCm ? String(p.body.heightCm) : '', w: p.body?.weightKg ? String(p.body.weightKg) : '', y: p.body?.birthYear ? String(p.body.birthYear) : '' });
  const setBudget = (monthly: number | null, band: string | null) =>
    actions.updatePreferences({ monthlyBudget: monthly, budgetBand: band, weeklyBudget: monthly ? Math.round(monthly / 4.3 / 1000) * 1000 : null });
  const num = (t: string) => (t.trim() ? Number(t.replace(/[^0-9.]/g, '')) || null : null);


  return (
    <Screen edges={['bottom']}>
      <SectionHeader title="내 캐릭터" />
      <Row gap={space.sm}>
        {CHARACTERS.map((c) => {
          const on = (p.characterId ?? 'sprout') === c.id;
          return (
            <Pressable key={c.id} onPress={() => actions.updatePreferences({ characterId: c.id })} style={{ flex: 1, alignItems: 'center', paddingVertical: space.md, borderRadius: radius.lg, borderWidth: 2, borderColor: on ? color.brand : color.border, backgroundColor: on ? color.brandSoft : color.surface }}>
              <Character id={c.id} size={64} />
              <T v="tiny" c={on ? color.brandDark : color.textSub}>{c.name}</T>
            </Pressable>
          );
        })}
      </Row>
      <T v="tiny" c={color.textMuted}>지금은 임시 캐릭터예요. 완성 캐릭터가 나오면 바뀌어요.</T>

      <CoachPicker compact characterId={p.characterId} nickname={p.nickname} value={p.coachId} onChange={(id) => actions.updatePreferences({ coachId: id })} />

      <SectionHeader title="생활 유형" />
      <Card>
        <Row wrap>
          {LIFESTYLES.map((l) => (
            <Chip key={l.id} label={`${l.emoji} ${l.label}`} selected={p.lifestyles.includes(l.id)} onPress={() => actions.updatePreferences({ lifestyles: p.lifestyles.includes(l.id) ? p.lifestyles.filter((x) => x !== l.id) : [...p.lifestyles, l.id] })} />
          ))}
        </Row>
        <T v="tiny" c={color.textMuted}>여러 개 골라도 돼요. 아래 생활 정보를 자세히 넣을수록 추천이 정교해져요.</T>
      </Card>

      <SectionHeader title="생활 정보" />
      <Card>
        <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>한 달 식비</T>
        <Row wrap>
          {BUDGET_BANDS.map((b) => <Chip key={b.id} label={b.label} selected={p.budgetBand === b.id} onPress={() => { setBudgetText(''); setBudget(p.budgetBand === b.id ? null : b.value, p.budgetBand === b.id ? null : b.id); }} />)}
        </Row>
        <Field placeholder="직접 입력(만 원)" keyboardType="number-pad" value={budgetText} onChangeText={(t) => { const v = t.replace(/[^0-9]/g, '').slice(0, 4); setBudgetText(v); setBudget(v ? Number(v) * 10000 : null, v ? 'custom' : null); }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T>함께 먹는 사람(나 포함)</T>
          <Row gap={4}><Stepper value={p.householdSize} onChange={(n) => actions.updatePreferences({ householdSize: Math.max(1, n) })} min={1} /><T v="small">명</T></Row>
        </Row>
        <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>냉장고 크기</T>
        <Row wrap>{FRIDGE_SIZES.map((f) => <Chip key={f.id} label={`${f.emoji} ${f.label}`} selected={p.fridgeSize === f.id} onPress={() => actions.updatePreferences({ fridgeSize: f.id })} />)}</Row>
        <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>더 넣을 공간</T>
        <Row wrap>{FRIDGE_SPACES.map((f) => <Chip key={f.id} label={`${f.emoji} ${f.label}`} selected={p.fridgeSpace === f.id} onPress={() => actions.updatePreferences({ fridgeSpace: f.id })} />)}</Row>
        <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>평일 요리 시간</T>
        <Row wrap>{COOK_TIME_BANDS.map((b) => <Chip key={b.minutes} label={b.label} selected={p.maxCookMinutes === b.minutes} onPress={() => actions.updatePreferences({ maxCookMinutes: b.minutes })} />)}</Row>
        <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>식단 보기</T>
        <Segmented options={[{ key: 'today', label: '오늘 한 끼 중심' }, { key: 'week', label: '일주일 계획 중심' }]} value={p.planHabit} onChange={(k) => actions.updatePreferences({ planHabit: k })} />
      </Card>

      <SectionHeader title="홈 냉장고 그림" />
      <Card>
        {p.fridgePhotoUri ? (
          <>
            <Image source={{ uri: p.fridgePhotoUri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="cover" />
            <Toggle label="홈에 내 냉장고 사진 보이기" value={p.showFridgePhoto} onChange={(v) => actions.updatePreferences({ showFridgePhoto: v })} sub="끄면 기본 냉장고 그림을 보여 줘요" />
            <Button title="사진 지우기" kind="ghost" small onPress={() => actions.updatePreferences({ fridgePhotoUri: null, showFridgePhoto: false })} />
          </>
        ) : (
          <T v="small" c={color.textSub}>기본 냉장고 그림을 쓰고 있어요. 냉장고 사진 분석 화면에서 찍은 사진을 홈 그림으로 쓸 수 있어요(이 기기에만 저장).</T>
        )}
      </Card>

      <SectionHeader title="나의 취향" />
      <Card>
        <Field label="이름" value={p.nickname} onChangeText={(t) => actions.updatePreferences({ nickname: t })} />
        <Field label="좋아하는 음식" value={liked} onChangeText={setLiked} onBlur={() => actions.updatePreferences({ preferredFoods: split(liked) })} />
        <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>안 먹는 음식</T>
        <TagPicker tone="warn" options={DISLIKE_OPTIONS} value={p.dislikedFoods} onChange={(v) => actions.updatePreferences({ dislikedFoods: v, restrictionsLater: false })} placeholder="직접 입력 (예: 셀러리)" />
        <T v="tiny" c={color.textMuted}>고른 음식이 꼭 들어가는 메뉴는 추천·식단·대체 재료에서 빠져요.</T>
        <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>요리 실력</T>
        <Segmented options={[{ key: '초보', label: '초보' }, { key: '보통', label: '보통' }, { key: '능숙', label: '능숙' }]} value={p.cookingSkill} onChange={(k) => actions.updatePreferences({ cookingSkill: k })} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T>평일 조리 시간(직접)</T>
          <Row gap={4}><Stepper value={p.maxCookMinutes} onChange={(n) => actions.updatePreferences({ maxCookMinutes: n })} step={5} min={5} /><T v="small">분</T></Row>
        </Row>
      </Card>

      <SectionHeader title="알레르기·식품 주의" />
      <Card>
        {!s.consents.healthInfo ? (
          <T v="small" c={color.textSub}>건강 정보 저장에 동의하면 알레르기를 레시피 추천에서 걸러 드려요. (아래 개인정보에서 켜기)</T>
        ) : (
          <>
            <TagPicker tone="danger" options={ALLERGEN_OPTIONS} value={p.allergies} onChange={(v) => actions.updatePreferences({ allergies: v, restrictionsLater: false })} placeholder="목록에 없으면 입력 (예: 키위)" />
            <T v="tiny" c={color.textMuted}>선택한 성분이 든 레시피는 추천·식단·대체 재료에서 빠지고, 직접 연 레시피에는 경고가 표시돼요.</T>
          </>
        )}
      </Card>

      <SectionHeader title="맞춤 영양 계산(선택)" />
      <Card>
        <T v="small" c={color.textSub}>원할 때만 넣으세요. 키·체중은 이 기기에만 저장되고, 언제든 고치거나 지울 수 있어요.</T>
        <Row>
          <Field label="키(cm)" keyboardType="decimal-pad" value={body.h} onChangeText={(t) => setBody({ ...body, h: t })} />
          <Field label="체중(kg)" keyboardType="decimal-pad" value={body.w} onChangeText={(t) => setBody({ ...body, w: t })} />
          <Field label="출생연도" keyboardType="number-pad" value={body.y} onChangeText={(t) => setBody({ ...body, y: t.slice(0, 4) })} />
        </Row>
        <Row gap={space.sm}>
          <Button title="저장" small style={{ flex: 1 }} onPress={() => { actions.updatePreferences({ body: { heightCm: num(body.h), weightKg: num(body.w), birthYear: num(body.y), updatedAt: new Date().toISOString() } }); notify('저장했어요'); }} />
          <Button title="지우기" kind="ghost" small style={{ flex: 1 }} disabled={!p.body} onPress={() => { actions.updatePreferences({ body: null }); setBody({ h: '', w: '', y: '' }); notify('신체 정보를 지웠어요'); }} />
        </Row>
      </Card>

      <SectionHeader title="알림" />
      <Card>
        <Toggle label="소비기한 임박" value={s.notifications.expiry} onChange={async (v) => { actions.updateNotifications({ expiry: v }); if (v) await requestNotificationPermission(); }} />
        <Toggle label="오래 안 쓴 재료" value={s.notifications.unusedIngredient} onChange={(v) => actions.updateNotifications({ unusedIngredient: v })} />
        <Toggle label="오늘의 메뉴 제안" value={s.notifications.menuSuggestion} onChange={(v) => actions.updateNotifications({ menuSuggestion: v })} />
        <Toggle label="장보기 제안" value={s.notifications.shopping} onChange={(v) => actions.updateNotifications({ shopping: v })} />
        <Toggle label="식사 기록 리마인더" value={s.notifications.mealReminder} onChange={async (v) => { actions.updateNotifications({ mealReminder: v }); if (v) await requestNotificationPermission(); }} sub="고른 시각에 하루 한 번씩" />
        {s.notifications.mealReminder && (
          <Row wrap>
            {[['08:30', '아침'], ['12:30', '점심'], ['19:00', '저녁']].map(([t, l]) => {
              const on = s.notifications.mealReminderTimes.includes(t);
              return <Chip key={t} label={`${l} ${t}`} selected={on} onPress={() => actions.updateNotifications({ mealReminderTimes: on ? s.notifications.mealReminderTimes.filter((x) => x !== t) : [...s.notifications.mealReminderTimes, t].sort() })} />;
            })}
          </Row>
        )}
        <Row style={{ justifyContent: 'space-between' }}>
          <T>소비기한 며칠 전에 알릴까요?</T>
          <Row gap={4}><Stepper value={s.notifications.expiryDaysBefore} onChange={(n) => actions.updateNotifications({ expiryDaysBefore: n })} min={0} /><T v="small">일</T></Row>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <T>하루 최대 알림</T>
          <Row gap={4}><Stepper value={s.notifications.maxPerDay} onChange={(n) => actions.updateNotifications({ maxPerDay: n })} min={1} /><T v="small">개</T></Row>
        </Row>
        <T v="tiny" c={color.textMuted}>{Platform.OS === 'web' ? '웹에서는 휴대폰 알림 대신 홈 화면 카드로 알려 드려요.' : '휴대폰 알림은 소비기한 임박·식사 기록만 보내고, 나머지는 홈 화면 카드로 보여 드려요.'}</T>
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
      <OnOff value={value} onValueChange={onChange} />
    </Row>
  );
}
