import { Redirect } from 'expo-router';

/** ⊕ 탭은 화면이 아니라 '만들기' 시트를 여는 버튼이다. 혹시 주소로 들어오면 홈으로 보낸다. */
export default function Add() {
  return <Redirect href="/" />;
}
