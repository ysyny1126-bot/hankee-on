/**
 * R15 두 번 먹기: 2인분 만들어 1인분은 오늘, 남은 1인분은 내일 다르게.
 * 흔한 가정식 '남은 음식 활용'만 골랐다(날음식·면 요리는 제외 — 불거나 보관이 어려움).
 * 보관은 식약처 기준: 식혀서 2시간 안에 냉장, 다음 날 속까지 뜨겁게 데우기.
 */
export interface Twice {
  /** 내일 메뉴 이름 */
  next: string;
  /** 어떻게 바꾸는지 한 줄(재료는 집에 흔한 것만) */
  how: string;
  /** 앱에 있는 레시피로 이어지면 그 id */
  recipeId?: string;
}

export const TWICE: Record<string, Twice> = {
  'curry-rice': { next: '카레우동', how: '남은 카레에 물 50ml를 넣어 끓이고 데친 우동면을 넣어요' },
  jeyuk: { next: '제육볶음밥', how: '잘게 썬 제육과 밥을 함께 볶고 계란 프라이를 올려요' },
  'mushroom-bulgogi': { next: '불고기덮밥', how: '불고기를 속까지 데워 밥에 얹고 계란 프라이를 올려요' },
  dakgalbi: { next: '닭갈비 볶음밥', how: '남은 닭갈비를 잘게 잘라 밥·김과 함께 눌어붙게 볶아요' },
  'jjukkumi-stir': { next: '주꾸미 볶음밥', how: '주꾸미를 잘게 잘라 밥·김과 함께 볶아요' },
  'squid-stir': { next: '오징어덮밥', how: '오징어볶음을 속까지 데워 밥에 얹어요' },
  tteokbokki: { next: '떡볶이 볶음밥', how: '남은 양념에 밥·김을 넣고 볶아요' },
  'tomato-pasta': { next: '또띠아 피자', how: '남은 토마토소스를 또띠아에 펴 바르고 치즈를 올려 구워요', recipeId: 'tortilla-pizza' },
  'kimchi-stew': { next: '김치찌개 볶음밥', how: '건더기를 건져 잘게 썰고 밥과 볶아요. 국물은 한 번 끓여 곁들여요' },
  'doenjang-stew': { next: '된장 비빔밥', how: '건더기를 숟가락으로 으깨 밥에 얹고 참기름 조금 넣어 비벼요' },
  'budae-stew': { next: '부대찌개 라면', how: '남은 국물에 물 200ml를 더해 끓이고 라면 사리를 넣어요' },
  'mapo-tofu': { next: '마파두부 덮밥', how: '속까지 데워 밥에 얹어요. 도시락으로도 좋아요' },
};

/** 남은 1인분 보관 한 줄(식약처 조리 음식 보관 기준) */
export const TWICE_KEEP = '남은 1인분은 식혀서 2시간 안에 냉장, 다음 날 속까지 뜨겁게 데워요';
