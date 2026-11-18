import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { notify } from '@/components/dialog';
import { Button, Card, Empty, Field, Row, Screen, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { findCatalog, sameIngredient } from '@/data/catalog';
import { actions, useAppState } from '@/data/store';

export default function Shopping() {
  const s = useAppState();
  const [name, setName] = useState('');
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

  /** 구매 완료한 재료를 재고로 등록 */
  const stockDone = () => {
    if (!done.length) return;
    actions.addIngredients(
      done.map((x) => {
        const c = findCatalog(x.name);
        return {
          name: c?.name ?? x.name,
          quantity: x.amount && x.amount > 0 ? x.amount : 1,
          unit: x.unit,
          storage: c?.storage ?? 'fridge',
          location: c?.storage === 'pantry' ? 'outside' : 'fridge',
          expiryDate: null,
          expirySource: null,
          source: 'user',
        };
      }),
    );
    done.forEach((x) => actions.removeShopping(x.id));
    notify(`${done.length}개를 냉장고에 넣었어요`, '냉장고 화면에서 소비기한을 입력하면 임박 알림을 받을 수 있어요.');
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
          <Button title="산 재료 냉장고에 넣기" icon="🧊" kind="fresh" onPress={stockDone} />
        </Card>
      )}
      <T v="tiny" c={color.textMuted}>쇼핑몰 연동은 출시 이후 단계에서 추가할 예정이에요.</T>
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
