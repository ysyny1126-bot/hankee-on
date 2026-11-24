import { buildKeepData, KEEP_DATA, keepLine, type KeepData } from './keep';
import type { NutritionInfo, StorageType } from './types';

export { KEEP_DATA };

/**
 * 식재료 기본 정보 사전.
 * 등록할 때 이모지·분류·기본 단위를 자동으로 채워 입력을 줄이기 위한 것.
 * 보관 방법은 "추천값"일 뿐 사용자가 바꿀 수 있고, 소비기한은 여기서 정하지 않는다(기획 원칙).
 * 가격은 아낀 금액을 보여 주기 위한 대략적인 참고값이다.
 */
export interface CatalogEntry {
  name: string;
  aliases?: string[];
  emoji: string;
  category: string;
  storage: StorageType;
  unit: string;
  avgPrice?: number; // 단위당 대략 가격(원)
}

export const INGREDIENT_CATALOG: CatalogEntry[] = [
  { name: '계란', aliases: ['달걀'], emoji: '🥚', category: '유제품·계란', storage: 'fridge', unit: '개', avgPrice: 300 },
  { name: '우유', emoji: '🥛', category: '유제품·계란', storage: 'fridge', unit: 'ml', avgPrice: 3 },
  { name: '치즈', aliases: ['슬라이스치즈', '모짜렐라치즈', '피자치즈'], emoji: '🧀', category: '유제품·계란', storage: 'fridge', unit: '장', avgPrice: 400 },
  { name: '두부', emoji: '🧈', category: '콩·두부', storage: 'fridge', unit: '모', avgPrice: 1500 },
  { name: '대파', aliases: ['파'], emoji: '🌿', category: '채소', storage: 'fridge', unit: '대', avgPrice: 700 },
  { name: '양파', emoji: '🧅', category: '채소', storage: 'pantry', unit: '개', avgPrice: 600 },
  { name: '마늘', aliases: ['다진마늘'], emoji: '🧄', category: '채소', storage: 'fridge', unit: '큰술', avgPrice: 200 },
  { name: '감자', emoji: '🥔', category: '채소', storage: 'pantry', unit: '개', avgPrice: 700 },
  { name: '당근', emoji: '🥕', category: '채소', storage: 'fridge', unit: '개', avgPrice: 800 },
  { name: '애호박', aliases: ['호박'], emoji: '🥒', category: '채소', storage: 'fridge', unit: '개', avgPrice: 1500 },
  { name: '오이', emoji: '🥒', category: '채소', storage: 'fridge', unit: '개', avgPrice: 800 },
  { name: '양배추', emoji: '🥬', category: '채소', storage: 'fridge', unit: '통', avgPrice: 3000 },
  { name: '상추', emoji: '🥬', category: '채소', storage: 'fridge', unit: '장', avgPrice: 100 },
  { name: '시금치', emoji: '🥬', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 15 },
  { name: '버섯', aliases: ['느타리버섯', '팽이버섯', '표고버섯', '새송이버섯', '양송이버섯'], emoji: '🍄', category: '채소', storage: 'fridge', unit: '봉', avgPrice: 1500 },
  { name: '토마토', aliases: ['방울토마토'], emoji: '🍅', category: '채소', storage: 'fridge', unit: '개', avgPrice: 900 },
  { name: '파프리카', aliases: ['피망'], emoji: '🫑', category: '채소', storage: 'fridge', unit: '개', avgPrice: 1200 },
  { name: '청양고추', aliases: ['고추'], emoji: '🌶️', category: '채소', storage: 'fridge', unit: '개', avgPrice: 200 },
  { name: '콩나물', emoji: '🌱', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 5 },
  { name: '김치', aliases: ['배추김치'], emoji: '🥬', category: '반찬', storage: 'fridge', unit: 'g', avgPrice: 8 },
  { name: '돼지고기', aliases: ['삼겹살', '앞다리살', '목살', '돼지고기 다짐육'], emoji: '🥩', category: '육류', storage: 'fridge', unit: 'g', avgPrice: 20 },
  { name: '소고기', aliases: ['다진소고기', '불고기용 소고기', '차돌박이', '국거리 소고기'], emoji: '🥩', category: '육류', storage: 'fridge', unit: 'g', avgPrice: 40 },
  { name: '닭가슴살', aliases: ['닭고기', '닭다리살'], emoji: '🍗', category: '육류', storage: 'freezer', unit: 'g', avgPrice: 12 },
  { name: '햄', aliases: ['스팸', '소시지'], emoji: '🥓', category: '가공식품', storage: 'fridge', unit: 'g', avgPrice: 15 },
  { name: '참치캔', aliases: ['참치'], emoji: '🐟', category: '가공식품', storage: 'pantry', unit: '캔', avgPrice: 2500 },
  { name: '어묵', emoji: '🍢', category: '가공식품', storage: 'fridge', unit: '장', avgPrice: 500 },
  { name: '새우', aliases: ['냉동새우'], emoji: '🦐', category: '해산물', storage: 'freezer', unit: 'g', avgPrice: 25 },
  { name: '고등어', emoji: '🐟', category: '해산물', storage: 'freezer', unit: '마리', avgPrice: 4000 },
  { name: '밥', aliases: ['즉석밥', '햇반', '쌀밥'], emoji: '🍚', category: '곡류', storage: 'pantry', unit: '공기', avgPrice: 1200 },
  { name: '쌀', emoji: '🌾', category: '곡류', storage: 'pantry', unit: 'g', avgPrice: 4 },
  { name: '라면', emoji: '🍜', category: '곡류', storage: 'pantry', unit: '봉', avgPrice: 900 },
  { name: '파스타면', aliases: ['스파게티면'], emoji: '🍝', category: '곡류', storage: 'pantry', unit: 'g', avgPrice: 6 },
  { name: '식빵', aliases: ['빵'], emoji: '🍞', category: '곡류', storage: 'pantry', unit: '장', avgPrice: 300 },
  { name: '떡', aliases: ['떡볶이떡', '떡국떡'], emoji: '🍡', category: '곡류', storage: 'fridge', unit: 'g', avgPrice: 8 },
  { name: '우동면', emoji: '🍜', category: '곡류', storage: 'fridge', unit: '봉', avgPrice: 1000 },
  { name: '고추장', emoji: '🫙', category: '양념', storage: 'fridge', unit: '큰술', avgPrice: 100 },
  { name: '된장', emoji: '🫙', category: '양념', storage: 'fridge', unit: '큰술', avgPrice: 100 },
  { name: '간장', emoji: '🫙', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 50 },
  { name: '고춧가루', emoji: '🌶️', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 100 },
  { name: '참기름', emoji: '🫗', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 150 },
  { name: '설탕', emoji: '🧂', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 20 },
  { name: '토마토소스', aliases: ['파스타소스'], emoji: '🥫', category: '양념', storage: 'fridge', unit: 'g', avgPrice: 10 },
  { name: '사과', emoji: '🍎', category: '과일', storage: 'fridge', unit: '개', avgPrice: 1500 },
  { name: '바나나', emoji: '🍌', category: '과일', storage: 'pantry', unit: '개', avgPrice: 500 },
  { name: '요거트', aliases: ['요구르트'], emoji: '🥣', category: '유제품·계란', storage: 'fridge', unit: '개', avgPrice: 1000 },
  { name: '김', aliases: ['조미김'], emoji: '🟩', category: '반찬', storage: 'pantry', unit: '봉', avgPrice: 500 },

  // ── A6: 사전 확장(1인 가구가 자주 사는 재료) ──
  // 채소
  { name: '배추', aliases: ['알배추', '알배기배추'], emoji: '🥬', category: '채소', storage: 'fridge', unit: '통', avgPrice: 3500 },
  { name: '무', aliases: ['무우'], emoji: '🥕', category: '채소', storage: 'fridge', unit: '개', avgPrice: 2000 },
  { name: '양상추', emoji: '🥬', category: '채소', storage: 'fridge', unit: '통', avgPrice: 2500 },
  { name: '브로콜리', emoji: '🥦', category: '채소', storage: 'fridge', unit: '개', avgPrice: 2000 },
  { name: '깻잎', emoji: '🌿', category: '채소', storage: 'fridge', unit: '장', avgPrice: 60 },
  { name: '부추', emoji: '🌿', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 10 },
  { name: '쪽파', aliases: ['실파'], emoji: '🌿', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 12 },
  { name: '가지', emoji: '🍆', category: '채소', storage: 'fridge', unit: '개', avgPrice: 1000 },
  { name: '고구마', emoji: '🍠', category: '채소', storage: 'pantry', unit: '개', avgPrice: 1000 },
  { name: '단호박', emoji: '🎃', category: '채소', storage: 'pantry', unit: '개', avgPrice: 3000 },
  { name: '숙주', aliases: ['숙주나물'], emoji: '🌱', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 6 },
  { name: '청경채', emoji: '🥬', category: '채소', storage: 'fridge', unit: '포기', avgPrice: 400 },
  { name: '미나리', emoji: '🌿', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 15 },
  { name: '생강', emoji: '🫚', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 20 },
  { name: '옥수수', aliases: ['옥수수캔', '스위트콘'], emoji: '🌽', category: '채소', storage: 'pantry', unit: 'g', avgPrice: 10 },
  { name: '아보카도', emoji: '🥑', category: '채소', storage: 'pantry', unit: '개', avgPrice: 2000 },
  { name: '연근', emoji: '🪷', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 12 },
  { name: '우엉', emoji: '🪵', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 12 },
  { name: '샐러드채소', aliases: ['샐러드믹스', '어린잎채소'], emoji: '🥗', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 25 },
  // 과일
  { name: '귤', aliases: ['감귤', '한라봉'], emoji: '🍊', category: '과일', storage: 'pantry', unit: '개', avgPrice: 400 },
  { name: '딸기', emoji: '🍓', category: '과일', storage: 'fridge', unit: 'g', avgPrice: 20 },
  { name: '블루베리', emoji: '🫐', category: '과일', storage: 'freezer', unit: 'g', avgPrice: 25 },
  { name: '키위', emoji: '🥝', category: '과일', storage: 'fridge', unit: '개', avgPrice: 700 },
  { name: '포도', aliases: ['샤인머스캣'], emoji: '🍇', category: '과일', storage: 'fridge', unit: 'g', avgPrice: 15 },
  { name: '레몬', emoji: '🍋', category: '과일', storage: 'fridge', unit: '개', avgPrice: 1000 },
  // 육류·해산물
  { name: '베이컨', emoji: '🥓', category: '육류', storage: 'fridge', unit: 'g', avgPrice: 30 },
  { name: '오리고기', aliases: ['훈제오리'], emoji: '🦆', category: '육류', storage: 'fridge', unit: 'g', avgPrice: 25 },
  { name: '오징어', emoji: '🦑', category: '해산물', storage: 'freezer', unit: '마리', avgPrice: 4000 },
  { name: '연어', emoji: '🍣', category: '해산물', storage: 'fridge', unit: 'g', avgPrice: 45 },
  { name: '멸치', aliases: ['잔멸치', '국물멸치'], emoji: '🐟', category: '해산물', storage: 'freezer', unit: 'g', avgPrice: 30 },
  { name: '바지락', aliases: ['조개', '모시조개'], emoji: '🦪', category: '해산물', storage: 'freezer', unit: 'g', avgPrice: 15 },
  { name: '미역', aliases: ['건미역'], emoji: '🌊', category: '해산물', storage: 'pantry', unit: 'g', avgPrice: 60 },
  { name: '맛살', aliases: ['게맛살', '크래미'], emoji: '🦀', category: '가공식품', storage: 'fridge', unit: '개', avgPrice: 300 },
  { name: '황태', aliases: ['북어', '황태채'], emoji: '🐟', category: '해산물', storage: 'pantry', unit: 'g', avgPrice: 60 },
  // 가공·냉동식품
  { name: '만두', aliases: ['냉동만두', '물만두', '군만두'], emoji: '🥟', category: '냉동식품', storage: 'freezer', unit: '개', avgPrice: 300 },
  { name: '냉동볶음밥', emoji: '🍛', category: '냉동식품', storage: 'freezer', unit: '봉', avgPrice: 3000 },
  { name: '치킨너겟', aliases: ['너겟'], emoji: '🍗', category: '냉동식품', storage: 'freezer', unit: '개', avgPrice: 250 },
  { name: '동그랑땡', aliases: ['떡갈비'], emoji: '🧆', category: '냉동식품', storage: 'freezer', unit: '개', avgPrice: 250 },
  { name: '유부', aliases: ['유부초밥'], emoji: '🟫', category: '콩·두부', storage: 'fridge', unit: '장', avgPrice: 150 },
  { name: '순두부', aliases: ['연두부'], emoji: '🧈', category: '콩·두부', storage: 'fridge', unit: '봉', avgPrice: 1200 },
  { name: '낫또', emoji: '🫘', category: '콩·두부', storage: 'fridge', unit: '개', avgPrice: 800 },
  // 곡류·면
  { name: '소면', aliases: ['국수', '중면'], emoji: '🍜', category: '곡류', storage: 'pantry', unit: 'g', avgPrice: 5 },
  { name: '당면', emoji: '🍜', category: '곡류', storage: 'pantry', unit: 'g', avgPrice: 8 },
  { name: '오트밀', aliases: ['귀리', '오트'], emoji: '🥣', category: '곡류', storage: 'pantry', unit: 'g', avgPrice: 10 },
  { name: '시리얼', aliases: ['그래놀라', '콘플레이크'], emoji: '🥣', category: '곡류', storage: 'pantry', unit: 'g', avgPrice: 12 },
  { name: '또띠아', aliases: ['토르티야'], emoji: '🫓', category: '곡류', storage: 'fridge', unit: '장', avgPrice: 500 },
  { name: '부침가루', aliases: ['튀김가루', '밀가루'], emoji: '🌾', category: '곡류', storage: 'pantry', unit: 'g', avgPrice: 4 },
  { name: '냉면', aliases: ['냉면사리', '메밀면'], emoji: '🍜', category: '곡류', storage: 'fridge', unit: '봉', avgPrice: 1500 },
  // 양념
  { name: '소금', emoji: '🧂', category: '양념', storage: 'pantry', unit: '작은술', avgPrice: 10 },
  { name: '후추', emoji: '🧂', category: '양념', storage: 'pantry', unit: '작은술', avgPrice: 30 },
  { name: '식용유', aliases: ['카놀라유', '포도씨유', '올리브유'], emoji: '🫗', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 60 },
  { name: '굴소스', emoji: '🫙', category: '양념', storage: 'fridge', unit: '큰술', avgPrice: 150 },
  { name: '케첩', aliases: ['케찹'], emoji: '🥫', category: '양념', storage: 'fridge', unit: '큰술', avgPrice: 60 },
  { name: '마요네즈', aliases: ['마요'], emoji: '🫙', category: '양념', storage: 'fridge', unit: '큰술', avgPrice: 80 },
  { name: '식초', emoji: '🫗', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 30 },
  { name: '맛술', aliases: ['미림'], emoji: '🫗', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 60 },
  { name: '올리고당', aliases: ['물엿', '꿀'], emoji: '🍯', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 80 },
  { name: '버터', emoji: '🧈', category: '유제품·계란', storage: 'fridge', unit: 'g', avgPrice: 25 },
  { name: '카레가루', aliases: ['카레'], emoji: '🍛', category: '양념', storage: 'pantry', unit: 'g', avgPrice: 30 },
  { name: '쌈장', emoji: '🫙', category: '양념', storage: 'fridge', unit: '큰술', avgPrice: 100 },
  { name: '들기름', emoji: '🫗', category: '양념', storage: 'fridge', unit: '큰술', avgPrice: 200 },
  { name: '참깨', aliases: ['깨', '통깨'], emoji: '🌾', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 100 },
  { name: '액젓', aliases: ['멸치액젓', '까나리액젓'], emoji: '🫗', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 80 },
  // 유제품·반찬
  { name: '생크림', aliases: ['휘핑크림'], emoji: '🥛', category: '유제품·계란', storage: 'fridge', unit: 'ml', avgPrice: 8 },
  { name: '두유', emoji: '🥛', category: '유제품·계란', storage: 'pantry', unit: '팩', avgPrice: 700 },
  { name: '단무지', emoji: '🟨', category: '반찬', storage: 'fridge', unit: 'g', avgPrice: 8 },
  { name: '깍두기', aliases: ['총각김치', '열무김치'], emoji: '🥬', category: '반찬', storage: 'fridge', unit: 'g', avgPrice: 9 },
  // ── A6 2차 ──
  { name: '고사리', emoji: '🌿', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 20 },
  { name: '도라지', emoji: '🌱', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 25 },
  { name: '시래기', aliases: ['우거지'], emoji: '🌿', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 15 },
  { name: '쑥갓', emoji: '🌿', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 15 },
  { name: '케일', aliases: ['루꼴라', '로메인'], emoji: '🥬', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 25 },
  { name: '셀러리', emoji: '🥬', category: '채소', storage: 'fridge', unit: '대', avgPrice: 700 },
  { name: '콜리플라워', emoji: '🥦', category: '채소', storage: 'fridge', unit: '개', avgPrice: 3000 },
  { name: '아스파라거스', emoji: '🌱', category: '채소', storage: 'fridge', unit: 'g', avgPrice: 40 },
  { name: '비트', emoji: '🟣', category: '채소', storage: 'fridge', unit: '개', avgPrice: 1500 },
  { name: '곤약', aliases: ['곤약면'], emoji: '⬜', category: '가공식품', storage: 'fridge', unit: 'g', avgPrice: 8 },
  { name: '도토리묵', aliases: ['청포묵'], emoji: '🟫', category: '가공식품', storage: 'fridge', unit: 'g', avgPrice: 8 },
  { name: '복숭아', emoji: '🍑', category: '과일', storage: 'fridge', unit: '개', avgPrice: 2000 },
  { name: '수박', emoji: '🍉', category: '과일', storage: 'fridge', unit: 'g', avgPrice: 4 },
  { name: '망고', emoji: '🥭', category: '과일', storage: 'pantry', unit: '개', avgPrice: 3000 },
  { name: '감', aliases: ['단감', '홍시'], emoji: '🟠', category: '과일', storage: 'pantry', unit: '개', avgPrice: 800 },
  { name: '자몽', aliases: ['오렌지'], emoji: '🍊', category: '과일', storage: 'fridge', unit: '개', avgPrice: 1500 },
  { name: '꽁치', aliases: ['꽁치캔'], emoji: '🐟', category: '해산물', storage: 'freezer', unit: '마리', avgPrice: 1500 },
  { name: '갈치', emoji: '🐟', category: '해산물', storage: 'freezer', unit: '토막', avgPrice: 3000 },
  { name: '삼치', emoji: '🐟', category: '해산물', storage: 'freezer', unit: '토막', avgPrice: 2500 },
  { name: '명란', aliases: ['명란젓', '백명란'], emoji: '🩷', category: '해산물', storage: 'fridge', unit: 'g', avgPrice: 60 },
  { name: '굴', aliases: ['생굴'], emoji: '🦪', category: '해산물', storage: 'fridge', unit: 'g', avgPrice: 25 },
  { name: '꽃게', aliases: ['게'], emoji: '🦀', category: '해산물', storage: 'freezer', unit: '마리', avgPrice: 5000 },
  { name: '낙지', aliases: ['쭈꾸미', '주꾸미', '문어'], emoji: '🐙', category: '해산물', storage: 'freezer', unit: 'g', avgPrice: 30 },
  { name: '돈까스', aliases: ['냉동돈까스', '돈가스'], emoji: '🍖', category: '냉동식품', storage: 'freezer', unit: '장', avgPrice: 1500 },
  { name: '미트볼', emoji: '🧆', category: '냉동식품', storage: 'freezer', unit: '개', avgPrice: 250 },
  { name: '김말이', emoji: '🍤', category: '냉동식품', storage: 'freezer', unit: '개', avgPrice: 200 },
  { name: '메추리알', emoji: '🥚', category: '유제품·계란', storage: 'fridge', unit: '개', avgPrice: 100 },
  { name: '크림치즈', emoji: '🧀', category: '유제품·계란', storage: 'fridge', unit: 'g', avgPrice: 30 },
  { name: '땅콩버터', emoji: '🥜', category: '양념', storage: 'pantry', unit: '큰술', avgPrice: 200 },
  { name: '잼', aliases: ['딸기잼'], emoji: '🍓', category: '양념', storage: 'fridge', unit: '큰술', avgPrice: 100 },
  { name: '칠리소스', aliases: ['스리라차', '스위트칠리소스'], emoji: '🌶️', category: '양념', storage: 'fridge', unit: '큰술', avgPrice: 100 },
  { name: '머스타드', aliases: ['머스터드', '와사비'], emoji: '🟡', category: '양념', storage: 'fridge', unit: '작은술', avgPrice: 50 },
  { name: '견과류', aliases: ['아몬드', '호두', '캐슈넛'], emoji: '🥜', category: '반찬', storage: 'pantry', unit: 'g', avgPrice: 30 },
  { name: '콩', aliases: ['서리태', '병아리콩', '검은콩'], emoji: '🫘', category: '콩·두부', storage: 'pantry', unit: 'g', avgPrice: 15 },
  { name: '쌀국수면', aliases: ['쌀국수'], emoji: '🍜', category: '곡류', storage: 'pantry', unit: 'g', avgPrice: 10 },
  { name: '칼국수면', aliases: ['칼국수', '수제비'], emoji: '🍜', category: '곡류', storage: 'fridge', unit: 'g', avgPrice: 8 },
  { name: '라이스페이퍼', emoji: '⚪', category: '곡류', storage: 'pantry', unit: '장', avgPrice: 60 },
  { name: '빵가루', emoji: '🌾', category: '곡류', storage: 'pantry', unit: 'g', avgPrice: 6 },
];

/**
 * B3: 재료별 보관 참고 정보(일반적인 가정 기준의 대략치).
 * 소비기한을 자동으로 채우지 않는다 — 화면에서 '참고'로만 보여 주고, 제품에 적힌 기한이 항상 우선이다.
 */
const norm = (s: string) => s.replace(/\s/g, '').toLowerCase();

/** 이름으로 사전 항목 찾기(별칭 포함, 부분 일치 허용). */
export function findCatalog(name: string): CatalogEntry | undefined {
  const n = norm(name);
  if (!n) return undefined;
  return (
    INGREDIENT_CATALOG.find((c) => norm(c.name) === n || c.aliases?.some((a) => norm(a) === n)) ??
    INGREDIENT_CATALOG.find(
      (c) => n.includes(norm(c.name)) || c.aliases?.some((a) => n.includes(norm(a))),
    )
  );
}

/** 이름이 사전의 재료명·별칭과 '정확히' 같을 때만 찾기(부분 일치 없음) */
export function findCatalogExact(name: string): CatalogEntry | undefined {
  const n = norm(name);
  return INGREDIENT_CATALOG.find((c) => norm(c.name) === n || c.aliases?.some((a) => norm(a) === n));
}

/** 재고 이름과 레시피 재료 이름이 같은 재료인지 판단(예: "삼겹살" = "돼지고기"). */
export function sameIngredient(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true;
  const ca = findCatalog(a);
  const cb = findCatalog(b);
  return !!ca && !!cb && ca.name === cb.name;
}

/** 양념처럼 대부분의 집에 있고 수량 관리가 어려운 재료(부족 재료 계산에서 '선택'으로 취급). */
export const PANTRY_STAPLES = ['소금', '후추', '설탕', '식용유', '간장', '참기름', '물', '깨', '다진마늘', '마늘'];

/**
 * 자주 먹는 음식의 1인분 참고 영양값.
 * 출처: 일반적인 1인분 기준 대략치(검증 데이터 아님) → 화면에 항상 "참고값(추정)"으로 표시한다.
 * TODO(출시 전): 식품의약품안전처 식품영양성분 DB(공공데이터포털, 무료)로 교체하고 'verified'로 표시.
 */
export interface FoodReference {
  name: string;
  aliases?: string[];
  nutrition: NutritionInfo;
  vegetableServings: number;
  ingredients: string[];
  tags: string[]; // 국물, 가공식품, 튀김 ...
}

const N = (
  calories: number,
  protein: number,
  carbohydrates: number,
  fat: number,
  sodium: number,
  fiber: number,
  sugar: number,
): NutritionInfo => ({ calories, protein, carbohydrates, fat, sodium, fiber, sugar });

export const FOOD_REFERENCES: FoodReference[] = [
  { name: '김치찌개', nutrition: N(320, 18, 14, 20, 1800, 3, 4), vegetableServings: 1, ingredients: ['김치', '돼지고기', '두부', '대파'], tags: ['국물', '한식'] },
  { name: '된장찌개', nutrition: N(180, 12, 14, 8, 1500, 4, 4), vegetableServings: 1.5, ingredients: ['된장', '두부', '애호박', '양파'], tags: ['국물', '한식'] },
  { name: '계란볶음밥', aliases: ['볶음밥'], nutrition: N(520, 16, 72, 18, 900, 2, 3), vegetableServings: 0.5, ingredients: ['밥', '계란', '대파'], tags: ['볶음', '한식'] },
  { name: '김치볶음밥', nutrition: N(560, 15, 78, 20, 1300, 3, 5), vegetableServings: 0.5, ingredients: ['밥', '김치', '계란'], tags: ['볶음', '한식'] },
  { name: '라면', aliases: ['신라면', '컵라면'], nutrition: N(500, 10, 79, 16, 1790, 3, 4), vegetableServings: 0, ingredients: ['라면'], tags: ['국물', '가공식품', '면'] },
  { name: '비빔밥', nutrition: N(560, 18, 85, 15, 1000, 6, 8), vegetableServings: 2.5, ingredients: ['밥', '계란', '시금치', '콩나물', '당근', '고추장'], tags: ['한식'] },
  { name: '제육볶음', nutrition: N(480, 28, 18, 32, 1300, 2, 12), vegetableServings: 1, ingredients: ['돼지고기', '양파', '고추장', '대파'], tags: ['볶음', '한식'] },
  { name: '불고기', nutrition: N(420, 30, 18, 24, 1000, 1, 12), vegetableServings: 0.5, ingredients: ['소고기', '양파', '간장'], tags: ['한식'] },
  { name: '닭가슴살 샐러드', aliases: ['샐러드'], nutrition: N(300, 32, 14, 12, 500, 5, 6), vegetableServings: 3, ingredients: ['닭가슴살', '양상추', '토마토'], tags: ['샐러드'] },
  { name: '떡볶이', nutrition: N(480, 9, 96, 5, 1500, 3, 18), vegetableServings: 0.3, ingredients: ['떡', '어묵', '고추장', '대파'], tags: ['분식'] },
  { name: '김밥', nutrition: N(480, 13, 78, 12, 1100, 3, 5), vegetableServings: 1, ingredients: ['밥', '김', '계란', '당근', '햄'], tags: ['분식'] },
  { name: '토마토 파스타', aliases: ['파스타', '스파게티'], nutrition: N(600, 18, 92, 16, 900, 5, 10), vegetableServings: 1, ingredients: ['파스타면', '토마토소스', '양파', '마늘'], tags: ['양식', '면'] },
  { name: '치킨', aliases: ['후라이드치킨', '양념치킨'], nutrition: N(900, 55, 40, 58, 1900, 1, 8), vegetableServings: 0, ingredients: ['닭고기'], tags: ['튀김', '배달'] },
  { name: '피자', nutrition: N(750, 30, 80, 32, 1600, 4, 8), vegetableServings: 0.5, ingredients: ['밀가루', '치즈', '토마토소스'], tags: ['배달', '양식'] },
  { name: '햄버거', aliases: ['버거'], nutrition: N(600, 28, 50, 30, 1100, 3, 9), vegetableServings: 0.5, ingredients: ['빵', '소고기', '양상추'], tags: ['패스트푸드'] },
  { name: '짜장면', nutrition: N(800, 20, 120, 25, 2300, 5, 15), vegetableServings: 0.5, ingredients: ['면', '돼지고기', '양파'], tags: ['중식', '면', '배달'] },
  { name: '편의점 도시락', aliases: ['도시락'], nutrition: N(750, 25, 100, 26, 1700, 3, 10), vegetableServings: 0.5, ingredients: ['밥', '햄'], tags: ['가공식품'] },
  { name: '삼각김밥', nutrition: N(200, 5, 38, 3, 500, 1, 2), vegetableServings: 0, ingredients: ['밥', '김'], tags: ['가공식품'] },
  { name: '토스트', aliases: ['계란토스트'], nutrition: N(380, 14, 40, 18, 650, 2, 8), vegetableServings: 0.3, ingredients: ['식빵', '계란', '양배추'], tags: ['간편식'] },
  { name: '시리얼', nutrition: N(250, 8, 42, 5, 250, 3, 14), vegetableServings: 0, ingredients: ['시리얼', '우유'], tags: ['간편식'] },
  { name: '요거트', nutrition: N(120, 6, 16, 3, 70, 0, 12), vegetableServings: 0, ingredients: ['요거트'], tags: ['간식'] },
  { name: '사과', nutrition: N(95, 0.5, 25, 0.3, 2, 4, 19), vegetableServings: 1, ingredients: ['사과'], tags: ['과일'] },
  { name: '바나나', nutrition: N(105, 1.3, 27, 0.4, 1, 3, 14), vegetableServings: 1, ingredients: ['바나나'], tags: ['과일'] },
  { name: '계란말이', nutrition: N(220, 14, 3, 16, 450, 0.5, 1), vegetableServings: 0.3, ingredients: ['계란', '대파', '당근'], tags: ['반찬'] },
  { name: '두부조림', nutrition: N(210, 15, 9, 13, 800, 2, 4), vegetableServings: 0.3, ingredients: ['두부', '간장', '대파'], tags: ['반찬'] },
  { name: '참치마요덮밥', nutrition: N(620, 22, 80, 22, 900, 1, 4), vegetableServings: 0.3, ingredients: ['밥', '참치캔', '김'], tags: ['덮밥'] },
  { name: '콩나물국', nutrition: N(60, 5, 6, 2, 900, 2, 1), vegetableServings: 1, ingredients: ['콩나물', '대파', '마늘'], tags: ['국물', '한식'] },
  { name: '어묵탕', nutrition: N(250, 13, 26, 9, 1700, 1, 5), vegetableServings: 0.5, ingredients: ['어묵', '무', '대파'], tags: ['국물', '가공식품'] },
  { name: '우동', nutrition: N(450, 13, 85, 5, 2000, 2, 5), vegetableServings: 0.3, ingredients: ['우동면', '어묵', '대파'], tags: ['국물', '면'] },
  { name: '고등어구이', nutrition: N(350, 30, 0, 25, 600, 0, 0), vegetableServings: 0, ingredients: ['고등어'], tags: ['한식', '생선'] },
  { name: '순두부찌개', nutrition: N(280, 18, 10, 18, 1600, 2, 3), vegetableServings: 0.5, ingredients: ['순두부', '계란', '대파'], tags: ['국물', '한식'] },
  { name: '미역국', nutrition: N(150, 12, 6, 8, 1100, 2, 1), vegetableServings: 1, ingredients: ['미역', '소고기'], tags: ['국물', '한식'] },
  { name: '소고기무국', aliases: ['무국'], nutrition: N(180, 14, 8, 9, 1200, 2, 3), vegetableServings: 1, ingredients: ['무', '소고기', '대파'], tags: ['국물', '한식'] },
  { name: '오징어볶음', nutrition: N(380, 30, 22, 14, 1500, 3, 12), vegetableServings: 1, ingredients: ['오징어', '양파', '고추장', '대파'], tags: ['볶음', '한식'] },
  { name: '계란국', nutrition: N(110, 9, 3, 7, 900, 0.5, 1), vegetableServings: 0.3, ingredients: ['계란', '대파'], tags: ['국물', '한식'] },
  { name: '김치전', nutrition: N(420, 9, 55, 18, 1200, 3, 4), vegetableServings: 0.5, ingredients: ['김치', '부침가루'], tags: ['전', '한식'] },
  { name: '부추전', aliases: ['파전'], nutrition: N(400, 8, 52, 17, 800, 3, 2), vegetableServings: 1, ingredients: ['부추', '부침가루'], tags: ['전', '한식'] },
  { name: '잔치국수', aliases: ['국수'], nutrition: N(450, 15, 80, 7, 1800, 3, 4), vegetableServings: 1, ingredients: ['소면', '애호박', '계란'], tags: ['국물', '면', '한식'] },
  { name: '비빔국수', nutrition: N(480, 12, 90, 7, 1300, 3, 15), vegetableServings: 1, ingredients: ['소면', '오이', '고추장'], tags: ['면', '한식'] },
  { name: '카레라이스', aliases: ['카레'], nutrition: N(620, 16, 95, 18, 1300, 5, 8), vegetableServings: 1.5, ingredients: ['밥', '감자', '당근', '양파', '카레가루'], tags: ['덮밥'] },
  { name: '만두국', aliases: ['떡만두국'], nutrition: N(420, 17, 50, 15, 1700, 2, 3), vegetableServings: 0.3, ingredients: ['만두', '계란', '대파'], tags: ['국물', '가공식품'] },
  { name: '계란찜', nutrition: N(160, 12, 2, 11, 500, 0, 1), vegetableServings: 0.2, ingredients: ['계란', '대파'], tags: ['반찬'] },
  { name: '연어덮밥', nutrition: N(560, 28, 72, 16, 900, 1, 6), vegetableServings: 0.3, ingredients: ['연어', '밥', '양파'], tags: ['덮밥', '생선'] },
  { name: '크림파스타', nutrition: N(780, 26, 85, 36, 1100, 3, 6), vegetableServings: 0.3, ingredients: ['파스타면', '베이컨', '우유', '치즈'], tags: ['양식', '면'] },
  { name: '또띠아 피자', nutrition: N(520, 22, 45, 26, 1100, 3, 6), vegetableServings: 0.5, ingredients: ['또띠아', '토마토소스', '치즈'], tags: ['양식'] },
  { name: '오트밀죽', aliases: ['오트밀'], nutrition: N(320, 11, 52, 7, 120, 6, 18), vegetableServings: 1, ingredients: ['오트밀', '우유', '바나나'], tags: ['간편식'] },
  { name: '숙주볶음', nutrition: N(380, 22, 10, 26, 1000, 3, 4), vegetableServings: 1.5, ingredients: ['숙주', '돼지고기'], tags: ['볶음'] },
  { name: '가지볶음', nutrition: N(150, 3, 14, 9, 700, 4, 6), vegetableServings: 1.5, ingredients: ['가지', '대파'], tags: ['반찬'] },
  { name: '브로콜리 새우볶음', nutrition: N(220, 20, 10, 10, 800, 4, 2), vegetableServings: 1.5, ingredients: ['브로콜리', '새우', '마늘'], tags: ['볶음'] },
  { name: '참치 주먹밥', aliases: ['주먹밥'], nutrition: N(480, 18, 70, 13, 700, 1, 2), vegetableServings: 0, ingredients: ['밥', '참치캔', '김'], tags: ['간편식'] },
  { name: '냉동볶음밥', nutrition: N(600, 18, 85, 20, 1300, 3, 4), vegetableServings: 0.5, ingredients: ['냉동볶음밥', '계란'], tags: ['가공식품', '볶음'] },
  { name: '명란 아보카도 덮밥', nutrition: N(560, 20, 70, 22, 1100, 6, 2), vegetableServings: 0.5, ingredients: ['밥', '명란', '아보카도'], tags: ['덮밥'] },
  { name: '토마토 계란볶음', nutrition: N(240, 14, 10, 16, 600, 2, 7), vegetableServings: 1, ingredients: ['토마토', '계란'], tags: ['볶음'] },
  { name: '어묵볶음', nutrition: N(230, 11, 24, 10, 1000, 1, 8), vegetableServings: 0.3, ingredients: ['어묵', '양파'], tags: ['반찬', '가공식품'] },
  { name: '감자조림', nutrition: N(260, 5, 55, 2, 1000, 4, 12), vegetableServings: 1, ingredients: ['감자', '간장'], tags: ['반찬'] },
  { name: '시금치나물', nutrition: N(70, 4, 5, 4, 400, 3, 1), vegetableServings: 1.5, ingredients: ['시금치'], tags: ['반찬'] },
  { name: '콩나물무침', nutrition: N(70, 5, 5, 4, 400, 3, 1), vegetableServings: 1.5, ingredients: ['콩나물'], tags: ['반찬'] },
  { name: '떡국', nutrition: N(480, 18, 80, 9, 1500, 2, 2), vegetableServings: 0.3, ingredients: ['떡', '계란', '소고기', '대파'], tags: ['국물', '한식'] },
  { name: '돈까스 덮밥', aliases: ['가츠동', '돈까스'], nutrition: N(820, 30, 105, 30, 1600, 2, 12), vegetableServings: 0.5, ingredients: ['돈까스', '밥', '양파', '계란'], tags: ['덮밥', '튀김'] },
  { name: '닭가슴살 덮밥', nutrition: N(560, 36, 82, 9, 1100, 1, 12), vegetableServings: 0.3, ingredients: ['닭가슴살', '밥', '양파'], tags: ['덮밥'] },
  { name: '쌀국수', nutrition: N(420, 18, 70, 6, 1800, 2, 4), vegetableServings: 1, ingredients: ['쌀국수면', '숙주', '소고기'], tags: ['국물', '면'] },
  { name: '월남쌈', nutrition: N(330, 12, 55, 5, 700, 4, 10), vegetableServings: 2.5, ingredients: ['라이스페이퍼', '파프리카', '오이', '맛살'], tags: ['샐러드'] },
  { name: '냉면', aliases: ['물냉면', '비빔냉면'], nutrition: N(520, 15, 100, 5, 2100, 3, 10), vegetableServings: 0.3, ingredients: ['냉면', '오이', '계란'], tags: ['면'] },
  { name: '라볶이', nutrition: N(650, 13, 120, 12, 2200, 4, 15), vegetableServings: 0.3, ingredients: ['라면', '떡', '어묵', '고추장'], tags: ['분식', '가공식품'] },
  { name: '감바스', nutrition: N(520, 22, 25, 38, 800, 2, 2), vegetableServings: 0.3, ingredients: ['새우', '마늘', '식빵'], tags: ['양식'] },
  { name: '바지락 칼국수', aliases: ['칼국수'], nutrition: N(560, 22, 100, 6, 2000, 4, 3), vegetableServings: 0.5, ingredients: ['칼국수면', '바지락', '애호박'], tags: ['국물', '면'] },
  { name: '프렌치토스트', nutrition: N(380, 14, 45, 15, 450, 2, 12), vegetableServings: 0, ingredients: ['식빵', '계란', '우유'], tags: ['간편식'] },
  { name: '요거트볼', nutrition: N(300, 10, 50, 7, 150, 4, 22), vegetableServings: 1, ingredients: ['요거트', '시리얼', '바나나'], tags: ['간편식'] },
  { name: '두부김치', nutrition: N(380, 24, 16, 24, 1300, 5, 6), vegetableServings: 1, ingredients: ['두부', '김치', '돼지고기'], tags: ['한식'] },
  { name: '메추리알 장조림', aliases: ['장조림'], nutrition: N(200, 13, 10, 11, 1100, 0, 7), vegetableServings: 0, ingredients: ['메추리알', '간장'], tags: ['반찬'] },
];

export function findFoodReference(name: string): FoodReference | undefined {
  const n = norm(name);
  if (!n) return undefined;
  return (
    FOOD_REFERENCES.find((f) => norm(f.name) === n || f.aliases?.some((a) => norm(a) === n)) ??
    FOOD_REFERENCES.find(
      (f) => n.includes(norm(f.name)) || f.aliases?.some((a) => n.includes(norm(a))),
    )
  );
}

/** 알레르기 선택지(식품 알레르기 표시 대상 기준 일부). */
export const ALLERGEN_OPTIONS = ['계란', '우유', '밀', '대두', '땅콩', '견과류', '갑각류', '생선', '조개류', '오징어', '돼지고기', '소고기', '닭고기', '복숭아', '토마토'];

/** 재료 이름 → 알레르기 분류. 레시피 추천 전에 항상 이걸로 걸러낸다. */
const ALLERGEN_MAP: Record<string, string[]> = {
  // 가공식품은 원재료에 흔히 들어가는 것을 넓게 잡는다(제외는 넘치게, 빠뜨리지 않게)
  계란: ['계란', '달걀', '마요네즈', '만두', '동그랑땡', '치킨너겟', '냉동볶음밥', '메추리알', '돈까스', '미트볼', '김말이'],
  우유: ['우유', '치즈', '버터', '요거트', '생크림', '모짜렐라'],
  밀: ['밀가루', '식빵', '빵', '라면', '파스타면', '우동면', '짜장', '간장', '부침가루', '튀김가루', '면', '소면', '또띠아', '만두', '치킨너겟', '동그랑땡', '굴소스', '카레', '시리얼', '어묵', '맛살', '고추장', '된장', '쌈장', '수제비', '돈까스', '미트볼', '김말이', '빵가루'],
  대두: ['두부', '순두부', '된장', '간장', '콩', '두유', '유부', '낫또', '쌈장', '고추장', '굴소스'],
  땅콩: ['땅콩'],
  견과류: ['호두', '아몬드', '잣', '캐슈넛', '견과'],
  갑각류: ['새우', '게', '랍스터', '맛살', '크래미'],
  생선: ['고등어', '참치', '어묵', '멸치', '연어', '액젓', '황태', '북어', '맛살', '꽁치', '갈치', '삼치', '명란'],
  조개류: ['바지락', '조개', '홍합', '굴', '굴소스'],
  돼지고기: ['돼지고기', '삼겹살', '햄', '스팸', '소시지', '베이컨', '만두', '동그랑땡', '돈까스', '미트볼'],
  소고기: ['소고기', '차돌박이', '떡갈비', '미트볼'],
  닭고기: ['닭가슴살', '닭고기', '닭다리살', '치킨너겟'],
  복숭아: ['복숭아'],
  // 오징어 표시 대상 외에 문어·낙지류도 피하고 싶은 경우가 많아 함께 묶는다
  오징어: ['오징어', '낙지', '쭈꾸미', '주꾸미', '문어'],
  토마토: ['토마토', '토마토소스'],
};

export function allergensOf(ingredientNames: string[]): string[] {
  const found = new Set<string>();
  for (const [allergen, words] of Object.entries(ALLERGEN_MAP)) {
    if (ingredientNames.some((n) => words.some((w) => norm(n).includes(norm(w))))) found.add(allergen);
  }
  return [...found];
}

/** 재료 사전의 분류로 상한 신호 기본값을 채워 보관 정보를 만든다 */
buildKeepData(Object.fromEntries(INGREDIENT_CATALOG.map((c) => [c.name, c.category])));

/** 재료 이름 → 보관 정보(냉장·냉동·실온 기간, 팁, 상한 신호) */
export function keepData(name: string): KeepData | undefined {
  const c = findCatalog(name);
  return c ? KEEP_DATA[c.name] : undefined;
}

/** 재료 이름 → 보관 한 줄 요약 */
export function keepInfo(name: string): string | undefined {
  const k = keepData(name);
  return k ? keepLine(k) : undefined;
}
