import { Stack as RStack, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/logic/nav';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { readExpiryFromPackage, hasAIKey } from '@/ai/gemini';
import { pickPhoto } from '@/ai/photo';
import { confirmAsync, notify } from '@/components/dialog';
import { Button, Card, Chip, Field, Row, Screen, Segmented, Stack, Stepper, T, Intro } from '@/components/ui';
import { IngPic } from '@/components/pics';
import { color, space } from '@/constants/tokens';
import { KeepInfo } from '@/components/keep-info';
import { packSizes } from '@/logic/amount';
import { frequentAdds } from '@/logic/frequent';
import { findCatalog, findCatalogExact, INGREDIENT_CATALOG } from '@/data/catalog';
import { actions, useAppState } from '@/data/store';
import type { IngredientLocation, StorageType } from '@/data/types';
import { addDays, isValidDateKey, toDateKey } from '@/logic/dates';

/** 식재료 직접 등록·수정. 소비기한은 사용자가 입력하거나 포장지에서 읽은 값만 저장한다. */
export default function IngredientEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const s = useAppState();
  const existing = id ? s.ingredients.find((i) => i.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1);
  const [unit, setUnit] = useState(existing?.unit ?? '개');
  const [storage, setStorage] = useState<StorageType>(existing?.storage ?? 'fridge');
  const [location, setLocation] = useState<IngredientLocation>(existing?.location ?? 'fridge');
  const [expiry, setExpiry] = useState(existing?.expiryDate ?? '');
  const [expirySource, setExpirySource] = useState<'user' | 'package' | null>(existing?.expirySource ?? null);
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : '');
  const [ocrText, setOcrText] = useState('');
  const [added, setAdded] = useState<string[]>([]); // '하나 더'로 방금 등록한 재료
  const [ocrLoading, setOcrLoading] = useState(false);

  const aiOn = hasAIKey() && s.consents.externalAI;
  const frequent = useMemo(() => (existing ? [] : frequentAdds(s)), [s, existing]);
  const suggestions = name.trim() && !existing ? INGREDIENT_CATALOG.filter((c) => c.name.includes(name.trim()) && c.name !== name.trim()).slice(0, 5) : [];

  // 사용자가 직접 바꾼 칸은 사전 값으로 덮어쓰지 않는다
  const [touched, setTouched] = useState({ unit: false, storage: false, quantity: false });
  const applyCatalog = (n: string, setTyped = true) => {
    if (setTyped) setName(n);
    const c = findCatalog(n);
    if (c && !existing) {
      if (!touched.unit) setUnit(c.unit);
      if (!touched.storage) {
        setStorage(c.storage);
        setLocation(c.storage === 'pantry' ? 'outside' : 'fridge');
      }
      // g·ml 재료를 '1g'로 넣는 실수를 막기 위한 시작값(언제든 고칠 수 있음)
      if (!touched.quantity) setQuantity(['g', 'ml'].includes(c.unit) ? 100 : 1);
    }
  };
  /** 이름을 칠 때마다: 사전에 정확히 있는 이름이면 단위·보관을 바로 맞춘다(칸을 벗어나지 않고 등록해도 맞게) */
  const onName = (t: string) => {
    setName(t);
    if (findCatalogExact(t.trim())) applyCatalog(t.trim(), false);
  };

  const scanPackage = async () => {
    try {
      const p = await pickPhoto('camera');
      if (!p) return;
      setOcrLoading(true);
      const r = await readExpiryFromPackage(p);
      setOcrText(r.text || '(날짜 문구를 찾지 못했어요)');
      if (r.date && isValidDateKey(r.date)) {
        setExpiry(r.date);
        setExpirySource('package');
      } else notify('날짜를 또렷하게 읽지 못했어요', '직접 입력해 주세요. 오잘먹은 소비기한을 추측하지 않아요.');
      if (!name && r.productName) applyCatalog(r.productName);
    } catch (e) {
      notify('포장지 읽기 실패', (e as Error).message);
    } finally {
      setOcrLoading(false);
    }
  };

  const save = (more = false) => {
    if (!name.trim()) return notify('재료 이름을 입력해 주세요');
    if (expiry && !isValidDateKey(expiry)) return notify('소비기한 형식을 확인해 주세요', '예: 2026-11-25');
    const data = {
      name: name.trim(),
      quantity,
      unit,
      storage,
      location,
      expiryDate: expiry || null,
      expirySource: expiry ? (expirySource ?? 'user') : null,
      price: price ? Number(price.replace(/[^0-9]/g, '')) : undefined,
    };
    if (existing) actions.updateIngredient(existing.id, { ...data, emoji: findCatalog(data.name)?.emoji ?? existing.emoji });
    else actions.addIngredients([{ ...data, source: 'user' }]);
    if (more && !existing) {
      // 등록하고 하나 더: 화면을 비우고 이름 칸부터 다시
      setAdded((l) => [...l, data.name]);
      setName('');
      setQuantity(1);
      setUnit('개');
      setTouched({ unit: false, storage: false, quantity: false });
      setExpiry('');
      setExpirySource(null);
      setPrice('');
      return;
    }
    goBack('/fridge');
  };

  const today = toDateKey();
  return (
    <Screen edges={['bottom']} footer={
      existing ? <Button title="저장" onPress={() => save()} /> : (
        <Row gap={space.sm}>
          <Button title="하나 더" kind="secondary" style={{ flex: 1 }} onPress={() => save(true)} />
          <Button title="냉장고에 등록" style={{ flex: 2 }} onPress={() => save()} />
        </Row>
      )
    }>
      <RStack.Screen options={{ title: existing ? '식재료 수정' : '식재료 등록' }} />
      {added.length > 0 && <T v="small" c={color.brandDark}>✓ 방금 등록: {added.join(', ')}</T>}
      {!existing && <Intro>이름만 적어도 등록돼요. 나머지는 나중에 고칠 수 있어요.</Intro>}
      {!existing && frequent.length > 0 && (
        <View style={{ gap: 4 }}>
          <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>자주 넣는 재료</T>
          <Row wrap gap={4}>
            {frequent.map((f) => (
              <Chip
                key={f.name}
                left={<IngPic name={f.name} emoji={f.emoji} size={22} />}
                label={f.name}
                selected={name === f.name}
                onPress={() => {
                  setName(f.name);
                  setQuantity(f.quantity);
                  setUnit(f.unit);
                  setStorage(f.storage);
                  setLocation(f.storage === 'pantry' ? 'outside' : 'fridge');
                  setTouched({ unit: true, storage: true, quantity: true });
                }}
              />
            ))}
          </Row>
          <T v="tiny" c={color.textMuted}>누르면 지난번 양으로 채워져요. 확인하고 등록해요.</T>
        </View>
      )}

      <Field label="재료 이름" placeholder="예: 두부" value={name} onChangeText={onName} onBlur={() => applyCatalog(name.trim())} />
      {suggestions.length > 0 && (
        <Row wrap>{suggestions.map((c) => <Chip key={c.name} left={<IngPic name={c.name} emoji={c.emoji} size={22} />} label={c.name} onPress={() => applyCatalog(c.name)} />)}</Row>
      )}

      <Row style={{ justifyContent: 'space-between' }}>
        <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>수량</T>
        <Row>
          <Stepper value={quantity} onChange={(n) => { setQuantity(n); setTouched((t) => ({ ...t, quantity: true })); }} step={unit === 'g' || unit === 'ml' ? 50 : 1} />
          <Field value={unit} onChangeText={(u) => { setUnit(u); setTouched((t) => ({ ...t, unit: true })); }} style={{ width: 64 }} accessibilityLabel="단위" />
        </Row>
      </Row>

      {packSizes(name, unit).length > 0 && (
        <View style={{ gap: 4 }}>
          <T v="tiny" c={color.textMuted}>저울이 없어도 괜찮아요. 포장지에 적힌 양이나 흔한 크기를 눌러요.</T>
          <Row wrap gap={4}>
            {packSizes(name, unit).map((n) => (
              <Chip key={n} label={n >= 1000 ? `${n / 1000}${unit === 'ml' ? 'L' : 'kg'}` : `${n}${unit}`} selected={quantity === n} onPress={() => { setQuantity(n); setTouched((t) => ({ ...t, quantity: true })); }} />
            ))}
          </Row>
        </View>
      )}

      <KeepInfo name={name} current={storage} />
      <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>보관 방법</T>
      <Segmented options={[{ key: 'fridge', label: '냉장' }, { key: 'freezer', label: '냉동' }, { key: 'pantry', label: '실온' }]} value={storage} onChange={(k) => { setStorage(k); setTouched((t) => ({ ...t, storage: true })); }} />
      <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>보관 위치</T>
      <Segmented options={[{ key: 'fridge', label: '냉장고 안' }, { key: 'outside', label: '냉장고 밖(찬장 등)' }]} value={location} onChange={setLocation} />

      <Card>
        <T v="bodyBold">소비기한</T>
        <T v="small" c={color.textSub}>포장지에 적힌 날짜나 직접 확인한 날짜만 저장해요. 오잘먹이 날짜를 추측하지 않아요.</T>
        <Field placeholder="YYYY-MM-DD" value={expiry} onChangeText={(t) => { setExpiry(t); setExpirySource('user'); }} />
        <Row wrap>
          {[0, 1, 3, 7].map((n) => (
            <Chip key={n} label={n === 0 ? '오늘' : `+${n}일`} onPress={() => { setExpiry(addDays(today, n)); setExpirySource('user'); }} />
          ))}
          {expiry ? <Chip label="지우기" onPress={() => { setExpiry(''); setExpirySource(null); }} /> : null}
        </Row>
        <Button title={aiOn ? '포장지 찍어서 날짜 읽기' : '포장지 읽기 (AI 연결 필요)'} icon="🔎" kind="secondary" small onPress={scanPackage} disabled={!aiOn} loading={ocrLoading} />
        {ocrText ? <T v="tiny" c={color.textMuted}>읽은 문구: {ocrText} {expirySource === 'package' ? '→ 날짜를 확인해 주세요' : ''}</T> : null}
      </Card>

      <Field label="구매 가격 (선택, 원)" placeholder="예: 2500" keyboardType="number-pad" value={price} onChangeText={setPrice} hint="식비·낭비 금액 계산에 써요" />

      {existing && (
        <Stack gap={space.sm}>
          <Button title="다 먹음 (재고에서 빼기)" kind="secondary" onPress={() => { actions.useUpIngredient(existing.id); goBack('/fridge'); }} />
          <Button
            title="버림 (폐기 기록)"
            kind="danger"
            onPress={async () => {
              if (await confirmAsync(`${existing.name} 폐기`, '폐기로 기록하면 이번 달 낭비 통계에 반영돼요.', '폐기 기록')) {
                actions.discardIngredient(existing.id, existing.expiryDate && existing.expiryDate < today ? 'expired' : 'spoiled');
                goBack('/fridge');
              }
            }}
          />
        </Stack>
      )}
    </Screen>
  );
}
