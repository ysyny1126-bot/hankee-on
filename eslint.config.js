// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // 앱 코드가 아닌 것: 빌드 결과, Expo 자동 생성 타입, 참고용 템플릿 문서
    ignores: ['dist/*', '.expo/*', 'docs/*'],
  },
]);
