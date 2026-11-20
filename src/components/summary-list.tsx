import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';

/**
 * 요약 목록 부품(설정·온보딩 공용): 묶음 제목 + 같은 모양의 줄.
 * 줄에는 '항목 이름 · (자동) · 지금 값 ›'만 두고, 자세한 선택지는 누르면 여는 창에서 보여 준다.
 */
export function Group({ title, note, children }: { title?: string; note?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      {title ? <T v="small" c={color.textSub} style={{ fontWeight: '700', marginTop: space.sm }}>{title}</T> : null}
      <View style={styles.box}>{children}</View>
      {note ? <T v="tiny" c={color.textMuted}>{note}</T> : null}
    </View>
  );
}

export function Line({ label, value, onPress, first, auto, empty, danger }: { label: string; value: string; onPress: () => void; first?: boolean; auto?: boolean; empty?: boolean; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}, ${value}${auto ? ', 생활 유형으로 자동 선택' : ''}. 눌러서 바꾸기`}
      style={({ pressed }) => [styles.line, !first && styles.lineTop, pressed && { backgroundColor: color.surfaceAlt }]}>
      <T v="bodyBold">{label}</T>
      {auto ? <View style={styles.auto}><T v="tiny" c={color.brandDark} style={{ fontWeight: '800' }}>자동</T></View> : null}
      <T v="small" c={danger ? color.dangerDark : empty ? color.textMuted : color.textSub} numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>{value}</T>
      <Icon name="chevron" size={16} c={color.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: color.surface, borderRadius: radius.lg, overflow: 'hidden' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.lg, minHeight: 54 },
  lineTop: { borderTopWidth: 1, borderTopColor: color.border },
  auto: { backgroundColor: color.brandSoft, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
});
