import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '@/components/ui';
import { color } from '@/constants/tokens';
import { isSaveFailed, persist, subscribeSave } from '@/data/store';

/** E19 저장 실패 알림: 탓하지 않는 말 + 다시 시도 */
export function SaveBanner() {
  const [failed, setFailed] = useState(isSaveFailed());
  const insets = useSafeAreaInsets();
  useEffect(() => subscribeSave(() => setFailed(isSaveFailed())), []);
  if (!failed) return null;
  return (
    <View style={{ position: 'absolute', top: insets.top + 6, left: 16, right: 16, alignItems: 'center' }} pointerEvents="box-none">
      <View accessibilityRole="alert" style={{ width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.warnSoft, borderRadius: 14, paddingLeft: 14, paddingRight: 6, minHeight: 48, borderWidth: 1, borderColor: color.warn }}>
        <T v="small" style={{ flex: 1 }}>방금 바꾼 내용을 기기에 저장하지 못했어요. 앱을 닫기 전에 다시 시도해 주세요.</T>
        <Pressable onPress={persist} accessibilityRole="button" hitSlop={8} style={{ paddingHorizontal: 10, minHeight: 40, justifyContent: 'center' }}>
          <T v="small" c={color.warnDark} style={{ fontWeight: '800' }}>다시 시도</T>
        </Pressable>
      </View>
    </View>
  );
}
