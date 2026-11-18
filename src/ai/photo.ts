import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { ImageInput } from './gemini';

export interface PickedPhoto extends ImageInput {
  uri: string;
}

/** 카메라 촬영 또는 앨범 선택. 사진은 AI 분석을 위해 가볍게 줄여(quality 0.5) base64로 받는다. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickedPhoto | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 0.5, allowsEditing: false };
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera' && Platform.OS !== 'web') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('카메라 권한이 필요해요. 설정에서 허용해 주세요.');
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  let base64 = a.base64 ?? '';
  // 웹에서는 base64 대신 data URI로 오는 경우가 있다
  if (!base64 && a.uri.startsWith('data:')) base64 = a.uri.split(',')[1] ?? '';
  return { uri: a.uri, base64, mimeType: a.mimeType ?? 'image/jpeg' };
}

/**
 * 화면 사이에 사진을 넘기는 임시 보관함(저장하지 않음, 앱을 끄면 사라짐).
 * 예: 온보딩에서 찍은 냉장고 사진 → 재료 인식 화면에서 바로 분석
 */
let pending: PickedPhoto | null = null;
export function setPendingPhoto(p: PickedPhoto | null) {
  pending = p;
}
export function takePendingPhoto(): PickedPhoto | null {
  const p = pending;
  pending = null;
  return p;
}

/** 사진 크기(KB) — 업로드 시간을 가늠하는 데 쓴다 */
export function photoKB(p: Pick<PickedPhoto, 'base64'>): number {
  return Math.round((p.base64.length * 3) / 4 / 1024);
}

/**
 * 홈 냉장고 그림으로 쓸 사진 주소.
 * 휴대폰은 파일 주소를 그대로 쓰고, 웹은 새로고침해도 남도록 data 주소로 바꾼다.
 * 웹 저장 공간(약 5MB)을 넘지 않게 너무 큰 사진은 저장하지 않는다(null).
 */
export const MAX_WEB_PHOTO_KB = 900;
export function storableUri(p: PickedPhoto): string | null {
  if (Platform.OS !== 'web') return p.uri;
  if (p.uri.startsWith('data:')) return photoKB(p) <= MAX_WEB_PHOTO_KB ? p.uri : null;
  if (!p.base64 || photoKB(p) > MAX_WEB_PHOTO_KB) return null;
  return `data:${p.mimeType};base64,${p.base64}`;
}
