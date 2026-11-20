import { Platform, Share, View } from 'react-native';

import { notify } from '@/components/dialog';
import { Button, Row, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { useAppState } from '@/data/store';
import { weekRecap } from '@/logic/analysis';

/** E14 주간 회고 카드: 실제 기록만 모아 한눈에, 글로 공유(이미지 저장은 별도 설치가 필요해 보류) */
export function WeekRecap({ start, end }: { start: string; end: string }) {
  const s = useAppState();
  const r = weekRecap(s, start, end);
  if (!r.hasData) return null;
  const title = `${s.preferences.nickname || '나'}의 한 주 (${start.slice(5).replace('-', '/')}~${end.slice(5).replace('-', '/')})`;
  const share = async () => {
    const text = `${title}\n${r.lines.join('\n')}\n— 한끼온`;
    try {
      if (Platform.OS !== 'web') await Share.share({ message: text });
      else if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        notify('복사했어요', '메신저에 붙여 넣어 공유할 수 있어요.');
      }
    } catch {
      /* 공유 창을 닫은 경우 */
    }
  };
  return (
    <View style={{ backgroundColor: color.scene, borderRadius: radius.lg, padding: space.lg, gap: space.sm }}>
      <T v="h3">📒 {title}</T>
      {r.lines.map((l) => <T key={l} v="small">{l}</T>)}
      <Row style={{ justifyContent: 'flex-end' }}>
        <Button small kind="secondary" title="공유하기" onPress={share} />
      </Row>
    </View>
  );
}
