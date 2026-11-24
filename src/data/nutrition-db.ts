// 자동 생성 파일(scripts/build-nutrition.mjs). 직접 고치지 말고 스크립트를 다시 돌린다.
// 출처: 식품의약품안전처 식품영양성분 DB(공공데이터포털, 이용허락범위 제한 없음). 1인분 = DB의 식품중량 기준.
import type { NutritionInfo } from './types';

export interface DbNutrition {
  dbName: string;
  foodCode: string;
  servingGram: number;
  researched: string;
  nutrition: NutritionInfo;
}

export const NUTRITION_DB: Record<string, DbNutrition> = {
  "kimchi-stew": {
    "dbName": "김치찌개_돼지고기",
    "foodCode": "D106-266100000-0001",
    "servingGram": 200,
    "researched": "2018-12-31",
    "nutrition": {
      "calories": 90,
      "protein": 8.5,
      "fat": 5.4,
      "carbohydrates": 2.1,
      "sugar": 0.1,
      "fiber": 3,
      "sodium": 414
    }
  },
  "doenjang-stew": {
    "dbName": "된장찌개",
    "foodCode": "D106-275000000-0001",
    "servingGram": 200,
    "researched": "2018-12-31",
    "nutrition": {
      "calories": 92,
      "protein": 6.8,
      "fat": 3.3,
      "carbohydrates": 8.9,
      "sugar": 0,
      "fiber": 3.2,
      "sodium": 636
    }
  },
  "jeyuk": {
    "dbName": "돼지고기볶음(제육볶음)",
    "foodCode": "D110-465000000-0001",
    "servingGram": 250,
    "researched": "2018-12-31",
    "nutrition": {
      "calories": 488,
      "protein": 30.4,
      "fat": 35.5,
      "carbohydrates": 11.8,
      "sugar": 1,
      "fiber": 9,
      "sodium": 1253
    }
  },
  "tofu-braise": {
    "dbName": "두부조림",
    "foodCode": "D111-517000000-0001",
    "servingGram": 50,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 72,
      "protein": 4.8,
      "fat": 4.8,
      "carbohydrates": 2.2,
      "sugar": 1.8,
      "fiber": 0.4,
      "sodium": 81
    }
  },
  "egg-roll": {
    "dbName": "달걀말이",
    "foodCode": "D109-416000000-0001",
    "servingGram": 100,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 193,
      "protein": 17.2,
      "fat": 13.2,
      "carbohydrates": 1.5,
      "sugar": 0,
      "fiber": 1.2,
      "sodium": 449
    }
  },
  "tteokbokki": {
    "dbName": "떡볶이",
    "foodCode": "D110-467000000-0001",
    "servingGram": 180,
    "researched": "2018-12-31",
    "nutrition": {
      "calories": 259,
      "protein": 6.3,
      "fat": 5.3,
      "carbohydrates": 46.7,
      "sugar": 7.9,
      "fiber": 1.8,
      "sodium": 704
    }
  },
  "bean-sprout-soup": {
    "dbName": "콩나물국",
    "foodCode": "D105-253000000-0001",
    "servingGram": 400,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 24,
      "protein": 3,
      "fat": 0.4,
      "carbohydrates": 2.4,
      "sugar": 0.6,
      "fiber": 1.6,
      "sodium": 876
    }
  },
  "potato-stir": {
    "dbName": "감자볶음",
    "foodCode": "D110-450000000-0001",
    "servingGram": 100,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 100,
      "protein": 1.8,
      "fat": 4.8,
      "carbohydrates": 12.4,
      "sugar": 3.4,
      "fiber": 1.7,
      "sodium": 318
    }
  },
  "shrimp-garlic": {
    "dbName": "볶음밥_새우볶음밥",
    "foodCode": "D201-017260000-0001",
    "servingGram": 300,
    "researched": "2025-09-30",
    "nutrition": {
      "calories": 483,
      "protein": 7.8,
      "fat": 0,
      "carbohydrates": 0,
      "sugar": 4.8,
      "fiber": 0,
      "sodium": 1026
    }
  },
  "mushroom-bulgogi": {
    "dbName": "소불고기",
    "foodCode": "D108-386000000-0001",
    "servingGram": 200,
    "researched": "2018-12-31",
    "nutrition": {
      "calories": 340,
      "protein": 32.8,
      "fat": 19.3,
      "carbohydrates": 8.5,
      "sugar": 6.5,
      "fiber": 7,
      "sodium": 836
    }
  },
  "seaweed-soup": {
    "dbName": "미역국",
    "foodCode": "D105-223000000-0001",
    "servingGram": 400,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 48,
      "protein": 2.6,
      "fat": 2.4,
      "carbohydrates": 3.5,
      "sugar": 1.1,
      "fiber": 1.6,
      "sodium": 672
    }
  },
  "radish-beef-soup": {
    "dbName": "무국_소고기",
    "foodCode": "D105-219240000-0001",
    "servingGram": 400,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 60,
      "protein": 5.3,
      "fat": 2.6,
      "carbohydrates": 4.4,
      "sugar": 0,
      "fiber": 2.8,
      "sodium": 664
    }
  },
  "kimchi-pancake": {
    "dbName": "김치전",
    "foodCode": "D109-412000000-0001",
    "servingGram": 150,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 201,
      "protein": 7.6,
      "fat": 6.3,
      "carbohydrates": 28.5,
      "sugar": 6.3,
      "fiber": 3.6,
      "sodium": 360
    }
  },
  "chive-pancake": {
    "dbName": "부추전",
    "foodCode": "D109-426000000-0001",
    "servingGram": 150,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 251,
      "protein": 6.9,
      "fat": 6.3,
      "carbohydrates": 41.8,
      "sugar": 12.4,
      "fiber": 4.4,
      "sodium": 371
    }
  },
  "curry-rice": {
    "dbName": "카레라이스",
    "foodCode": "D101-044000000-0001",
    "servingGram": 480,
    "researched": "2018-12-31",
    "nutrition": {
      "calories": 518,
      "protein": 14.9,
      "fat": 6.7,
      "carbohydrates": 99.6,
      "sugar": 0.8,
      "fiber": 2.4,
      "sodium": 1008
    }
  },
  "dumpling-soup": {
    "dbName": "만두국",
    "foodCode": "D303-151000000-0001",
    "servingGram": 700,
    "researched": "2012-02-28",
    "nutrition": {
      "calories": 434,
      "protein": 21.4,
      "fat": 17.4,
      "carbohydrates": 47.8,
      "sugar": 3.1,
      "fiber": 32.2,
      "sodium": 2366
    }
  },
  "sprout-pork": {
    "dbName": "돼지고기볶음",
    "foodCode": "D310-464000000-0002",
    "servingGram": 200,
    "researched": "2012-02-28",
    "nutrition": {
      "calories": 350,
      "protein": 23,
      "fat": 20.7,
      "carbohydrates": 18.2,
      "sugar": 8.2,
      "fiber": 3,
      "sodium": 1052
    }
  },
  "broccoli-shrimp": {
    "dbName": "새우볶음",
    "foodCode": "D110-480000000-0001",
    "servingGram": 200,
    "researched": "2017-12-31",
    "nutrition": {
      "calories": 166,
      "protein": 19.8,
      "fat": 4.4,
      "carbohydrates": 11.9,
      "sugar": 8,
      "fiber": 2.2,
      "sodium": 652
    }
  },
  "fishcake-stir": {
    "dbName": "어묵볶음",
    "foodCode": "D110-486000000-0001",
    "servingGram": 140,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 276,
      "protein": 11.8,
      "fat": 10.2,
      "carbohydrates": 34.1,
      "sugar": 8.8,
      "fiber": 3.5,
      "sodium": 1145
    }
  },
  "potato-braise": {
    "dbName": "감자조림",
    "foodCode": "D111-508000000-0001",
    "servingGram": 50,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 57,
      "protein": 1.2,
      "fat": 1.8,
      "carbohydrates": 9.1,
      "sugar": 3.8,
      "fiber": 0.9,
      "sodium": 244
    }
  },
  "spinach-namul": {
    "dbName": "시금치나물",
    "foodCode": "D113-586000000-0001",
    "servingGram": 50,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 35,
      "protein": 1.9,
      "fat": 2.2,
      "carbohydrates": 1.7,
      "sugar": 0.1,
      "fiber": 1,
      "sodium": 68
    }
  },
  "sprout-namul": {
    "dbName": "콩나물무침",
    "foodCode": "D113-597000000-0001",
    "servingGram": 50,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 35,
      "protein": 1.9,
      "fat": 2.3,
      "carbohydrates": 1.6,
      "sugar": 0.3,
      "fiber": 0.9,
      "sodium": 194
    }
  },
  "rice-cake-soup": {
    "dbName": "떡국",
    "foodCode": "D103-145000000-0001",
    "servingGram": 700,
    "researched": "2018-12-31",
    "nutrition": {
      "calories": 588,
      "protein": 24,
      "fat": 3.7,
      "carbohydrates": 114.6,
      "sugar": 0.6,
      "fiber": 5.6,
      "sodium": 1232
    }
  },
  "chicken-teriyaki": {
    "dbName": "덮밥_닭고기",
    "foodCode": "D101-010110000-0001",
    "servingGram": 410,
    "researched": "2017-12-31",
    "nutrition": {
      "calories": 513,
      "protein": 46.7,
      "fat": 8.9,
      "carbohydrates": 60.8,
      "sugar": 4.4,
      "fiber": 4.5,
      "sodium": 627
    }
  },
  "pho": {
    "dbName": "쌀국수",
    "foodCode": "D303-162000000-0001",
    "servingGram": 600,
    "researched": "2016-10-31",
    "nutrition": {
      "calories": 318,
      "protein": 15.6,
      "fat": 4.2,
      "carbohydrates": 55.1,
      "sugar": 4.3,
      "fiber": 1.8,
      "sodium": 1650
    }
  },
  "spring-roll": {
    "dbName": "월남쌈",
    "foodCode": "D103-167000000-0001",
    "servingGram": 250,
    "researched": "2017-12-31",
    "nutrition": {
      "calories": 295,
      "protein": 14.9,
      "fat": 12.4,
      "carbohydrates": 30.6,
      "sugar": 13.8,
      "fiber": 4.5,
      "sodium": 575
    }
  },
  "rabokki": {
    "dbName": "라볶이",
    "foodCode": "D110-468000000-0001",
    "servingGram": 200,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 268,
      "protein": 5.7,
      "fat": 9.4,
      "carbohydrates": 40.3,
      "sugar": 1.9,
      "fiber": 3.8,
      "sodium": 622
    }
  },
  "ramen-upgrade": {
    "dbName": "라면_달걀",
    "foodCode": "D103-148090000-0001",
    "servingGram": 550,
    "researched": "2017-12-31",
    "nutrition": {
      "calories": 594,
      "protein": 14.4,
      "fat": 17.5,
      "carbohydrates": 95.3,
      "sugar": 1,
      "fiber": 4.4,
      "sodium": 1007
    }
  },
  "clam-kalguksu": {
    "dbName": "칼국수_바지락",
    "foodCode": "D103-174240000-0001",
    "servingGram": 700,
    "researched": "2018-12-31",
    "nutrition": {
      "calories": 574,
      "protein": 24,
      "fat": 3.7,
      "carbohydrates": 111.8,
      "sugar": 1.3,
      "fiber": 2.1,
      "sodium": 1904
    }
  },
  "tofu-kimchi": {
    "dbName": "두부김치",
    "foodCode": "D310-466000000-0001",
    "servingGram": 250,
    "researched": "2013-03-31",
    "nutrition": {
      "calories": 288,
      "protein": 19.5,
      "fat": 17.1,
      "carbohydrates": 14.1,
      "sugar": 1.5,
      "fiber": 10.5,
      "sodium": 990
    }
  },
  "quail-egg-braise": {
    "dbName": "장조림_메추리알",
    "foodCode": "D111-532040000-0001",
    "servingGram": 100,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 203,
      "protein": 14.3,
      "fat": 13.4,
      "carbohydrates": 6.3,
      "sugar": 3.5,
      "fiber": 0.8,
      "sodium": 755
    }
  },
  "omurice": {
    "dbName": "오므라이스",
    "foodCode": "D101-028000000-0001",
    "servingGram": 400,
    "researched": "2018-12-31",
    "nutrition": {
      "calories": 692,
      "protein": 26,
      "fat": 28.9,
      "carbohydrates": 82.2,
      "sugar": 12.8,
      "fiber": 9.6,
      "sodium": 1732
    }
  },
  "potato-pancake": {
    "dbName": "감자전",
    "foodCode": "D109-408000000-0001",
    "servingGram": 200,
    "researched": "2019-12-31",
    "nutrition": {
      "calories": 266,
      "protein": 3.4,
      "fat": 13.1,
      "carbohydrates": 33.6,
      "sugar": 3.6,
      "fiber": 4,
      "sodium": 586
    }
  }
};
