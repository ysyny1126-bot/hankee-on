import { Link, router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type SwitchProps,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { clay, color, familyFor, font, MAX_WIDTH, radius, shadow, space } from '@/constants/tokens';

/**
 * 한끼온 공용 UI 부품. 모든 화면이 이 부품만 쓰므로 디자인을 바꿀 때 여기와 tokens.ts만 고치면 된다.
 */

export function Screen({ children, scroll = true, edges = ['top'] as ('top' | 'bottom')[], footer }: { children: ReactNode; scroll?: boolean; edges?: ('top' | 'bottom')[]; footer?: ReactNode }) {
  const inner = <View style={[styles.inner, !scroll && { flex: 1 }]}>{children}</View>;
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

/**
 * 글자 스타일 마무리: fontWeight에 맞는 Pretendard 굵기를 고르고,
 * 웹에서는 한국어 단어 중간에서 줄이 바뀌지 않게(keep-all) 한다.
 */
export function tx(style: StyleProp<TextStyle>): TextStyle {
  const f = StyleSheet.flatten(style) ?? {};
  const { fontWeight, ...rest } = f as TextStyle;
  const out: Record<string, unknown> = { ...rest, fontFamily: familyFor(fontWeight) };
  if (Platform.OS === 'web') {
    out.fontWeight = fontWeight; // 웹은 굵기도 함께 둬도 안전
    out.wordBreak = 'keep-all'; // 한국어 단어 중간 줄바꿈 방지
  } // 휴대폰에서는 굵기를 글꼴 이름으로만 정한다(안드로이드 이중 굵기 방지)
  return out as TextStyle;
}

type TVariant = keyof typeof font;
export function T({ v = 'body', c, style, children, numberOfLines }: { v?: TVariant; c?: string; style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={tx([font[v], { color: c ?? color.text }, style])}>
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
  // 알약 버튼: 주요 = 네이비, 완료 = 민트, 보조 = 흰 바탕 + 테두리
  const palette = {
    primary: { bg: color.navy, fg: color.onBrand, bd: 'transparent' },
    fresh: { bg: color.brandDark, fg: color.onBrand, bd: 'transparent' },
    secondary: { bg: color.surface, fg: color.navy, bd: color.borderStrong },
    ghost: { bg: 'transparent', fg: color.textSub, bd: 'transparent' },
    danger: { bg: color.dangerSoft, fg: color.dangerDark, bd: 'transparent' },
  }[kind];
  const body = (
    <Pressable
      onPress={href ? () => router.push(href) : onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: palette.bg, borderColor: palette.bd, opacity: disabled ? 0.45 : 1 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={tx([small ? font.small : font.bodyBold, { color: palette.fg, fontWeight: '700' }])}>
          {icon ? `${icon}  ` : ''}
          {title}
        </Text>
      )}
    </Pressable>
  );
  return body;
}

export function Chip({ label, selected, onPress, tone }: { label: string; selected?: boolean; onPress?: () => void; tone?: 'warn' | 'danger' | 'fresh' }) {
  // 선택된 칩: 네이비(알레르기는 코랄, 기피는 노랑, 완료는 민트)
  const toneColor = tone ? { warn: color.warnDark, danger: color.dangerDark, fresh: color.freshDark }[tone] : color.brandDark;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.chip, selected && { backgroundColor: toneColor, borderColor: toneColor }]}>
      <Text style={tx([font.small, { color: selected ? color.onBrand : color.textSub, fontWeight: '600' }])}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'muted', center }: { label: string; tone?: 'muted' | 'brand' | 'fresh' | 'warn' | 'danger' | 'info'; center?: boolean }) {
  const map = {
    muted: [color.surfaceAlt, color.textSub],
    brand: [color.brandSoft, color.brandDark],
    fresh: [color.freshSoft, color.freshDark],
    warn: [color.warnSoft, color.warnDark],
    danger: [color.dangerSoft, color.dangerDark],
    info: [color.infoSoft, color.info],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map[0] }, center && { alignSelf: 'center' }]}>
      <Text style={tx([font.tiny, { color: map[1], fontWeight: '700' }])}>{label}</Text>
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
    <Row style={{ justifyContent: 'space-between', marginTop: space.lg }}>
      <T v="h2">{title}</T>
      {action ? (
        href ? (
          <Link href={href}>
            <Row gap={2}><T v="small" c={color.textMuted} style={{ fontWeight: '600' }}>{action}</T><Icon name="chevron" size={15} c={color.textMuted} /></Row>
          </Link>
        ) : (
          <Pressable onPress={onPress}>
            <Row gap={2}><T v="small" c={color.textMuted} style={{ fontWeight: '600' }}>{action}</T><Icon name="chevron" size={15} c={color.textMuted} /></Row>
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
      <TextInput placeholderTextColor={color.textMuted} {...props} style={[tx(styles.input), { width: '100%', minWidth: 0 }, props.multiline && { minHeight: 72, textAlignVertical: 'top' }, props.style]} />
      {hint ? <T v="tiny" c={color.textMuted}>{hint}</T> : null}
    </View>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.segItem, value === o.key && styles.segActive]}>
          <Text style={tx([font.small, { fontWeight: '700', color: value === o.key ? color.text : color.textMuted }])}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0 }: { value: number; onChange: (n: number) => void; step?: number; min?: number }) {
  const set = (n: number) => onChange(Math.max(min, Math.round(n * 100) / 100));
  return (
    <Row gap={space.xs}>
      <Pressable style={styles.stepBtn} onPress={() => set(value - step)}><Text style={tx(font.h3)}>−</Text></Pressable>
      <TextInput
        value={String(value)}
        onChangeText={(t) => { const n = Number(t.replace(/[^0-9.]/g, '')); if (!Number.isNaN(n)) set(n); }}
        keyboardType="decimal-pad"
        style={[tx(styles.input), { width: 56, textAlign: 'center', paddingHorizontal: 4 }]}
      />
      <Pressable style={styles.stepBtn} onPress={() => set(value + step)}><Text style={tx(font.h3)}>+</Text></Pressable>
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
            <View style={{ width: '70%', height: Math.max(2, (d.value / max) * (height - 18)), borderRadius: 6, backgroundColor: d.highlight ? color.brand : '#CFE9DC' }} />
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

/** 켜기/끄기 스위치 — 웹에서도 손잡이를 흰색으로 맞춘다 */
export function OnOff(props: SwitchProps) {
  return (
    <Switch
      trackColor={{ true: color.brand, false: color.border }}
      thumbColor={color.surface}
      {...({ activeThumbColor: color.surface } as object)}
      {...props}
    />
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
  footer: { backgroundColor: 'rgba(247,244,238,0.95)', paddingVertical: space.md, borderTopWidth: 1, borderTopColor: color.border },
  footerInner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: space.lg, gap: space.sm },
  card: { ...clay, padding: 20, gap: space.sm },
  btn: { minHeight: 50, borderRadius: radius.pill, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  btnSmall: { minHeight: 36, paddingHorizontal: 14 },
  chip: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 15, borderRadius: radius.pill, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  input: { ...font.body, color: color.text, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, minHeight: 50 },
  seg: { flexDirection: 'row', backgroundColor: color.surfaceAlt, borderRadius: radius.pill, padding: 3 },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.pill },
  segActive: { backgroundColor: color.surface, ...shadow.soft },
  stepBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: color.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: color.surfaceAlt, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  refLine: { position: 'absolute', left: 0, right: 0, height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: color.textMuted },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
});

/** 큰 선택 칸(온보딩·설정): 이모지 + 제목 + 설명. multi면 체크 표시 */
export function Choice({ emoji, label, sub, selected, onPress, multi }: { emoji?: string; label: string; sub?: string; selected?: boolean; onPress: () => void; multi?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: !!selected } : { selected: !!selected }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        paddingHorizontal: space.md,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: selected ? color.brand : color.border,
        backgroundColor: selected ? color.brandSoft : color.surface,
        opacity: pressed ? 0.85 : 1,
      })}>
      {emoji ? <Text style={{ fontSize: 26 }}>{emoji}</Text> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="bodyBold">{label}</T>
        {sub ? <T v="tiny" c={color.textSub}>{sub}</T> : null}
      </View>
      <View style={{ width: 22, height: 22, borderRadius: multi ? 6 : 11, borderWidth: 2, borderColor: selected ? color.brand : color.border, backgroundColor: selected ? color.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {selected ? <Text style={{ color: color.onBrand, fontSize: 12, fontWeight: '900' }}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

/** 목록 선택 + 직접 입력을 함께 받는 칩 묶음 */
export function TagPicker({ options, value, onChange, tone, placeholder }: { options: string[]; value: string[]; onChange: (v: string[]) => void; tone?: 'warn' | 'danger' | 'fresh'; placeholder?: string }) {
  const toggle = (x: string) => onChange(value.includes(x) ? value.filter((y) => y !== x) : [...value, x]);
  const customs = value.filter((x) => !options.includes(x));
  return (
    <View style={{ gap: space.sm }}>
      <Row wrap>
        {[...options, ...customs].map((o) => <Chip key={o} label={customs.includes(o) ? `${o} ✕` : o} tone={tone} selected={value.includes(o)} onPress={() => toggle(o)} />)}
      </Row>
      <TagInput placeholder={placeholder ?? '직접 입력 후 추가'} onAdd={(t) => !value.includes(t) && onChange([...value, t])} />
    </View>
  );
}

function TagInput({ placeholder, onAdd }: { placeholder: string; onAdd: (t: string) => void }) {
  const [text, setText] = useState('');
  const add = () => {
    const t = text.trim();
    if (t) onAdd(t);
    setText('');
  };
  return (
    <Row>
      <Field placeholder={placeholder} value={text} onChangeText={setText} onSubmitEditing={add} returnKeyType="done" />
      <Button title="추가" kind="secondary" small onPress={add} disabled={!text.trim()} />
    </Row>
  );
}

/**
 * 화면 머리: 작은 머리말(무슨 화면인지) + 큰 제목(지금 할 일) + 오른쪽 보조 버튼.
 * 모든 탭 화면이 같은 위계를 쓰도록 한 부품으로 둔다.
 */
export function PageHeader({ eyebrow, title, right }: { eyebrow?: string; title: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.xs, marginBottom: space.xs }}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {eyebrow ? <T v="small" c={color.textMuted} style={{ fontWeight: '600' }}>{eyebrow}</T> : null}
        {typeof title === 'string' ? <T v="h1">{title}</T> : title}
      </View>
      {right}
    </View>
  );
}

/** 동그란 보조 버튼(설정·검색 등). 접근 가능한 이름을 꼭 받는다. */
export function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: pressed ? color.surfaceAlt : color.surface, borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center' })}>
      {children}
    </Pressable>
  );
}
