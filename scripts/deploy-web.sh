#!/bin/sh
# 웹 버전을 GitHub Pages(gh-pages 브랜치)에 배포한다: npm run deploy:web
# - .env를 읽지 않아(EXPO_NO_DOTENV) API 키가 공개 웹 파일에 들어가지 않는다(사진 AI 인식만 꺼짐)
# - 주소: https://ysyny1126-bot.github.io/hankee-on/
set -e
cd "$(dirname "$0")/.."
rm -rf dist-web
EXPO_NO_DOTENV=1 WEB_BASE_URL=/hankee-on npx expo export --platform web --output-dir dist-web
if grep -rqE 'AIza[0-9A-Za-z_-]{30,}' dist-web; then echo "API 키가 빌드에 섞였어요. 배포를 멈춥니다." >&2; exit 1; fi
touch dist-web/.nojekyll            # _expo 폴더를 숨기지 않게
cp dist-web/index.html dist-web/404.html   # 화면 주소로 바로 들어와도 열리게
AN="$(git log -1 --format=%an)"; AE="$(git log -1 --format=%ae)"; R="$(git remote get-url origin)"
T="$(mktemp -d)"; cp -R dist-web/. "$T/"
cd "$T" && git init -q -b gh-pages && git add -A && git -c user.name="$AN" -c user.email="$AE" commit -qm "웹 배포" && git push -q -f "$R" gh-pages
rm -rf "$T"
echo "배포 완료: https://ysyny1126-bot.github.io/hankee-on/ (반영까지 1~2분)"
