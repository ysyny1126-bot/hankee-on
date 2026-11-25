import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg';

import { FoodPic, IngPic } from '@/components/pics';
import { T, tx } from '@/components/ui';
import { art, color, holo, pastel, space } from '@/constants/tokens';
import { findCatalog } from '@/data/catalog';
import type { Recipe } from '@/data/types';

/**
 * 요리 모드의 단계 한 장을 '레시피 카드'로(docs/디자인_레시피카드.md).
 * 무지갯빛 테두리 → 그림 창(음식 그림 + STEP 스티커 + 이 단계 재료 배지) → 큰 문장 → 이름표.
 */

/** 이 단계 문장에 나오는 재료(이름·별칭으로 찾기, 최대 3개) */
function stepIngredients(r: Recipe, step: string) {
  return r.ingredients
    .filter((ing) => {
      const c = findCatalog(ing.name);
      const keys = [ing.name, c?.name, ...(c?.aliases ?? [])].filter((k): k is string => !!k && k.length >= 1).map((k) => k.replace(/캔$/, ''));
      return keys.some((k) => step.includes(k));
    })
    .slice(0, 3)
    .map((ing) => ({ name: ing.name, emoji: findCatalog(ing.name)?.emoji ?? '🥄' }));
}

export function StepCard({ recipe, index, onPress }: { recipe: Recipe; index: number; onPress?: () => void }) {
  const step = recipe.steps[index];
  const total = recipe.steps.length;
  const used = stepIngredients(recipe, step);

  // 단계가 바뀌면 살짝 아래에서 올라오며 나타남
  const [appear] = useState(() => new Animated.Value(0));
  useEffect(() => {
    appear.setValue(0);
    Animated.timing(appear, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [index, appear]);

  return (
    <Animated.View style={{ flex: 1, opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${index + 1}단계. ${step}${onPress ? ' 눌러서 다음 단계' : ''}`}
        style={({ pressed }) => [styles.frame, pressed && { transform: [{ scale: 0.99 }] }]}>
        {/* 무지갯빛 테두리 */}
        <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="holo" x1="0" y1="0" x2="1" y2="1">
              {holo.map((c, k) => <Stop key={c} offset={k / (holo.length - 1)} stopColor={c} />)}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#holo)" />
        </Svg>

        <View style={styles.inner}>
          {/* 그림 창 */}
          <View style={styles.window}>
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="win" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={pastel.peach} />
                  <Stop offset="1" stopColor={pastel.mint} />
                </LinearGradient>
                <Pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
                  <Circle cx="7" cy="7" r="1.3" fill={art.ink} opacity={0.08} />
                </Pattern>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#win)" />
              <Rect width="100%" height="100%" fill="url(#dots)" />
            </Svg>
            <FoodPic id={recipe.id} name={recipe.name} emoji={recipe.emoji} size={190} />

            {/* 단계 스티커 */}
            <View style={styles.sticker} accessible={false}>
              <Text allowFontScaling={false} style={styles.stickerSmall}>STEP</Text>
              <Text allowFontScaling={false} style={styles.stickerNum}>{index + 1}</Text>
            </View>

            {/* 이 단계 재료 */}
            {used.length > 0 && (
              <View style={styles.badge} accessible={false}>
                {used.map((u) => (
                  <View key={u.name} style={{ alignItems: 'center', minWidth: 40 }}>
                    <IngPic name={u.name} emoji={u.emoji} size={28} />
                    <Text allowFontScaling={false} style={styles.badgeName} numberOfLines={1}>{u.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 문장 */}
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: space.lg, paddingVertical: space.md }}>
            <Text style={styles.step} lineBreakStrategyIOS="hangul-word">{step}</Text>
          </View>

          {/* 이름표 */}
          <View style={styles.plate}>
            <View style={styles.namePill}>
              <T v="tiny" c={color.textSub} style={{ fontWeight: '700' }} numberOfLines={1}>{recipe.name}</T>
            </View>
            <T v="small" style={{ fontWeight: '800' }}>{index + 1} / {total}</T>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, borderRadius: 28, overflow: 'hidden', padding: 6, shadowColor: '#3A2E26', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  inner: { flex: 1, borderRadius: 22, overflow: 'hidden', backgroundColor: art.paper },
  window: { height: '50%', minHeight: 180, alignItems: 'center', justifyContent: 'center', margin: 10, marginBottom: 0, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(58,46,38,0.08)' },
  sticker: { position: 'absolute', top: 10, left: 10, width: 54, height: 54, borderRadius: 27, backgroundColor: color.brandDark, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', transform: [{ rotate: '-8deg' }] },
  stickerSmall: { ...tx({ fontSize: 9, lineHeight: 11, fontWeight: '800', color: '#fff', letterSpacing: 1 }) },
  stickerNum: { ...tx({ fontSize: 20, lineHeight: 22, fontWeight: '800', color: '#fff' }) },
  badge: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', gap: 2, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(58,46,38,0.1)' },
  badgeName: { ...tx({ fontSize: 10, lineHeight: 13, fontWeight: '700', color: color.textSub }) },
  step: { ...tx({ fontSize: 26, lineHeight: 38, fontWeight: '700', color: color.text }) },
  plate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: 4 },
  namePill: { maxWidth: '70%', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: color.surfaceAlt },
});
