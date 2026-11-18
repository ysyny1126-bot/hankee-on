/**
 * 한끼온 디자인 토큰 — 색·간격·글자·모서리를 여기 한 곳에서만 정한다.
 * 디자인을 다듬을 때는 이 파일 값만 바꾸면 앱 전체에 반영된다.
 *
 * 콘셉트(캠퍼스메이트 UX/UI 적용): 옅은 보랏빛 배경, 흰 평면 카드(둥근 24px), 딥 네이비 알약 버튼,
 * 보라 포인트, 파스텔 타일로 구역 구분, 떠 있는 유리 느낌 알약형 하단 탭.
 */
export const color = {
  // 포인트: 보라(선택·활성 탭) — 캠퍼스메이트 디자인에서 가져옴
  brand: '#6C5CE7',
  brandSoft: '#F0ECFF',
  brandDark: '#5B3DC4',
  brandShade: '#5546C7',
  // 주요 버튼: 딥 네이비
  navy: '#1A2142',
  navyDeep: '#0C1022',
  navyMid: '#2A3360',
  fresh: '#2EC394', // 민트 — 신선함·달성
  freshSoft: '#DDF7EE',
  freshDark: '#0A6B52',
  freshShade: '#24A67D',
  warn: '#F5B942', // 임박
  warnSoft: '#FFF4D9',
  warnDark: '#7A4E00',
  danger: '#FF6F5E', // 코랄 — 지남·삭제·알레르기
  dangerSoft: '#FFEAE6',
  dangerDark: '#B3301F',
  info: '#3B5BDB',
  infoSoft: '#EEF2FF',

  bg: '#F5F4FA', // 아주 옅은 보랏빛 회색
  surface: '#FFFFFF',
  surfaceAlt: '#F6F6FA',
  border: '#ECEBF3',
  borderStrong: '#D9D8E4',
  text: '#15172A',
  textSub: '#5A5E73',
  textMuted: '#6E7287',
  onBrand: '#FFFFFF',
} as const;

/** 파스텔 타일 색(홈 바로가기·구역 구분용) */
export const pastel = {
  lav: '#C9BCFF',
  peach: '#FFC46B',
  sky: '#B8CFFF',
  pink: '#F7B5EE',
  mint: '#B4EEDB',
  yellow: '#FFE38A',
} as const;

/** 홈 대표 카드 그라데이션(파랑 → 라벤더) */
export const heroGradient = 'linear-gradient(135deg, #5B7CF0 0%, #8E86F5 55%, #C9A8F2 100%)';

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
    shadowColor: '#14143C',
    shadowOpacity: 0.07,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  soft: {
    shadowColor: '#141432',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  button: {
    shadowColor: '#6C5CE7',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  float: {
    shadowColor: '#3C328C',
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
