/**
 * 한끼온 디자인 토큰 — 색·간격·글자·모서리를 여기 한 곳에서만 정한다.
 * 디자인을 다듬을 때는 이 파일 값만 바꾸면 앱 전체에 반영된다.
 *
 * 콘셉트: 말랑 클레이 — 크림 배경, 두툼하고 둥근 카드, 따뜻한 그림자, 테라코타 포인트.
 */
export const color = {
  brand: '#E07A4F', // 테라코타(캐릭터 머리띠 색)
  brandSoft: '#FCEBE1',
  brandDark: '#B9592F',
  brandShade: '#C9653C', // 버튼 아래 두께감
  fresh: '#5E9E4A', // 청경채 초록 — 신선함·달성
  freshSoft: '#E8F3DF',
  freshShade: '#4C8539',
  warn: '#E3A21A', // 임박
  warnSoft: '#FFF2D3',
  danger: '#D85A4E', // 지남·삭제
  dangerSoft: '#FBE6E2',
  info: '#5B8BC9',
  infoSoft: '#E7EFF9',

  bg: '#FFF6EC', // 크림
  surface: '#FFFDF9',
  surfaceAlt: '#F7EBDD',
  border: '#EEDFCD',
  text: '#3B2A22', // 따뜻한 갈색 먹색
  textSub: '#7A6556',
  textMuted: '#A8968A',
  onBrand: '#FFFFFF',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** 글꼴: Pretendard(무료, OFL). 굵기마다 이름이 다르다. */
export const family = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  extrabold: 'Pretendard-ExtraBold',
} as const;

/** fontWeight 값 → Pretendard 굵기 이름 */
export function familyFor(weight?: string | number): string {
  const w = Number(weight ?? 400);
  if (w >= 800) return family.extrabold;
  if (w >= 700) return family.bold;
  if (w >= 600) return family.semibold;
  if (w >= 500) return family.medium;
  return family.regular;
}

export const font = {
  h1: { fontSize: 26, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 20, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, lineHeight: 24, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  tiny: { fontSize: 11, lineHeight: 15, fontWeight: '500' as const },
} as const;

/** 말랑한 클레이 느낌의 그림자 */
export const shadow = {
  card: {
    shadowColor: '#9A5B36',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  soft: {
    shadowColor: '#9A5B36',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  button: {
    shadowColor: '#B9592F',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
} as const;

/** 클레이 카드 기본 모양 — 화면마다 같은 카드 느낌을 쓰기 위한 묶음 */
export const clay = {
  backgroundColor: color.surface,
  borderRadius: radius.lg,
  borderBottomWidth: 3,
  borderBottomColor: color.border,
  ...shadow.soft,
} as const;

/** 웹(PC 브라우저)에서도 휴대폰처럼 보이도록 최대 폭 */
export const MAX_WIDTH = 520;
