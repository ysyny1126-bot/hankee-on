# 한끼온 (HANKEE ON)

> 나의 식생활을 기억하는 AI — 식재료 구매부터 보관, 소비기한, 요리, 식사 기록, 식생활 분석까지 하나로 연결하는 1인 가구용 식생활 앱.

- 기술: React Native + Expo (SDK 58), Expo Router, TypeScript
- 저장: 기기 안(AsyncStorage). 로그인·서버는 다음 단계
- AI: Google Gemini (무료 등급, 시연용) — 키가 없으면 AI 기능만 꺼지고 나머지는 동작

## 실행

```bash
npm install
npx expo start          # 휴대폰의 Expo Go 앱으로 QR 스캔
npx expo start --web    # 브라우저에서 보기
```

AI를 켜려면 `.env.example`을 `.env`로 복사하고 `EXPO_PUBLIC_GEMINI_API_KEY`를 채운 뒤 다시 실행한다.

## 폴더 구조

```
src/
  app/                화면(파일 하나 = 화면 하나)
    (tabs)/           하단 탭: HOME · 냉장고 · COOK · 식단 · MY
    scan/             냉장고 사진 분석, 음식 사진 → 레시피
    recipe/[id]       레시피(냉장고 비교·장보기·영상)
    cook/[id]         요리 완료(재고 차감 + 식사 기록)
    meal-record/edit  식사 기록 입력·수정
    report, goals, shopping, settings, onboarding
  data/               데이터 구조(types), 저장소(store), 기본 레시피·식재료 사전, 시연 데이터
  logic/              계산: 재고↔레시피 비교, 먼저 제안하기, 식생활 분석, 식단 짜기, 알림
  ai/                 Gemini 연결, 사진 선택
  components/ui.tsx   공용 UI 부품
  constants/tokens.ts 디자인 토큰(색·간격·글자) — 디자인은 여기서 바꾼다
docs/
  기능현황.md          실제 작동 / 화면만 / 미구현 구분표
  expo-template/      Expo 기본 템플릿 원본(참고용)
```

구현 상태는 [docs/기능현황.md](docs/기능현황.md)를 본다.
