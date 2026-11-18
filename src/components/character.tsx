import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { getCharacter } from '@/constants/characters';

/**
 * 한끼온 캐릭터(임시 도형 버전).
 * - holding: 오늘 먹은 음식 이모지를 들고 있게 한다(없으면 빈손).
 * - 완성 에셋(image)이 연결되면 그 이미지를 쓴다.
 */
export function Character({ id, size = 120, holding, mood = 'happy' }: { id?: string; size?: number; holding?: string | null; mood?: 'happy' | 'idle' }) {
  const c = getCharacter(id);
  const s = size;
  const ink = '#3B2A22';

  if (c.image) {
    return (
      <View style={{ width: s, height: s * 1.15, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Image source={c.image} style={{ width: s, height: s * 1.15 }} contentFit="contain" />
        {holding ? <Text style={{ position: 'absolute', bottom: s * 0.22, fontSize: s * 0.26 }}>{holding}</Text> : null}
      </View>
    );
  }

  const eye = (left: number) =>
    mood === 'happy' ? (
      // 웃는 눈(∩ 모양)
      <View style={{ position: 'absolute', top: s * 0.36, left, width: s * 0.13, height: s * 0.07, borderTopLeftRadius: s * 0.07, borderTopRightRadius: s * 0.07, borderWidth: s * 0.022, borderBottomWidth: 0, borderColor: ink }} />
    ) : (
      <View style={{ position: 'absolute', top: s * 0.35, left: left + s * 0.035, width: s * 0.065, height: s * 0.08, borderRadius: s * 0.04, backgroundColor: ink }} />
    );

  return (
    <View style={{ width: s, height: s * 1.15, alignItems: 'center' }} accessibilityLabel={`${c.name} 캐릭터`}>
      {/* 머리 위 소품 */}
      {c.accessory === 'leaves' && (
        <View style={{ position: 'absolute', top: -s * 0.05, flexDirection: 'row' }}>
          {[-1, 0, 1].map((k) => (
            <View key={k} style={{ width: s * 0.36, height: s * 0.36, borderRadius: s * 0.18, backgroundColor: c.accent, marginHorizontal: -s * 0.04, marginTop: k === 0 ? 0 : s * 0.06 }} />
          ))}
        </View>
      )}
      {c.accessory === 'sprout' && (
        <View style={{ position: 'absolute', top: -s * 0.02, flexDirection: 'row', zIndex: 2 }}>
          <View style={{ width: s * 0.16, height: s * 0.09, borderRadius: s * 0.08, backgroundColor: c.accent, transform: [{ rotate: '-25deg' }] }} />
          <View style={{ width: s * 0.16, height: s * 0.09, borderRadius: s * 0.08, backgroundColor: c.accent, transform: [{ rotate: '25deg' }] }} />
        </View>
      )}

      {/* 몸 */}
      <View style={{ position: 'absolute', top: s * 0.06, width: s * 0.92, height: s * 0.92, borderRadius: s * 0.44, backgroundColor: c.body, borderWidth: 1, borderColor: 'rgba(59,42,34,0.06)' }}>
        {c.accessory === 'headband' && (
          <View style={{ position: 'absolute', top: s * 0.16, left: s * 0.02, right: s * 0.02, height: s * 0.1, backgroundColor: c.accent, borderRadius: s * 0.04 }} />
        )}
        {eye(s * 0.22)}
        {eye(s * 0.57)}
        <View style={{ position: 'absolute', top: s * 0.47, left: s * 0.12, width: s * 0.13, height: s * 0.07, borderRadius: s * 0.04, backgroundColor: c.cheek, opacity: 0.8 }} />
        <View style={{ position: 'absolute', top: s * 0.47, right: s * 0.12, width: s * 0.13, height: s * 0.07, borderRadius: s * 0.04, backgroundColor: c.cheek, opacity: 0.8 }} />
        {/* 입 */}
        <View style={{ position: 'absolute', top: s * 0.48, left: s * 0.4, width: s * 0.12, height: s * 0.07, borderBottomLeftRadius: s * 0.07, borderBottomRightRadius: s * 0.07, backgroundColor: mood === 'happy' ? '#E8735A' : ink, opacity: mood === 'happy' ? 1 : 0.7 }} />
      </View>

      {/* 발 */}
      <View style={{ position: 'absolute', bottom: 0, flexDirection: 'row', gap: s * 0.18 }}>
        <View style={{ width: s * 0.22, height: s * 0.12, borderRadius: s * 0.06, backgroundColor: c.body, borderWidth: 1, borderColor: 'rgba(59,42,34,0.08)' }} />
        <View style={{ width: s * 0.22, height: s * 0.12, borderRadius: s * 0.06, backgroundColor: c.body, borderWidth: 1, borderColor: 'rgba(59,42,34,0.08)' }} />
      </View>

      {/* 들고 있는 음식 */}
      {holding ? (
        <View style={{ position: 'absolute', bottom: s * 0.1, width: s * 0.4, height: s * 0.3, borderBottomLeftRadius: s * 0.2, borderBottomRightRadius: s * 0.2, borderTopLeftRadius: s * 0.06, borderTopRightRadius: s * 0.06, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(59,42,34,0.08)' }}>
          <Text style={{ fontSize: s * 0.2 }}>{holding}</Text>
        </View>
      ) : null}
    </View>
  );
}
