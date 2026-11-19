import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { hasAIKey } from '@/ai/gemini';
import { pickPhoto, setPendingPhoto, storableUri, type PickedPhoto } from '@/ai/photo';
import { Character } from '@/components/character';
import { Icon } from '@/components/icon';
import { CoachPicker } from '@/components/coach-picker';
import { notify } from '@/components/dialog';
import { Welcome } from '@/components/welcome';
import { Button, Choice, Field, OnOff, Row, T, TagPicker } from '@/components/ui';
import { CHARACTERS } from '@/constants/characters';
import {
  BODY_GOALS,
  BUDGET_BANDS,
  COOK_TIME_BANDS,
  DISLIKE_OPTIONS,
  FRIDGE_SIZES,
  FRIDGE_SPACES,
  GOAL_OPTIONS,
  LIFESTYLES,
  SKILLS,
} from '@/constants/profile';
import { clay, color, MAX_WIDTH, radius, space } from '@/constants/tokens';
import { ALLERGEN_OPTIONS } from '@/data/catalog';
import { buildDemoState } from '@/data/demo';
import { actions, getState } from '@/data/store';
import type { FoodPreferences } from '@/data/types';
import { toDateKey } from '@/logic/dates';
import { requestNotificationPermission } from '@/logic/notify';

type Draft = Pick<
  FoodPreferences,
  | 'nickname'
  | 'lifestyles'
  | 'monthlyBudget'
  | 'budgetBand'
  | 'fridgeSize'
  | 'fridgeSpace'
  | 'maxCookMinutes'
  | 'cookingSkill'
  | 'householdSize'
  | 'planHabit'
  | 'profileGoals'
  | 'allergies'
  | 'dislikedFoods'
  | 'restrictionsLater'
  | 'characterId'
  | 'coachId'
>;

const START: Draft = {
  nickname: '',
  lifestyles: [],
  monthlyBudget: null,
  budgetBand: null,
  fridgeSize: null,
  fridgeSpace: null,
  maxCookMinutes: 20,
  cookingSkill: '초보',
  householdSize: 1,
  planHabit: 'today',
  profileGoals: [],
  allergies: [],
  dislikedFoods: [],
  restrictionsLater: false,
  characterId: 'sprout',
  coachId: 'warm',
};

const STEPS = ['nickname', 'lifestyle', 'budget', 'fridge', 'cooking', 'goals', 'restrictions', 'character', 'coach'] as const;
type Step = (typeof STEPS)[number];
/** 건너뛸 수 있는 질문(대략적인 정보·목표 등) */
const SKIPPABLE: Step[] = ['lifestyle', 'budget', 'fridge', 'cooking', 'goals'];

/**
 * 시작하기: 한 화면에 한 가지 질문, 위에는 진행률과 뒤로 가기.
 * 처음엔 대략적인 값만 받고, 자세한 값은 설정에서 언제든 고칠 수 있다.
 */
export default function Onboarding() {
  const [welcome, setWelcome] = useState(true); // 첫 화면(환영) → 9단계 질문
  const [i, setI] = useState(0);
  const [d, setD] = useState<Draft>(START);
  const touched = useRef(new Set<keyof Draft>());
  const [customBudget, setCustomBudget] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [usePhotoAtHome, setUsePhotoAtHome] = useState(true);
  const [aiConsent, setAiConsent] = useState(false);
  const [healthConsent, setHealthConsent] = useState(true);
  const [personal, setPersonal] = useState(true);
  const [photoBusy, setPhotoBusy] = useState(false);

  const step = STEPS[i];
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    touched.current.add(k);
    setD((x) => ({ ...x, [k]: v }));
  };

  /** 생활 유형을 고르면, 사용자가 아직 건드리지 않은 값만 그 유형의 기본값으로 미리 채운다 */
  const applyLifestyleDefaults = () => {
    setD((x) => {
      const next = { ...x };
      for (const id of x.lifestyles) {
        const l = LIFESTYLES.find((y) => y.id === id);
        for (const [k, v] of Object.entries(l?.defaults ?? {})) {
          if (touched.current.has(k as keyof Draft)) continue;
          if (k === 'householdSize' && typeof v === 'number') next.householdSize = Math.max(next.householdSize, v);
          else if (k === 'budgetBand') {
            const b = BUDGET_BANDS.find((y) => y.id === v);
            if (b) Object.assign(next, { budgetBand: b.id, monthlyBudget: b.value });
          } else Object.assign(next, { [k]: v });
        }
      }
      return next;
    });
  };

  const next = () => {
    if (step === 'lifestyle') applyLifestyleDefaults();
    if (i < STEPS.length - 1) setI(i + 1);
  };
  const back = () => (i > 0 ? setI(i - 1) : setWelcome(true));
  const skip = () => {
    if (step === 'goals') set('profileGoals', []);
    next();
  };

  const choosePhoto = async (src: 'camera' | 'library') => {
    setPhotoBusy(true);
    try {
      const p = await pickPhoto(src);
      if (p) setPhoto(p);
    } catch (e) {
      notify('사진을 열 수 없어요', (e as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const finish = async (withDemo: boolean) => {
    const savedPhoto = photo && usePhotoAtHome ? storableUri(photo) : null;
    actions.completeOnboarding(
      {
        ...d,
        nickname: d.nickname.trim() || '한끼러',
        weeklyBudget: d.monthlyBudget ? Math.round(d.monthlyBudget / 4.3 / 1000) * 1000 : null,
        allergies: healthConsent ? d.allergies : [],
        fridgePhotoUri: savedPhoto,
        showFridgePhoto: !!savedPhoto,
      },
      { personalization: personal, externalAI: aiConsent, healthInfo: healthConsent && d.allergies.length > 0 },
    );
    // 진행률을 셀 수 있는 목표는 '식생활 목표'에도 만든다
    for (const label of d.profileGoals) {
      const g = GOAL_OPTIONS.find((x) => x.label === label);
      if (g?.track) actions.addGoal({ goalType: g.track.type, title: g.label, targetValue: g.track.target, unit: g.track.unit, startDate: toDateKey(), endDate: null, status: 'active' });
      else actions.addGoal({ goalType: 'custom', title: label, targetValue: 1, unit: '', startDate: toDateKey(), endDate: null, status: 'active' });
    }
    if (withDemo) actions.replaceAll(buildDemoState(getState()));
    await requestNotificationPermission();
    // 냉장고 사진 + AI 동의 + 키 있음 → 바로 재료 인식 화면으로
    if (!withDemo && photo && aiConsent && hasAIKey()) {
      setPendingPhoto(photo);
      router.replace('/');
      router.push('/scan/fridge');
      return;
    }
    if (photo && usePhotoAtHome && !savedPhoto) notify('사진이 커서 홈 그림으로는 저장하지 못했어요', '웹에서는 1MB 이하 사진만 저장돼요. 기본 냉장고 그림을 보여 드릴게요.');
    router.replace('/');
  };

  const canNext = step === 'nickname' ? d.nickname.trim().length > 0 : true;

  if (welcome) return <Welcome characterId={d.characterId} onStart={() => setWelcome(false)} onDemo={() => finish(true)} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }} edges={['top', 'bottom']}>
      <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', flex: 1 }}>
        {/* 진행률 + 뒤로 가기 */}
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm }}>
          <Row style={{ justifyContent: 'space-between', minHeight: 32 }}>
            <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel={i === 0 ? '첫 화면으로' : '이전 질문'} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}>
              <View style={{ transform: [{ scaleX: -1 }] }}><Icon name="chevron" size={22} c={color.text} /></View>
            </Pressable>
            <T v="small" c={color.textMuted}>{i + 1} / {STEPS.length}</T>
            {SKIPPABLE.includes(step) ? (
              <Pressable onPress={skip} hitSlop={12} accessibilityRole="button">
                <T v="small" c={color.textSub} style={{ fontWeight: '700' }}>건너뛰기</T>
              </Pressable>
            ) : (
              <View style={{ width: 48 }} />
            )}
          </Row>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: color.surfaceAlt, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: STEPS.length, now: i + 1 }}>
            <View style={{ width: `${((i + 1) / STEPS.length) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: color.brand }} />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
          {step === 'nickname' && (
            <Q title="뭐라고 불러 드릴까요?" sub="홈에서 코치가 이 이름으로 불러요. 나중에 바꿀 수 있어요.">
              <Field placeholder="닉네임 (예: 한끼러)" value={d.nickname} onChangeText={(t) => set('nickname', t.slice(0, 12))} autoFocus returnKeyType="next" onSubmitEditing={() => canNext && next()} maxLength={12} />
            </Q>
          )}

          {step === 'lifestyle' && (
            <Q title="요즘 생활은 어떤가요?" sub="여러 개 골라도 돼요. 추천의 출발점으로만 쓰고, 언제든 바꿀 수 있어요.">
              {LIFESTYLES.map((l) => (
                <Choice key={l.id} multi emoji={l.emoji} label={l.label} selected={d.lifestyles.includes(l.id)} onPress={() => set('lifestyles', d.lifestyles.includes(l.id) ? d.lifestyles.filter((x) => x !== l.id) : [...d.lifestyles, l.id])} />
              ))}
            </Q>
          )}

          {step === 'budget' && (
            <Q title="한 달 식비는 대략 얼마예요?" sub="정확하지 않아도 돼요. 장볼 재료가 예산에 맞는 메뉴를 먼저 골라 드려요.">
              {BUDGET_BANDS.map((b) => (
                <Choice key={b.id} label={b.label} selected={d.budgetBand === b.id} onPress={() => { setCustomBudget(''); set('budgetBand', b.id); set('monthlyBudget', b.value); }} />
              ))}
              <Field
                label="직접 입력(만 원)"
                placeholder="예: 30"
                keyboardType="number-pad"
                value={customBudget}
                onChangeText={(t) => {
                  const v = t.replace(/[^0-9]/g, '').slice(0, 4);
                  setCustomBudget(v);
                  set('budgetBand', v ? 'custom' : null);
                  set('monthlyBudget', v ? Number(v) * 10000 : null);
                }}
              />
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="small" c={color.textSub}>함께 먹는 사람(나 포함)</T>
                <Row gap={space.xs}>
                  {[1, 2, 3, 4].map((n) => (
                    <Pressable key={n} onPress={() => set('householdSize', n)} style={{ width: 40, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: d.householdSize === n ? color.brand : color.border, backgroundColor: d.householdSize === n ? color.brandSoft : color.surface }}>
                      <T v="bodyBold">{n === 4 ? '4+' : n}</T>
                    </Pressable>
                  ))}
                </Row>
              </Row>
            </Q>
          )}

          {step === 'fridge' && (
            <Q title="냉장고는 어떤가요?" sub="크기와 남은 공간을 알면 '사지 말고 있는 걸로' 하는 메뉴를 더 챙겨요.">
              <T v="small" c={color.textSub} style={{ fontWeight: '700' }}>전체 크기</T>
              <Row wrap gap={space.sm}>
                {FRIDGE_SIZES.map((f) => (
                  <Tile key={f.id} emoji={f.emoji} label={f.label} sub={f.sub} selected={d.fridgeSize === f.id} onPress={() => set('fridgeSize', f.id)} />
                ))}
              </Row>
              <T v="small" c={color.textSub} style={{ fontWeight: '700' }}>지금 더 넣을 공간</T>
              <Row gap={space.sm}>
                {FRIDGE_SPACES.map((f) => (
                  <Tile key={f.id} basis="30%" emoji={f.emoji} label={f.label} selected={d.fridgeSpace === f.id} onPress={() => set('fridgeSpace', f.id)} />
                ))}
              </Row>

              <View style={{ ...clay, padding: space.md, gap: space.sm }}>
                <T v="bodyBold">📷 냉장고 사진 (선택)</T>
                {photo ? (
                  <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="cover" />
                ) : (
                  <T v="tiny" c={color.textSub}>올리지 않아도 기본 냉장고 그림으로 시작해요. 문을 열고 한 칸씩 밝게 찍으면 좋아요.</T>
                )}
                <Row gap={space.sm}>
                  <Button title={photo ? '다시 찍기' : '촬영'} kind="secondary" small style={{ flex: 1 }} onPress={() => choosePhoto('camera')} loading={photoBusy} />
                  <Button title="앨범" kind="secondary" small style={{ flex: 1 }} onPress={() => choosePhoto('library')} disabled={photoBusy} />
                </Row>
                {photo && (
                  <>
                    <Toggle label="홈 냉장고 그림으로 쓰기" sub="이 기기에만 저장해요" value={usePhotoAtHome} onChange={setUsePhotoAtHome} />
                    <Toggle label="AI로 재료 찾기" sub="사진을 Google Gemini(무료 등급)로 보내 분석해요. 무료 등급은 구글이 서비스 개선에 쓸 수 있어요." value={aiConsent} onChange={setAiConsent} />
                    {aiConsent && !hasAIKey() && <T v="tiny" c={color.warn}>AI 키가 아직 연결되지 않아 지금은 분석할 수 없어요. 재료는 직접 넣을 수 있어요.</T>}
                  </>
                )}
              </View>
            </Q>
          )}

          {step === 'cooking' && (
            <Q title="요리에 쓸 수 있는 시간은요?" sub="평일 한 끼 기준이에요. 이 시간 안에 끝나는 메뉴를 먼저 보여 드려요.">
              <Row wrap gap={space.sm}>
                {COOK_TIME_BANDS.map((b) => (
                  <Tile key={b.minutes} label={b.label} selected={d.maxCookMinutes === b.minutes} onPress={() => set('maxCookMinutes', b.minutes)} />
                ))}
              </Row>
              <T v="small" c={color.textSub} style={{ fontWeight: '700', marginTop: space.sm }}>요리 경험</T>
              {SKILLS.map((k) => (
                <Choice key={k.key} emoji={k.emoji} label={k.label} sub={k.sub} selected={d.cookingSkill === k.key} onPress={() => set('cookingSkill', k.key)} />
              ))}
              <T v="small" c={color.textSub} style={{ fontWeight: '700', marginTop: space.sm }}>식단은 어떻게 짤까요?</T>
              <Row gap={space.sm}>
                <Tile emoji="🍱" label="오늘 한 끼씩" selected={d.planHabit === 'today'} onPress={() => set('planHabit', 'today')} />
                <Tile emoji="🗓️" label="일주일 계획" selected={d.planHabit === 'week'} onPress={() => set('planHabit', 'week')} />
              </Row>
            </Q>
          )}

          {step === 'goals' && (
            <Q title="이루고 싶은 게 있나요?" sub="없어도 괜찮아요. 목표 없이도 모든 기능을 쓸 수 있어요.">
              <TagPicker options={GOAL_OPTIONS.map((g) => g.label)} value={d.profileGoals} onChange={(v) => set('profileGoals', v)} placeholder="직접 입력 (예: 아침 꼭 먹기)" />
              {d.profileGoals.some((g) => BODY_GOALS.includes(g)) && (
                <T v="tiny" c={color.textSub}>맞춤 영양 계산이 필요하면 키·체중은 나중에 ‘설정’에서 원할 때만 넣으면 돼요. 지금은 묻지 않아요.</T>
              )}
            </Q>
          )}

          {step === 'restrictions' && (
            <Q title="못 먹거나 피하는 음식이 있나요?" sub="고른 음식은 추천·식단·대체 재료·코치 말에서 모두 빠져요.">
              <T v="small" c={color.textSub} style={{ fontWeight: '700' }}>알레르기</T>
              <TagPicker tone="danger" options={ALLERGEN_OPTIONS} value={d.allergies} onChange={(v) => { set('allergies', v); set('restrictionsLater', false); }} placeholder="목록에 없으면 입력 (예: 키위)" />
              <T v="small" c={color.textSub} style={{ fontWeight: '700', marginTop: space.sm }}>안 먹는 음식</T>
              <TagPicker tone="warn" options={DISLIKE_OPTIONS} value={d.dislikedFoods} onChange={(v) => { set('dislikedFoods', v); set('restrictionsLater', false); }} placeholder="직접 입력 (예: 셀러리)" />
              {d.allergies.length > 0 && <Toggle label="알레르기 정보를 이 기기에 저장" sub="추천에서 빼는 데만 써요. 끄면 저장하지 않아요." value={healthConsent} onChange={setHealthConsent} />}
              <Row gap={space.sm}>
                <Button title="없어요" kind="secondary" small style={{ flex: 1 }} onPress={() => { set('allergies', []); set('dislikedFoods', []); set('restrictionsLater', false); next(); }} />
                <Button title="나중에 설정" kind="ghost" small style={{ flex: 1 }} onPress={() => { set('restrictionsLater', true); next(); }} />
              </Row>
              <T v="tiny" c={color.textMuted}>의료 진단을 대신하지 않아요. 심한 알레르기는 성분표를 꼭 확인해 주세요.</T>
            </Q>
          )}

          {step === 'character' && (
            <Q title="함께할 캐릭터를 골라요" sub="생김새만 고르는 거예요. 말투는 다음에 골라요.">
              <View style={{ alignItems: 'center', paddingVertical: space.md, backgroundColor: color.brandSoft, borderRadius: radius.xl }}>
                <Character id={d.characterId} size={140} mood="happy" />
              </View>
              <Row gap={space.sm}>
                {CHARACTERS.map((c) => {
                  const on = d.characterId === c.id;
                  return (
                    <Pressable key={c.id} onPress={() => set('characterId', c.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={c.name} style={{ flex: 1, alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: 2, borderColor: on ? color.brand : color.border, backgroundColor: on ? color.brandSoft : color.surface }}>
                      <Character id={c.id} size={60} mood={on ? 'happy' : 'idle'} />
                      <T v="tiny" c={on ? color.brandDark : color.textSub}>{c.name}</T>
                    </Pressable>
                  );
                })}
              </Row>
            </Q>
          )}

          {step === 'coach' && (
            <CoachPicker characterId={d.characterId} nickname={d.nickname} value={d.coachId} onChange={(v) => set('coachId', v)}>
              <View style={{ ...clay, padding: space.md, gap: space.sm }}>
                <Toggle label="내 기록으로 맞춤 추천받기" sub="식사·요리 기록을 이 기기에서 기억해 추천에 써요. 설정에서 끌 수 있어요." value={personal} onChange={setPersonal} />
              </View>
            </CoachPicker>
          )}
        </ScrollView>

        {/* 아래 버튼 */}
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.sm }}>
          {step === 'coach' ? (
            <>
              <Button title="시작하기" onPress={() => finish(false)} />
              <Button title="예시 데이터로 둘러보기" kind="ghost" small onPress={() => finish(true)} />
            </>
          ) : (
            <Button title="다음" onPress={next} disabled={!canNext} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Q({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <T v="h1">{title}</T>
        {sub ? <T v="small" c={color.textSub}>{sub}</T> : null}
      </View>
      {children}
    </View>
  );
}

function Tile({ emoji, label, sub, selected, onPress, basis = '45%' }: { emoji?: string; label: string; sub?: string; selected?: boolean; onPress: () => void; basis?: '45%' | '30%' }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: !!selected }} style={{ flexGrow: 1, flexBasis: basis, minWidth: 0, alignItems: 'center', gap: 2, paddingVertical: space.md, paddingHorizontal: space.sm, borderRadius: radius.lg, borderWidth: 2, borderColor: selected ? color.brand : color.border, backgroundColor: selected ? color.brandSoft : color.surface }}>
      {emoji ? <Text style={{ fontSize: 24 }}>{emoji}</Text> : null}
      <T v="bodyBold" style={{ textAlign: 'center' }}>{label}</T>
      {sub ? <T v="tiny" c={color.textSub} style={{ textAlign: 'center' }}>{sub}</T> : null}
    </Pressable>
  );
}

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <T v="bodyBold">{label}</T>
        {sub ? <T v="tiny" c={color.textMuted}>{sub}</T> : null}
      </View>
      <OnOff value={value} onValueChange={onChange} />
    </Row>
  );
}

