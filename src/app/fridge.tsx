import { router, Stack as RStack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { confirmAsync, notify } from '@/components/dialog';
import { Sheet } from '@/components/sheet';
import { TidyCard } from '@/components/tidy-card';
import { Badge, Button, Chip, Empty, Field, Row, Screen, Segmented, Stepper, T } from '@/components/ui';
import { clay, color, radius, space } from '@/constants/tokens';
import { findCatalog, keepInfo, sameIngredient } from '@/data/catalog';
import { convert } from '@/logic/units';
import { actions, useAppState } from '@/data/store';
import type { Ingredient, StorageType } from '@/data/types';
import { addDays, dDayLabel, daysUntil, euro, guessMealType, isValidDateKey, toDateKey } from '@/logic/dates';
import { rankForUser } from '@/logic/suggestions';

const SHELVES: { key: StorageType | 'leftover'; label: string; emoji: string }[] = [
  { key: 'leftover', label: '남은 음식', emoji: '🥡' },
  { key: 'fridge', label: '냉장', emoji: '🧊' },
  { key: 'freezer', label: '냉동', emoji: '❄️' },
  { key: 'pantry', label: '실온', emoji: '🧺' },
];

/** 냉장고: 냉장·냉동·실온 선반. 재료를 누르면 아래에서 작은 창이 열린다. */
export default function Fridge() {
  const s = useAppState();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = s.ingredients.find((i) => i.id === openId) ?? null;
  const warn = s.notifications.expiryDaysBefore;
  const [mode, setMode] = useState<'shelf' | 'list'>('shelf');

  return (
    <Screen edges={['bottom']}>
      <RStack.Screen options={{ title: `내 냉장고 ${s.ingredients.length}` }} />
      <Row gap={space.sm}>
        <Button title="찍어서 추가" icon="📷" style={{ flex: 1 }} href="/scan/fridge" />
        <Button title="직접 추가" icon="✏️" kind="secondary" style={{ flex: 1 }} href="/ingredient/edit" />
      </Row>

      <TidyCard stock={s.ingredients} max={20} />
      {s.ingredients.length > 0 && (
        <Segmented options={[{ key: 'shelf', label: '선반으로 보기' }, { key: 'list', label: '빠르게 고치기' }]} value={mode} onChange={setMode} />
      )}

      {s.ingredients.length === 0 ? (
        <Empty emoji="🫙" title="냉장고가 비어 있어요" />
      ) : mode === 'list' ? (
        <QuickList items={s.ingredients} warn={warn} />
      ) : (
        SHELVES.map((sh) => {
          const items = s.ingredients
            .filter((i) => (sh.key === 'leftover' ? i.kind === 'leftover' : i.kind !== 'leftover' && i.storage === sh.key))
            .sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'));
          if (sh.key === 'leftover' && items.length === 0) return null;
          return (
            <View key={sh.key} style={{ ...clay, overflow: 'hidden' }}>
              <Row style={{ paddingHorizontal: space.md, paddingVertical: space.sm, backgroundColor: color.surfaceAlt }}>
                <T v="bodyBold">{sh.emoji} {sh.label}</T>
                <T v="small" c={color.textMuted}>{items.length}</T>
              </Row>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: space.sm }}>
                {items.length === 0 ? (
                  <T v="small" c={color.textMuted} style={{ padding: space.sm }}>비어 있어요</T>
                ) : (
                  items.map((i) => <Tile key={i.id} item={i} warn={warn} onPress={() => setOpenId(i.id)} />)
                )}
              </View>
            </View>
          );
        })
      )}

      <Sheet visible={!!open} onClose={() => setOpenId(null)}>
        {open ? <IngredientSheet item={open} onClose={() => setOpenId(null)} /> : null}
      </Sheet>
    </Screen>
  );
}

/** 양을 하나 줄일 때의 단위(개 → 1, g·ml → 50, 1보다 적으면 0.25) */
function stepOf(i: Ingredient) {
  if (['g', 'ml'].includes(i.unit)) return i.quantity > 100 ? 50 : 10;
  return i.quantity < 1 ? 0.25 : 1;
}

/**
 * C1 빠르게 고치기: 편집 화면에 들어가지 않고 한 줄에서 −/다 씀/버림.
 * 기한이 가까운 순. 다 씀·버림은 화면 아래 '되돌리기'로 바로 취소할 수 있다.
 */
function QuickList({ items, warn }: { items: Ingredient[]; warn: number }) {
  const sorted = [...items].sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999') || a.name.localeCompare(b.name));
  return (
    <View style={{ ...clay, overflow: 'hidden' }}>
      {sorted.map((i, idx) => {
        const d = i.expiryDate ? daysUntil(i.expiryDate) : null;
        const tone = d === null ? color.textMuted : d <= 0 ? color.danger : d <= warn ? color.warnDark : color.textSub;
        const st = stepOf(i);
        return (
          <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.md, paddingVertical: 8, borderTopWidth: idx ? 1 : 0, borderTopColor: color.border }}>
            <Text style={{ fontSize: 22 }}>{i.emoji}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="bodyBold" numberOfLines={1}>{i.name}</T>
              <T v="tiny" c={tone}>{i.quantity}{i.unit} · {d === null ? '기한 미입력' : dDayLabel(i.expiryDate!)}</T>
            </View>
            <QuickBtn
              label={`−${st}`}
              a11y={`${i.name} ${st}${i.unit} 줄이기`}
              onPress={() => (i.quantity - st > 0.001 ? actions.updateIngredient(i.id, { quantity: Math.round((i.quantity - st) * 100) / 100 }) : actions.useUpIngredient(i.id))}
            />
            <QuickBtn label="다 씀" a11y={`${i.name} 다 씀`} onPress={() => actions.useUpIngredient(i.id)} />
            <QuickBtn label="버림" danger a11y={`${i.name} 버림`} onPress={() => actions.discardIngredient(i.id, d !== null && d < 0 ? 'expired' : 'spoiled')} />
          </View>
        );
      })}
    </View>
  );
}

function QuickBtn({ label, onPress, a11y, danger }: { label: string; onPress: () => void; a11y: string; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={4}
      style={({ pressed }) => ({ minHeight: 40, minWidth: 44, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? color.dangerSoft : color.surfaceAlt, opacity: pressed ? 0.7 : 1 })}>
      <T v="small" c={danger ? color.danger : color.text} style={{ fontWeight: '700' }}>{label}</T>
    </Pressable>
  );
}

function Tile({ item: i, warn, onPress }: { item: Ingredient; warn: number; onPress: () => void }) {
  const d = i.expiryDate ? daysUntil(i.expiryDate) : null;
  const tone = d === null ? color.textMuted : d < 0 || d === 0 ? color.danger : d <= warn ? color.warnDark : color.textSub;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: '25%', alignItems: 'center', paddingVertical: space.sm, gap: 2, opacity: pressed ? 0.6 : 1 })} accessibilityLabel={`${i.name} ${d === null ? '기한 없음' : dDayLabel(i.expiryDate!)}`}>
      <Text style={{ fontSize: 30 }}>{i.emoji}</Text>
      <T v="tiny" numberOfLines={1} style={{ fontWeight: '600' }}>{i.name}</T>
      <T v="tiny" c={tone}>{d === null ? '—' : dDayLabel(i.expiryDate!)}</T>
    </Pressable>
  );
}

function IngredientSheet({ item: i, onClose }: { item: Ingredient; onClose: () => void }) {
  const s = useAppState();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(i.expiryDate ?? '');
  const d = i.expiryDate ? daysUntil(i.expiryDate) : null;
  const recipe = useMemo(() => rankForUser(s).find((m) => m.recipe.ingredients.some((x) => sameIngredient(x.name, i.name))), [s, i.name]);
  const step = i.unit === 'g' || i.unit === 'ml' ? 50 : i.quantity < 1 ? 0.25 : 1;

  const saveDate = (v: string) => {
    if (v && !isValidDateKey(v)) return;
    actions.updateIngredient(i.id, { expiryDate: v || null, expirySource: v ? 'user' : null });
    setEditing(false);
  };

  return (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <Text style={{ fontSize: 34 }}>{i.emoji}</Text>
          <T v="h2">{i.name}</T>
        </Row>
        {d !== null ? <Badge label={dDayLabel(i.expiryDate!)} tone={d <= 0 ? 'danger' : d <= s.notifications.expiryDaysBefore ? 'warn' : 'fresh'} /> : null}
      </Row>

      <Row style={{ justifyContent: 'space-between' }}>
        <T c={color.textSub}>수량</T>
        <Row gap={4}>
          <Stepper value={i.quantity} step={step} onChange={(n) => (n > 0 ? actions.updateIngredient(i.id, { quantity: n }) : undefined)} />
          <T v="small">{i.unit}</T>
        </Row>
      </Row>

      <Row style={{ justifyContent: 'space-between' }}>
        <T c={color.textSub}>소비기한</T>
        <Pressable onPress={() => setEditing(!editing)} hitSlop={8}>
          <T v="bodyBold">{i.expiryDate ?? '입력하기'} ✏️</T>
        </Pressable>
      </Row>
      {editing && (
        <>
          <Field placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} onSubmitEditing={() => saveDate(date)} />
          <Row wrap>
            {[0, 1, 3, 7].map((n) => <Chip key={n} label={n === 0 ? '오늘' : `+${n}일`} onPress={() => saveDate(addDays(toDateKey(), n))} />)}
            <Chip label="저장" selected onPress={() => saveDate(date)} />
          </Row>
        </>
      )}

      {i.kind !== 'leftover' && keepInfo(i.name) ? (
        <T v="tiny" c={color.textSub}>📦 보관 참고: {keepInfo(i.name)} (대략치 · 제품 기한이 우선)</T>
      ) : null}
      {i.kind !== 'leftover' ? <MyUnit item={i} /> : null}

      {i.kind === 'leftover' && (
        <Button title={`🍽️ 한 끼 먹기 (${Math.min(1, i.quantity)}인분)`} kind="fresh" onPress={() => { actions.eatLeftover(i.id, 1, guessMealType() === 'snack' ? 'dinner' : guessMealType()); onClose(); notify('맛있게 드세요!', '식사 기록에 남겼어요.'); }} />
      )}
      <Row gap={space.sm}>
        <Button title={i.kind === 'leftover' ? '다 먹음(기록 없이)' : '다 먹음'} kind="secondary" style={{ flex: 1 }} onPress={() => { actions.useUpIngredient(i.id); onClose(); }} />
        <Button
          title="버림"
          kind="danger"
          style={{ flex: 1 }}
          onPress={async () => {
            if (await confirmAsync(`${i.name} 버림`, '이번 달 낭비 기록에 남아요.', '버림')) {
              actions.discardIngredient(i.id, d !== null && d < 0 ? 'expired' : 'spoiled');
              onClose();
            }
          }}
        />
      </Row>

      {recipe && i.kind !== 'leftover' ? (
        <Pressable onPress={() => { onClose(); router.push(`/recipe/${recipe.recipe.id}`); }} style={{ backgroundColor: color.brandSoft, borderRadius: radius.md, padding: space.md }}>
          <T v="bodyBold" c={color.brandDark}>이 재료로 → {recipe.recipe.emoji} {recipe.recipe.name} ›</T>
        </Pressable>
      ) : null}
      <Pressable onPress={() => { onClose(); router.push(`/ingredient/edit?id=${i.id}`); }} style={{ alignSelf: 'center' }}>
        <T v="small" c={color.textMuted}>자세히 수정</T>
      </Pressable>
    </>
  );
}

/**
 * A7 내 단위: 이 재료의 단위를 레시피 단위(사전 기본 단위)로 바꿀 수 없을 때
 * "1팩 = 몇 모"처럼 한 번만 정해 두면, 그다음부터 추천·차감이 자동으로 맞춰진다.
 */
function MyUnit({ item: i }: { item: Ingredient }) {
  const s = useAppState();
  const cat = findCatalog(i.name);
  const saved = cat ? s.preferences.myUnits?.[cat.name]?.[i.unit] : undefined;
  const auto = cat && cat.unit !== i.unit ? convert(1, i.unit, cat.unit, i.name) : null;
  const [v, setV] = useState(saved ?? auto ?? 1);
  const [open, setOpen] = useState(false);
  if (!cat || cat.unit === i.unit) return null;
  if (auto != null && saved == null && !open)
    return (
      <Pressable onPress={() => setOpen(true)} hitSlop={6}>
        <T v="tiny" c={color.textMuted}>단위: 1{i.unit} ≈ {Math.round(auto * 100) / 100}{cat.unit}(평균값) · 우리 집 기준으로 바꾸기</T>
      </Pressable>
    );
  return (
    <View style={{ backgroundColor: color.surfaceAlt, borderRadius: radius.md, padding: space.sm, gap: 6 }}>
      <T v="small" style={{ fontWeight: '700' }}>{saved != null ? '내 단위' : '단위 맞추기'}: 1{i.unit} = 몇 {cat.unit}인가요?</T>
      {saved == null && auto == null ? <T v="tiny" c={color.textSub}>레시피는 '{cat.unit}' 단위라서, 정해 두면 이 재료도 추천·차감에 정확히 쓰여요.</T> : null}
      <Row style={{ justifyContent: 'space-between' }}>
        <T>1{i.unit} =</T>
        <Row gap={4}>
          <Stepper value={v} step={['g', 'ml'].includes(cat.unit) ? 10 : 0.25} min={0.25} onChange={setV} />
          <T v="small">{cat.unit}</T>
        </Row>
      </Row>
      <Button small title="저장" onPress={() => { actions.setMyUnit(cat.name, i.unit, v); setOpen(false); notify('내 단위를 저장했어요', `${cat.name} 1${i.unit} = ${euro(`${v}${cat.unit}`)} 계산할게요.`); }} />
    </View>
  );
}
