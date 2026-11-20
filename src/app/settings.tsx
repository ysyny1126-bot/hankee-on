import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Image } from 'expo-image';

import { Character } from '@/components/character';
import { CoachPicker } from '@/components/coach-picker';
import { CHARACTERS } from '@/constants/characters';
import { BUDGET_BANDS, budgetLabel, COOK_TIME_BANDS, DISLIKE_OPTIONS, FRIDGE_SIZES, FRIDGE_SPACES, getCoach, LIFESTYLES, lifestyleLabels, SKILLS } from '@/constants/profile';

import { AI_MODEL_NAME, hasAIKey } from '@/ai/gemini';
import { confirmAsync, notify } from '@/components/dialog';
import { Badge, Button, Chip, Choice, Field, Intro, OnOff, ProgressBar, Row, Screen, Stepper, T, TagPicker } from '@/components/ui';
import { Group, Line } from '@/components/summary-list';
import { Sheet } from '@/components/sheet';
import { color, radius, space } from '@/constants/tokens';
import { ALLERGEN_OPTIONS } from '@/data/catalog';
import { buildDemoState, buildScenario, DEMO_SCENES } from '@/data/demo';
import { actions, getState, initialState, useAppState } from '@/data/store';
import { requestNotificationPermission } from '@/logic/notify';
import { backupSummary, exportBackup, parseBackup, pickBackupFileWeb } from '@/logic/backup';

const join = (l: string[]) => l.join(', ');
const split = (t: string) => t.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

/** 아래 창으로 여는 항목 */
type EditKey =
  | 'lifestyle' | 'budget' | 'cookTime' | 'skill' | 'fridge' | 'planHabit'
  | 'allergy' | 'dislike' | 'name' | 'liked' | 'body'
  | 'character' | 'coach' | 'fridgePhoto' | 'notify' | 'privacy' | 'data';

/**
 * 설정 — "요약 목록 + 하나씩 고치기"
 * 첫 화면에는 지금 값만 한 줄씩. 줄을 누르면 그 질문 하나만 아래에서 올라온다.
 * 생활 유형을 고르면 식비·요리 시간 등을 흔한 값으로 미리 채우고 '자동'으로 표시한다(직접 바꾸면 표시가 사라짐).
 */
export default function Settings() {
  const s = useAppState();
  const p = s.preferences;
  const [open, setOpen] = useState<EditKey | null>(null);
  const { height } = useWindowDimensions();
  const auto = new Set(p.autoFilled ?? []);

  // 추천에 쓰는 정보 채운 정도(요리 시간·경험은 항상 값이 있어 기본으로 셈)
  const items: { key: EditKey; label: string; done: boolean }[] = [
    { key: 'lifestyle', label: '생활 유형', done: p.lifestyles.length > 0 },
    { key: 'budget', label: '식비', done: !!p.monthlyBudget },
    { key: 'cookTime', label: '요리 시간', done: true },
    { key: 'skill', label: '요리 경험', done: true },
    { key: 'fridge', label: '냉장고', done: !!p.fridgeSize || !!p.fridgeSpace },
    { key: 'liked', label: '취향', done: p.preferredFoods.length > 0 || p.dislikedFoods.length > 0 },
    { key: 'allergy', label: '알레르기', done: s.consents.healthInfo || !p.restrictionsLater },
  ];
  const filled = items.filter((x) => x.done).length;

  const lifestyle = lifestyleLabels(p.lifestyles);
  const cook = COOK_TIME_BANDS.find((b) => b.minutes === p.maxCookMinutes)?.label ?? `${p.maxCookMinutes}분`;
  const skill = SKILLS.find((x) => x.key === p.cookingSkill);
  const fridge = [FRIDGE_SIZES.find((f) => f.id === p.fridgeSize)?.label, FRIDGE_SPACES.find((f) => f.id === p.fridgeSpace)?.label].filter(Boolean).join(' · ');
  const coach = getCoach(p.coachId);
  const character = CHARACTERS.find((c) => c.id === (p.characterId ?? 'sprout'));
  const n = s.notifications;
  const notiOn = [n.expiry, n.unusedIngredient, n.menuSuggestion, n.shopping, n.mealReminder].filter(Boolean).length;

  return (
    <Screen edges={['bottom']}>
      <Intro>지금 값만 모아 보여 줘요. 줄을 누르면 하나씩 바꿀 수 있어요.</Intro>

      {/* 추천에 쓰는 정보: 채운 정도 + 아직 안 정한 항목(재촉하지 않음) */}
      <View style={styles.box}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="bodyBold">추천에 쓰는 정보</T>
          <T v="small" c={color.brandDark} style={{ fontWeight: '800' }}>{filled} / {items.length}</T>
        </Row>
        <ProgressBar ratio={filled / items.length} />
        {filled < items.length ? (
          <Row wrap gap={6}>
            {items.filter((x) => !x.done).map((x) => <Chip key={x.key} label={`+ ${x.label}`} onPress={() => setOpen(x.key)} />)}
          </Row>
        ) : (
          <T v="tiny" c={color.textSub}>모두 채웠어요. 바뀌면 언제든 고쳐 주세요.</T>
        )}
      </View>

      <Group title="나의 생활">
        <Line label="생활 유형" value={lifestyle.length ? lifestyle.join(', ') : '정하지 않음'} empty={!lifestyle.length} onPress={() => setOpen('lifestyle')} first />
        <Line label="한 달 식비" value={p.monthlyBudget ? `${budgetLabel(p).replace('(대략)', '')} · ${p.householdSize}명` : '정하지 않음'} empty={!p.monthlyBudget} auto={auto.has('budget')} onPress={() => setOpen('budget')} />
        <Line label="요리 시간" value={`평일 ${cook}`} auto={auto.has('cookTime')} onPress={() => setOpen('cookTime')} />
        <Line label="요리 경험" value={skill?.sub ?? p.cookingSkill} auto={auto.has('skill')} onPress={() => setOpen('skill')} />
        <Line label="냉장고" value={fridge || '정하지 않음'} empty={!fridge} onPress={() => setOpen('fridge')} />
        <Line label="식단 보기" value={p.planHabit === 'week' ? '일주일 계획 중심' : '오늘 한 끼 중심'} auto={auto.has('planHabit')} onPress={() => setOpen('planHabit')} />
      </Group>

      <Group title="먹을 수 없는 것" note="고른 것이 들어간 메뉴는 추천·식단·대체 재료에서 항상 빠져요.">
        <Line label="알레르기" value={!s.consents.healthInfo ? '저장 안 함' : p.allergies.length ? p.allergies.join(', ') : '없음'} danger={s.consents.healthInfo && p.allergies.length > 0} onPress={() => setOpen('allergy')} first />
        <Line label="안 먹는 음식" value={p.dislikedFoods.length ? p.dislikedFoods.join(', ') : '없음'} onPress={() => setOpen('dislike')} />
      </Group>

      <Group title="나에 대해">
        <Line label="이름" value={p.nickname || '정하지 않음'} onPress={() => setOpen('name')} first />
        <Line label="좋아하는 음식" value={p.preferredFoods.length ? p.preferredFoods.join(', ') : '정하지 않음'} empty={!p.preferredFoods.length} onPress={() => setOpen('liked')} />
        <Line label="신체 정보" value={p.body ? '입력함' : '선택 · 맞춤 영양 계산용'} empty={!p.body} onPress={() => setOpen('body')} />
      </Group>

      <Group title="캐릭터와 화면">
        <Line label="캐릭터" value={character?.name ?? '기본'} onPress={() => setOpen('character')} first />
        <Line label="코치 말투" value={`${coach.emoji} ${coach.name}`} onPress={() => setOpen('coach')} />
        <Line label="홈 냉장고 그림" value={p.fridgePhotoUri && p.showFridgePhoto ? '내 냉장고 사진' : '기본 그림'} onPress={() => setOpen('fridgePhoto')} />
      </Group>

      <Group title="앱">
        <Line label="알림" value={`${notiOn}개 켜짐`} onPress={() => setOpen('notify')} first />
        <Line label="개인정보·AI" value={s.consents.personalization ? '기록 기억 켜짐' : '기록 기억 꺼짐'} onPress={() => setOpen('privacy')} />
        <Line label="데이터 관리" value="백업 · 예시 데이터" onPress={() => setOpen('data')} />
      </Group>
      <View style={{ height: space.lg }} />

      <Sheet visible={!!open} onClose={() => setOpen(null)}>
        <ScrollView style={{ maxHeight: Math.round(height * 0.62) }} contentContainerStyle={{ gap: space.md }} keyboardShouldPersistTaps="handled">
          {open ? <Editor k={open} onDone={() => setOpen(null)} /> : null}
        </ScrollView>
        {/* 값은 누르는 즉시 저장 — '완료'는 창을 닫기만 한다(스크롤해도 항상 보이게 밖에 둠) */}
        <Button title="완료" onPress={() => setOpen(null)} />
      </Sheet>
    </Screen>
  );
}

/** 질문 하나: 큰 제목 · 짧은 설명 · 선택지 · 완료 */
function Q({ title, desc, children, autoNote }: { title: string; desc?: string; children: ReactNode; onDone?: () => void; autoNote?: boolean }) {
  return (
    <>
      <T v="h2">{title}</T>
      {autoNote ? <Badge label="생활 유형으로 미리 골라 뒀어요 · 맞으면 그대로 두세요" tone="fresh" /> : null}
      {desc ? <T v="small" c={color.textSub}>{desc}</T> : null}
      {children}
    </>
  );
}

/** 항목별 편집 내용(값은 누르는 즉시 저장되고, '완료'는 창을 닫기만 한다) */
function Editor({ k, onDone }: { k: EditKey; onDone: () => void }) {
  const s = useAppState();
  const p = s.preferences;
  const auto = new Set(p.autoFilled ?? []);
  const [budgetText, setBudgetText] = useState(p.budgetBand === 'custom' && p.monthlyBudget ? String(Math.round(p.monthlyBudget / 10000)) : '');
  const [text, setText] = useState(k === 'name' ? p.nickname : k === 'liked' ? join(p.preferredFoods) : '');
  const [body, setBody] = useState({ h: p.body?.heightCm ? String(p.body.heightCm) : '', w: p.body?.weightKg ? String(p.body.weightKg) : '', y: p.body?.birthYear ? String(p.body.birthYear) : '' });
  const num = (t: string) => (t.trim() ? Number(t.replace(/[^0-9.]/g, '')) || null : null);
  const setBudget = (monthly: number | null, band: string | null) =>
    actions.setProfile('budget', { monthlyBudget: monthly, budgetBand: band, weeklyBudget: monthly ? Math.round(monthly / 4.3 / 1000) * 1000 : null });

  switch (k) {
    case 'lifestyle':
      return (
        <Q title="요즘 생활은 어떤가요?" desc="여러 개 골라도 돼요. 아직 직접 정하지 않은 식비·요리 시간 등을 흔한 값으로 미리 채워 드려요." onDone={onDone}>
          {LIFESTYLES.map((l) => (
            <Choice key={l.id} emoji={l.emoji} label={l.label} multi selected={p.lifestyles.includes(l.id)}
              onPress={() => actions.setLifestyles(p.lifestyles.includes(l.id) ? p.lifestyles.filter((x) => x !== l.id) : [...p.lifestyles, l.id])} />
          ))}
        </Q>
      );
    case 'budget':
      return (
        <Q title="한 달 식비는 대략 얼마예요?" desc="장보기·배달을 모두 합친 대략적인 값이면 돼요." autoNote={auto.has('budget')} onDone={onDone}>
          {BUDGET_BANDS.map((b) => (
            <Choice key={b.id} label={b.label} selected={p.budgetBand === b.id} onPress={() => { setBudgetText(''); setBudget(b.value, b.id); }} />
          ))}
          <Field label="직접 입력(만 원)" keyboardType="number-pad" value={budgetText} onChangeText={(t) => { const v = t.replace(/[^0-9]/g, '').slice(0, 4); setBudgetText(v); setBudget(v ? Number(v) * 10000 : null, v ? 'custom' : null); }} />
          <Row style={{ justifyContent: 'space-between' }}>
            <T>함께 먹는 사람(나 포함)</T>
            <Row gap={4}><Stepper value={p.householdSize} onChange={(v) => actions.setProfile('household', { householdSize: Math.max(1, v) })} min={1} /><T v="small">명</T></Row>
          </Row>
          {p.monthlyBudget ? <Button title="식비 정하지 않기" kind="ghost" small onPress={() => { setBudgetText(''); setBudget(null, null); }} /> : null}
        </Q>
      );
    case 'cookTime':
      return (
        <Q title="평일에 요리할 수 있는 시간은요?" desc="이 시간 안에 끝나는 메뉴를 먼저 보여 드려요." autoNote={auto.has('cookTime')} onDone={onDone}>
          {COOK_TIME_BANDS.map((b) => <Choice key={b.minutes} label={b.label} selected={p.maxCookMinutes === b.minutes} onPress={() => actions.setProfile('cookTime', { maxCookMinutes: b.minutes })} />)}
        </Q>
      );
    case 'skill':
      return (
        <Q title="요리 경험은 어느 정도예요?" desc="초보라면 쉬운 메뉴부터 골라 드려요." autoNote={auto.has('skill')} onDone={onDone}>
          {SKILLS.map((x) => <Choice key={x.key} emoji={x.emoji} label={x.label} sub={x.sub} selected={p.cookingSkill === x.key} onPress={() => actions.setProfile('skill', { cookingSkill: x.key })} />)}
        </Q>
      );
    case 'fridge':
      return (
        <Q title="냉장고는 어떤가요?" desc="공간이 적으면 '사지 말고 있는 걸로' 만드는 메뉴를 더 챙겨요." onDone={onDone}>
          <T v="small" c={color.textSub} style={{ fontWeight: '700' }}>크기</T>
          <Row wrap>{FRIDGE_SIZES.map((f) => <Chip key={f.id} label={`${f.emoji} ${f.label}`} selected={p.fridgeSize === f.id} onPress={() => actions.updatePreferences({ fridgeSize: f.id })} />)}</Row>
          <T v="small" c={color.textSub} style={{ fontWeight: '700' }}>더 넣을 공간</T>
          <Row wrap>{FRIDGE_SPACES.map((f) => <Chip key={f.id} label={`${f.emoji} ${f.label}`} selected={p.fridgeSpace === f.id} onPress={() => actions.updatePreferences({ fridgeSpace: f.id })} />)}</Row>
        </Q>
      );
    case 'planHabit':
      return (
        <Q title="식단은 어떻게 볼까요?" desc="홈과 식단 화면이 처음 보여 줄 범위예요." autoNote={auto.has('planHabit')} onDone={onDone}>
          <Choice emoji="🍽️" label="오늘 한 끼 중심" selected={p.planHabit === 'today'} onPress={() => actions.setProfile('planHabit', { planHabit: 'today' })} />
          <Choice emoji="🗓️" label="일주일 계획 중심" selected={p.planHabit === 'week'} onPress={() => actions.setProfile('planHabit', { planHabit: 'week' })} />
        </Q>
      );
    case 'allergy':
      return (
        <Q title="알레르기가 있나요?" desc="고른 성분이 든 메뉴는 추천·식단·대체 재료에서 빠지고, 직접 연 레시피에는 경고가 떠요." onDone={onDone}>
          {!s.consents.healthInfo ? (
            <>
              <T v="small" c={color.textSub}>알레르기는 건강 정보라서, 저장에 동의해야 걸러 드릴 수 있어요. 이 기기에만 저장돼요.</T>
              <Button title="동의하고 알레르기 고르기" kind="secondary" onPress={() => actions.updateConsents({ healthInfo: true })} />
            </>
          ) : (
            <TagPicker tone="danger" options={ALLERGEN_OPTIONS} value={p.allergies} onChange={(v) => actions.updatePreferences({ allergies: v, restrictionsLater: false })} placeholder="목록에 없으면 입력 (예: 키위)" />
          )}
        </Q>
      );
    case 'dislike':
      return (
        <Q title="안 먹는 음식이 있나요?" desc="고른 음식이 꼭 들어가는 메뉴는 추천에서 빠져요." onDone={onDone}>
          <TagPicker tone="warn" options={DISLIKE_OPTIONS} value={p.dislikedFoods} onChange={(v) => actions.updatePreferences({ dislikedFoods: v, restrictionsLater: false })} placeholder="직접 입력 (예: 셀러리)" />
        </Q>
      );
    case 'name':
      return (
        <Q title="뭐라고 불러 드릴까요?">
          <Field value={text} onChangeText={(t) => { setText(t); if (t.trim()) actions.updatePreferences({ nickname: t.trim() }); }} autoFocus maxLength={12} />
        </Q>
      );
    case 'liked':
      return (
        <Q title="좋아하는 음식이 있나요?" desc="쉼표로 여러 개 적어요. 비슷한 메뉴를 조금 더 자주 보여 드려요.">
          <Field value={text} onChangeText={(t) => { setText(t); actions.updatePreferences({ preferredFoods: split(t) }); }} placeholder="예: 김치찌개, 파스타" autoFocus />
        </Q>
      );
    case 'body':
      return (
        <Q title="맞춤 영양 계산(선택)" desc="원할 때만 넣으세요. 이 기기에만 저장되고 언제든 지울 수 있어요." onDone={onDone}>
          <Row>
            <Field label="키(cm)" keyboardType="decimal-pad" value={body.h} onChangeText={(t) => setBody({ ...body, h: t })} />
            <Field label="체중(kg)" keyboardType="decimal-pad" value={body.w} onChangeText={(t) => setBody({ ...body, w: t })} />
            <Field label="출생연도" keyboardType="number-pad" value={body.y} onChangeText={(t) => setBody({ ...body, y: t.slice(0, 4) })} />
          </Row>
          <Row gap={space.sm}>
            <Button title="저장" kind="secondary" small style={{ flex: 1 }} onPress={() => { actions.updatePreferences({ body: { heightCm: num(body.h), weightKg: num(body.w), birthYear: num(body.y), updatedAt: new Date().toISOString() } }); notify('저장했어요'); }} />
            <Button title="지우기" kind="ghost" small style={{ flex: 1 }} disabled={!p.body} onPress={() => { actions.updatePreferences({ body: null }); setBody({ h: '', w: '', y: '' }); }} />
          </Row>
        </Q>
      );
    case 'character':
      return (
        <Q title="함께할 캐릭터" desc="생김새만 바뀌어요. 말투는 코치에서 골라요." onDone={onDone}>
          <Row gap={space.sm}>
            {CHARACTERS.map((c) => {
              const on = (p.characterId ?? 'sprout') === c.id;
              return (
                <Pressable key={c.id} onPress={() => actions.updatePreferences({ characterId: c.id })} accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: space.md, borderRadius: radius.lg, borderWidth: 2, borderColor: on ? color.brand : color.border, backgroundColor: on ? color.brandSoft : color.surface }}>
                  <Character id={c.id} size={64} />
                  <T v="tiny" c={on ? color.brandDark : color.textSub}>{c.name}</T>
                </Pressable>
              );
            })}
          </Row>
          <T v="tiny" c={color.textMuted}>지금은 임시 캐릭터예요. 완성 캐릭터가 나오면 바뀌어요.</T>
        </Q>
      );
    case 'coach':
      return (
        <Q title="코치 말투" onDone={onDone}>
          <CoachPicker compact characterId={p.characterId} nickname={p.nickname} value={p.coachId} onChange={(id) => actions.updatePreferences({ coachId: id })} />
        </Q>
      );
    case 'fridgePhoto':
      return (
        <Q title="홈 냉장고 그림" onDone={onDone}>
          {p.fridgePhotoUri ? (
            <>
              <Image source={{ uri: p.fridgePhotoUri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="cover" />
              <Toggle label="홈에 내 냉장고 사진 보이기" value={p.showFridgePhoto} onChange={(v) => actions.updatePreferences({ showFridgePhoto: v })} sub="끄면 기본 냉장고 그림을 보여 줘요" />
              <Button title="사진 지우기" kind="ghost" small onPress={() => actions.updatePreferences({ fridgePhotoUri: null, showFridgePhoto: false })} />
            </>
          ) : (
            <T v="small" c={color.textSub}>기본 냉장고 그림을 쓰고 있어요. 냉장고 사진 화면에서 찍은 사진을 홈 그림으로 쓸 수 있어요(이 기기에만 저장).</T>
          )}
        </Q>
      );
    case 'notify':
      return (
        <Q title="알림" desc={Platform.OS === 'web' ? '웹에서는 휴대폰 알림 대신 홈 화면 카드로 알려 드려요.' : '휴대폰 알림은 소비기한 임박·식사 기록만 보내고, 나머지는 홈 화면 카드로 보여 드려요.'} onDone={onDone}>
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
            <Row gap={4}><Stepper value={s.notifications.expiryDaysBefore} onChange={(v) => actions.updateNotifications({ expiryDaysBefore: v })} min={0} /><T v="small">일</T></Row>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T>하루 최대 알림</T>
            <Row gap={4}><Stepper value={s.notifications.maxPerDay} onChange={(v) => actions.updateNotifications({ maxPerDay: v })} min={1} /><T v="small">개</T></Row>
          </Row>
        </Q>
      );
    case 'privacy':
      return (
        <Q title="개인정보·AI" desc="모든 기록은 지금 이 기기에만 저장돼요. 로그인 기능이 생기면 동의를 받고 서버로 옮겨요." onDone={onDone}>
          <Toggle label="식생활 기억하기(개인화)" value={s.consents.personalization} onChange={(v) => actions.updateConsents({ personalization: v })} sub="식사·요리 기록을 맞춤 제안에 사용" />
          <Toggle label="사진을 AI로 분석하기" value={s.consents.externalAI} onChange={(v) => actions.updateConsents({ externalAI: v })} sub="사진을 Google Gemini(무료 등급)로 전송" />
          <Toggle label="건강 정보(알레르기) 저장" value={s.consents.healthInfo} onChange={(v) => { actions.updateConsents({ healthInfo: v }); if (!v) actions.updatePreferences({ allergies: [] }); }} sub="끄면 저장된 알레르기 정보를 지워요" />
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="small" c={color.textSub}>AI 연결 상태</T>
            {hasAIKey() ? <Badge label={`연결됨 · ${AI_MODEL_NAME}`} tone="fresh" /> : <Badge label="연결 전" tone="warn" />}
          </Row>
        </Q>
      );
    case 'data':
      return (
        <Q title="데이터 관리" desc={`재료 ${s.ingredients.length} · 식사 ${s.meals.length} · 요리 ${s.cooks.length} · 목표 ${s.goals.length} · 장보기 ${s.shopping.length}`} onDone={onDone}>
          <BackupBox />
          <Button
            title="예시 데이터 넣기(시연용)"
            kind="secondary"
            small
            onPress={async () => {
              if (await confirmAsync('예시 데이터', '지금 재료·식사·목표를 예시 데이터로 바꿔요. 기존 기록은 사라져요.', '바꾸기')) {
                actions.replaceAll(buildDemoState(getState()));
                onDone();
                router.replace('/');
              }
            }}
          />
          <T v="tiny" c={color.textMuted}>시연용 장면 바꾸기(예시 데이터로 바뀌고, 직후 되돌리기 가능)</T>
          <Row wrap>
            {DEMO_SCENES.map((sc) => (
              <Chip
                key={sc.key}
                label={sc.label}
                onPress={async () => {
                  if (await confirmAsync(`장면: ${sc.label}`, `${sc.desc}\n지금 기록이 예시 데이터로 바뀌어요.`, '바꾸기')) {
                    actions.restoreBackup({ ...buildScenario(getState(), sc.key), onboarded: true }, `장면: ${sc.label}`);
                    onDone();
                    router.replace('/');
                  }
                }}
              />
            ))}
          </Row>
          <Button
            title="모든 기록 지우기"
            kind="danger"
            small
            onPress={async () => {
              if (await confirmAsync('모든 기록 지우기', '재료·식사·목표·설정이 모두 지워지고 되돌릴 수 없어요.', '모두 지우기')) {
                actions.replaceAll({ ...initialState });
                notify('모두 지웠어요');
                onDone();
                router.replace('/onboarding');
              }
            }}
          />
        </Q>
      );
  }
}

const styles = StyleSheet.create({
  box: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
});

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

/** C5 백업 내보내기·가져오기 */
function BackupBox() {
  const s = useAppState();
  const [paste, setPaste] = useState<string | null>(null);
  const load = async (text: string | null) => {
    if (!text) return;
    try {
      const next = parseBackup(text);
      if (!(await confirmAsync('백업 불러오기', `백업: ${backupSummary(next)}\n지금 기록(${backupSummary(s)})을 이 백업으로 바꿔요.`, '불러오기'))) return;
      actions.restoreBackup(next);
      setPaste(null);
      notify('백업을 불러왔어요', '잘못 불러왔다면 화면 아래 되돌리기를 누르세요.');
    } catch (e) {
      notify('불러오지 못했어요', (e as Error).message);
    }
  };
  return (
    <View style={{ gap: space.sm, paddingVertical: space.xs }}>
      <T v="bodyBold">백업</T>
      <T v="tiny" c={color.textMuted}>기기를 바꾸거나 브라우저 기록을 지우면 기록이 사라질 수 있어요. 가끔 내보내 두세요. (사진은 이 기기 경로만 들어가요)</T>
      <Row gap={space.sm}>
        <Button small kind="secondary" title={Platform.OS === 'web' ? '백업 파일 내려받기' : '백업 내보내기(공유)'} style={{ flex: 1 }} onPress={() => exportBackup(s).catch((e) => notify('내보내지 못했어요', (e as Error).message))} />
        <Button small kind="secondary" title="백업 불러오기" style={{ flex: 1 }} onPress={async () => (Platform.OS === 'web' ? load(await pickBackupFileWeb()) : setPaste(''))} />
      </Row>
      {Platform.OS === 'web' && paste === null ? (
        <Pressable onPress={() => setPaste('')} hitSlop={6}><T v="tiny" c={color.textSub}>파일 대신 글로 붙여 넣기</T></Pressable>
      ) : null}
      {paste !== null && (
        <>
          <Field label="백업 글 붙여 넣기" multiline value={paste} onChangeText={setPaste} placeholder='{"app":"hankeeon-backup", ...}' style={{ minHeight: 90 }} />
          <Row gap={space.sm}>
            <Button small title="불러오기" style={{ flex: 1 }} disabled={!paste.trim()} onPress={() => load(paste)} />
            <Button small kind="ghost" title="닫기" onPress={() => setPaste(null)} />
          </Row>
        </>
      )}
    </View>
  );
}
