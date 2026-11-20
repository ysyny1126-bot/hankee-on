import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { notify } from '@/components/dialog';
import { Button, Row, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { actions } from '@/data/store';
import type { Ingredient } from '@/data/types';
import { dDayLabel } from '@/logic/dates';
import { RECHECK_DAYS, tidyList } from '@/logic/tidy';

/**
 * 냉장고 정리 카드(A2·A4).
 * 기한이 지난 재료: 다 썼어요 / 버렸어요 / 아직 괜찮아요
 * 아주 적게 남은 재료: 다 썼어요 / 남겨 두기
 * 답하기 전까지 이 재료들은 추천·식단 계산에 쓰지 않는다(화면에 안내).
 */
export function TidyCard({ stock, max = 3, wrapStyle }: { stock: Ingredient[]; max?: number; wrapStyle?: StyleProp<ViewStyle> }) {
  const { expired, tiny, total } = tidyList(stock);
  if (!total) return null;
  const rows = [...expired.map((i) => ({ i, kind: 'expired' as const })), ...tiny.map((i) => ({ i, kind: 'tiny' as const }))].slice(0, max);
  return (
    <View style={[{ backgroundColor: color.warnSoft, borderRadius: radius.lg, padding: space.md, gap: space.sm }, wrapStyle]} accessibilityRole="summary">
      <T v="bodyBold">냉장고 확인 {total}개</T>
      <T v="small" c={color.textSub}>답해 주시기 전까지는 이 재료로 메뉴를 고르지 않아요.</T>
      {rows.map(({ i, kind }) => (
        <View key={i.id} style={{ backgroundColor: color.surface, borderRadius: radius.md, padding: space.sm, gap: 8 }}>
          <Row>
            <Text style={{ fontSize: 22 }}>{i.emoji}</Text>
            <View style={{ flex: 1 }}>
              <T v="bodyBold">{i.name} <T v="small" c={color.textSub}>{i.quantity}{i.unit}</T></T>
              <T v="tiny" c={kind === 'expired' ? color.danger : color.textSub}>
                {kind === 'expired' ? `소비기한 ${dDayLabel(i.expiryDate!)} · 어떻게 됐나요?` : '아주 조금 남았어요 · 다 쓰셨나요?'}
              </T>
            </View>
          </Row>
          <Row gap={6} wrap>
            <Button small kind="secondary" title="다 썼어요" onPress={() => actions.useUpIngredient(i.id)} />
            {kind === 'expired' ? (
              <>
                <Button small kind="danger" title="버렸어요" onPress={() => actions.discardIngredient(i.id, 'expired')} />
                <Button
                  small
                  kind="ghost"
                  title="아직 괜찮아요"
                  onPress={() => {
                    actions.confirmStillGood(i.id);
                    notify('알겠어요', `상태를 직접 확인하셨으니 ${RECHECK_DAYS}일 동안은 재료로 쓸게요. 냄새·색이 변하면 바로 정리해 주세요.`);
                  }}
                />
              </>
            ) : (
              <Button small kind="ghost" title="남겨 두기" onPress={() => actions.keepSmall(i.id)} />
            )}
          </Row>
        </View>
      ))}
      {total > rows.length ? <T v="tiny" c={color.textSub}>나머지 {total - rows.length}개는 냉장고 화면에서 볼 수 있어요.</T> : null}
    </View>
  );
}
