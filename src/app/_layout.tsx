import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { color } from '@/constants/tokens';
import { StoreProvider, useAppState } from '@/data/store';
import { syncExpiryNotifications } from '@/logic/notify';

SplashScreen.preventAutoHideAsync();

function NotificationSync() {
  const s = useAppState();
  useEffect(() => {
    syncExpiryNotifications(s).catch(() => {});
  }, [s.ingredients, s.notifications]);
  return null;
}

export default function RootLayout() {
  // Pretendard: 굵기마다 이름을 따로 등록한다(모든 기기에서 같은 굵기가 나오게)
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Regular': require('@/assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('@/assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('@/assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('@/assets/fonts/Pretendard-Bold.otf'),
    'Pretendard-ExtraBold': require('@/assets/fonts/Pretendard-ExtraBold.otf'),
  });
  const ready = fontsLoaded || !!fontError; // 글꼴을 못 읽어도 기본 글꼴로 앱은 연다
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  return (
    <StoreProvider>
      <StatusBar style="dark" />
      <NotificationSync />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: color.bg },
          headerShadowVisible: false,
          headerTintColor: color.text,
          headerTitleStyle: { fontFamily: 'Pretendard-Bold', fontSize: 17 },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: color.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '홈' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="ingredient/edit" options={{ title: '식재료' }} />
        <Stack.Screen name="scan/fridge" options={{ title: '냉장고 사진 분석' }} />
        <Stack.Screen name="scan/food" options={{ title: '음식 사진으로 레시피' }} />
        <Stack.Screen name="recipe/[id]" options={{ title: '레시피' }} />
        <Stack.Screen name="cook/[id]" options={{ title: '요리 완료' }} />
        <Stack.Screen name="meal-record/edit" options={{ title: '식사 기록' }} />
        <Stack.Screen name="meals" options={{ title: '식사 기록 모아보기' }} />
        <Stack.Screen name="report" options={{ title: '식생활 리포트' }} />
        <Stack.Screen name="goals" options={{ title: '식생활 목표' }} />
        <Stack.Screen name="shopping" options={{ title: '장보기 목록' }} />
        <Stack.Screen name="settings" options={{ title: '설정' }} />
        <Stack.Screen name="fridge" options={{ title: '내 냉장고' }} />
        <Stack.Screen name="plan" options={{ title: '이번 주 식단' }} />
        <Stack.Screen name="cook-mode/[id]" options={{ title: '요리 모드' }} />
      </Stack>
    </StoreProvider>
  );
}
