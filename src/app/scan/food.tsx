import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { hasAIKey, recipeFromFoodPhoto } from '@/ai/gemini';
import { pickPhoto } from '@/ai/photo';
import { Button, Card, Row, Screen, Stack, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { actions, useAppState } from '@/data/store';
import { aiRecipeToRecipe } from '@/logic/recipe-convert';

/** 음식 사진 → AI 레시피 → 레시피 화면(냉장고 비교·장보기·영상·요리 완료)으로 이어진다. */
export default function ScanFood() {
  const s = useAppState();
  const aiOn = hasAIKey() && s.consents.externalAI;
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async (src: 'camera' | 'library') => {
    setError('');
    try {
      const p = await pickPhoto(src);
      if (!p) return;
      setPhoto(p.uri);
      setLoading(true);
      const r = await recipeFromFoodPhoto(p, { allergies: s.preferences.allergies, skill: s.preferences.cookingSkill, maxMinutes: s.preferences.maxCookMinutes });
      if (!r.name) throw new Error('음식을 알아보지 못했어요. 음식이 잘 보이게 다시 찍어 주세요.');
      const recipe = { ...aiRecipeToRecipe(r, 'ai_photo'), imageUri: p.uri.startsWith('data:') ? undefined : p.uri };
      actions.saveRecipe(recipe);
      router.replace(`/recipe/${recipe.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Stack gap={space.xs}>
        <T v="h2">먹고 싶은 음식을 보여 주세요</T>
        <T c={color.textSub}>SNS에서 본 음식, 식당에서 먹은 음식 사진도 좋아요.</T>
      </Stack>

      {!aiOn ? (
        <Card tone="warn">
          <T v="bodyBold">AI 사진 분석이 꺼져 있어요</T>
          <T v="small" c={color.textSub}>{hasAIKey() ? '설정 › 개인정보에서 ‘사진을 AI로 분석하기’에 동의하면 쓸 수 있어요.' : 'AI 키가 아직 연결되지 않았어요(개발 중). 지금은 COOK 탭에서 음식 이름으로 레시피를 찾을 수 있어요.'}</T>
          <Button title="COOK에서 검색하기" kind="secondary" small onPress={() => router.replace('/cook')} />
        </Card>
      ) : (
        <Card>
          {photo ? <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 1, borderRadius: radius.md }} contentFit="cover" /> : (
            <View style={{ alignItems: 'center', paddingVertical: space.xl }}><T style={{ fontSize: 56, lineHeight: 64 }}>🍜</T></View>
          )}
          <Row gap={space.sm}>
            <Button title="촬영" icon="📷" style={{ flex: 1 }} onPress={() => run('camera')} loading={loading} />
            <Button title="앨범" icon="🖼️" kind="secondary" style={{ flex: 1 }} onPress={() => run('library')} disabled={loading} />
          </Row>
          {loading && <T v="small" c={color.textSub} style={{ textAlign: 'center' }}>음식 분석 → 재료 추정 → 1인분 레시피 만드는 중…</T>}
          {error ? <T v="small" c={color.danger}>{error}</T> : null}
        </Card>
      )}

      <Card>
        <T v="bodyBold">이렇게 이어져요</T>
        {['① 음식 종류·특징 분석', '② 예상 재료와 분량(추정)', '③ 1인분 레시피 생성', '④ 내 냉장고 재료와 비교', '⑤ 부족한 재료 장보기에 담기', '⑥ 조리 영상 연결', '⑦ 요리 완료 → 재고 차감 + 식사 기록'].map((t) => (
          <T key={t} v="small" c={color.textSub}>{t}</T>
        ))}
        {s.preferences.allergies.length > 0 && <T v="tiny" c={color.textMuted}>알레르기({s.preferences.allergies.join(', ')})는 대체 재료로 바꿔 드려요.</T>}
      </Card>
    </Screen>
  );
}
