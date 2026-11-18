import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { analyzeFridgePhoto, hasAIKey } from '@/ai/gemini';
import { pickPhoto } from '@/ai/photo';
import { notify } from '@/components/dialog';
import { Badge, Button, Card, Chip, Field, Row, Screen, Segmented, Stepper, T , OnOff } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { findCatalog, INGREDIENT_CATALOG } from '@/data/catalog';
import { actions, useAppState, type NewIngredient } from '@/data/store';
import type { StorageType } from '@/data/types';

interface Candidate {
  key: string;
  name: string;
  quantity: number;
  unit: string;
  storage: StorageType;
  confidence: 'high' | 'medium' | 'low' | 'user';
  checked: boolean;
  expiry: string;
}

/**
 * 냉장고 사진 → AI 인식 → 사용자 확인·수정 → 재고 등록.
 * AI가 찾은 재료는 '후보'일 뿐이고, 사용자가 체크한 것만 재고가 된다(기획 원칙).
 */
export default function ScanFridge() {
  const s = useAppState();
  const aiOn = hasAIKey() && s.consents.externalAI;
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Candidate[]>([]);
  const [error, setError] = useState('');

  const run = async (src: 'camera' | 'library') => {
    setError('');
    try {
      const p = await pickPhoto(src);
      if (!p) return;
      setPhoto(p.uri);
      setLoading(true);
      const items = await analyzeFridgePhoto(p);
      setList((prev) => [
        ...prev,
        ...items.map((it, i) => {
          const c = findCatalog(it.name);
          return {
            key: `${Date.now()}_${i}`,
            name: c?.name ?? it.name,
            quantity: it.quantity || 1,
            unit: it.unit || c?.unit || '개',
            storage: it.storage ?? c?.storage ?? 'fridge',
            confidence: it.confidence ?? 'medium',
            checked: it.confidence !== 'low',
            expiry: '',
          };
        }),
      ]);
      if (!items.length) setError('사진에서 식재료를 찾지 못했어요. 더 밝게 찍거나 직접 추가해 주세요.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, patch: Partial<Candidate>) => setList((l) => l.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const addManual = (name: string) => {
    const c = findCatalog(name);
    setList((l) => [...l, { key: `m_${Date.now()}_${name}`, name, quantity: 1, unit: c?.unit ?? '개', storage: c?.storage ?? 'fridge', confidence: 'user', checked: true, expiry: '' }]);
  };

  const save = () => {
    const chosen = list.filter((c) => c.checked && c.name.trim());
    if (!chosen.length) return notify('등록할 재료를 선택해 주세요');
    const bad = chosen.find((c) => c.expiry && !/^\d{4}-\d{2}-\d{2}$/.test(c.expiry));
    if (bad) return notify(`${bad.name}의 소비기한 형식을 확인해 주세요`, '예: 2026-11-25');
    const items: NewIngredient[] = chosen.map((c) => ({
      name: c.name.trim(),
      quantity: c.quantity,
      unit: c.unit,
      storage: c.storage,
      location: c.storage === 'pantry' ? 'outside' : 'fridge',
      expiryDate: c.expiry || null,
      expirySource: c.expiry ? 'user' : null,
      source: c.confidence === 'user' ? 'user' : 'ai_estimated',
    }));
    actions.addIngredients(items);
    notify(`${items.length}개 재료를 등록했어요`, items.some((i) => !i.expiryDate) ? '소비기한은 냉장고 화면에서 재료를 눌러 언제든 추가할 수 있어요.' : '');
    router.back();
  };

  const checkedCount = list.filter((c) => c.checked).length;

  return (
    <Screen edges={['bottom']} footer={list.length ? <Button title={`선택한 ${checkedCount}개 등록`} onPress={save} disabled={!checkedCount} /> : undefined}>
      {!aiOn && (
        <Card tone="warn">
          <T v="bodyBold">AI 사진 분석이 꺼져 있어요</T>
          <T v="small" c={color.textSub}>
            {hasAIKey() ? '설정에서 ‘사진을 AI로 분석하기’에 동의하면 사용할 수 있어요.' : 'AI 키가 아직 연결되지 않았어요(개발 중). 아래에서 자주 쓰는 재료를 눌러 빠르게 등록할 수 있어요.'}
          </T>
        </Card>
      )}

      {aiOn && (
        <Card>
          {photo ? <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="cover" /> : (
            <View style={{ alignItems: 'center', paddingVertical: space.lg, gap: space.xs }}>
              <T v="h1">🧊📷</T>
              <T v="small" c={color.textSub} style={{ textAlign: 'center' }}>냉장고 문을 열고 칸이 잘 보이게 찍어 주세요.{'\n'}여러 장을 나눠 찍어도 계속 추가돼요.</T>
            </View>
          )}
          <Row gap={space.sm}>
            <Button title="촬영" icon="📷" style={{ flex: 1 }} onPress={() => run('camera')} loading={loading} />
            <Button title="앨범" icon="🖼️" kind="secondary" style={{ flex: 1 }} onPress={() => run('library')} disabled={loading} />
          </Row>
          {loading && <T v="small" c={color.textSub} style={{ textAlign: 'center' }}>HANKEE AI가 재료를 찾고 있어요…</T>}
          {error ? <T v="small" c={color.danger}>{error}</T> : null}
        </Card>
      )}

      {list.length > 0 && (
        <>
          <T v="h3">찾은 재료 확인하기</T>
          <T v="small" c={color.textSub}>AI 결과는 틀릴 수 있어요. 이름·수량·보관을 고치고, 맞는 것만 체크해 주세요.</T>
          {list.map((c) => (
            <Card key={c.key} style={{ opacity: c.checked ? 1 : 0.55 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ flex: 1 }}>
                  <T v="h3">{findCatalog(c.name)?.emoji ?? '🥫'}</T>
                  <Field value={c.name} onChangeText={(t) => update(c.key, { name: t })} />
                </Row>
                <OnOff value={c.checked} onValueChange={(v) => update(c.key, { checked: v })} />
              </Row>
              <Row style={{ justifyContent: 'space-between' }} wrap>
                <Row>
                  <Stepper value={c.quantity} onChange={(n) => update(c.key, { quantity: n })} />
                  <Field value={c.unit} onChangeText={(t) => update(c.key, { unit: t })} style={{ width: 56 }} />
                </Row>
                {c.confidence !== 'user' && <Badge label={c.confidence === 'high' ? 'AI 확신 높음' : c.confidence === 'medium' ? 'AI 확신 보통' : 'AI 확신 낮음 · 확인 필요'} tone={c.confidence === 'low' ? 'warn' : 'info'} />}
              </Row>
              <Segmented options={[{ key: 'fridge', label: '냉장' }, { key: 'freezer', label: '냉동' }, { key: 'pantry', label: '실온' }]} value={c.storage} onChange={(k) => update(c.key, { storage: k })} />
              <Field placeholder="소비기한 YYYY-MM-DD (알면 입력)" value={c.expiry} onChangeText={(t) => update(c.key, { expiry: t })} />
            </Card>
          ))}
        </>
      )}

      <T v="h3">빠르게 추가</T>
      <Row wrap>
        {INGREDIENT_CATALOG.filter((c) => c.category !== '양념').slice(0, 30).map((c) => (
          <Chip key={c.name} label={`${c.emoji} ${c.name}`} onPress={() => addManual(c.name)} />
        ))}
      </Row>
      <Pressable onPress={() => router.replace('/ingredient/edit')}>
        <T v="small" c={color.brandDark} style={{ fontWeight: '700' }}>목록에 없는 재료 직접 입력 ›</T>
      </Pressable>
    </Screen>
  );
}
