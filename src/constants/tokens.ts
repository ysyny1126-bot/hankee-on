/**
 * 한끼온 디자인 토큰 — 색·간격·글자·모서리를 여기 한 곳에서만 정한다.
 * 디자인을 다듬을 때는 이 파일 값만 바꾸면 앱 전체에 반영된다.
 */
export const color = {
  brand: '#FF7A3D', // 한끼온 주황(따뜻한 식탁)
  brandSoft: '#FFF1E8',
  brandDark: '#D9581E',
  fresh: '#2F9E62', // 신선함·달성
  freshSoft: '#E7F6EE',
  warn: '#E8A317', // 임박
  warnSoft: '#FFF6DD',
  danger: '#E5484D', // 지남·삭제
  dangerSoft: '#FDECEC',
  info: '#3B82F6',
  infoSoft: '#EAF2FF',

  bg: '#FAF8F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F0EB',
  border: '#E8E3DC',
  text: '#1F1B16',
  textSub: '#6B635A',
  textMuted: '#9C948A',
  onBrand: '#FFFFFF',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const font = {
  h1: { fontSize: 26, lineHeight: 34, fontWeight: '800' as const },
  h2: { fontSize: 20, lineHeight: 28, fontWeight: '700' as const },
  h3: { fontSize: 17, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  tiny: { fontSize: 11, lineHeight: 15, fontWeight: '500' as const },
} as const;

export const shadow = {
  card: {
    shadowColor: '#3A2A1A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

/** 웹(PC 브라우저)에서도 휴대폰처럼 보이도록 최대 폭 */
export const MAX_WIDTH = 520;
