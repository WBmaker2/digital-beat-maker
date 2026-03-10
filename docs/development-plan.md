# Digital Beat Maker Development Plan

## Refined Prompt

```text
초등학교 3~6학년 음악 수업용 웹앱 "나만의 감성 리듬 작곡가(Digital Beat Maker)"를 만들어줘.

목표:
- 악기를 다루지 못하는 학생도 클릭만으로 자신만의 리듬을 만들 수 있어야 한다.
- 학생이 박자, 반복, 리듬 패턴의 구조를 시각적으로 이해할 수 있어야 한다.
- 수업 시간에 바로 사용할 수 있을 만큼 직관적이고 반응이 빨라야 한다.

학습 맥락:
- 대상: 초등 3~6학년 음악
- 연계 성취기준:
  - [4음02-02] 제재곡의 노랫말을 바꾸거나 노랫말에 어울리는 말붙임새를 만든다.
  - [6음01-01] 음악의 구성 요소를 이해하며 악곡을 감상한다.

핵심 기능:
- 16x4 스텝 시퀀서 그리드 구현
  - 가로축: 시간/박자(16박)
  - 세로축: 악기 종류 4개(킥, 스네어, 하이햇, 박수)
- 각 셀 버튼을 클릭하면 on/off 토글
- 재생 시 플레이헤드가 왼쪽에서 오른쪽으로 이동
- 플레이헤드가 활성화된 셀을 지나갈 때 해당 소리 재생
- 재생/정지 버튼
- 템포 조절 슬라이더(BPM)
- 전체 패턴 지우기 버튼
- 현재 박 위치를 시각적으로 강조
- 4박 단위로 구분선 또는 색상 강조를 넣어 박자 구조가 잘 보이게 하기

기술 요구:
- HTML, CSS, JavaScript만으로 구현
- Web Audio API를 사용해서 외부 음원 파일 없이 킥, 스네어, 하이햇, 박수 소리를 간단히 합성
- 모바일과 데스크톱에서 모두 usable 하게 반응형 처리
- 초등학생이 쓰기 쉬운 큰 버튼, 명확한 색상, 쉬운 한국어 UI 사용
- 접근성을 고려해 버튼 상태가 시각적으로 명확해야 함

디자인 방향:
- 교육용 앱답게 밝고 친근하지만 너무 유치하지 않게
- 격자 패턴이 한눈에 읽히도록 단순하고 명확하게
- 현재 재생 중인 칸, 활성화된 칸, 비활성 칸의 상태 차이가 분명해야 함

코드 산출물:
- index.html
- styles.css
- app.js

구현 시 추가로 반영할 것:
- 초기 기본 리듬 예시 1개를 넣어 앱을 열자마자 소리가 나게 해도 좋다
- 코드에 너무 복잡한 추상화는 피하고, 교육용 예제로 읽기 쉬운 구조로 작성
- 마지막에 핵심 동작 방식과 확장 아이디어(예: 저장, 공유, 악기 추가)를 짧게 설명해줘
```

## Development Workflow Plan

### 1. Analyze Requirements

- Primary interaction: click cells to build a rhythm, press play, listen, adjust tempo, refine pattern.
- Required scope: 16x4 sequencer grid, play and stop controls, BPM slider, clear action, four drum voices, visual playhead.
- Non-goals for v1: login, cloud save, share links, recorded export, advanced arrangement tools.

### 2. Design Architecture

- Keep the app static and framework-free for fast classroom use.
- Use three files only:
  - `index.html`
  - `styles.css`
  - `app.js`
- Core state:
  - `pattern[4][16]`
  - `isPlaying`
  - `currentStep`
  - `tempo`
- Audio model:
  - `playKick()`
  - `playSnare()`
  - `playHiHat()`
  - `playClap()`

### 3. Generate Code

- Build the layout and learning-oriented copy first.
- Render the 16x4 grid dynamically in JavaScript.
- Toggle cells on click and keep ARIA state updated.
- Add Web Audio synth voices for each percussion sound.
- Implement sequencer playback with a moving playhead and BPM-based timing.
- Seed the grid with a simple starter beat.

### 4. Run Tests

- Smoke check in a local browser.
- Verify that only active cells trigger sound.
- Verify tempo updates during playback.
- Verify play and stop transitions do not duplicate timers.
- Verify mobile-sized layout remains usable.

### 5. Review Code

- Confirm that the timing loop cannot create overlapping playback sessions.
- Confirm that visual current-step feedback matches audible playback.
- Confirm that active and inactive states are obvious for children.
- Confirm the code remains simple enough to explain during class.

### 6. Report

- Summarize delivered functionality.
- Record verification performed.
- Note residual risk: browser audio timing can differ slightly by device.
