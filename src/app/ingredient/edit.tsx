import { router, Stack as RStack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { readExpiryFromPackage, hasAIKey } from '@/ai/gemini';
import { pickPhoto } from '@/ai/photo';
import { confirmAsync, notify } from '@/components/dialog';
import { Button, Card, Chip, Field, Row, Screen, Segmented, Stack, Stepper, T } from '@/components/ui';
import { color, space } from '@/constants/tokens';
import { findCatalog, INGREDIENT_CATALOG, keepInfo } from '@/data/catalog';
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
  const [ocrLoading, setOcrLoading] = useState(false);

  const aiOn = hasAIKey() && s.consents.externalAI;
  const suggestions = name.trim() && !existing ? INGREDIENT_CATALOG.filter((c) => c.name.includes(name.trim()) && c.name !== name.trim()).slice(0, 5) : [];

  const applyCatalog = (n: string) => {
    setName(n);
    const c = findCatalog(n);
    if (c && !existing) {
      setUnit(c.unit);
      setStorage(c.storage);
      setLocation(c.storage === 'pantry' ? 'outside' : 'fridge');
    }
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
      } else notify('날짜를 또렷하게 읽지 못했어요', '직접 입력해 주세요. 한끼온은 소비기한을 추측하지 않아요.');
      if (!name && r.productName) applyCatalog(r.productName);
    } catch (e) {
      notify('포장지 읽기 실패', (e as Error).message);
    } finally {
      setOcrLoading(false);
    }
  };

  const save = () => {
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
    router.back();
  };

  const today = toDateKey();
  return (
    <Screen edges={['bottom']} footer={<Button title={existing ? '저장' : '냉장고에 등록'} onPress={save} />}>
      <RStack.Screen options={{ title: existing ? '식재료 수정' : '식재료 등록' }} />
      <Field label="재료 이름" placeholder="예: 두부" value={name} onChangeText={setName} onBlur={() => applyCatalog(name.trim())} />
      {suggestions.length > 0 && (
        <Row wrap>{suggestions.map((c) => <Chip key={c.name} label={`${c.emoji} ${c.name}`} onPress={() => applyCatalog(c.name)} />)}</Row>
      )}

      <Row style={{ justifyContent: 'space-between' }}>
        <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>수량</T>
        <Row>
          <Stepper value={quantity} onChange={setQuantity} step={unit === 'g' || unit === 'ml' ? 50 : 1} />
          <Field value={unit} onChangeText={setUnit} style={{ width: 64 }} />
        </Row>
      </Row>

      <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>보관 방법</T>
      <Segmented options={[{ key: 'fridge', label: '냉장' }, { key: 'freezer', label: '냉동' }, { key: 'pantry', label: '실온' }]} value={storage} onChange={setStorage} />
      <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>보관 위치</T>
      <Segmented options={[{ key: 'fridge', label: '냉장고 안' }, { key: 'outside', label: '냉장고 밖(찬장 등)' }]} value={location} onChange={setLocation} />

      <Card>
        <T v="bodyBold">소비기한</T>
        <T v="small" c={color.textSub}>포장지에 적힌 날짜나 직접 확인한 날짜만 저장해요. 한끼온이 날짜를 추측하지 않아요.</T>
        {keepInfo(name) ? <T v="tiny" c={color.textSub}>📦 보관 참고: {keepInfo(name)} (일반적인 대략치 · 제품에 적힌 기한이 우선)</T> : null}
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
          <Button title="다 먹음 (재고에서 빼기)" kind="secondary" onPress={() => { actions.useUpIngredient(existing.id); router.back(); }} />
          <Button
            title="버림 (폐기 기록)"
            kind="danger"
            onPress={async () => {
              if (await confirmAsync(`${existing.name} 폐기`, '폐기로 기록하면 이번 달 낭비 통계에 반영돼요.', '폐기 기록')) {
                actions.discardIngredient(existing.id, existing.expiryDate && existing.expiryDate < today ? 'expired' : 'spoiled');
                router.back();
              }
            }}
          />
        </Stack>
      )}
    </Screen>
  );
}
