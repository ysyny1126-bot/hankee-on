import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';

import { color, MAX_WIDTH, radius, space } from '@/constants/tokens';

/** 아래에서 올라오는 작은 창(바텀 시트). 화면을 떠나지 않고 바로 고칠 때 쓴다. */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(31,27,22,0.35)' }} accessibilityLabel="닫기" />
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', backgroundColor: color.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.lg, paddingBottom: space.xxl, gap: space.md }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: color.border }} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
