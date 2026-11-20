import { router, type Href } from 'expo-router';

/** 뒤로 가기. 링크로 바로 들어와 이전 화면이 없으면(웹 새로고침 등) 대신 갈 화면으로 */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
