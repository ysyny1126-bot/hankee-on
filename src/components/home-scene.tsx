import { Pressable, Text, View } from 'react-native';

import { Character } from '@/components/character';
import { T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import type { Ingredient } from '@/data/types';
import { daysUntil } from '@/logic/dates';

const SHOW = 8; // 냉장고 그림에 보여 줄 최대 재료 수

/**
 * 홈 메인 장면: 캐릭터 + 냉장고.
 * 냉장고에는 실제 재고를 소비기한 순으로 보여 주고, 임박 재료는 작은 점으로만 표시한다.
 */
export function HomeScene({
  characterId,
  ingredients,
  warnDays,
  holding,
  bubble,
  onPressFridge,
  onPressCharacter,
}: {
  characterId?: string;
  ingredients: Ingredient[];
  warnDays: number;
  holding?: string | null;
  bubble?: string;
  onPressFridge: () => void;
  onPressCharacter?: () => void;
}) {
  const sorted = [...ingredients].sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'));
  const shown = sorted.slice(0, SHOW);
  const extra = sorted.length - shown.length;

  return (
    <View style={{ backgroundColor: color.brandSoft, borderRadius: radius.xl, paddingTop: space.lg, paddingHorizontal: space.lg, overflow: 'hidden' }}>
      {bubble ? (
        <View style={{ alignSelf: 'flex-start', maxWidth: '62%', backgroundColor: color.surface, borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.sm, marginBottom: space.sm }}>
          <T v="small" style={{ fontWeight: '600' }} numberOfLines={2}>{bubble}</T>
          <View style={{ position: 'absolute', bottom: -6, left: 28, width: 12, height: 12, backgroundColor: color.surface, transform: [{ rotate: '45deg' }] }} />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Pressable onPress={onPressCharacter} style={{ paddingBottom: 6 }} accessibilityRole="button" accessibilityLabel="캐릭터">
          <Character id={characterId} size={112} holding={holding} mood={holding ? 'happy' : 'idle'} />
        </Pressable>

        {/* 냉장고 */}
        <Pressable onPress={onPressFridge} accessibilityRole="button" accessibilityLabel={`냉장고 열기, 재료 ${ingredients.length}개`} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <View style={{ width: 150, height: 196, backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 2, borderColor: '#EADFD3', padding: 8, gap: 6 }}>
            {/* 냉동칸 */}
            <View style={{ height: 34, borderRadius: 12, backgroundColor: '#F4F8FB', justifyContent: 'center', paddingHorizontal: 10 }}>
              <View style={{ position: 'absolute', right: 10, top: 10, width: 4, height: 14, borderRadius: 2, backgroundColor: '#D9CFC4' }} />
              <Text style={{ fontSize: 11, color: color.textMuted }}>❄︎</Text>
            </View>
            {/* 냉장칸: 재료 */}
            <View style={{ flex: 1, borderRadius: 14, backgroundColor: '#FBF8F4', padding: 8, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', gap: 4 }}>
              {shown.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 120 }}>
                  <Text style={{ fontSize: 22, opacity: 0.35 }}>🫙</Text>
                  <T v="tiny" c={color.textMuted}>비어 있어요</T>
                </View>
              ) : (
                shown.map((i) => {
                  const d = i.expiryDate ? daysUntil(i.expiryDate) : null;
                  const dot = d === null ? null : d < 0 ? color.danger : d <= warnDays ? color.warn : null;
                  return (
                    <View key={i.id} style={{ width: 28, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>{i.emoji}</Text>
                      {dot ? <View style={{ position: 'absolute', top: 1, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: dot, borderWidth: 1.5, borderColor: '#FBF8F4' }} /> : null}
                    </View>
                  );
                })
              )}
              {extra > 0 ? (
                <View style={{ width: 28, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                  <T v="tiny" c={color.textSub}>+{extra}</T>
                </View>
              ) : null}
            </View>
            <View style={{ position: 'absolute', left: -2, top: 54, width: 4, height: 30, borderRadius: 2, backgroundColor: '#D9CFC4' }} />
          </View>
        </Pressable>
      </View>
      {/* 바닥 */}
      <View style={{ height: 14, marginHorizontal: -space.lg, backgroundColor: '#F7DCC8' }} />
    </View>
  );
}
