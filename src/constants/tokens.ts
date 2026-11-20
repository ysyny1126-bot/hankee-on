/**
 * 한끼온 디자인 토큰 — 색·간격·글자·모서리를 여기 한 곳에서만 정한다.
 * 디자인을 다듬을 때는 이 파일 값만 바꾸면 앱 전체에 반영된다.
 *
 * 콘셉트: 따뜻하고 산뜻한 식탁 — 따뜻한 회백색 배경, 흰 카드, 초록 포인트 하나.
 * 캐릭터·냉장고 장면만 살구빛 바탕으로 두드러지게 하고, 나머지는 차분하게 둔다.
 */
export const color = {
  // 포인트 색은 초록 하나(신선한 식재료). 버튼·선택·활성 탭에만 쓴다.
  brand: '#1FA971',
  brandSoft: '#E4F4EC',
  brandDark: '#11805A', // 흰 글자·흰 바탕 위 글자로 써도 대비가 충분한 진한 초록
  brandShade: '#0E6E4D',
  navy: '#11805A', // (예전 이름) 주요 버튼 = 진한 초록
  navyDeep: '#22201C',
  navyMid: '#3A3631',
  fresh: '#1FA971',
  freshSoft: '#E4F4EC',
  freshDark: '#11805A',
  freshShade: '#0E6E4D',
  warn: '#E0A12B', // 먼저 활용하면 좋은 재료(경고가 아니라 안내)
  warnSoft: '#FFF4DC',
  warnDark: '#7A5200',
  danger: '#DE5D4C', // 알레르기·삭제
  dangerSoft: '#FDECE8',
  dangerDark: '#A33A2C',
  info: '#3E6FB5',
  infoSoft: '#EAF1FA',

  bg: '#F7F4EE', // 따뜻한 회백색
  surface: '#FFFFFF',
  surfaceAlt: '#F1EDE5',
  scene: '#FCEFDC', // 캐릭터·냉장고 장면 바탕(밝은 살구빛)
  border: '#E9E3D8',
  borderStrong: '#D8D0C3',
  text: '#22201C',
  textSub: '#5F5A52',
  textMuted: '#77716A',
  onBrand: '#FFFFFF',
} as const;

/**
 * 브랜드 그림(손그림 냉장고·자석) 전용 색.
 * 홈·첫 화면·빈 화면의 일러스트에만 쓰고, 버튼·글자·상태 표시에는 쓰지 않는다(포인트 색은 초록 하나).
 */
export const art = {
  ink: '#3A2E26', // 손그림 선
  paper: '#FFFDF8', // 냉장고 몸통
  paperShade: '#F3EBDD',
  carrot: '#F08A3C',
  leaf: '#5DB36A',
  tomato: '#E5574A',
  butter: '#F4C542',
  sky: '#7FB5E6',
} as const;

/** 보조 바탕색(강한 색을 여러 개 쓰지 않도록 옅은 색만) */
export const pastel = {
  lav: '#EFEAF8',
  peach: '#FCEFDC',
  sky: '#EAF1FA',
  pink: '#FBEAE6',
  mint: '#E4F4EC',
  yellow: '#FFF4DC',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 12, md: 16, lg: 24, xl: 28, pill: 999 } as const;

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
  h1: { fontSize: 26, lineHeight: 33, fontWeight: '800' as const, letterSpacing: -0.9 },
  h2: { fontSize: 20, lineHeight: 27, fontWeight: '800' as const, letterSpacing: -0.6 },
  h3: { fontSize: 17, lineHeight: 24, fontWeight: '800' as const, letterSpacing: -0.4 },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '400' as const, letterSpacing: -0.2 },
  bodyBold: { fontSize: 15, lineHeight: 23, fontWeight: '700' as const, letterSpacing: -0.2 },
  small: { fontSize: 13.5, lineHeight: 19, fontWeight: '500' as const, letterSpacing: -0.2 },
  tiny: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: -0.1 },
} as const;

/** 그림자: 아주 옅게(카드는 색 대비로 구분하고 그림자는 거의 쓰지 않음) */
export const shadow = {
  card: {
    shadowColor: '#3B2A14',
    shadowOpacity: 0.07,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  soft: {
    shadowColor: '#3B2A14',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  button: {
    shadowColor: '#11805A',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  float: {
    shadowColor: '#3B2A14',
    shadowOpacity: 0.16,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

/** 기본 카드 모양: 흰 바탕 · 둥근 24px · 테두리 없음 (이름은 예전 그대로 clay) */
export const clay = {
  backgroundColor: color.surface,
  borderRadius: radius.lg,
  ...shadow.soft,
} as const;

/** 웹(PC 브라우저)에서도 휴대폰처럼 보이도록 최대 폭 */
export const MAX_WIDTH = 520;
