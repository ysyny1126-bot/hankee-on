import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Chip, Row, T } from '@/components/ui';
import { FoodPic } from '@/components/pics';
import { clay, color, radius, space } from '@/constants/tokens';
import { KINDS, MOODS, type KindKey, type MoodKey } from '@/data/taxonomy';
import type { AppState } from '@/data/types';
import { browse, kindCounts, reasonLine } from '@/logic/browse';
import type { RecipeMatch } from '@/logic/inventory';

const STEP = 3;

/** '뭐 먹고 싶어요?' 종류 격자(4×2). 레시피가 3개 미만인 칸은 숨긴다. */
export function KindGrid({ ranked, value, onChange }: { ranked: RecipeMatch[]; value: KindKey | null; onChange: (k: KindKey | null) => void }) {
  const counts = useMemo(() => kindCounts(ranked), [ranked]);
  const kinds = KINDS.filter((k) => (counts[k.key]?.all ?? 0) >= 3);
  return (
    <View style={{ gap: space.xs }}>
      <T v="bodyBold">뭐 먹고 싶어요?</T>
      <View style={{ ...clay, flexDirection: 'row', flexWrap: 'wrap', padding: 4 }}>
        {kinds.map((k) => {
          const on = value === k.key;
          const c = counts[k.key];
          return (
            <Pressable
              key={k.key}
              onPress={() => onChange(on ? null : k.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${k.label}, ${c.all}개 중 내 재료로 바로 ${c.ready}개`}
              style={({ pressed }) => ({
                width: '25%',
                minHeight: 76,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: on ? color.brandDark : 'transparent',
                backgroundColor: on ? color.brandSoft : 'transparent',
                opacity: pressed ? 0.6 : 1,
              })}>
              <Text style={{ fontSize: 24 }}>{k.emoji}</Text>
              <T v="tiny" c={on ? color.brandDark : color.text} style={{ fontWeight: '700' }}>{k.label}</T>
              <T v="tiny" c={c.ready ? color.fresh : color.textMuted}>{c.ready ? `바로 ${c.ready}` : `${c.all}개`}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** 종류를 고른 뒤: 상황 칩 한 줄 + 추천 3개씩 */
export function BrowseList({ ranked, s, kind, onClear }: { ranked: RecipeMatch[]; s: AppState; kind: KindKey; onClear: () => void }) {
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [shown, setShown] = useState(STEP);
  const [lastKind, setLastKind] = useState(kind);
  if (lastKind !== kind) {
    setLastKind(kind);
    setMood(null);
    setShown(STEP);
  }
  const list = useMemo(() => browse(ranked, s, kind, mood), [ranked, s, kind, mood]);
  const k = KINDS.find((x) => x.key === kind)!;
  const m = MOODS.find((x) => x.key === mood);

  return (
    <View style={{ gap: space.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {MOODS.map((x) => (
          <Chip key={x.key} label={`${x.emoji} ${x.label}`} selected={mood === x.key} onPress={() => { setMood(mood === x.key ? null : x.key); setShown(STEP); }} />
        ))}
      </ScrollView>

      <Row style={{ justifyContent: 'space-between' }}>
        <T v="small" c={color.textSub}>{k.emoji} {k.label}{m ? ` · ${m.label}` : ''} 추천</T>
        <Pressable onPress={onClear} hitSlop={10} accessibilityRole="button" accessibilityLabel="분류 고르기 지우기">
          <T v="small" c={color.textMuted}>✕ 지우기</T>
        </Pressable>
      </Row>

      {list.length ? (
        <View style={{ gap: space.sm }}>
          {list.slice(0, shown).map((x) => <BrowseCard key={x.recipe.id} m={x} s={s} mood={mood} />)}
          {shown < list.length ? (
            <Button title={`${Math.min(STEP, list.length - shown)}개 더 보기`} kind="secondary" onPress={() => setShown(shown + STEP)} />
          ) : list.length > STEP ? (
            <T v="tiny" c={color.textMuted} style={{ textAlign: 'center' }}>여기까지예요 · 위에서 다른 칸을 골라 보세요</T>
          ) : null}
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: space.lg, gap: space.sm }}>
          <T c={color.textSub}>이 조건엔 아직 메뉴가 없어요</T>
          {mood ? <Button title={`‘${m!.label}’ 빼고 보기`} kind="secondary" small onPress={() => setMood(null)} /> : null}
        </View>
      )}
    </View>
  );
}

function BrowseCard({ m, s, mood }: { m: RecipeMatch; s: AppState; mood: MoodKey | null }) {
  const why = reasonLine(m, s, mood);
  const ready = m.missingRequired.length === 0;
  return (
    <Pressable
      onPress={() => router.push(`/recipe/${m.recipe.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${m.recipe.name}, ${m.recipe.timeMinutes}분, ${m.recipe.difficulty}. ${why}`}
      style={({ pressed }) => ({ ...clay, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: color.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
        <FoodPic id={m.recipe.id} name={m.recipe.name} emoji={m.recipe.emoji} size={46} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="bodyBold" numberOfLines={1}>{m.recipe.name} <T v="tiny" c={color.textMuted}>{m.recipe.timeMinutes}분 · {m.recipe.difficulty}</T></T>
        <T v="small" c={ready ? color.brandDark : color.textSub} numberOfLines={1}>{why}</T>
      </View>
      <T c={color.textMuted}>›</T>
    </Pressable>
  );
}
