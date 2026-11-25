import { router, Stack as RStack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { confirmAsync, notify } from '@/components/dialog';
import { Sheet } from '@/components/sheet';
import { TidyCard } from '@/components/tidy-card';
import { FridgeArt } from '@/components/fridge-art';
import { Badge, Button, Chip, Empty, Field, Row, Screen, Segmented, Stepper, T, Intro } from '@/components/ui';
import { ItemPic } from '@/components/pics';
import { clay, color, radius, space } from '@/constants/tokens';
import { KeepInfo } from '@/components/keep-info';
import { shortAmount, fullOf, isRough, LEVELS, levelOf, lowerLevel, quantityFor } from '@/logic/amount';
import { findCatalog, sameIngredient } from '@/data/catalog';
import { formatAmount } from '@/logic/inventory';
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

      <Intro>재료를 누르면 수량·소비기한을 고치거나 다 썼다고 표시할 수 있어요.</Intro>
      <TidyCard stock={s.ingredients} max={20} lastCheckAt={s.preferences.lastCheckAt} />
      {s.ingredients.length > 0 && (
        <Segmented options={[{ key: 'shelf', label: '선반으로 보기' }, { key: 'list', label: '빠르게 고치기' }]} value={mode} onChange={setMode} />
      )}

      {s.ingredients.length === 0 ? (
        <Empty emoji="🫙" art={<FridgeArt width={84} />} title="냉장고가 비어 있어요" body="사진 한 장이나 직접 입력으로 재료를 넣으면, 있는 재료로 메뉴를 골라 드려요." />
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
        const rough = isRough(i);
        const low = rough ? lowerLevel(i) : null;
        return (
          <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.md, paddingVertical: 8, borderTopWidth: idx ? 1 : 0, borderTopColor: color.border }}>
            <ItemPic item={i} size={30} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="bodyBold" numberOfLines={1}>{i.name}</T>
              <T v="tiny" c={tone} numberOfLines={1}>{shortAmount(i)} · {d === null ? '기한 미입력' : dDayLabel(i.expiryDate!)}</T>
            </View>
            {rough ? (
              <QuickBtn
                label={low ? `→${low.label}` : '−'}
                a11y={low ? `${i.name} ${low.label} 남음으로 바꾸기` : `${i.name} 다 씀`}
                onPress={() => (low ? actions.updateIngredient(i.id, { quantity: quantityFor(i, low) }) : actions.useUpIngredient(i.id))}
              />
            ) : (
              <QuickBtn
                label={`−${st}`}
                a11y={`${i.name} ${st}${i.unit} 줄이기`}
                onPress={() => (i.quantity - st > 0.001 ? actions.updateIngredient(i.id, { quantity: Math.round((i.quantity - st) * 100) / 100 }) : actions.useUpIngredient(i.id))}
              />
            )}
            <QuickBtn label="다 씀" a11y={`${i.name} 다 씀`} onPress={() => actions.useUpIngredient(i.id)} />
            <QuickBtn label="버림" danger a11y={`${i.name} 버림`} onPress={() => actions.discardIngredient(i.id, d !== null && d < 0 ? 'expired' : 'spoiled')} />
          </View>
        );
      })}
    </View>
  );
}

/** 눈대중 단계 고르기: 거의 그대로 · 반 넘게 · 반쯤 · 조금 · 아주 조금 */
function LevelPicker({ item: i }: { item: Ingredient }) {
  const cur = levelOf(i).key;
  return (
    <Row gap={6} wrap>
      {LEVELS.map((l) => (
        <Pressable
          key={l.key}
          onPress={() => actions.updateIngredient(i.id, { quantity: quantityFor(i, l) })}
          accessibilityRole="radio"
          accessibilityState={{ selected: cur === l.key }}
          accessibilityLabel={`${l.label} 남음`}
          style={{ alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 6, minWidth: 60, flexGrow: 1, borderRadius: 14, borderWidth: cur === l.key ? 2 : 1, borderColor: cur === l.key ? color.brandDark : color.border, backgroundColor: cur === l.key ? color.brandSoft : color.surface }}>
          <Gauge ratio={l.ratio} on={cur === l.key} />
          <T v="tiny" c={cur === l.key ? color.brandDark : color.textSub} style={{ fontWeight: '700' }}>{l.label}</T>
        </Pressable>
      ))}
    </Row>
  );
}

/** 통에 담긴 정도를 보여 주는 작은 그림(아래부터 채워짐) */
function Gauge({ ratio, on }: { ratio: number; on: boolean }) {
  return (
    <View style={{ width: 18, height: 26, borderRadius: 5, borderWidth: 2, borderColor: on ? color.brandDark : color.borderStrong, justifyContent: 'flex-end', overflow: 'hidden' }}>
      <View style={{ height: `${Math.max(10, ratio * 100)}%`, backgroundColor: on ? color.brand : color.textMuted }} />
    </View>
  );
}

function QuickBtn({ label, onPress, a11y, danger }: { label: string; onPress: () => void; a11y: string; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={4}
      style={({ pressed }) => ({ minHeight: 40, minWidth: 44, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface, borderWidth: 1, borderColor: color.borderStrong, opacity: pressed ? 0.7 : 1 })}>
      <T v="small" c={danger ? color.dangerDark : color.brandDark} style={{ fontWeight: '700' }}>{label}</T>
    </Pressable>
  );
}

function Tile({ item: i, warn, onPress }: { item: Ingredient; warn: number; onPress: () => void }) {
  const d = i.expiryDate ? daysUntil(i.expiryDate) : null;
  const tone = d === null ? color.textMuted : d < 0 || d === 0 ? color.danger : d <= warn ? color.warnDark : color.textSub;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: '25%', alignItems: 'center', paddingVertical: space.sm, gap: 2, opacity: pressed ? 0.6 : 1 })} accessibilityLabel={`${i.name} ${d === null ? '기한 없음' : dDayLabel(i.expiryDate!)}`}>
      <ItemPic item={i} size={46} />
      <T v="tiny" numberOfLines={1} style={{ fontWeight: '600' }}>{i.name}</T>
      <T v="tiny" c={tone}>{d === null ? '—' : dDayLabel(i.expiryDate!)}</T>
    </Pressable>
  );
}

function IngredientSheet({ item: i, onClose }: { item: Ingredient; onClose: () => void }) {
  const s = useAppState();
  const [editing, setEditing] = useState(false);
  const [exact, setExact] = useState(false);
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
          <ItemPic item={i} size={52} />
          <T v="h2">{i.name}</T>
        </Row>
        {d !== null ? <Badge label={dDayLabel(i.expiryDate!)} tone={d <= 0 ? 'danger' : d <= s.notifications.expiryDaysBefore ? 'warn' : 'fresh'} /> : null}
      </Row>

      {isRough(i) && !exact ? (
        <View style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T c={color.textSub}>얼마나 남았나요?</T>
            <Pressable onPress={() => setExact(true)} hitSlop={8} accessibilityRole="button">
              <T v="tiny" c={color.textMuted}>약 {formatAmount(i.quantity, i.unit)} · 숫자로 고치기</T>
            </Pressable>
          </Row>
          <LevelPicker item={i} />
          <T v="tiny" c={color.textMuted}>저울 없이 눈대중으로 골라도 돼요. 처음 넣은 양({formatAmount(fullOf(i), i.unit)})을 기준으로 계산해요.</T>
        </View>
      ) : (
        <Row style={{ justifyContent: 'space-between' }}>
          <T c={color.textSub}>수량</T>
          <Row gap={4}>
            <Stepper value={i.quantity} step={step} onChange={(n) => (n > 0 ? actions.updateIngredient(i.id, { quantity: n }) : undefined)} />
            <T v="small">{i.unit}</T>
          </Row>
        </Row>
      )}

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

      {i.kind !== 'leftover' ? <KeepInfo name={i.name} current={i.storage} /> : null}
      {i.kind !== 'leftover' ? <MyUnit item={i} /> : null}
      {i.kind !== 'leftover' ? <StoreTools item={i} onMoved={() => setEditing(true)} /> : null}

      {i.kind === 'leftover' && (
        <Button title={`🍽️ 한 끼 먹기 (${Math.min(1, i.quantity)}인분)`} onPress={() => { actions.eatLeftover(i.id, 1, guessMealType() === 'snack' ? 'dinner' : guessMealType()); onClose(); notify('맛있게 드세요!', '식사 기록에 남겼어요.'); }} />
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
      {saved == null && auto == null ? <T v="tiny" c={color.textSub}>레시피는 ‘{cat.unit}’ 단위라서, 정해 두면 이 재료도 추천·차감에 정확히 쓰여요.</T> : null}
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

/**
 * E3 냉동실로 옮기기 · E2 나눠 담기(소분).
 * 냉동하면 보관 기간이 늘어나지만 얼마나 늘지는 제품마다 달라서, 앱이 정하지 않고 바로 날짜 칸을 열어 준다.
 */
function StoreTools({ item: i, onMoved }: { item: Ingredient; onMoved: () => void }) {
  const [splitOpen, setSplitOpen] = useState(false);
  const [parts, setParts] = useState(i.unit === 'g' && i.quantity >= 400 ? Math.min(5, Math.round(i.quantity / 200)) : 2);
  const [freeze, setFreeze] = useState(i.storage !== 'freezer');
  const d = i.expiryDate ? daysUntil(i.expiryDate) : null;
  const canFreeze = i.storage === 'fridge' && ['육류', '해산물', '곡류', '과일', '채소', '콩·두부'].includes(i.category);
  const each = Math.round((i.quantity / parts) * 100) / 100;
  return (
    <View style={{ gap: 6 }}>
      <Row gap={6} wrap>
        {canFreeze ? (
          <Chip
            label={d !== null && d <= 2 ? '❄️ 냉동실로 옮기기(곧 기한)' : '❄️ 냉동실로 옮기기'}
            tone={d !== null && d <= 2 ? 'warn' : undefined}
            onPress={() => {
              actions.moveStorage(i.id, 'freezer');
              onMoved();
              notify('냉동실로 옮겼어요', '냉동하면 보관 기간이 늘어나요. 포장지나 보관 안내를 보고 새 기한을 정해 주세요.');
            }}
          />
        ) : null}
        {i.storage === 'freezer' ? <Chip label="🧊 냉장실로 꺼내기(해동)" onPress={() => { actions.moveStorage(i.id, 'fridge'); onMoved(); }} /> : null}
        {i.quantity >= 2 || (['g', 'ml'].includes(i.unit) && i.quantity >= 100) ? (
          <Chip label="✂️ 나눠 담기" selected={splitOpen} onPress={() => setSplitOpen(!splitOpen)} />
        ) : null}
      </Row>
      {splitOpen && (
        <View style={{ backgroundColor: color.surfaceAlt, borderRadius: radius.md, padding: space.sm, gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="small">몇 개로 나눌까요?</T>
            <Stepper value={parts} min={2} onChange={(n) => setParts(Math.min(10, Math.max(2, n)))} />
          </Row>
          <T v="tiny" c={color.textSub}>한 묶음에 약 {each}{i.unit}씩 {parts}개가 돼요.</T>
          {i.storage !== 'freezer' ? <Chip label="첫 묶음만 남기고 나머지는 냉동" selected={freeze} onPress={() => setFreeze(!freeze)} /> : null}
          <Button small title="나누기" onPress={() => { actions.splitIngredient(i.id, parts, freeze && i.storage !== 'freezer'); setSplitOpen(false); notify(`${parts}개로 나눴어요`, freeze && i.storage !== 'freezer' ? '냉동한 묶음의 기한은 냉장고 화면에서 정할 수 있어요.' : ''); }} />
        </View>
      )}
    </View>
  );
}
