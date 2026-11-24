import { View } from 'react-native';

import { notify } from '@/components/dialog';
import { Button, Row, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { actions, useAppState } from '@/data/store';
import type { AppState } from '@/data/types';
import { exportBackup } from '@/logic/backup';
import { addDays, toDateKey } from '@/logic/dates';

const DAYS = 30;

/**
 * 백업 안심 안내: 재료가 10개 이상 쌓였는데 30일 넘게(또는 한 번도) 백업하지 않았을 때만 한 번.
 * 닫으면 30일 동안 다시 보이지 않는다.
 */
export function backupDue(s: AppState): boolean {
  const p = s.preferences;
  const since = addDays(toDateKey(), -DAYS);
  return s.ingredients.length >= 10 && (!p.lastBackupAt || p.lastBackupAt <= since) && (!p.backupNudgeAt || p.backupNudgeAt <= since);
}

export function BackupNudge() {
  const s = useAppState();
  if (!backupDue(s)) return null;
  return (
    <View style={{ backgroundColor: color.surfaceAlt, borderRadius: radius.lg, padding: space.md, gap: space.sm, marginTop: space.md }}>
      <T v="small">💾 기록이 쌓였어요. 휴대폰을 바꿔도 남도록 백업해 둘까요?</T>
      <Row gap={space.sm}>
        <Button
          small
          kind="secondary"
          title="백업하기"
          onPress={() =>
            exportBackup(s)
              .then(() => actions.updatePreferences({ lastBackupAt: toDateKey() }))
              .catch((e) => notify('내보내지 못했어요', (e as Error).message))
          }
        />
        <Button small kind="ghost" title="나중에" onPress={() => actions.updatePreferences({ backupNudgeAt: toDateKey() })} />
      </Row>
    </View>
  );
}
