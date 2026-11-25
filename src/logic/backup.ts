import { Platform, Share } from 'react-native';

import type { AppState } from '@/data/types';
import { toDateKey } from './dates';

/**
 * C5 백업: 이 기기에 저장된 모든 기록을 글자(JSON) 한 덩어리로 내보내고, 다시 불러온다.
 * 새 프로그램 설치 없이 동작하도록 웹은 파일 내려받기·열기, 휴대폰은 공유하기·붙여넣기를 쓴다.
 * AI 키 같은 비밀값은 앱 상태에 없으므로 백업에도 들어가지 않는다.
 */
const MAGIC = 'hankeeon-backup';

export function backupText(s: AppState): string {
  return JSON.stringify({ app: MAGIC, version: 1, exportedAt: new Date().toISOString(), state: s });
}

export function backupSummary(s: Pick<AppState, 'ingredients' | 'meals' | 'cooks' | 'goals' | 'mealPlan'>) {
  return `재료 ${s.ingredients.length} · 식사 ${s.meals.length} · 요리 ${s.cooks.length} · 식단 ${s.mealPlan.length} · 목표 ${s.goals.length}`;
}

/** 백업 글을 읽어 앱 상태로. 형식이 틀리면 이유를 담아 오류를 던진다 */
export function parseBackup(text: string): AppState {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    throw new Error('백업 내용을 읽지 못했어요. 내보낸 글 전체를 그대로 붙여 넣어 주세요.');
  }
  const r = raw as { app?: string; state?: AppState };
  const st = r?.app === MAGIC ? r.state : (raw as AppState);
  if (!st || typeof st !== 'object' || !Array.isArray(st.ingredients) || !Array.isArray(st.meals) || !st.preferences)
    throw new Error('오잘먹 백업 형식이 아니에요.');
  return st;
}

/** 내보내기: 웹은 파일로 내려받기, 휴대폰은 공유 창(메모·메일·드라이브 등에 저장) */
export async function exportBackup(s: AppState): Promise<'file' | 'share'> {
  const text = backupText(s);
  const name = `hankeeon-backup-${toDateKey()}.json`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'file';
  }
  await Share.share({ title: name, message: text });
  return 'share';
}

/** 웹에서 백업 파일 고르기. 취소하면 null */
export function pickBackupFileWeb(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json,.txt';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      f.text().then(resolve, () => resolve(null));
    };
    input.click();
  });
}
