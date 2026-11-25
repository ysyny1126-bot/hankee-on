import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { notify } from '@/components/dialog';
import { lowerLevel, quantityFor, shortAmount } from '@/logic/amount';
import { Button, Row, T } from '@/components/ui';
import { ItemPic } from '@/components/pics';
import { color, radius, space } from '@/constants/tokens';
import { actions } from '@/data/store';
import type { Ingredient } from '@/data/types';
import { addDays, dDayLabel, toDateKey } from '@/logic/dates';
import { isUsable, RECHECK_DAYS, tidyList } from '@/logic/tidy';

/**
 * 냉장고 정리 카드(A2·A4).
 * 기한이 지난 재료: 다 썼어요 / 버렸어요 / 아직 괜찮아요
 * 아주 적게 남은 재료: 다 썼어요 / 남겨 두기
 * 답하기 전까지 이 재료들은 추천·식단 계산에 쓰지 않는다(화면에 안내).
 */
export function TidyCard({ stock, max = 3, wrapStyle, lastCheckAt }: { stock: Ingredient[]; max?: number; wrapStyle?: StyleProp<ViewStyle>; lastCheckAt?: string }) {
  const { expired, tiny, total } = tidyList(stock);
  // 정리할 게 없으면, 일주일에 한 번 '30초 점검'을 같은 자리에서
  if (!total) return weeklyDue(stock, lastCheckAt) ? <WeeklyCheck stock={stock} wrapStyle={wrapStyle} /> : null;
  const rows = [...expired.map((i) => ({ i, kind: 'expired' as const })), ...tiny.map((i) => ({ i, kind: 'tiny' as const }))].slice(0, max);
  return (
    <View style={[{ backgroundColor: color.warnSoft, borderRadius: radius.lg, padding: space.md, gap: space.sm }, wrapStyle]} accessibilityRole="summary">
      <T v="bodyBold">냉장고 확인 {total}개</T>
      <T v="small" c={color.textSub}>답해 주시기 전까지는 이 재료로 메뉴를 고르지 않아요.</T>
      {rows.map(({ i, kind }) => (
        <View key={i.id} style={{ backgroundColor: color.surface, borderRadius: radius.md, padding: space.sm, gap: 8 }}>
          <Row>
            <ItemPic item={i} size={30} />
            <View style={{ flex: 1 }}>
              <T v="bodyBold">{i.name} <T v="small" c={color.textSub}>{shortAmount(i)}</T></T>
              <T v="tiny" c={kind === 'expired' ? color.danger : color.textSub}>
                {kind === 'expired' ? `소비기한 ${dDayLabel(i.expiryDate!)} · 어떻게 됐나요?` : '아주 조금 남았어요 · 다 쓰셨나요?'}
              </T>
            </View>
          </Row>
          <Row gap={6} wrap>
            <Button small kind="secondary" title="다 썼어요" a11y={`${i.name} 다 썼어요`} onPress={() => actions.useUpIngredient(i.id)} />
            {kind === 'expired' ? (
              <>
                <Button small kind="danger" title="버렸어요" a11y={`${i.name} 버렸어요`} onPress={() => actions.discardIngredient(i.id, 'expired')} />
                <Button
                  small
                  kind="ghost"
                  title="아직 괜찮아요"
                  a11y={`${i.name} 아직 괜찮아요`}
                  onPress={() => {
                    actions.confirmStillGood(i.id);
                    notify('알겠어요', `상태를 직접 확인하셨으니 ${RECHECK_DAYS}일 동안은 재료로 쓸게요. 냄새·색이 변하면 바로 정리해 주세요.`);
                  }}
                />
              </>
            ) : (
              <Button small kind="ghost" title="남겨 두기" a11y={`${i.name} 남겨 두기`} onPress={() => actions.keepSmall(i.id)} />
            )}
          </Row>
        </View>
      ))}
      {total > rows.length ? <T v="tiny" c={color.textSub}>나머지 {total - rows.length}개는 냉장고 화면에서 볼 수 있어요.</T> : null}
    </View>
  );
}

const CHECK_DAYS = 7;
const checkable = (stock: Ingredient[]) =>
  stock
    .filter((i) => i.kind !== 'leftover' && i.category !== '양념' && isUsable(i))
    .sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999') || a.addedAt.localeCompare(b.addedAt));

/** 점검할 때가 됐나: 마지막 점검(없으면 가장 오래된 재료를 넣은 날)이 7일 넘게 지났고, 점검할 재료가 3개 이상 */
export function weeklyDue(stock: Ingredient[], lastCheckAt?: string) {
  const list = checkable(stock);
  if (list.length < 3) return false;
  const since = lastCheckAt ?? list.map((i) => i.addedAt.slice(0, 10)).sort()[0];
  return since <= addDays(toDateKey(), -CHECK_DAYS);
}

/** 일주일 30초 점검: 재료 5개까지 [그대로 · 줄었어요 · 다 썼어요] */
function WeeklyCheck({ stock, wrapStyle }: { stock: Ingredient[]; wrapStyle?: StyleProp<ViewStyle> }) {
  const [done, setDone] = useState<string[]>([]);
  const [ids] = useState(() => checkable(stock).slice(0, 5).map((i) => i.id));
  const rows = ids.map((id) => stock.find((i) => i.id === id)).filter((i): i is Ingredient => !!i && !done.includes(i.id));
  const answer = (id: string) => {
    const next = [...done, id];
    setDone(next);
    if (ids.every((x) => next.includes(x) || !stock.some((i) => i.id === x))) actions.updatePreferences({ lastCheckAt: toDateKey() });
  };
  if (!rows.length) return null;
  return (
    <View style={[{ backgroundColor: color.brandSoft, borderRadius: radius.lg, padding: space.md, gap: space.sm }, wrapStyle]} accessibilityRole="summary">
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="bodyBold">이번 주 냉장고 점검</T>
        <T v="tiny" c={color.textSub}>{done.length}/{ids.length}</T>
      </Row>
      <T v="small" c={color.textSub}>30초면 돼요. 맞춰 두면 추천이 정확해져요.</T>
      {rows.slice(0, 3).map((i) => {
        const low = lowerLevel(i);
        return (
          <View key={i.id} style={{ backgroundColor: color.surface, borderRadius: radius.md, padding: space.sm, gap: 8 }}>
            <Row>
              <ItemPic item={i} size={30} />
              <T v="bodyBold" style={{ flex: 1 }}>{i.name} <T v="small" c={color.textSub}>{shortAmount(i)}</T></T>
            </Row>
            <Row gap={6} wrap>
              <Button small kind="secondary" title="그대로" a11y={`${i.name} 그대로`} onPress={() => answer(i.id)} />
              <Button
                small
                kind="secondary"
                title="줄었어요"
                a11y={`${i.name} 줄었어요`}
                onPress={() => {
                  if (low) actions.updateIngredient(i.id, { quantity: quantityFor(i, low) });
                  else actions.useUpIngredient(i.id);
                  answer(i.id);
                }}
              />
              <Button small kind="ghost" title="다 썼어요" a11y={`${i.name} 다 썼어요`} onPress={() => { actions.useUpIngredient(i.id); answer(i.id); }} />
            </Row>
          </View>
        );
      })}
    </View>
  );
}
