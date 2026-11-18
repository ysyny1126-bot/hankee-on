import { Link, router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { color, font, MAX_WIDTH, radius, shadow, space } from '@/constants/tokens';

/**
 * 한끼온 공용 UI 부품. 모든 화면이 이 부품만 쓰므로 디자인을 바꿀 때 여기와 tokens.ts만 고치면 된다.
 */

export function Screen({ children, scroll = true, edges = ['top'] as ('top' | 'bottom')[], footer }: { children: ReactNode; scroll?: boolean; edges?: ('top' | 'bottom')[]; footer?: ReactNode }) {
  const inner = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
      {footer ? <View style={styles.footer}><View style={styles.footerInner}>{footer}</View></View> : null}
    </SafeAreaView>
  );
}

type TVariant = keyof typeof font;
export function T({ v = 'body', c, style, children, numberOfLines }: { v?: TVariant; c?: string; style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[font[v], { color: c ?? color.text }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'brand' | 'fresh' | 'warn' | 'danger' | 'info' }) {
  const bg = tone ? { brand: color.brandSoft, fresh: color.freshSoft, warn: color.warnSoft, danger: color.dangerSoft, info: color.infoSoft }[tone] : color.surface;
  return <View style={[styles.card, { backgroundColor: bg }, tone && { borderColor: 'transparent' }, style]}>{children}</View>;
}

export function Row({ children, gap = space.sm, style, wrap }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Stack({ children, gap = space.md, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'fresh';
export function Button({ title, onPress, kind = 'primary', small, disabled, loading, icon, style, href }: { title: string; onPress?: () => void; kind?: BtnKind; small?: boolean; disabled?: boolean; loading?: boolean; icon?: string; style?: StyleProp<ViewStyle>; href?: Href }) {
  const palette = {
    primary: { bg: color.brand, fg: color.onBrand, bd: color.brand },
    fresh: { bg: color.fresh, fg: color.onBrand, bd: color.fresh },
    secondary: { bg: color.surface, fg: color.text, bd: color.border },
    ghost: { bg: 'transparent', fg: color.brandDark, bd: 'transparent' },
    danger: { bg: color.dangerSoft, fg: color.danger, bd: color.dangerSoft },
  }[kind];
  const body = (
    <Pressable
      onPress={href ? () => router.push(href) : onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: palette.bg, borderColor: palette.bd, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[small ? font.small : font.bodyBold, { color: palette.fg, fontWeight: '700' }]}>
          {icon ? `${icon}  ` : ''}
          {title}
        </Text>
      )}
    </Pressable>
  );
  return body;
}

export function Chip({ label, selected, onPress, tone }: { label: string; selected?: boolean; onPress?: () => void; tone?: 'warn' | 'danger' | 'fresh' }) {
  const toneColor = tone ? { warn: color.warn, danger: color.danger, fresh: color.fresh }[tone] : color.brand;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.chip, selected && { backgroundColor: toneColor, borderColor: toneColor }]}>
      <Text style={[font.small, { color: selected ? color.onBrand : color.textSub, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'brand' | 'fresh' | 'warn' | 'danger' | 'info' }) {
  const map = {
    muted: [color.surfaceAlt, color.textSub],
    brand: [color.brandSoft, color.brandDark],
    fresh: [color.freshSoft, color.fresh],
    warn: [color.warnSoft, '#9A6A00'],
    danger: [color.dangerSoft, color.danger],
    info: [color.infoSoft, color.info],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map[0] }]}>
      <Text style={[font.tiny, { color: map[1], fontWeight: '700' }]}>{label}</Text>
    </View>
  );
}

/** 추정값 표시(기획 원칙: 영양정보의 정확도와 추정 여부를 항상 표시) */
export function EstimateBadge({ source }: { source: 'ai_estimated' | 'reference_estimated' | 'user' | 'verified' | null | undefined }) {
  if (source === 'verified') return <Badge label="검증된 데이터" tone="fresh" />;
  if (source === 'user') return <Badge label="직접 입력" tone="info" />;
  if (source === 'ai_estimated') return <Badge label="AI 추정" tone="warn" />;
  if (source === 'reference_estimated') return <Badge label="참고값(추정)" tone="warn" />;
  return <Badge label="영양정보 없음" />;
}

export function SectionHeader({ title, action, href, onPress }: { title: string; action?: string; href?: Href; onPress?: () => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
      <T v="h3">{title}</T>
      {action ? (
        href ? (
          <Link href={href}>
            <T v="small" c={color.brandDark} style={{ fontWeight: '700' }}>{action} ›</T>
          </Link>
        ) : (
          <Pressable onPress={onPress}>
            <T v="small" c={color.brandDark} style={{ fontWeight: '700' }}>{action} ›</T>
          </Pressable>
        )
      ) : null}
    </Row>
  );
}

export function Empty({ emoji, title, body, children }: { emoji: string; title: string; body?: string; children?: ReactNode }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.sm }}>
      <Text style={{ fontSize: 36 }}>{emoji}</Text>
      <T v="bodyBold" style={{ textAlign: 'center' }}>{title}</T>
      {body ? <T v="small" c={color.textSub} style={{ textAlign: 'center' }}>{body}</T> : null}
      {children}
    </Card>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label?: string; hint?: string }) {
  return (
    <View style={{ gap: space.xs, flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
      {label ? <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>{label}</T> : null}
      <TextInput placeholderTextColor={color.textMuted} {...props} style={[styles.input, { width: '100%', minWidth: 0 }, props.multiline && { minHeight: 72, textAlignVertical: 'top' }, props.style]} />
      {hint ? <T v="tiny" c={color.textMuted}>{hint}</T> : null}
    </View>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.segItem, value === o.key && styles.segActive]}>
          <Text style={[font.small, { fontWeight: '700', color: value === o.key ? color.text : color.textMuted }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0 }: { value: number; onChange: (n: number) => void; step?: number; min?: number }) {
  const set = (n: number) => onChange(Math.max(min, Math.round(n * 100) / 100));
  return (
    <Row gap={space.xs}>
      <Pressable style={styles.stepBtn} onPress={() => set(value - step)}><Text style={font.h3}>−</Text></Pressable>
      <TextInput
        value={String(value)}
        onChangeText={(t) => { const n = Number(t.replace(/[^0-9.]/g, '')); if (!Number.isNaN(n)) set(n); }}
        keyboardType="decimal-pad"
        style={[styles.input, { width: 56, textAlign: 'center', paddingHorizontal: 4 }]}
      />
      <Pressable style={styles.stepBtn} onPress={() => set(value + step)}><Text style={font.h3}>+</Text></Pressable>
    </Row>
  );
}

export function ProgressBar({ ratio, tone = 'fresh' }: { ratio: number; tone?: 'fresh' | 'brand' | 'warn' }) {
  const c = { fresh: color.fresh, brand: color.brand, warn: color.warn }[tone];
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, backgroundColor: c }]} />
    </View>
  );
}

/** 막대 그래프(라이브러리 없이 그림). values는 같은 단위. */
export function Bars({ data, height = 110, unit = '', refLine }: { data: { label: string; value: number; highlight?: boolean }[]; height?: number; unit?: string; refLine?: number }) {
  const max = Math.max(1, refLine ?? 0, ...data.map((d) => d.value));
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 6 }}>
        {refLine ? <View style={[styles.refLine, { bottom: (refLine / max) * height }]} /> : null}
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height }}>
            {d.value > 0 ? <T v="tiny" c={color.textSub}>{Math.round(d.value)}{unit}</T> : null}
            <View style={{ width: '70%', height: Math.max(2, (d.value / max) * (height - 18)), borderRadius: 6, backgroundColor: d.highlight ? color.brand : '#FFC9A8' }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
        {data.map((d, i) => (
          <T key={i} v="tiny" c={color.textMuted} style={{ flex: 1, textAlign: 'center' }}>{d.label}</T>
        ))}
      </View>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color.border, marginVertical: space.xs }} />;
}

export function ListItem({ left, title, sub, right, onPress, href }: { left?: ReactNode; title: string; sub?: string; right?: ReactNode; onPress?: () => void; href?: Href }) {
  const body = (
    <Pressable onPress={href ? () => router.push(href) : onPress} style={({ pressed }) => [styles.listItem, pressed && { opacity: 0.7 }]}>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="bodyBold" numberOfLines={1}>{title}</T>
        {sub ? <T v="small" c={color.textSub} numberOfLines={2}>{sub}</T> : null}
      </View>
      {right}
    </Pressable>
  );
  return body;
}

export function Emoji({ children, size = 28, bg = color.surfaceAlt }: { children: string; size?: number; bg?: string }) {
  return (
    <View style={{ width: size + 16, height: size + 16, borderRadius: radius.md, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.8 }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  scroll: { paddingBottom: 120 },
  inner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, backgroundColor: color.surface, paddingVertical: space.md },
  footerInner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: space.lg, gap: space.sm },
  card: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: color.border, gap: space.sm, ...shadow.card },
  btn: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  btnSmall: { minHeight: 34, paddingHorizontal: space.md, borderRadius: radius.sm },
  chip: { paddingHorizontal: space.md, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, alignSelf: 'flex-start' },
  input: { ...font.body, color: color.text, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10, minHeight: 44 },
  seg: { flexDirection: 'row', backgroundColor: color.surfaceAlt, borderRadius: radius.md, padding: 3 },
  segItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm },
  segActive: { backgroundColor: color.surface, ...shadow.card },
  stepBtn: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: color.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: color.surfaceAlt, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  refLine: { position: 'absolute', left: 0, right: 0, height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: color.textMuted },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
});
