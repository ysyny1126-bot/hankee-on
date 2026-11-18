import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { color } from '@/constants/tokens';

/**
 * 선 아이콘(캠퍼스메이트처럼 2px 선, 둥근 끝).
 * 모양은 Lucide 아이콘(ISC 라이선스, 무료 사용 가능)을 따랐다.
 * 음식·재료는 계속 이모지를 쓰고, 버튼·탭·바로가기처럼 '기능'에만 이 아이콘을 쓴다.
 */
export type IconName =
  | 'home'
  | 'pot'
  | 'book'
  | 'user'
  | 'plus'
  | 'settings'
  | 'search'
  | 'camera'
  | 'calendar'
  | 'cart'
  | 'clock'
  | 'chevron'
  | 'refresh'
  | 'x'
  | 'chat'
  | 'fridge'
  | 'utensils'
  | 'pencil'
  | 'bulb';

const P = (d: string, k?: string) => <Path key={k ?? d} d={d} />;

const SHAPES: Record<IconName, React.ReactNode[]> = {
  home: [P('m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'), P('M9 22V12h6v10')],
  pot: [P('M2 12h20'), P('M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8'), P('m4 8 16-4'), P('m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8')],
  book: [P('M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'), P('M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z')],
  user: [P('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'), <Circle key="c" cx={12} cy={7} r={4} />],
  plus: [P('M5 12h14'), P('M12 5v14')],
  settings: [
    P('M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z'),
    <Circle key="c" cx={12} cy={12} r={3} />,
  ],
  search: [<Circle key="c" cx={11} cy={11} r={8} />, P('m21 21-4.3-4.3')],
  camera: [P('M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z'), <Circle key="c" cx={12} cy={13} r={3} />],
  calendar: [<Rect key="r" x={3} y={4} width={18} height={18} rx={2} />, P('M16 2v4'), P('M8 2v4'), P('M3 10h18')],
  cart: [<Circle key="a" cx={8} cy={21} r={1} />, <Circle key="b" cx={19} cy={21} r={1} />, P('M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12')],
  clock: [<Circle key="c" cx={12} cy={12} r={10} />, P('M12 6v6l4 2')],
  chevron: [P('m9 18 6-6-6-6')],
  refresh: [P('M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'), P('M21 3v5h-5'), P('M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'), P('M8 16H3v5')],
  x: [P('M18 6 6 18'), P('m6 6 12 12')],
  chat: [P('M7.9 20A9 9 0 1 0 4 16.1L2 22Z')],
  fridge: [P('M5 6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6Z'), P('M5 10h14'), P('M15 7v6')],
  utensils: [P('M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2'), P('M7 2v20'), P('M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7')],
  pencil: [P('M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z')],
  bulb: [P('M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5'), P('M9 18h6'), P('M10 22h4')],
};

export function Icon({ name, size = 22, c = color.navy, stroke = 2 }: { name: IconName; size?: number; c?: string; stroke?: number }) {
  return (
    // 꾸밈용 아이콘이라 화면낭독기에서는 숨긴다(이름은 버튼의 라벨로 읽힌다)
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        {SHAPES[name]}
      </Svg>
    </View>
  );
}
