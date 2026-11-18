import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance } from "react-native";

import { Character } from '@/components/character';
import { Row, T } from '@/components/ui';
import { COACHES } from '@/constants/profile';
import { color, radius, space } from '@/constants/tokens';

/** 코치 고르기: 좌우로 넘겨 보며 대화 예시를 확인하고 선택 */
export function CoachPicker({ characterId, nickname, value, onChange, children, compact }: { characterId?: string; nickname: string; value: string; onChange: (id: string) => void; children?: ReactNode; compact?: boolean }) {
  const [w, setW] = useState(0);
  const ref = useRef<ScrollViewInstance>(null);
  const idx = Math.max(0, COACHES.findIndex((c) => c.id === value));
  // 처음 그려질 때 고른 코치 쪽으로 넘겨 둔다(웹은 contentOffset이 적용되지 않음)
  useEffect(() => {
    if (w > 0) ref.current?.scrollTo({ x: idx * w, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w]);
  const go = (n: number) => {
    const k = (n + COACHES.length) % COACHES.length;
    onChange(COACHES[k].id);
    ref.current?.scrollTo({ x: k * w, animated: true });
  };
  return (
    <View style={{ gap: space.md }}>
      {compact ? (
        <T v="h3">AI 코치 말투</T>
      ) : (
        <View style={{ gap: space.xs, marginTop: space.sm }}>
          <T v="h1">어떤 코치와 함께할까요?</T>
          <T v="small" c={color.textSub}>넘겨 보면서 말투를 확인해 보세요. 설정에서 언제든 바꿀 수 있어요.</T>
        </View>
      )}
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <ScrollView
            ref={ref}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: idx * w, y: 0 }}
            onMomentumScrollEnd={(e) => onChange(COACHES[Math.round(e.nativeEvent.contentOffset.x / w)]?.id ?? value)}>
            {COACHES.map((c) => (
              <View key={c.id} style={{ width: w, paddingHorizontal: 2 }}>
                <View style={{ backgroundColor: color.brandSoft, borderRadius: radius.xl, padding: space.md, gap: space.sm }}>
                  <Row>
                    <Character id={characterId} size={72} mood="happy" />
                    <View style={{ flex: 1 }}>
                      <T v="h3">{c.emoji} {c.name}</T>
                      <T v="small" c={color.textSub}>{c.tagline}</T>
                    </View>
                  </Row>
                  {c.sample.map((m, k) => (
                    <View key={k} style={{ gap: 6 }}>
                      <Bubble mine text={m.me} />
                      <Bubble text={m.coach.replace('{name}', nickname || '한끼러')} />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      <Row style={{ justifyContent: 'center' }} gap={space.md}>
        <Pressable onPress={() => go(idx - 1)} hitSlop={10} accessibilityLabel="이전 코치"><T v="h3" c={color.textSub}>‹</T></Pressable>
        {COACHES.map((c, k) => (
          <Pressable key={c.id} onPress={() => go(k)} accessibilityLabel={c.name}>
            <View style={{ width: k === idx ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: k === idx ? color.brand : color.border }} />
          </Pressable>
        ))}
        <Pressable onPress={() => go(idx + 1)} hitSlop={10} accessibilityLabel="다음 코치"><T v="h3" c={color.textSub}>›</T></Pressable>
      </Row>
      <T v="small" c={color.brandDark} style={{ textAlign: 'center', fontWeight: '700' }}>선택: {COACHES[idx].emoji} {COACHES[idx].name}</T>
      {children}
    </View>
  );
}

function Bubble({ text, mine }: { text: string; mine?: boolean }) {
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', backgroundColor: mine ? color.brand : color.surface, borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.sm }}>
      <T v="small" c={mine ? color.onBrand : color.text}>{text}</T>
    </View>
  );
}
