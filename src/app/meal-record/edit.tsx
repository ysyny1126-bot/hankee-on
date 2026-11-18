import { Image } from 'expo-image';
import { router, Stack as RStack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { analyzeMealPhoto, hasAIKey } from '@/ai/gemini';
import { pickPhoto } from '@/ai/photo';
import { confirmAsync, notify } from '@/components/dialog';
import { Badge, Button, Card, Chip, EstimateBadge, Field, Row, Screen, Segmented, Stepper, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { findFoodReference } from '@/data/catalog';
import { actions, useAppState } from '@/data/store';
import type { MealItem, MealSourceType, MealType } from '@/data/types';
import { guessMealType, isValidDateKey, newId, nowTime, toDateKey } from '@/logic/dates';

function itemFromName(name: string, prev?: MealItem): MealItem {
  const ref = findFoodReference(name);
  return {
    id: prev?.id ?? newId('item_'),
    foodName: name,
    quantity: prev?.quantity ?? 1,
    unit: prev?.unit ?? '인분',
    nutrition: ref?.nutrition ?? null,
    dataConfidence: ref ? 'medium' : 'none',
    nutritionSource: ref ? 'reference_estimated' : null,
    vegetableServings: ref?.vegetableServings,
    ingredients: ref?.ingredients,
  };
}

export default function MealRecordEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const s = useAppState();
  const existing = id ? s.meals.find((m) => m.id === id) : undefined;

  const [date, setDate] = useState(existing?.mealDate ?? toDateKey());
  const [mealType, setMealType] = useState<MealType>(existing?.mealType ?? guessMealType());
  const [time, setTime] = useState(existing?.mealTime ?? nowTime());
  const [source, setSource] = useState<MealSourceType>(existing?.sourceType ?? 'home');
  const [imageUri, setImageUri] = useState<string | null>(existing?.imageUri ?? null);
  const [items, setItems] = useState<MealItem[]>(existing?.items ?? []);
  const [memo, setMemo] = useState(existing?.description ?? '');
  const [newName, setNewName] = useState('');
  const [aiNote, setAiNote] = useState('');
  const [loading, setLoading] = useState(false);
  const aiOn = hasAIKey() && s.consents.externalAI;

  // 기억하는 AI: 자주 먹은 음식은 한 번에 누를 수 있게
  const frequent = useMemo(() => {
    if (!s.consents.personalization) return [];
    const c = new Map<string, number>();
    s.meals.flatMap((m) => m.items).forEach((i) => c.set(i.foodName, (c.get(i.foodName) ?? 0) + 1));
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => n);
  }, [s.meals, s.consents.personalization]);

  const addItem = (name: string) => {
    const n = name.trim();
    if (!n) return;
    setItems((l) => [...l, itemFromName(n)]);
    setNewName('');
  };
  const patch = (iid: string, p: Partial<MealItem>) => setItems((l) => l.map((i) => (i.id === iid ? { ...i, ...p } : i)));

  const photoFlow = async (src: 'camera' | 'library') => {
    try {
      const p = await pickPhoto(src);
      if (!p) return;
      setImageUri(p.uri);
      if (!aiOn) return;
      setLoading(true);
      const r = await analyzeMealPhoto(p);
      setAiNote(r.note ?? '');
      setItems((l) => [
        ...l,
        ...(r.items ?? []).filter((x) => x?.foodName).map((x) => ({
          id: newId('item_'),
          foodName: x.foodName,
          quantity: x.quantity || 1,
          unit: x.unit || '인분',
          nutrition: x.nutrition ?? null,
          dataConfidence: x.confidence ?? 'low',
          nutritionSource: 'ai_estimated' as const,
          vegetableServings: x.vegetableServings,
          ingredients: x.ingredients,
        })),
      ]);
    } catch (e) {
      notify('사진 분석 실패', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    if (!items.length && !memo.trim()) return notify('음식을 하나 이상 추가해 주세요');
    if (!isValidDateKey(date)) return notify('날짜 형식을 확인해 주세요', '예: 2026-11-18');
    if (!/^\d{1,2}:\d{2}$/.test(time)) return notify('시간 형식을 확인해 주세요', '예: 12:30');
    const data = { mealDate: date, mealType, mealTime: time.padStart(5, '0'), imageUri, description: memo, sourceType: source, items };
    if (existing) actions.updateMeal(existing.id, data);
    else actions.addMeal(data);
    router.back();
  };

  const total = items.reduce((a, i) => a + (i.nutrition?.calories ?? 0) * (i.quantity || 1), 0);

  return (
    <Screen edges={['bottom']} footer={<Button title={existing ? '수정 저장' : '기록 저장'} onPress={save} />}>
      <RStack.Screen options={{ title: existing ? '식사 기록 수정' : '식사 기록' }} />
      <Segmented options={[{ key: 'breakfast', label: '아침' }, { key: 'lunch', label: '점심' }, { key: 'dinner', label: '저녁' }, { key: 'snack', label: '간식' }]} value={mealType} onChange={setMealType} />
      <Row gap={space.sm}>
        <View style={{ flex: 3 }}><Field label="날짜" value={date} onChangeText={setDate} /></View>
        <View style={{ flex: 2 }}><Field label="시간" value={time} onChangeText={setTime} /></View>
      </Row>
      <Row wrap>
        {(['home', 'delivery', 'eat_out', 'convenience'] as MealSourceType[]).map((k) => (
          <Chip key={k} label={{ home: '🍚 집밥', delivery: '🛵 배달', eat_out: '🍽️ 외식', convenience: '🏪 편의점' }[k]} selected={source === k} onPress={() => setSource(k)} />
        ))}
      </Row>

      <Card>
        {imageUri ? <Image source={{ uri: imageUri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="cover" /> : null}
        <Row gap={space.sm}>
          <Button title={imageUri ? '다시 찍기' : '사진 찍기'} icon="📸" style={{ flex: 1 }} onPress={() => photoFlow('camera')} loading={loading} />
          <Button title="앨범" icon="🖼️" kind="secondary" style={{ flex: 1 }} onPress={() => photoFlow('library')} disabled={loading} />
        </Row>
        <T v="tiny" c={color.textMuted}>
          {aiOn ? 'AI가 음식과 영양을 추정해요. 결과는 아래에서 고칠 수 있어요.' : 'AI가 연결되지 않아 사진만 저장돼요. 음식 이름을 입력하면 참고 영양값을 찾아 드려요.'}
        </T>
        {aiNote ? <T v="tiny" c={color.textSub}>AI 메모: {aiNote}</T> : null}
      </Card>

      <T v="h3">먹은 음식</T>
      <Row>
        <View style={{ flex: 1 }}><Field placeholder="음식 이름 (예: 김치찌개)" value={newName} onChangeText={setNewName} onSubmitEditing={() => addItem(newName)} returnKeyType="done" /></View>
        <Button title="추가" small onPress={() => addItem(newName)} />
      </Row>
      {frequent.length > 0 && (
        <Row wrap>
          <T v="tiny" c={color.textMuted}>자주 먹은 음식</T>
          {frequent.map((f) => <Chip key={f} label={f} onPress={() => addItem(f)} />)}
        </Row>
      )}

      {items.map((it) => (
        <Card key={it.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}><Field value={it.foodName} onChangeText={(t) => patch(it.id, { foodName: t })} onBlur={() => it.nutritionSource !== 'ai_estimated' && patch(it.id, itemFromName(it.foodName, it))} /></View>
            <Pressable onPress={() => setItems((l) => l.filter((x) => x.id !== it.id))}><T c={color.danger} v="small" style={{ fontWeight: '700' }}>삭제</T></Pressable>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={4}><Stepper value={it.quantity} onChange={(n) => patch(it.id, { quantity: n })} step={0.5} /><Field value={it.unit} onChangeText={(t) => patch(it.id, { unit: t })} style={{ width: 60 }} /></Row>
            <EstimateBadge source={it.nutritionSource} />
          </Row>
          {it.nutrition ? (
            <T v="small" c={color.textSub}>
              약 {Math.round(it.nutrition.calories * it.quantity)}kcal · 단백질 {Math.round(it.nutrition.protein * it.quantity)}g · 탄수 {Math.round(it.nutrition.carbohydrates * it.quantity)}g · 지방 {Math.round(it.nutrition.fat * it.quantity)}g · 나트륨 {Math.round(it.nutrition.sodium * it.quantity)}mg
            </T>
          ) : (
            <T v="small" c={color.textMuted}>참고 영양값을 찾지 못했어요. 식사 횟수·다양성 분석에는 반영돼요.</T>
          )}
          {it.dataConfidence === 'low' && <Badge label="정확도 낮음 · 분석 시 참고만" tone="warn" />}
        </Card>
      ))}
      {total > 0 && <T v="small" c={color.textSub}>이 식사 합계 약 {Math.round(total)}kcal (추정)</T>}

      <Field label="메모 (선택)" placeholder="예: 친구랑 먹음, 국물은 반만" value={memo} onChangeText={setMemo} multiline />

      {existing && (
        <Button
          title="이 기록 삭제"
          kind="danger"
          onPress={async () => {
            if (await confirmAsync('식사 기록 삭제', '삭제하면 되돌릴 수 없어요.', '삭제')) {
              actions.deleteMeal(existing.id);
              router.back();
            }
          }}
        />
      )}
    </Screen>
  );
}
