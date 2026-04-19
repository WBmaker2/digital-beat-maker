# Digital Beat Maker

초등 3~6학년 음악 수업에서 박자, 반복, 리듬 패턴을 직접 눌러 보며 익히는 정적 웹앱입니다. 16칸 시퀀서에 킥, 스네어, 하이햇, 박수를 배치하고 Web Audio API로 바로 들어볼 수 있습니다.

## 주요 기능

- 4개 악기 x 16스텝 리듬 패턴 만들기
- 재생/정지, 전체 지우기, BPM 조절
- 브라우저 `localStorage` 기반 내 비트 슬롯 저장
- URL 공유 코드와 QR 코드 생성
- 공유받은 친구 비트와 내 비트 슬롯 분리
- 키보드 방향키로 시퀀서 셀 이동

## 로컬 실행

정적 파일만으로 구성되어 있지만, 공유/클립보드/브라우저 보안 정책을 안정적으로 확인하려면 로컬 서버로 여는 것을 권장합니다.

```bash
python3 -m http.server 4173
```

브라우저에서 `http://127.0.0.1:4173/`을 여시면 됩니다.

## 권장 브라우저

- 최신 Chrome
- 최신 Edge
- 최신 Safari

오디오는 브라우저 정책상 사용자가 버튼이나 셀을 누른 뒤 시작됩니다. 오래된 iOS WebView나 구형 Safari에서는 일부 오디오 기능이 제한될 수 있습니다.

## 저장과 공유 방식

- 내 비트 슬롯은 현재 브라우저의 `localStorage`에 저장됩니다.
- 브라우저 저장 공간이 막혀 있거나 가득 차면 저장되지 않을 수 있습니다.
- 공유 링크는 패턴, 템포, 이름을 `?beat=` 쿼리 안에 압축해 담습니다.
- 친구 비트는 내 슬롯을 바로 덮어쓰지 않고, 원하면 새 슬롯으로 저장할 수 있습니다.

## 테스트

처음 한 번 의존성을 설치합니다.

```bash
npm install
```

문법 검사:

```bash
npm run test:syntax
```

브라우저 동작 회귀 테스트:

```bash
npm run test:behavior
```

## 배포

이 프로젝트는 빌드 단계가 없습니다. `index.html`, `styles.css`, `app.js`, `qr-code.js`와 필요한 문서 파일을 GitHub Pages, Netlify, Vercel, Cloudflare Pages 같은 정적 호스팅에 올리면 됩니다.

## 개발 메모

현재 폴더가 Git 저장소가 아닌 상태에서 GitHub 원격 파일을 동기화한 작업본일 수 있습니다. 이후 지속적으로 개발하려면 `https://github.com/WBmaker2/digital-beat-maker`를 정식 clone한 폴더를 기준으로 작업하는 것을 권장합니다.
