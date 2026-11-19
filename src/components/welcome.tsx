import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Character } from '@/components/character';
import { Icon, type IconName } from '@/components/icon';
import { T, tx } from '@/components/ui';
import { color, MAX_WIDTH, shadow, space } from '@/constants/tokens';

const VALUES: { icon: IconName; text: string }[] = [
  { icon: 'fridge', text: '냉장고 재료로 오늘 메뉴 추천' },
  { icon: 'clock', text: '먼저 쓰면 좋은 재료를 알려 줘요' },
  { icon: 'pencil', text: '먹은 건 사진이나 메모로 간단히' },
];

/**
 * 앱 첫 화면(온보딩 앞).
 * 캐릭터가 식탁 위로 고개를 내밀고 인사하는 장면으로 첫인상을 만들고,
 * 핵심 가치 3줄과 '시작하기'를 바로 보여 준다.
 * 로그인은 아직 없으므로 버튼처럼 꾸미지 않고 '준비 중'이라고 알린다.
 */
export function Welcome({ characterId, onStart, onDemo }: { characterId?: string; onStart: () => void; onDemo: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
        <View style={{ paddingHorizontal: 24, paddingTop: space.lg, gap: space.md }}>
          <View style={styles.logo}>
            <Icon name="pot" size={18} c={color.onBrand} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            냉장고 속 재료로{'\n'}
            <Text style={{ color: color.brandDark }}>오늘 한 끼</Text>를 같이 챙겨요
          </Text>
          <T c={color.textSub}>있는 재료로 메뉴를 고르고, 먹은 건 편하게 남겨요. 자취생도, 바쁜 직장인도, 요리 초보도 괜찮아요.</T>
          <View style={{ gap: 10, marginTop: space.xs }}>
            {VALUES.map((v) => (
              <View key={v.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.valueIcon}><Icon name={v.icon} size={17} c={color.brandDark} /></View>
                <T v="bodyBold">{v.text}</T>
              </View>
            ))}
          </View>
        </View>

        {/* 캐릭터 장면: 식탁(살구빛 반원) 위로 고개를 내밀고 인사 */}
        <View style={styles.sceneWrap}>
          <View style={styles.bubble}>
            <T v="small" style={{ fontWeight: '700' }}>반가워요! 오늘 한 끼부터 같이 해요</T>
            <View style={styles.tail} />
          </View>
          <View style={styles.table}>
            <View style={{ marginTop: -70 }}>
              <Character id={characterId} size={150} mood="happy" />
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: space.md, gap: space.sm, backgroundColor: color.scene }}>
          <Pressable onPress={onStart} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && { opacity: 0.9 }]}>
            <T v="bodyBold" c={color.onBrand}>시작하기</T>
          </Pressable>
          <Pressable onPress={onDemo} accessibilityRole="button" style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.85 }]}>
            <T v="bodyBold" c={color.brandDark}>예시 데이터로 먼저 둘러보기</T>
          </Pressable>
          <T v="tiny" c={color.textSub} style={{ textAlign: 'center' }}>로그인은 준비 중이에요. 지금은 이 기기에만 저장돼요.</T>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  logo: { width: 40, height: 40, borderRadius: 14, backgroundColor: color.brandDark, alignItems: 'center', justifyContent: 'center' },
  title: { ...tx({ fontSize: 30, lineHeight: 39, fontWeight: '800', letterSpacing: -1.1, color: color.text }) },
  valueIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center' },
  sceneWrap: { flex: 1, minHeight: 220, justifyContent: 'flex-end', alignItems: 'center' },
  bubble: { backgroundColor: color.surface, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6, ...shadow.soft },
  tail: { position: 'absolute', bottom: -6, alignSelf: 'center', width: 12, height: 12, backgroundColor: color.surface, transform: [{ rotate: '45deg' }] },
  table: { width: '100%', height: 120, marginTop: 70, backgroundColor: color.scene, borderTopLeftRadius: 200, borderTopRightRadius: 200, alignItems: 'center' },
  primary: { minHeight: 54, borderRadius: 999, backgroundColor: color.brandDark, alignItems: 'center', justifyContent: 'center' },
  secondary: { minHeight: 50, borderRadius: 999, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center' },
});
