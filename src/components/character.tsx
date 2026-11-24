import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { getCharacter } from '@/constants/characters';

/**
 * 한끼온 캐릭터(임시 도형 버전, 말랑 클레이 느낌).
 * 몸 위에 그림자·하이라이트를 겹쳐 입체감을 낸다.
 * - holding: 오늘 먹은 음식 이모지를 그릇에 담아 들고 있다(없으면 빈손).
 * - 완성 에셋(image)이 연결되면 그 이미지를 쓴다.
 */
export function Character({ id, size = 120, holding, mood = 'happy' }: { id?: string; size?: number; holding?: string | null; mood?: 'happy' | 'idle' }) {
  const c = getCharacter(id);
  const s = size;
  const ink = '#4A3428';
  const W = s;
  const H = s * 1.18;

  if (c.image) {
    return (
      <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Image source={c.image} style={{ width: W, height: H }} contentFit="contain" />
        {holding ? <Text allowFontScaling={false} style={{ position: 'absolute', bottom: s * 0.22, fontSize: s * 0.26 }}>{holding}</Text> : null}
      </View>
    );
  }

  const bodySize = s * 0.9;
  const bodyTop = s * 0.12;
  const bodyLeft = (W - bodySize) / 2;

  const eye = (x: number) =>
    mood === 'happy' ? (
      <View style={{ position: 'absolute', top: bodySize * 0.36, left: x, width: bodySize * 0.14, height: bodySize * 0.075, borderTopLeftRadius: bodySize * 0.08, borderTopRightRadius: bodySize * 0.08, borderWidth: bodySize * 0.026, borderBottomWidth: 0, borderColor: ink }} />
    ) : (
      <View style={{ position: 'absolute', top: bodySize * 0.33, left: x + bodySize * 0.035, width: bodySize * 0.075, height: bodySize * 0.095, borderRadius: bodySize * 0.05, backgroundColor: ink }}>
        <View style={{ position: 'absolute', top: 2, left: 2, width: bodySize * 0.025, height: bodySize * 0.025, borderRadius: 4, backgroundColor: '#fff' }} />
      </View>
    );

  const arm = (side: 'left' | 'right') => (
    <View
      style={{
        position: 'absolute',
        top: bodyTop + bodySize * (holding ? 0.58 : 0.5),
        [side]: bodyLeft - s * 0.04 + (holding ? s * 0.08 : 0),
        width: s * 0.2,
        height: s * 0.17,
        borderRadius: s * 0.09,
        backgroundColor: c.body,
        borderWidth: 1.5,
        borderColor: 'rgba(154,91,54,0.16)',
        transform: [{ rotate: side === 'left' ? (holding ? '35deg' : '-20deg') : holding ? '-35deg' : '20deg' }],
        zIndex: holding ? 4 : 0,
      }}
    />
  );

  return (
    <View style={{ width: W, height: H }} accessibilityLabel={`${c.name} 캐릭터`}>
      {/* 바닥 그림자 */}
      <View style={{ position: 'absolute', bottom: 0, left: W * 0.18, width: W * 0.64, height: s * 0.08, borderRadius: s * 0.04, backgroundColor: 'rgba(154,91,54,0.16)' }} />

      {/* 머리 위 잎(청경이) — 몸 뒤 */}
      {c.accessory === 'leaves' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row' }}>
            {[-1, 0, 1].map((k) => (
              <View key={k} style={{ width: s * 0.38, height: s * 0.38, borderRadius: s * 0.19, backgroundColor: k === 0 ? c.accent : '#6FAE58', marginHorizontal: -s * 0.05, marginTop: k === 0 ? 0 : s * 0.07, borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.08)' }}>
                <View style={{ position: 'absolute', top: s * 0.06, left: s * 0.17, width: 2, height: s * 0.22, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 1 }} />
              </View>
            ))}
          </View>
        </View>
      )}

      {arm('left')}
      {arm('right')}

      {/* 몸 */}
      <View style={{ position: 'absolute', top: bodyTop, left: bodyLeft, width: bodySize, height: bodySize, borderRadius: bodySize / 2, backgroundColor: c.body, overflow: 'hidden' }}>
        {/* 아래쪽 그늘(입체감) */}
        <View style={{ position: 'absolute', top: bodySize * 0.45, left: bodySize * 0.08, width: bodySize * 1.1, height: bodySize * 0.9, borderRadius: bodySize * 0.55, backgroundColor: 'rgba(154,91,54,0.08)' }} />
        {/* 위쪽 하이라이트 */}
        <View style={{ position: 'absolute', top: bodySize * 0.08, left: bodySize * 0.16, width: bodySize * 0.3, height: bodySize * 0.16, borderRadius: bodySize * 0.1, backgroundColor: 'rgba(255,255,255,0.55)', transform: [{ rotate: '-20deg' }] }} />

        {c.accessory === 'headband' && (
          <View style={{ position: 'absolute', top: bodySize * 0.14, left: -2, right: -2, height: bodySize * 0.12, backgroundColor: c.accent, borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.12)' }} />
        )}

        {eye(bodySize * 0.22)}
        {eye(bodySize * 0.6)}
        <View style={{ position: 'absolute', top: bodySize * 0.5, left: bodySize * 0.1, width: bodySize * 0.15, height: bodySize * 0.08, borderRadius: bodySize * 0.05, backgroundColor: c.cheek, opacity: 0.85 }} />
        <View style={{ position: 'absolute', top: bodySize * 0.5, right: bodySize * 0.1, width: bodySize * 0.15, height: bodySize * 0.08, borderRadius: bodySize * 0.05, backgroundColor: c.cheek, opacity: 0.85 }} />
        {/* 코 */}
        <View style={{ position: 'absolute', top: bodySize * 0.47, left: bodySize * 0.465, width: bodySize * 0.07, height: bodySize * 0.045, borderRadius: bodySize * 0.03, backgroundColor: ink }} />
        {/* 입 */}
        {mood === 'happy' ? (
          <View style={{ position: 'absolute', top: bodySize * 0.53, left: bodySize * 0.42, width: bodySize * 0.16, height: bodySize * 0.1, borderBottomLeftRadius: bodySize * 0.08, borderBottomRightRadius: bodySize * 0.08, backgroundColor: '#C8564A', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', bottom: -bodySize * 0.02, left: bodySize * 0.03, width: bodySize * 0.1, height: bodySize * 0.06, borderRadius: bodySize * 0.03, backgroundColor: '#F08C7B' }} />
          </View>
        ) : (
          <View style={{ position: 'absolute', top: bodySize * 0.54, left: bodySize * 0.45, width: bodySize * 0.1, height: bodySize * 0.03, borderRadius: 2, backgroundColor: ink, opacity: 0.6 }} />
        )}
      </View>

      {/* 새싹(몽실이) — 몸 위 */}
      {c.accessory === 'sprout' && (
        <View style={{ position: 'absolute', top: s * 0.0, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <View style={{ width: s * 0.17, height: s * 0.1, borderRadius: s * 0.08, backgroundColor: c.accent, transform: [{ rotate: '-28deg' }], marginRight: -2, borderBottomWidth: 2, borderBottomColor: 'rgba(0,0,0,0.1)' }} />
            <View style={{ width: s * 0.17, height: s * 0.1, borderRadius: s * 0.08, backgroundColor: '#8DBE66', transform: [{ rotate: '28deg' }], borderBottomWidth: 2, borderBottomColor: 'rgba(0,0,0,0.1)' }} />
          </View>
          <View style={{ width: 3, height: s * 0.06, backgroundColor: c.accent, borderRadius: 2 }} />
        </View>
      )}

      {/* 발 */}
      <View style={{ position: 'absolute', bottom: s * 0.03, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: s * 0.16 }}>
        {[0, 1].map((k) => (
          <View key={k} style={{ width: s * 0.22, height: s * 0.13, borderRadius: s * 0.07, backgroundColor: c.body, borderBottomWidth: 3, borderBottomColor: 'rgba(74,52,40,0.12)' }} />
        ))}
      </View>

      {/* 들고 있는 그릇 */}
      {holding ? (
        <View style={{ position: 'absolute', bottom: s * 0.1, left: (W - s * 0.44) / 2, width: s * 0.44, height: s * 0.3, zIndex: 3, alignItems: 'center' }}>
          <Text allowFontScaling={false} style={{ position: 'absolute', top: -s * 0.08, fontSize: s * 0.2 }}>{holding}</Text>
          <View style={{ position: 'absolute', bottom: 0, width: s * 0.44, height: s * 0.2, borderBottomLeftRadius: s * 0.22, borderBottomRightRadius: s * 0.22, borderTopLeftRadius: s * 0.04, borderTopRightRadius: s * 0.04, backgroundColor: '#FFFFFF', borderBottomWidth: 3, borderBottomColor: '#EADFD3' }} />
        </View>
      ) : null}
    </View>
  );
}
