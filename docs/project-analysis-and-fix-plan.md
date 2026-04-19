# 프로젝트 분석 및 수정안

작성일: 2026-04-19

## 요약

`digital-beat-maker`는 초등 3~6학년 음악 수업에서 리듬, 박자, 반복 구조를 클릭으로 체험하도록 만든 정적 웹앱입니다. 빌드 도구 없이 `index.html`, `styles.css`, `app.js`, `qr-code.js`만으로 실행되며, Web Audio API로 킥, 스네어, 하이햇, 박수 소리를 합성합니다.

초기 분석 시점에는 로컬 실행 코드와 GitHub 원격 저장소 `WBmaker2/digital-beat-maker`의 실행 코드가 동일했습니다. 다만 로컬 폴더는 Git 저장소가 아니었고, 원격에만 있던 문서와 에이전트 산출물이 빠져 있었습니다. 이번 확인에서 원격 파일을 현재 폴더로 보강한 뒤, 아래 권장 작업을 로컬에 추가 반영했습니다.

## GitHub 비교 결과

- 원격 저장소: `https://github.com/WBmaker2/digital-beat-maker`
- 기본 브랜치: `main`
- 최신 커밋: `2e4d1e928b2daae20b58ff0619ade816ef80b799`
- 커밋 메시지: `Add fullstack harness demo run artifacts`
- 커밋 시각: 2026-03-29 12:05:56 KST
- 로컬과 원격의 공통 실행 파일: `.gitignore`, `README.md`, `app.js`, `index.html`, `qr-code.js`, `styles.css`
- 공통 실행 파일 내용: 동일
- 원격 전용 파일: `.agents/`, `_workspace/`, `agents/`, `docs/`의 문서 및 작업 산출물
- 최신화 조치: 원격 전용 문서와 산출물을 현재 폴더에 복사했고, 초기 최신화 직후에는 원격 복제본과 `diff -qr` 기준 차이가 없음을 확인했습니다.

참고: 현재 폴더에는 여전히 `.git` 디렉터리가 없습니다. 이후 `git pull` 기반으로 관리하려면 새 위치에 원격 저장소를 정식 clone 하거나, 현재 폴더를 Git 저장소로 재구성하는 절차가 필요합니다.

## 구조 분석

- `index.html`: 앱 골격, 학습 문구, 16-step 시퀀서 영역, 저장/공유 UI, QR 캔버스를 정의합니다.
- `styles.css`: 밝은 교육용 UI, 카드형 레이아웃, 반응형 배치, 시퀀서 그리드 표시를 담당합니다.
- `app.js`: 전체 앱 상태, 패턴 편집, 슬롯 저장, 공유 링크 인코딩/디코딩, QR 렌더링 호출, Web Audio 재생을 담당합니다.
- `qr-code.js`: Project Nayuki QR 생성 코드를 포함하며, `LocalQrCode.renderToCanvas()`로 공유 링크 QR을 그립니다.

## 주요 데이터 흐름

1. 앱 시작 시 `loadLibrary()`가 `localStorage`의 `digital-beat-maker:slots-library`를 읽고, 없으면 기본 슬롯을 만듭니다.
2. 사용자가 셀, 이름, 템포를 바꾸면 `persistCurrentBeat()`가 현재 비트를 슬롯 또는 공유 미리보기로 저장합니다.
3. 공유 링크 생성 시 `encodeBeat()`가 패턴을 압축하고 `?beat=` 쿼리로 붙입니다.
4. 공유 링크로 접속하면 `getSharedBeatFromUrl()`과 `decodeBeat()`가 패턴을 복원해 공유 모드로 엽니다.
5. 재생은 `scheduleNextStep()`가 BPM 기준으로 다음 스텝을 예약하고, 각 악기별 합성 함수가 Web Audio 노드를 생성합니다.

## 발견한 문제와 수정안

### P1. 공유 모드 편집 내용 복원 정책이 애매합니다

`sharedPreview`는 저장되지만, 앱 시작 시 공유 모드로 다시 들어가는 조건은 URL에 `beat` 값이 있을 때뿐입니다. 사용자가 친구 비트를 수정한 뒤 새로고침하거나 다시 열면, 기대와 달리 최근 공유 편집본이 바로 복원되지 않을 수 있습니다.

수정안:
- 공유 모드 드래프트를 명확히 정의합니다.
- URL `beat`가 있으면 URL 값을 우선하고, 없더라도 `sharedPreview`가 있으면 “최근 친구 비트 이어서 보기” 안내를 제공하거나 별도 복원 버튼을 둡니다.
- 공유 비트를 내 슬롯으로 저장한 뒤에는 `sharedPreview`를 정리해 혼란을 줄입니다.

### P2. 저장 실패가 성공처럼 보일 수 있습니다

`saveJsonToStorage()`는 실패 시 메시지만 표시하고 `false`를 반환하지만, 상위 흐름 일부는 이 실패를 강하게 처리하지 않습니다. 저장소가 막힌 브라우저, 사생활 보호 모드, 용량 초과 환경에서는 저장되지 않았는데도 사용자가 저장된 것으로 오해할 수 있습니다.

수정안:
- `saveLibrary()`의 반환값을 `persistCurrentBeat()`에서 확인합니다.
- 저장 실패 시 “저장했습니다”류 피드백을 표시하지 않습니다.
- 공유 링크 복사 또는 JSON 내보내기 같은 수동 백업 경로를 제공합니다.

### P2. 구형 Safari/iOS WebView 오디오 호환성이 약합니다

`ensureAudioContext()`가 `window.AudioContext`만 사용합니다. 오래된 WebKit 계열 환경에서는 `webkitAudioContext` 폴백이 필요할 수 있습니다.

수정안:
- `const AudioContextCtor = window.AudioContext || window.webkitAudioContext;` 형태로 폴백을 추가합니다.
- 둘 다 없으면 재생 버튼 근처에 지원되지 않는 브라우저 안내를 표시합니다.

### P2. 그리드 접근성 구현이 불완전합니다

마크업은 `role="grid"`를 사용하지만 실제 화살표 키 이동, roving tabindex, 행/열 의미 보강은 없습니다. 현재 상태에서는 키보드 사용자가 64개 버튼을 순차 탭해야 합니다.

수정안:
- 단순 버튼 묶음으로 의미를 낮추거나, 진짜 그리드 패턴에 맞춰 키보드 내비게이션을 구현합니다.
- 각 셀에 현재 악기/스텝/켜짐 상태를 더 명확히 읽어주는 ARIA 라벨을 제공합니다.

### P2. 모바일에서 시퀀서 조작 밀도가 높습니다

시퀀서가 `min-width: 860px` 기반이라 작은 화면에서 가로 스크롤에 의존합니다. 수업 중 태블릿에서는 괜찮을 수 있지만, 휴대폰에서는 라벨과 셀을 함께 보기 어렵습니다.

수정안:
- 모바일 전용으로 8-step씩 두 줄로 나누는 모드를 검토합니다.
- 또는 악기 라벨 열을 sticky 처리해 가로 스크롤 중에도 행 맥락을 유지합니다.
- 셀 크기, 간격, 폰트 크기를 모바일 전용으로 조정합니다.

### P3. README가 부족합니다

현재 `README.md`는 제목만 있어 실행 방법, 브라우저 요구사항, 공유/저장 제약, 배포 방법이 드러나지 않습니다.

수정안:
- 로컬 실행 방법: 정적 서버 사용 권장.
- 권장 브라우저: 최신 Chrome, Edge, Safari.
- Web Audio는 사용자 클릭 이후 재생됨을 안내.
- localStorage 저장과 URL 공유 방식의 한계를 설명.
- GitHub Pages 또는 정적 호스팅 배포 절차를 추가합니다.

## 권장 작업 순서

1. README 보강으로 현재 사용/배포 방법을 먼저 명확히 합니다.
2. 저장 실패 처리와 AudioContext 폴백을 적용해 실제 수업 환경의 실패 가능성을 줄입니다.
3. 공유 모드 드래프트 정책을 정리합니다.
4. 키보드 접근성과 모바일 시퀀서 UX를 다음 개선 배포로 묶어 처리합니다.
5. 현재 폴더를 앞으로 계속 개발할 계획이라면 Git 저장소로 재구성하거나, 원격 저장소를 새 위치에 clone해 작업 기준을 정합니다.

## 2026-04-19 실행 결과

- README에 실행 방법, 권장 브라우저, 저장/공유 제약, 테스트, 배포 안내를 추가했습니다.
- 저장 실패 시 성공 메시지가 덮어쓰지 않도록 `saveLibrary()`와 `persistCurrentBeat()` 흐름을 보강했습니다.
- `AudioContext`가 없는 WebKit 계열 브라우저를 위해 `webkitAudioContext` 폴백과 미지원 안내를 추가했습니다.
- 최근 친구 비트를 다시 열 수 있는 `최근 친구 비트 이어서 보기` 버튼을 추가하고, 새 슬롯 저장 성공 시 공유 드래프트를 정리하도록 했습니다.
- 시퀀서 셀에 방향키 이동, roving tabindex, 켜짐/꺼짐 ARIA 라벨을 추가했습니다.
- 모바일 가로 스크롤 중에도 악기 라벨이 보이도록 sticky 라벨과 모바일 셀 크기 조정을 추가했습니다.
- Playwright 기반 회귀 테스트와 `npm` 스크립트를 추가했습니다.

참고: 현재 폴더를 `.git` 저장소로 강제 재구성하지는 않았습니다. 숨은 Git 메타데이터를 새로 만드는 작업은 이후 커밋/푸시 방식과 연결되므로, 정식 저장소 기준 작업이 필요하면 별도 clone 또는 Git 초기화 중 하나를 선택해 진행하는 것이 안전합니다.

## 검증 기록

- `node --check app.js`: 통과
- `node --check qr-code.js`: 통과
- `npm run test:syntax`: 통과
- `npm run test:behavior`: 5개 통과
- GitHub 원격 복제본과 현재 폴더 `diff -qr --exclude='.git'`: 초기 최신화 직후 차이 없음. 이후 권장 수정 작업으로 `README.md`, `.gitignore`, `index.html`, `styles.css`, `app.js`, 테스트 설정 파일이 변경됨
- 로컬 정적 서버: `http://127.0.0.1:4173/`
- Playwright CLI 스크린샷: 데스크톱/모바일 장치 프리셋에서 페이지 렌더링 확인
