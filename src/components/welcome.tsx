import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '@/components/ui';
import { color, MAX_WIDTH, space } from '@/constants/tokens';

/** 웰컴 그림(로고·슬로건·캐릭터 장면·환영 문구까지, 941×1050)과 같은 바탕색 — 그림 경계가 보이지 않게 */
const HERO = require('../../assets/images/welcome-hero.png');
const HERO_RATIO = 941 / 1050;
const BG = '#FEF6EE';
/** 버튼 두 개 + 안내 문구 높이(대략) */
const ACTIONS_H = 54 + 52 + 20 + space.sm * 2 + space.lg * 2;

/**
 * 앱 첫 화면(웰컴) — 사용자가 고른 웰컴 그림을 그대로 쓴다(로고 '오잘먹'·슬로건·캐릭터와 밥상·냉장고·환영 문구).
 * 그림 아래의 로그인 버튼 부분은 잘라 냈다: 로그인·회원가입 기능이 아직 없어서(기록은 이 휴대폰에만)
 * 그림 속 버튼은 눌러도 동작하지 않기 때문. 대신 실제로 연결된 버튼만 코드로 그린다.
 * - 시작하기 → 질문 단계 · 예시 데이터로 먼저 둘러보기 → 홈
 * 이미 쓰던 사용자는 저장된 데이터가 있으면 이 화면 없이 홈으로 간다.
 */
export function Welcome({ onStart, onDemo }: { characterId?: string; onStart: () => void; onDemo: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // 그림은 비율 그대로, 버튼이 한 화면에 함께 보이도록 남는 높이에 맞춰 너비를 정한다(작은 화면에서는 조금 작게)
  const colW = Math.min(width, MAX_WIDTH);
  const fitH = height - insets.top - insets.bottom - ACTIONS_H;
  const heroW = Math.max(240, Math.min(colW, 460, fitH * HERO_RATIO));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.col}>
          <Image
            source={HERO}
            style={{ width: heroW, aspectRatio: HERO_RATIO, alignSelf: 'center' }}
            contentFit="contain"
            accessible
            accessibilityRole="image"
            accessibilityLabel="오잘먹, 오늘 하루도 잘 먹자! 캐릭터가 밥상에서 밥 한 공기와 열린 냉장고 옆에서 인사해요. 오늘도 한 끼, 같이 챙겨요. 바쁜 날에도 내 생활에 맞게 한 끼부터 시작해요."
          />

          {/* 실제로 연결된 시작 버튼만 */}
          <View style={styles.actions}>
            <Pressable onPress={onStart} accessibilityRole="button" accessibilityHint="몇 가지 질문에 답하고 시작해요" style={({ pressed }) => [styles.primary, pressed && { opacity: 0.9 }]}>
              <T v="bodyBold" c={color.onBrand}>시작하기</T>
            </Pressable>
            <Pressable onPress={onDemo} accessibilityRole="button" accessibilityHint="예시 재료와 기록이 채워진 상태로 둘러봐요" style={({ pressed }) => [styles.secondary, pressed && { backgroundColor: color.brandSoft }]}>
              <T v="bodyBold" c={color.brandDark}>예시 데이터로 먼저 둘러보기</T>
            </Pressable>
            <T v="tiny" c={color.textSub} style={{ textAlign: 'center' }}>로그인 없이 바로 써요 · 내 기록은 이 휴대폰에만 저장돼요</T>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  col: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', justifyContent: 'center', gap: space.md, paddingBottom: space.lg },
  actions: { gap: space.sm, paddingHorizontal: 24 },
  primary: { minHeight: 54, borderRadius: 999, backgroundColor: color.brandDark, alignItems: 'center', justifyContent: 'center' },
  secondary: { minHeight: 52, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1.5, borderColor: color.brandDark, alignItems: 'center', justifyContent: 'center' },
});
