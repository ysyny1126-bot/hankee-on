import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { Character } from '@/components/character';
import { FridgeArt } from '@/components/fridge-art';
import { IngPic } from '@/components/pics';
import { T, tx } from '@/components/ui';
import { art, color, MAX_WIDTH, space } from '@/constants/tokens';

/**
 * 앱 첫 화면(웰컴) — 오잘먹 '오늘 하루도 잘 먹자!'
 * 1 브랜드: 앱 아이콘(밥그릇) + '오잘먹' + 슬로건
 * 2 환영 장면: 고른 캐릭터가 체크무늬 밥상 위 밥 한 공기 옆에서 인사, 옆에 냉장고(앱 곳곳의 같은 그림)
 * 3 환영 문구 + 보조 문구
 * 4 시작 버튼: 실제로 연결된 것만 — '시작하기'(질문 단계) · '예시 데이터로 먼저 둘러보기'.
 *   로그인·회원가입 기능은 아직 없으므로(기록은 이 휴대폰에만 저장) 소셜·이메일 버튼과 약관 동의는 넣지 않는다.
 *   이미 쓰던 사용자는 저장된 데이터가 있으면 이 화면 없이 홈으로 간다.
 */
export function Welcome({ characterId, onStart, onDemo }: { characterId?: string; onStart: () => void; onDemo: () => void }) {
  // 장면(320×210)을 화면 폭에 맞춰 통째로 줄인다(작은 화면에서도 캐릭터·밥상·냉장고가 겹치거나 잘리지 않게)
  const [w, setW] = useState(0);
  // 화면이 낮으면(작은 휴대폰) 로고·이름·장면을 줄여 두 버튼이 스크롤 없이 보이게
  const short = useWindowDimensions().height < 700;
  const k = w ? Math.min(short ? 0.85 : 1.25, w / 320) : 1;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={[styles.col, short && { gap: space.sm, paddingTop: space.md }]}>
          {/* 1. 브랜드 */}
          <View style={styles.brand}>
            <Image source={require('../../assets/images/icon.png')} style={[styles.appIcon, short && { width: 40, height: 40, borderRadius: 12 }]} contentFit="cover" accessible={false} />
            <Text style={[styles.name, short && { fontSize: 34, lineHeight: 40 }]} accessibilityRole="header" accessibilityLabel="오잘먹, 오늘 하루도 잘 먹자">오잘먹</Text>
            <View style={styles.sloganPill}>
              <Text style={styles.slogan}>오늘 하루도 잘 먹자!</Text>
            </View>
          </View>

          {/* 2. 환영 장면 */}
          <View style={styles.sceneBox} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible={false}>
            <View style={[styles.scene, { transform: [{ scale: k }], marginVertical: (210 * (k - 1)) / 2 }]}>
              {/* 체크무늬 밥상보 */}
              <View style={styles.mat}>
                <Svg width="100%" height="100%">
                  <Defs>
                    <Pattern id="check" width="16" height="16" patternUnits="userSpaceOnUse">
                      <Rect width="16" height="16" fill="#DCEBDF" />
                      <Rect width="8" height="16" fill="#C7DFCD" />
                      <Rect width="16" height="8" fill="#C7DFCD" opacity={0.7} />
                    </Pattern>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#check)" />
                </Svg>
              </View>
              <View style={styles.floor} />
              <View style={styles.charSpot}><Character id={characterId} size={118} mood="happy" /></View>
              {/* 밥 한 공기: 손그림 밥그릇에 밥(재료 그림)을 소복이 */}
              <View style={styles.bowlSpot}>
                <View style={styles.rice}><IngPic name="밥" emoji="🍚" size={64} /></View>
                <View style={styles.bowl}><View style={styles.bowlLeaf} /></View>
              </View>
              <View style={styles.fridgeSpot}><FridgeArt width={92} /></View>
            </View>
          </View>

          {/* 3. 환영 문구 */}
          <View style={styles.copy}>
            <View>
              <View style={styles.highlight} />
              <Text style={styles.headline}>오늘도 한 끼, 같이 챙겨요</Text>
            </View>
            <T c={color.textSub} style={{ textAlign: 'center' }}>바쁜 날에도 내 생활에 맞게 한 끼부터 시작해요.</T>
          </View>

          {/* 4. 시작 버튼(실제로 연결된 것만) */}
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

const BROWN = art.ink;

const styles = StyleSheet.create({
  // 화면이 낮으면 스크롤, 높으면 위아래로 고르게 펼친다
  scroll: { flexGrow: 1 },
  col: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24, paddingTop: space.lg, paddingBottom: space.md, justifyContent: 'space-between', gap: space.lg },
  brand: { alignItems: 'center', gap: 6 },
  appIcon: { width: 56, height: 56, borderRadius: 16 },
  name: { ...tx({ fontSize: 44, lineHeight: 52, fontWeight: '800', letterSpacing: -1, color: BROWN }) },
  sloganPill: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 999, backgroundColor: '#DCEBDF' },
  slogan: { ...tx({ fontSize: 15, lineHeight: 21, fontWeight: '700', color: '#4A5E4F' }) },
  sceneBox: { alignItems: 'center' },
  scene: { width: 320, height: 210 },
  floor: { position: 'absolute', left: 16, right: 16, bottom: 6, height: 14, borderRadius: 999, backgroundColor: 'rgba(154,91,54,0.10)' },
  mat: { position: 'absolute', left: 14, width: 210, bottom: 12, height: 46, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(58,46,38,0.25)', transform: [{ skewX: '-8deg' }] },
  charSpot: { position: 'absolute', left: 22, bottom: 26 },
  bowlSpot: { position: 'absolute', left: 138, bottom: 28, width: 74, height: 70 },
  rice: { position: 'absolute', left: 5, top: 0 },
  bowl: { position: 'absolute', left: 4, right: 4, bottom: 0, height: 38, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: '#F6E3C2', borderWidth: 2, borderColor: art.ink },
  bowlLeaf: { position: 'absolute', left: 28, top: 12, width: 10, height: 6, borderRadius: 5, backgroundColor: '#8DBE8F', transform: [{ rotate: '-20deg' }] },
  fridgeSpot: { position: 'absolute', right: 10, bottom: 14 },
  copy: { alignItems: 'center', gap: space.sm },
  // 제목 아래 은은한 주황 형광펜
  highlight: { position: 'absolute', left: -6, right: -6, bottom: 2, height: 12, borderRadius: 6, backgroundColor: 'rgba(240,138,60,0.22)' },
  headline: { ...tx({ fontSize: 25, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8, color: BROWN }), textAlign: 'center' },
  actions: { gap: space.sm },
  primary: { minHeight: 54, borderRadius: 999, backgroundColor: color.brandDark, alignItems: 'center', justifyContent: 'center' },
  secondary: { minHeight: 52, borderRadius: 999, backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.brandDark, alignItems: 'center', justifyContent: 'center' },
});
