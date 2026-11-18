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
