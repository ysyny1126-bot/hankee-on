import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '@/components/ui';
import { color, shadow } from '@/constants/tokens';
import { actions, getUndo, subscribeUndo, UNDO_MS, type UndoInfo } from '@/data/store';

/**
 * C6: 지우기·버리기·요리 완료 직후 화면 아래에 잠깐 뜨는 '되돌리기'.
 * 8초가 지나면 저절로 사라진다.
 */
export function UndoToast() {
  const [u, setU] = useState<UndoInfo | null>(getUndo());
  const insets = useSafeAreaInsets();
  useEffect(() => subscribeUndo(() => setU(getUndo())), []);
  useEffect(() => {
    if (!u) return;
    const t = setTimeout(() => setU(getUndo()), UNDO_MS - (Date.now() - u.at) + 50);
    return () => clearTimeout(t);
  }, [u]);
  if (!u) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 84 }]}>
      <View style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <T v="small" c="#fff" style={{ flex: 1, fontWeight: '600' }} numberOfLines={1}>{u.label}</T>
        <Pressable onPress={() => actions.undo()} accessibilityRole="button" accessibilityLabel={`${u.label} 되돌리기`} hitSlop={8} style={styles.btn}>
          <T v="small" c="#9BE3C2" style={{ fontWeight: '800' }}>되돌리기</T>
        </Pressable>
        <Pressable onPress={() => actions.clearUndo()} accessibilityRole="button" accessibilityLabel="알림 닫기" hitSlop={8} style={styles.btn}>
          <T v="small" c="#ffffffaa">닫기</T>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 16 },
  toast: { width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: color.text, borderRadius: 16, paddingLeft: 16, paddingRight: 6, minHeight: 50, ...shadow.card },
  btn: { paddingHorizontal: 10, minHeight: 40, justifyContent: 'center' },
});
