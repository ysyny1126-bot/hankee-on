import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { T } from '@/components/ui';
import { art, color } from '@/constants/tokens';

/**
 * 오잘먹 대표 그림: 손으로 그린 듯한 냉장고.
 * - 윗문에는 장식 자석(당근·잎) — 브랜드 표시
 * - 아랫문에는 '실제 내 재료'가 자석처럼 붙는다(items). 재료가 없으면 비워 둔다(가짜 재료 없음)
 * - badge: 먼저 쓰면 좋은 재료 수(있을 때만)
 * 선이 살짝 삐뚤어진 경로로 손그림 느낌을 낸다. 크기는 width에 맞춰 비율로 커진다.
 */
export function FridgeArt({ width = 120, items = [], badge = 0, decorative = true }: { width?: number; items?: string[]; badge?: number; decorative?: boolean }) {
  const h = width * 1.6;
  const k = width / 120; // viewBox 120 x 192 기준 배율
  const mag = items.slice(0, 6);
  return (
    <View style={{ width, height: h }} accessible={false}>
      <Svg width={width} height={h} viewBox="0 0 120 192" aria-hidden>
        {/* 아래 통풍구 */}
        <G stroke={art.ink} strokeWidth={1.6} strokeLinecap="round">
          <Line x1="20" y1="184" x2="38" y2="184" />
          <Line x1="46" y1="184" x2="74" y2="184" />
          <Line x1="82" y1="184" x2="100" y2="184" />
        </G>
        {/* 몸통(살짝 삐뚤게) */}
        <Path d="M10 9 Q9 4 15 4 L105 3.5 Q112 4 112 10 L113 172 Q113 179 106 179 L14 179.5 Q8 179 8 173 Z" fill={art.paper} stroke={art.ink} strokeWidth={2.4} strokeLinejoin="round" />
        {/* 오른쪽 그늘(입체감 대신 종이 질감) */}
        <Path d="M104 8 L106 8 Q109 9 109 13 L110 170 Q110 175 105 175 L104 175 Z" fill={art.paperShade} />
        {/* 윗문/아랫문 경계 */}
        <Path d="M9 62 Q60 60.5 112.5 63" stroke={art.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        {/* 손잡이 */}
        <Rect x="15" y="18" width="7" height="32" rx="3.5" fill="#FFFFFF" stroke={art.ink} strokeWidth={1.8} />
        <Rect x="15" y="74" width="7" height="44" rx="3.5" fill="#FFFFFF" stroke={art.ink} strokeWidth={1.8} />
        {decorative && (
          <>
            {/* 당근 자석 */}
            <G transform="translate(84 14) rotate(18)">
              <Path d="M0 0 L9 0 L4.5 22 Z" fill={art.carrot} stroke={art.ink} strokeWidth={1.2} strokeLinejoin="round" />
              <Path d="M2 0 Q0 -6 3 -8 M4.5 0 Q4.5 -7 6 -9 M7 0 Q9 -6 11 -6" stroke={art.leaf} strokeWidth={2} fill="none" strokeLinecap="round" />
            </G>
            {/* 잎 자석 */}
            <Ellipse cx="52" cy="24" rx="9" ry="5" fill={art.leaf} stroke={art.ink} strokeWidth={1.2} transform="rotate(-20 52 24)" />
            {/* 동그란 노랑 자석 */}
            <Circle cx="66" cy="44" r="4.5" fill={art.butter} stroke={art.ink} strokeWidth={1.2} />
            {/* 토마토 자석(아랫문 구석) */}
            <Circle cx="98" cy="164" r="6" fill={art.tomato} stroke={art.ink} strokeWidth={1.2} />
            <Path d="M95 158.5 L98 160.5 L101 158.5" stroke={art.leaf} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          </>
        )}
      </Svg>

      {/* 아랫문에 붙은 실제 재료(자석처럼 살짝 기울여) */}
      {mag.length > 0 && (
        <View style={{ position: 'absolute', left: 30 * k, top: 72 * k, width: 74 * k, height: 84 * k, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center' }}>
          {mag.map((e, i) => (
            <View key={`${e}${i}`} style={{ width: '33%', alignItems: 'center', paddingVertical: 2 * k, transform: [{ rotate: `${[-8, 6, -4, 9, -6, 4][i]}deg` }] }}>
              <Text allowFontScaling={false} style={{ fontSize: 17 * k }}>{e}</Text>
            </View>
          ))}
        </View>
      )}

      {badge > 0 && (
        <View style={{ position: 'absolute', top: -6, right: -6, minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 6, backgroundColor: color.warn, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <T v="tiny" c={color.text} style={{ fontWeight: "800" }}>{badge}</T>
        </View>
      )}
    </View>
  );
}
