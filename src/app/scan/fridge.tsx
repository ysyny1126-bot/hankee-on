import { Image } from 'expo-image';
import { router } from 'expo-router';
import { goBack } from '@/logic/nav';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { analyzeFridgePhoto, hasAIKey, type FridgeScanResult } from '@/ai/gemini';
import { photoKB, pickPhoto, storableUri, takePendingPhoto, type PickedPhoto } from '@/ai/photo';
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
  const [picked, setPicked] = useState<PickedPhoto | null>(null);
  const [stat, setStat] = useState<{ kb: number; sec: number; found: number } | null>(null);


  const run = async (src: 'camera' | 'library') => {
    setError('');
    try {
      const p = await pickPhoto(src);
      if (!p) return;
      await analyze(p);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  async function analyze(p: PickedPhoto) {
    setError('');
    setPhoto(p.uri);
    setPicked(p);
    if (!aiOn) return;
    const t0 = Date.now();
    try {
      setLoading(true);
      const { items, quality } = await analyzeFridgePhoto(p);
      setStat({ kb: photoKB(p), sec: Math.round((Date.now() - t0) / 100) / 10, found: items.length });
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
      const tip = QUALITY_TIP[quality];
      if (!items.length) setError(tip ?? '사진에서 식재료를 찾지 못했어요. 한 칸씩 가까이 다시 찍거나 아래에서 직접 추가해 주세요.');
      else if (tip) setError(`일부만 찾았을 수 있어요. ${tip}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }


  // 온보딩에서 찍어 온 사진이 있으면 바로 분석
  useEffect(() => {
    const p = takePendingPhoto();
    if (p) analyze(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = (key: string) => setList((l) => l.filter((c) => c.key !== key));
  const useAsHome = () => {
    if (!picked) return;
    const uri = storableUri(picked);
    if (!uri) return notify('사진이 커서 저장하지 못했어요', '웹에서는 1MB 이하 사진만 홈 그림으로 쓸 수 있어요.');
    actions.updatePreferences({ fridgePhotoUri: uri, showFridgePhoto: true });
    notify('홈 냉장고를 이 사진으로 바꿨어요', '이 기기에만 저장돼요. 설정에서 언제든 기본 그림으로 되돌릴 수 있어요.');
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
    goBack('/fridge');
  };

  const checkedCount = list.filter((c) => c.checked).length;

  return (
    <Screen edges={['bottom']} footer={list.length ? <Button title={`선택한 ${checkedCount}개 등록`} onPress={save} disabled={!checkedCount} /> : undefined}>
      {!aiOn && (
        <Card tone="info">
          <T v="bodyBold">{hasAIKey() ? '사진 인식이 꺼져 있어요' : '사진 인식은 준비 중이에요'}</T>
          <T v="small" c={color.textSub}>
            {hasAIKey() ? '사진은 동의 없이 밖으로 보내지 않아요. 설정의 ‘사진을 AI로 분석하기’를 켜면 쓸 수 있어요.' : '아래 재료를 누르면 바로 냉장고에 넣을 수 있어요. 사진은 찍어 두고 보면서 고르셔도 돼요.'}
          </T>
        </Card>
      )}

      {/* 1순위: 사진으로 등록 */}
      <Card>
        {photo ? <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="cover" /> : !aiOn ? (
          <T v="small" c={color.textSub}>냉장고를 찍어 두면, 사진을 보면서 아래에서 재료를 고를 수 있어요.</T>
        ) : (
          <View style={{ paddingVertical: space.sm, gap: space.xs }}>
            <T v="h3">📷 이렇게 찍으면 잘 찾아요</T>
            <T v="small" c={color.textSub}>· 냉장고 전체 말고 <T v="small" style={{ fontWeight: '700' }}>한 칸씩</T> 가까이{'\n'}· 문을 활짝 열고 밝은 곳에서 정면으로{'\n'}· 봉지 속 재료는 꺼내거나 이름이 보이게{'\n'}· 여러 장 찍으면 결과가 계속 더해져요</T>
          </View>
        )}
        <Row gap={space.sm}>
          {/* 사진 인식을 못 쓸 때는 촬영이 주된 행동이 아니므로 보조 버튼으로 */}
          <Button title={photo ? '한 칸 더 찍기' : aiOn ? '촬영' : '사진 찍어 두기'} icon="📷" kind={aiOn ? 'primary' : 'secondary'} style={{ flex: 1 }} onPress={() => run('camera')} loading={loading} />
          <Button title="앨범" icon="🖼️" kind="secondary" style={{ flex: 1 }} onPress={() => run('library')} disabled={loading} />
        </Row>
        {loading && <T v="small" c={color.textSub} style={{ textAlign: 'center' }}>사진 속 재료를 찾고 있어요… (보통 수 초~수십 초)</T>}
        {error ? <T v="small" c={color.danger}>{error}</T> : null}
        {stat && <T v="tiny" c={color.textMuted}>사진 {stat.kb >= 1024 ? `${(stat.kb / 1024).toFixed(1)}MB` : `${stat.kb}KB`} · 분석 {stat.sec}초 · 후보 {stat.found}개 — 후보는 틀릴 수 있으니 꼭 확인해 주세요</T>}
        {photo && !aiOn && <T v="small" c={color.textSub}>사진을 보면서 아래에서 재료를 눌러 주세요.</T>}
        {picked && <Button title="이 사진을 홈 냉장고 그림으로 쓰기" kind="ghost" small onPress={useAsHome} />}
      </Card>

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
                <Pressable onPress={() => remove(c.key)} hitSlop={8} accessibilityLabel={`${c.name} 후보 삭제`}><T v="small" c={color.textMuted}>✕</T></Pressable>
              </Row>
              <Row style={{ justifyContent: 'space-between' }} wrap>
                <Row>
                  <Stepper value={c.quantity} onChange={(n) => update(c.key, { quantity: n })} />
                  <Field value={c.unit} onChangeText={(t) => update(c.key, { unit: t })} style={{ width: 56 }} />
                </Row>
                {c.confidence !== 'user' && <Badge label={c.confidence === 'high' ? 'AI 확신 높음' : c.confidence === 'medium' ? 'AI 확신 보통' : 'AI 확신 낮음 · 확인 필요'} tone={c.confidence === 'low' ? 'warn' : 'info'} />}
              </Row>
              <Segmented options={[{ key: 'fridge', label: '냉장' }, { key: 'freezer', label: '냉동' }, { key: 'pantry', label: '실온' }]} value={c.storage} onChange={(k) => update(c.key, { storage: k })} />
              <Field placeholder="소비기한 YYYY-MM-DD · 모르면 비워 두고 나중에" value={c.expiry} onChangeText={(t) => update(c.key, { expiry: t })} />
            </Card>
          ))}
        </>
      )}

      <T v="h3">{aiOn ? '직접 추가' : '재료를 눌러 바로 넣기'}</T>
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

const QUALITY_TIP: Partial<Record<FridgeScanResult['quality'], string>> = {
  blurry: '사진이 흐려요. 흔들리지 않게 다시 찍어 주세요.',
  dark: '사진이 어두워요. 밝은 곳에서 다시 찍어 주세요.',
  far: '재료가 작게 보여요. 한 칸씩 가까이 찍어 주세요.',
  not_food: '식재료가 보이지 않아요. 냉장고 칸을 찍어 주세요.',
};
