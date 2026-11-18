import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Character } from '@/components/character';
import { Button, Chip, Row, Screen, T , OnOff } from '@/components/ui';
import { CHARACTERS, type CharacterId } from '@/constants/characters';
import { clay, color, radius, space } from '@/constants/tokens';
import { ALLERGEN_OPTIONS } from '@/data/catalog';
import { buildDemoState } from '@/data/demo';
import { actions, getState } from '@/data/store';
import { requestNotificationPermission } from '@/logic/notify';

/** 시작 화면 1장: 캐릭터 · 알레르기 · 동의 한 번. 나머지(이름·예산·조리 시간)는 설정에서. */
export default function Onboarding() {
  const [character, setCharacter] = useState<CharacterId>('sprout');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [agree, setAgree] = useState(true);
  const [detail, setDetail] = useState(false);

  const finish = async (withDemo: boolean) => {
    actions.completeOnboarding(
      { nickname: '한끼러', characterId: character, allergies: agree ? allergies : [] },
      { personalization: agree, externalAI: agree, healthInfo: agree },
    );
    if (withDemo) actions.replaceAll(buildDemoState(getState()));
    await requestNotificationPermission();
    router.replace('/');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ paddingTop: space.xl, alignItems: 'center', gap: space.xs }}>
        <T v="tiny" c={color.brandDark}>HANKEE ON</T>
        <T v="h1">함께할 친구를 골라요</T>
      </View>

      <Row gap={space.sm}>
        {CHARACTERS.map((c) => {
          const on = character === c.id;
          return (
            <Pressable key={c.id} onPress={() => setCharacter(c.id)} style={{ flex: 1, alignItems: 'center', paddingVertical: space.md, borderRadius: radius.lg, borderWidth: 2, borderColor: on ? color.brand : color.border, backgroundColor: on ? color.brandSoft : color.surface }}>
              <Character id={c.id} size={70} mood={on ? 'happy' : 'idle'} />
            </Pressable>
          );
        })}
      </Row>

      <T v="h3" style={{ marginTop: space.md }}>못 먹는 음식이 있나요?</T>
      <Row wrap>
        {ALLERGEN_OPTIONS.map((a) => (
          <Chip key={a} label={a} tone="danger" selected={allergies.includes(a)} onPress={() => setAllergies((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))} />
        ))}
      </Row>

      <View style={{ ...clay, padding: space.md, gap: space.sm, marginTop: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="bodyBold" style={{ flex: 1 }}>내 기록으로 맞춤 추천받기</T>
          <OnOff value={agree} onValueChange={setAgree} />
        </Row>
        <Pressable onPress={() => setDetail(!detail)}>
          <T v="tiny" c={color.textMuted}>{detail ? '접기 ▲' : '무엇에 동의하나요? ▼'}</T>
        </Pressable>
        {detail && (
          <T v="tiny" c={color.textSub}>
            · 식사·요리 기록을 기억해 추천에 써요{'\n'}· 사진을 Google Gemini(무료 등급)로 보내 분석해요. 무료 등급은 구글이 서비스 개선에 쓸 수 있어요{'\n'}· 알레르기 정보를 이 기기에만 저장해요{'\n'}· 의료 진단을 대신하지 않아요. 설정에서 따로 끌 수 있어요
          </T>
        )}
      </View>

      <View style={{ gap: space.sm, marginTop: space.lg }}>
        <Button title="시작하기" onPress={() => finish(false)} />
        <Button title="예시 데이터로 둘러보기" kind="ghost" onPress={() => finish(true)} />
      </View>
    </Screen>
  );
}
