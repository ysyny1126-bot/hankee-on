// app.json을 그대로 쓰고, 웹 배포(GitHub Pages)할 때만 하위 경로(/hankee-on)를 넣는다.
// 배포: npm run deploy:web  (개발 서버·휴대폰 앱에는 영향 없음)
module.exports = ({ config }) =>
  process.env.WEB_BASE_URL
    ? { ...config, experiments: { ...config.experiments, baseUrl: process.env.WEB_BASE_URL } }
    : config;
