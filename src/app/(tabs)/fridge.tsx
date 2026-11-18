import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { confirmAsync } from '@/components/dialog';
import { Badge, Button, Card, Chip, Emoji, Empty, ListItem, Row, Screen, Segmented, Stack, T } from '@/components/ui';
import { color, space } from '@/constants/tokens';
import { actions, useAppState } from '@/data/store';
import type { Ingredient, StorageType } from '@/data/types';
import { wasteStats } from '@/logic/analysis';
import { dDayLabel, daysUntil } from '@/logic/dates';

const STORAGE_LABEL: Record<StorageType, string> = { fridge: '냉장', freezer: '냉동', pantry: '실온' };

export default function Fridge() {
  const s = useAppState();
  const [tab, setTab] = useState<'all' | StorageType>('all');
  const [sort, setSort] = useState<'expiry' | 'recent'>('expiry');

  const list = useMemo(() => {
    const l = s.ingredients.filter((i) => tab === 'all' || i.storage === tab);
    return l.sort((a, b) =>
      sort === 'recent'
        ? b.addedAt.localeCompare(a.addedAt)
        : (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'),
    );
  }, [s.ingredients, tab, sort]);

  const ws = wasteStats(s);
  const noExpiry = s.ingredients.filter((i) => !i.expiryDate && i.category !== '양념').length;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
        <T v="h1">냉장고</T>
        <Button title="장보기" kind="secondary" small icon="🛒" href="/shopping" />
      </Row>

      <Row gap={space.sm}>
        <Button title="사진으로 등록" icon="📷" style={{ flex: 1 }} href="/scan/fridge" />
        <Button title="직접 등록" icon="✏️" kind="secondary" style={{ flex: 1 }} href="/ingredient/edit" />
      </Row>

      <Segmented
        options={[{ key: 'all', label: `전체 ${s.ingredients.length}` }, { key: 'fridge', label: '냉장' }, { key: 'freezer', label: '냉동' }, { key: 'pantry', label: '실온' }]}
        value={tab}
        onChange={setTab}
      />
      <Row>
        <Chip label="소비기한 순" selected={sort === 'expiry'} onPress={() => setSort('expiry')} />
        <Chip label="최근 등록 순" selected={sort === 'recent'} onPress={() => setSort('recent')} />
      </Row>

      {noExpiry > 0 && (
        <Card tone="warn">
          <T v="small">소비기한을 입력하지 않은 재료가 {noExpiry}개 있어요. 포장지를 찍거나 직접 입력하면 임박 알림을 받을 수 있어요.</T>
        </Card>
      )}

      {list.length === 0 ? (
        <Empty emoji="🧊" title="냉장고가 비어 있어요" body="냉장고 사진을 찍으면 AI가 재료를 찾아 드려요. 확인한 재료만 등록돼요." />
      ) : (
        <Card>
          {list.map((i) => <IngredientRow key={i.id} item={i} />)}
        </Card>
      )}

      <Card>
        <T v="bodyBold">이번 달 식재료 낭비</T>
        <Row style={{ justifyContent: 'space-between' }}>
          <T c={color.textSub}>버린 재료 {ws.wasteCount}개 · 약 {ws.wasteValue.toLocaleString()}원</T>
          <T c={color.textSub}>요리 {ws.cookCount}회</T>
        </Row>
        {ws.waste.slice(0, 3).map((w) => (
          <T key={w.id} v="small" c={color.textMuted}>· {w.date.slice(5)} {w.ingredientName} {w.quantity}{w.unit} ({w.reason === 'expired' ? '기한 지남' : w.reason === 'spoiled' ? '상함' : '기타'})</T>
        ))}
        <T v="tiny" c={color.textMuted}>금액은 입력한 가격 또는 평균 가격 기준의 대략치예요.</T>
      </Card>
    </Screen>
  );
}

function IngredientRow({ item: i }: { item: Ingredient }) {
  const d = i.expiryDate ? daysUntil(i.expiryDate) : null;
  return (
    <View>
      <ListItem
        href={`/ingredient/edit?id=${i.id}`}
        left={<Emoji size={22}>{i.emoji}</Emoji>}
        title={i.name}
        sub={`${i.quantity}${i.unit} · ${STORAGE_LABEL[i.storage]}${i.location === 'outside' ? ' · 냉장고 밖' : ''}`}
        right={
          <Stack gap={4} style={{ alignItems: 'flex-end' }}>
            {d === null ? <Badge label="기한 미입력" /> : <Badge label={dDayLabel(i.expiryDate!)} tone={d < 0 ? 'danger' : d <= 2 ? 'warn' : 'fresh'} />}
            {i.source === 'ai_estimated' && <Badge label="AI 인식" tone="info" />}
          </Stack>
        }
      />
      <Row style={{ justifyContent: 'flex-end', marginBottom: space.xs }} gap={space.xs}>
        <Button title="다 먹음" kind="secondary" small onPress={() => actions.useUpIngredient(i.id)} />
        <Button
          title="버림"
          kind="danger"
          small
          onPress={async () => {
            if (await confirmAsync(`${i.name} 폐기`, '폐기로 기록하면 이번 달 낭비 통계에 반영돼요.', '폐기 기록')) {
              actions.discardIngredient(i.id, d !== null && d < 0 ? 'expired' : 'spoiled');
            }
          }}
        />
      </Row>
    </View>
  );
}
