import { View } from 'react-native';

import { Row, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { keepData } from '@/data/catalog';
import type { StorageType } from '@/data/types';

const PLACES: { key: 'fridge' | 'freezer' | 'room'; storage: StorageType; label: string }[] = [
  { key: 'fridge', storage: 'fridge', label: '냉장' },
  { key: 'freezer', storage: 'freezer', label: '냉동' },
  { key: 'room', storage: 'pantry', label: '실온' },
];

/** 재료 보관 안내: 냉장·냉동·실온 기간 + 보관 팁 + 상한 신호. current는 지금 보관 중인 곳(강조). */
export function KeepInfo({ name, current }: { name: string; current?: StorageType }) {
  const k = keepData(name);
  if (!k) return null;
  const places = PLACES.filter((p) => k[p.key]);
  return (
    <View style={{ backgroundColor: color.surfaceAlt, borderRadius: radius.md, padding: space.md, gap: space.sm }}>
      <T v="bodyBold">📦 이렇게 보관해요</T>
      <Row gap={6} wrap>
        {places.map((p) => {
          const on = current === p.storage;
          return (
            <View
              key={p.key}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md, borderWidth: on ? 2 : 1, borderColor: on ? color.brandDark : color.border, backgroundColor: color.surface, maxWidth: '100%' }}>
              <T v="tiny" c={on ? color.brandDark : color.textMuted} style={{ fontWeight: '800' }}>{p.label}{on ? ' · 지금' : ''}</T>
              <T v="small" style={{ fontWeight: '700' }}>{k[p.key]}</T>
            </View>
          );
        })}
      </Row>
      {k.tip ? <T v="small" c={color.textSub}>💡 {k.tip}</T> : null}
      <T v="small" c={color.danger}>⚠️ {k.signs}</T>
      <T v="tiny" c={color.textMuted}>포장지에 적힌 소비기한이 먼저예요 · 식약처·USDA 보관 기준을 참고한 일반 안내</T>
    </View>
  );
}
