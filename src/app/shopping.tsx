import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { notify } from '@/components/dialog';
import { Sheet } from '@/components/sheet';
import { Button, Card, Chip, Empty, Field, Row, Screen, Segmented, Stepper, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { findCatalog, sameIngredient } from '@/data/catalog';
import { actions, useAppState } from '@/data/store';
import type { StorageType } from '@/data/types';
import { addDays, isValidDateKey, toDateKey } from '@/logic/dates';

/** 산 재료를 냉장고에 넣기 전에 확인하는 값(R5) */
interface BuyForm {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: string; // 원(비워도 됨)
  expiry: string; // YYYY-MM-DD(비워도 됨)
  storage: StorageType;
}

export default function Shopping() {
  const s = useAppState();
  const [name, setName] = useState('');
  const [form, setForm] = useState<BuyForm[] | null>(null);
  const todo = s.shopping.filter((x) => !x.done);
  const done = s.shopping.filter((x) => x.done);

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const inStock = s.ingredients.find((i) => sameIngredient(i.name, n));
    const added = actions.addShopping([{ name: n, amount: null, unit: findCatalog(n)?.unit ?? '개', reason: '직접 추가' }]);
    if (!added) notify('이미 목록에 있어요');
    else if (inStock) notify(`냉장고에 ${inStock.name} ${inStock.quantity}${inStock.unit} 있어요`, '중복 구매가 아닌지 확인해 보세요.');
    setName('');
  };

  /** 구매 완료한 재료 → 확인 창(수량·가격·소비기한·보관) 열기 */
  const openStock = () => {
    if (!done.length) return;
    setForm(
      done.map((x) => {
        const c = findCatalog(x.name);
        const unit = x.unit || c?.unit || '개';
        // 레시피에 모자란 양이 0.5모여도 살 때는 1모 — 개수 단위는 올림, 무게·부피는 그대로
        const raw = x.amount && x.amount > 0 ? x.amount : 1;
        const quantity = ['g', 'ml', '큰술', '작은술'].includes(unit) ? raw : Math.ceil(raw);
        return { id: x.id, name: c?.name ?? x.name, quantity, unit, price: '', expiry: '', storage: c?.storage ?? 'fridge' };
      }),
    );
  };
  const patch = (id: string, p: Partial<BuyForm>) => setForm((f) => f && f.map((x) => (x.id === id ? { ...x, ...p } : x)));

  /** 확인한 값으로 재고 등록. 소비기한은 사용자가 고르거나 적은 것만 저장(모르면 비워 둠) */
  const stockDone = () => {
    if (!form) return;
    const bad = form.find((x) => x.expiry && !isValidDateKey(x.expiry));
    if (bad) return notify(`${bad.name}의 소비기한을 확인해 주세요`, '예: 2026-11-25 · 모르면 비워 두세요');
    actions.addIngredients(
      form.map((x) => ({
        name: x.name.trim(),
        quantity: x.quantity > 0 ? x.quantity : 1,
        unit: x.unit.trim() || '개',
        storage: x.storage,
        location: x.storage === 'pantry' ? 'outside' : 'fridge',
        expiryDate: x.expiry || null,
        expirySource: x.expiry ? 'user' : null,
        price: x.price ? Number(x.price.replace(/[^0-9]/g, '')) || undefined : undefined,
        source: 'user',
      })),
    );
    form.forEach((x) => actions.removeShopping(x.id));
    const noExpiry = form.filter((x) => !x.expiry).length;
    setForm(null);
    notify(`${form.length}개를 냉장고에 넣었어요`, noExpiry ? `소비기한을 비워 둔 ${noExpiry}개는 냉장고 화면에서 언제든 입력할 수 있어요.` : '');
  };

  return (
    <Screen edges={['bottom']}>
      <Row>
        <View style={{ flex: 1 }}><Field placeholder="살 것 추가 (예: 우유)" value={name} onChangeText={setName} onSubmitEditing={add} returnKeyType="done" /></View>
        <Button title="추가" small onPress={add} />
      </Row>

      {todo.length === 0 && done.length === 0 && <Empty emoji="🛒" title="장보기 목록이 비어 있어요" body="레시피나 식단에서 부족한 재료를 한 번에 담을 수 있어요." />}

      {todo.length > 0 && (
        <Card>
          <T v="h3">살 것 {todo.length}</T>
          {todo.map((x) => <ItemRow key={x.id} id={x.id} name={x.name} sub={`${x.amount ? `${x.amount}${x.unit} · ` : ''}${x.reason}`} done={false} />)}
        </Card>
      )}

      {done.length > 0 && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="h3">산 것 {done.length}</T>
            <Pressable onPress={() => actions.clearDoneShopping()}><T v="small" c={color.textMuted}>목록에서 지우기</T></Pressable>
          </Row>
          {done.map((x) => <ItemRow key={x.id} id={x.id} name={x.name} sub={x.reason} done />)}
          <Button title="산 재료 냉장고에 넣기" kind="fresh" onPress={openStock} />
        </Card>
      )}
      <T v="tiny" c={color.textMuted}>쇼핑몰 연동은 출시 이후 단계에서 추가할 예정이에요.</T>

      <Sheet visible={!!form} onClose={() => setForm(null)}>
        <T v="h3">냉장고에 넣기 전에 확인해요</T>
        <T v="small" c={color.textSub}>가격을 적으면 식비에, 소비기한을 적으면 '먼저 쓸 재료' 알림에 들어가요. 모르면 비워 둬도 돼요.</T>
        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: space.md }} keyboardShouldPersistTaps="handled">
          {form?.map((x) => (
            <View key={x.id} style={{ gap: space.sm, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: color.border }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="bodyBold">{findCatalog(x.name)?.emoji ?? '🛍️'} {x.name}</T>
                <Row gap={4}>
                  <Stepper value={x.quantity} onChange={(n) => patch(x.id, { quantity: n })} step={x.unit === 'g' || x.unit === 'ml' ? 50 : 1} />
                  <Field value={x.unit} onChangeText={(t) => patch(x.id, { unit: t })} style={{ width: 52 }} accessibilityLabel={`${x.name} 단위`} />
                </Row>
              </Row>
              <Row>
                <Field placeholder="가격(원)" keyboardType="number-pad" value={x.price} onChangeText={(t) => patch(x.id, { price: t.replace(/[^0-9]/g, '') })} accessibilityLabel={`${x.name} 가격`} />
                <Field placeholder="소비기한 YYYY-MM-DD" value={x.expiry} onChangeText={(t) => patch(x.id, { expiry: t })} accessibilityLabel={`${x.name} 소비기한`} />
              </Row>
              <Row wrap>
                {[3, 7, 14].map((n) => {
                  const d = addDays(toDateKey(), n);
                  return <Chip key={n} label={`${n}일 뒤`} selected={x.expiry === d} onPress={() => patch(x.id, { expiry: x.expiry === d ? '' : d })} />;
                })}
                <Chip label="모름" selected={!x.expiry} onPress={() => patch(x.id, { expiry: '' })} />
              </Row>
              <Segmented options={[{ key: 'fridge', label: '냉장' }, { key: 'freezer', label: '냉동' }, { key: 'pantry', label: '실온' }]} value={x.storage} onChange={(k) => patch(x.id, { storage: k })} />
            </View>
          ))}
        </ScrollView>
        <T v="tiny" c={color.textMuted}>날짜 칩은 포장지를 보고 직접 고르는 빠른 입력이에요. 앱이 기한을 정하지 않아요.</T>
        <Button title={`${form?.length ?? 0}개 냉장고에 넣기`} onPress={stockDone} />
      </Sheet>
    </Screen>
  );
}

function ItemRow({ id, name, sub, done }: { id: string; name: string; sub: string; done: boolean }) {
  return (
    <Row style={{ paddingVertical: 6 }}>
      <Pressable onPress={() => actions.toggleShopping(id)} hitSlop={8} style={{ width: 26, height: 26, borderRadius: radius.sm, borderWidth: 2, borderColor: done ? color.fresh : color.border, backgroundColor: done ? color.fresh : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {done ? <T v="small" c="#fff">✓</T> : null}
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="bodyBold" c={done ? color.textMuted : color.text} style={done ? { textDecorationLine: 'line-through' } : undefined}>{findCatalog(name)?.emoji ?? '🛍️'} {name}</T>
        <T v="tiny" c={color.textMuted}>{sub}</T>
      </View>
      <Pressable onPress={() => actions.removeShopping(id)} hitSlop={8} style={{ padding: space.xs }}><T v="small" c={color.textMuted}>✕</T></Pressable>
    </Row>
  );
}
