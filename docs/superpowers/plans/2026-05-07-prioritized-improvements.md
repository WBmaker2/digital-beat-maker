# Digital Beat Maker Prioritized Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve classroom reliability by stabilizing playback timing, adding one-step recovery for accidental clearing, widening regression coverage for save/share flows, and documenting a repeatable release gate.

**Architecture:** Keep the app as a no-build static site. Extract the audio scheduling surface first because it has the highest behavioral risk and the clearest boundary, then add focused UI recovery and tests around existing DOM contracts. Preserve existing `?beat=` sharing compatibility and do not modify the bundled QR library.

**Tech Stack:** Plain HTML/CSS/JavaScript, Web Audio API, browser `localStorage`, bundled Nayuki QR generator, Playwright, GitHub Pages static hosting.

---

## Current Context

- Workspace: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker`
- Live app URL: `https://wbmaker2.github.io/digital-beat-maker/`
- GitHub repo: `https://github.com/WBmaker2/digital-beat-maker`
- Current verification commands:
  - `npm run test:syntax`
  - `npm run test:behavior`
- Current high-risk file:
  - `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/app.js` is 1000+ lines and owns state, storage, sharing, audio, rendering, and event binding.
- Do not edit:
  - `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/qr-code.js` is a bundled third-party QR generator.

## File Structure

- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/index.html`
  - Add `audio-engine.js` before `app.js`.
  - Add an undo button for accidental `전체 지우기`.
  - Add a compact playback progress label.
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/styles.css`
  - Style undo/progress states.
  - Add stronger focus and non-color active cues for grid cells.
  - Add mobile scroll affordance without changing the grid contract.
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/app.js`
  - Remove direct scheduler ownership after audio extraction.
  - Wire one-step clear undo.
  - Update progress feedback and clear stale undo snapshots after meaningful edits.
- Create: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/audio-engine.js`
  - Own Web Audio initialization, sound synthesis, look-ahead step scheduling, one-shot audition playback, and scheduler cleanup.
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/tests/app-behavior.spec.js`
  - Add tests for share round-trip, slot lifecycle, stale share invalidation, clear undo, playback progression, clipboard fallback, and QR fallback.
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/README.md`
  - Update status, deployment URL, browser/storage constraints, and release checks.
- Create: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/docs/release-checklist.md`
  - Document repeatable pre-push and post-deploy checks.

---

### Task 1: Add Regression Coverage for Existing Save and Share Contracts

**Files:**
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/tests/app-behavior.spec.js`

- [ ] **Step 1: Add shared test helpers near the top of the spec**

Add this after line 1:

```js
async function toggleStep(page, row, step) {
  await page.locator(`.step-button[data-row="${row}"][data-step="${step}"]`).click();
}

async function expectStepState(page, row, step, pressed) {
  await expect(page.locator(`.step-button[data-row="${row}"][data-step="${step}"]`)).toHaveAttribute(
    "aria-pressed",
    String(pressed),
  );
}
```

- [ ] **Step 2: Add a share round-trip test**

Append this test to the file:

```js
test("share link round-trip preserves pattern, tempo, and name", async ({ page }) => {
  await page.goto("/");
  await page.locator("#pattern-name").fill("둥근 리듬 테스트");
  await page.locator("#tempo-slider").fill("142");
  await toggleStep(page, 0, 1);
  await toggleStep(page, 1, 4);
  await toggleStep(page, 2, 7);
  await toggleStep(page, 3, 15);

  await page.locator("#generate-share-link").click();
  const shareUrl = await page.locator("#share-url").inputValue();

  await page.goto(shareUrl);

  await expect(page.locator("#mode-badge")).toHaveText("친구 비트");
  await expect(page.locator("#pattern-name")).toHaveValue("둥근 리듬 테스트");
  await expect(page.locator("#tempo-value")).toHaveText("142 BPM");
  await expectStepState(page, 0, 1, true);
  await expectStepState(page, 1, 4, true);
  await expectStepState(page, 2, 7, true);
  await expectStepState(page, 3, 15, true);
});
```

- [ ] **Step 3: Add stale share invalidation coverage**

Append this test:

```js
test("editing a saved slot invalidates stale share artifacts until regenerated", async ({ page }) => {
  await page.goto("/");
  await page.locator("#generate-share-link").click();
  const firstShareUrl = await page.locator("#share-url").inputValue();
  await expect(page.locator("#share-qr")).toBeVisible();

  await toggleStep(page, 0, 2);

  await expect(page.locator("#share-url")).toHaveValue("");
  await expect(page.locator("#share-qr")).toBeHidden();
  await expect(page.locator("#qr-placeholder")).toBeVisible();

  await page.locator("#generate-share-link").click();
  const secondShareUrl = await page.locator("#share-url").inputValue();

  expect(secondShareUrl).not.toBe(firstShareUrl);
  await expect(page.locator("#share-qr")).toBeVisible();
});
```

- [ ] **Step 4: Add slot lifecycle coverage**

Append this test:

```js
test("slot lifecycle keeps user data isolated", async ({ page }) => {
  await page.goto("/");
  await page.locator("#pattern-name").fill("첫 슬롯");
  await toggleStep(page, 0, 0);

  await page.locator("#new-slot").click();
  await expect(page.locator("#pattern-name")).toHaveValue(/리듬 \d+/);
  await page.locator("#pattern-name").fill("둘째 슬롯");
  await toggleStep(page, 2, 5);

  await page.locator("#slot-select").selectOption({ label: /첫 슬롯/ });
  await expect(page.locator("#pattern-name")).toHaveValue("첫 슬롯");
  await expectStepState(page, 0, 0, true);
  await expectStepState(page, 2, 5, false);

  await page.locator("#slot-select").selectOption({ label: /둘째 슬롯/ });
  await expect(page.locator("#pattern-name")).toHaveValue("둘째 슬롯");
  await expectStepState(page, 0, 0, false);
  await expectStepState(page, 2, 5, true);
});
```

- [ ] **Step 5: Run the existing and new behavior tests**

Run:

```bash
npm run test:behavior
```

Expected: PASS. These tests protect current intended behavior and should pass before implementation work continues.

- [ ] **Step 6: Commit**

```bash
git add tests/app-behavior.spec.js
git commit -m "test: cover save and share lifecycle"
```

---

### Task 2: Extract Audio Engine and Add Look-Ahead Playback Scheduling

**Files:**
- Create: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/audio-engine.js`
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/index.html`
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/app.js`
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/tests/app-behavior.spec.js`

- [ ] **Step 1: Add a playback progression regression test**

Append this test to `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/tests/app-behavior.spec.js`:

```js
test("playback advances the visual step and clears it when stopped", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeAudioParam {
      setValueAtTime() {}
      exponentialRampToValueAtTime() {}
    }

    class FakeNode {
      constructor() {
        this.frequency = new FakeAudioParam();
        this.gain = new FakeAudioParam();
        this.Q = { value: 0 };
      }
      connect() {}
      start() {}
      stop() {}
    }

    class FakeAudioContext {
      constructor() {
        this.startedAt = Date.now();
        this.destination = {};
        this.sampleRate = 44100;
        this.state = "running";
      }
      get currentTime() {
        return (Date.now() - this.startedAt) / 1000;
      }
      resume() {
        return Promise.resolve();
      }
      createOscillator() {
        return new FakeNode();
      }
      createGain() {
        return new FakeNode();
      }
      createBiquadFilter() {
        return new FakeNode();
      }
      createBufferSource() {
        return new FakeNode();
      }
      createBuffer(channelCount, length) {
        return {
          getChannelData() {
            return new Float32Array(length);
          },
        };
      }
    }

    window.AudioContext = FakeAudioContext;
  });

  await page.goto("/");
  await page.locator("#play-toggle").click();
  await expect(page.locator(".step-button.is-current")).toHaveCount(1);

  const firstStep = await page.locator(".step-button.is-current").first().getAttribute("data-step");
  await page.waitForTimeout(260);
  const laterStep = await page.locator(".step-button.is-current").first().getAttribute("data-step");

  expect(laterStep).not.toBe(firstStep);

  await page.locator("#play-toggle").click();
  await expect(page.locator("#play-toggle")).toHaveText("재생");
  await expect(page.locator(".step-button.is-current")).toHaveCount(0);
});
```

- [ ] **Step 2: Run the new playback test against current code**

Run:

```bash
npm run test:behavior
```

Expected: PASS or FAIL only if current timing is too unstable. If it fails before implementation, keep the test because the implementation below is meant to stabilize this path.

- [ ] **Step 3: Create `audio-engine.js`**

Create `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/audio-engine.js` with this structure:

```js
(function () {
  const schedulerLookaheadMs = 25;
  const schedulerAheadTime = 0.12;
  const firstStepDelaySeconds = 0.04;

  function createAudioEngine(options) {
    const {
      instruments,
      totalSteps,
      getPattern,
      getTempo,
      setCurrentStep,
      renderPlaybackStep,
      clearPlaybackStep,
      setFeedback,
    } = options;

    let audioContext = null;
    let schedulerId = null;
    let scheduledStep = 0;
    let nextStepTime = 0;
    const visualTimerIds = new Set();

    function ensureAudioContext() {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) {
        setFeedback("이 브라우저는 오디오 재생을 지원하지 않아요. 최신 Chrome, Edge, Safari에서 다시 열어 주세요.");
        return Promise.reject(new Error("Web Audio API is not supported."));
      }

      if (!audioContext) {
        audioContext = new AudioContextConstructor();
      }

      if (audioContext.state === "suspended") {
        return audioContext.resume();
      }

      return Promise.resolve();
    }

    async function prepare() {
      try {
        await ensureAudioContext();
        return true;
      } catch (error) {
        return false;
      }
    }

    function createNoiseBuffer() {
      const bufferSize = audioContext.sampleRate * 0.25;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const channel = buffer.getChannelData(0);

      for (let index = 0; index < bufferSize; index += 1) {
        channel[index] = Math.random() * 2 - 1;
      }

      return buffer;
    }

    function playKick(time) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(140, time);
      oscillator.frequency.exponentialRampToValueAtTime(45, time + 0.18);
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.2);
    }

    function playSnare(time) {
      const noise = audioContext.createBufferSource();
      const noiseFilter = audioContext.createBiquadFilter();
      const noiseGain = audioContext.createGain();
      const toneOsc = audioContext.createOscillator();
      const toneGain = audioContext.createGain();

      noise.buffer = createNoiseBuffer();
      noiseFilter.type = "highpass";
      noiseFilter.frequency.value = 1600;
      noiseGain.gain.setValueAtTime(0.7, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

      toneOsc.type = "triangle";
      toneOsc.frequency.setValueAtTime(180, time);
      toneGain.gain.setValueAtTime(0.22, time);
      toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(audioContext.destination);
      toneOsc.connect(toneGain);
      toneGain.connect(audioContext.destination);

      noise.start(time);
      noise.stop(time + 0.2);
      toneOsc.start(time);
      toneOsc.stop(time + 0.12);
    }

    function playHiHat(time) {
      const noise = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();

      noise.buffer = createNoiseBuffer();
      filter.type = "bandpass";
      filter.frequency.value = 9000;
      filter.Q.value = 1.2;
      gain.gain.setValueAtTime(0.28, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);

      noise.start(time);
      noise.stop(time + 0.06);
    }

    function playClap(time) {
      [0, 0.018, 0.036].forEach((offset) => {
        const noise = audioContext.createBufferSource();
        const filter = audioContext.createBiquadFilter();
        const gain = audioContext.createGain();

        noise.buffer = createNoiseBuffer();
        filter.type = "highpass";
        filter.frequency.value = 1100;
        gain.gain.setValueAtTime(0.45, time + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, time + offset + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);

        noise.start(time + offset);
        noise.stop(time + offset + 0.09);
      });
    }

    function playInstrument(instrumentId, time) {
      if (instrumentId === "kick") {
        playKick(time);
        return;
      }

      if (instrumentId === "snare") {
        playSnare(time);
        return;
      }

      if (instrumentId === "hihat") {
        playHiHat(time);
        return;
      }

      playClap(time);
    }

    function getStepDurationSeconds() {
      return 60 / getTempo() / 4;
    }

    function clearVisualTimers() {
      visualTimerIds.forEach((timerId) => window.clearTimeout(timerId));
      visualTimerIds.clear();
    }

    function queueVisualStep(step, time) {
      const delayMs = Math.max(0, (time - audioContext.currentTime) * 1000);
      const timerId = window.setTimeout(() => {
        visualTimerIds.delete(timerId);
        setCurrentStep(step);
        renderPlaybackStep();
      }, delayMs);
      visualTimerIds.add(timerId);
    }

    function playScheduledStep(step, time) {
      const pattern = getPattern();
      instruments.forEach((instrument, rowIndex) => {
        if (pattern[rowIndex][step]) {
          playInstrument(instrument.id, time);
        }
      });
      queueVisualStep(step, time);
    }

    function schedule() {
      if (!schedulerId) {
        return;
      }

      while (nextStepTime < audioContext.currentTime + schedulerAheadTime) {
        playScheduledStep(scheduledStep, nextStepTime);
        scheduledStep = (scheduledStep + 1) % totalSteps;
        nextStepTime += getStepDurationSeconds();
      }

      schedulerId = window.setTimeout(schedule, schedulerLookaheadMs);
    }

    async function start() {
      if (!(await prepare())) {
        return false;
      }

      clearVisualTimers();
      scheduledStep = 0;
      nextStepTime = audioContext.currentTime + firstStepDelaySeconds;
      schedulerId = window.setTimeout(schedule, 0);
      return true;
    }

    function stop() {
      if (schedulerId) {
        window.clearTimeout(schedulerId);
        schedulerId = null;
      }
      clearVisualTimers();
      clearPlaybackStep();
    }

    function playInstrumentNow(instrumentId) {
      if (!audioContext) {
        return;
      }
      playInstrument(instrumentId, audioContext.currentTime + 0.01);
    }

    return {
      prepare,
      start,
      stop,
      playInstrumentNow,
    };
  }

  window.DigitalBeatAudio = { createAudioEngine };
})();
```

- [ ] **Step 4: Load `audio-engine.js` before `app.js`**

Change the script section in `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/index.html` to:

```html
    <script src="qr-code.js?v=1.0.1"></script>
    <script src="audio-engine.js?v=1.0.1"></script>
    <script src="app.js?v=1.0.1"></script>
```

- [ ] **Step 5: Wire the engine in `app.js`**

In `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/app.js`, remove `schedulerId` and `audioContext` ownership from the global state and add this after DOM element constants:

```js
const audioEngine = window.DigitalBeatAudio.createAudioEngine({
  instruments,
  totalSteps,
  getPattern: () => pattern,
  getTempo: () => tempo,
  setCurrentStep(step) {
    currentStep = step;
  },
  renderPlaybackStep() {
    updateGrid();
    updatePlaybackProgress();
  },
  clearPlaybackStep() {
    currentStep = 0;
    updateGrid();
    updatePlaybackProgress();
  },
  setFeedback,
});
```

Replace `prepareAudioContext()` with:

```js
async function prepareAudioContext() {
  return audioEngine.prepare();
}
```

Replace `stopPlayback()` with:

```js
function stopPlayback() {
  isPlaying = false;
  audioEngine.stop();
  playButton.textContent = "재생";
}
```

Replace `startPlayback()` with:

```js
async function startPlayback() {
  if (isPlaying) {
    return;
  }

  const started = await audioEngine.start();
  if (!started) {
    return;
  }

  isPlaying = true;
  currentStep = 0;
  playButton.textContent = "정지";
  updateGrid();
  updatePlaybackProgress();
}
```

Change the play button click handler to:

```js
playButton.addEventListener("click", async () => {
  if (isPlaying) {
    stopPlayback();
    return;
  }

  await startPlayback();
});
```

Change the step click audition call inside `renderGrid()` to:

```js
        if (pattern[rowIndex][step]) {
          audioEngine.playInstrumentNow(instrument.id);
        }
```

Remove the old direct audio functions from `app.js` after the new engine wiring:

- `ensureAudioContext`
- `createNoiseBuffer`
- `playKick`
- `playSnare`
- `playHiHat`
- `playClap`
- `playInstrument`
- `getStepDurationMs`
- `scheduleNextStep`

- [ ] **Step 6: Run verification**

Run:

```bash
npm run test:syntax
npm run test:behavior
```

Expected: both PASS. Existing `webkitAudioContext` fallback test must still pass because the engine keeps the same fallback behavior.

- [ ] **Step 7: Commit**

```bash
git add index.html app.js audio-engine.js tests/app-behavior.spec.js
git commit -m "feat: stabilize beat playback scheduling"
```

---

### Task 3: Add One-Step Undo for Accidental Clear

**Files:**
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/index.html`
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/app.js`
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/tests/app-behavior.spec.js`

- [ ] **Step 1: Add the failing clear undo test**

Append this test:

```js
test("clear pattern can be undone once", async ({ page }) => {
  await page.goto("/");
  await toggleStep(page, 0, 0);
  await toggleStep(page, 2, 8);

  await page.locator("#clear-pattern").click();
  await expectStepState(page, 0, 0, false);
  await expectStepState(page, 2, 8, false);
  await expect(page.locator("#undo-clear")).toBeVisible();

  await page.locator("#undo-clear").click();

  await expectStepState(page, 0, 0, true);
  await expectStepState(page, 2, 8, true);
  await expect(page.locator("#undo-clear")).toBeHidden();
  await expect(page.locator("#save-feedback")).toContainText("복원");
});
```

- [ ] **Step 2: Run the single test and verify it fails**

Run:

```bash
npm run test:behavior -- --grep "clear pattern can be undone once"
```

Expected: FAIL because `#undo-clear` does not exist yet.

- [ ] **Step 3: Add the undo button**

In `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/index.html`, change the controls block to:

```html
          <div class="controls" aria-label="재생 컨트롤">
            <button id="play-toggle" class="primary-button" type="button">재생</button>
            <button id="clear-pattern" class="ghost-button" type="button">전체 지우기</button>
            <button id="undo-clear" class="ghost-button undo-button" type="button" hidden>지우기 취소</button>
          </div>
```

- [ ] **Step 4: Add undo state and helpers**

In `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/app.js`, add the DOM reference near the clear button:

```js
const undoClearButton = document.getElementById("undo-clear");
```

Add state near `focusedCell`:

```js
let clearSnapshot = null;
let clearSnapshotSource = "slot";
```

Add these helpers near `createCurrentBeat()`:

```js
function patternHasActiveStep(beat) {
  return beat.pattern.some((row) => row.some(Boolean));
}

function rememberClearSnapshot() {
  const currentBeat = createCurrentBeat();
  clearSnapshot = currentBeat && patternHasActiveStep(currentBeat) ? currentBeat : null;
  clearSnapshotSource = currentSource;
  undoClearButton.hidden = !clearSnapshot;
}

function clearUndoSnapshot() {
  clearSnapshot = null;
  undoClearButton.hidden = true;
}
```

- [ ] **Step 5: Update clear and edit flows**

Replace the clear button handler with:

```js
clearButton.addEventListener("click", () => {
  rememberClearSnapshot();
  pattern = pattern.map((row) => row.map(() => false));
  stopPlayback();
  updateGrid();
  persistCurrentBeat();
  if (clearSnapshot) {
    setFeedback("전체를 지웠어요. 실수였다면 지우기 취소를 누를 수 있어요.");
  }
});
```

Add this event handler near the clear handler:

```js
undoClearButton.addEventListener("click", () => {
  if (!clearSnapshot) {
    setFeedback("복원할 리듬이 없어요.");
    clearUndoSnapshot();
    return;
  }

  loadBeatIntoComposer(clearSnapshot, clearSnapshotSource);
  persistCurrentBeat();
  clearUndoSnapshot();
  setFeedback("지우기 전 리듬을 복원했어요.");
});
```

Call `clearUndoSnapshot()` after meaningful non-clear edits so the undo button does not restore stale work. Add it at the start of these handlers:

```js
tempoSlider.addEventListener("input", (event) => {
  clearUndoSnapshot();
  tempo = clampTempo(event.target.value);
  syncTempoUi();
  persistCurrentBeat();
});
```

```js
patternNameInput.addEventListener("input", (event) => {
  clearUndoSnapshot();
  patternName = sanitizeName(event.target.value, currentSource === "shared" ? "친구 리듬" : "이름 없는 리듬");
  persistCurrentBeat();
});
```

Inside the step button click handler, add `clearUndoSnapshot();` before toggling the cell:

```js
        clearUndoSnapshot();
        pattern[rowIndex][step] = !pattern[rowIndex][step];
```

- [ ] **Step 6: Run verification**

Run:

```bash
npm run test:syntax
npm run test:behavior
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html app.js tests/app-behavior.spec.js
git commit -m "feat: add undo for clearing patterns"
```

---

### Task 4: Improve Playback and Grid Feedback

**Files:**
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/index.html`
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/styles.css`
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/app.js`
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/tests/app-behavior.spec.js`

- [ ] **Step 1: Add a progress label test**

Append this test:

```js
test("playback progress label updates while playing", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#playback-progress")).toHaveText("정지 중");

  await page.locator("#play-toggle").click();
  await expect(page.locator("#playback-progress")).toContainText(/현재 \d+박 \/ 16박/);

  await page.locator("#play-toggle").click();
  await expect(page.locator("#playback-progress")).toHaveText("정지 중");
});
```

- [ ] **Step 2: Run the single test and verify it fails**

Run:

```bash
npm run test:behavior -- --grep "playback progress label updates while playing"
```

Expected: FAIL because `#playback-progress` does not exist yet.

- [ ] **Step 3: Add the progress label markup**

In `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/index.html`, insert this after the `.tempo-panel`:

```html
        <p id="playback-progress" class="playback-progress" aria-live="polite">정지 중</p>
```

- [ ] **Step 4: Wire progress updates**

In `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/app.js`, add:

```js
const playbackProgress = document.getElementById("playback-progress");
```

Add this helper near `syncTempoUi()`:

```js
function updatePlaybackProgress() {
  playbackProgress.textContent = isPlaying ? `현재 ${currentStep + 1}박 / ${totalSteps}박` : "정지 중";
}
```

Make sure `stopPlayback()`, `startPlayback()`, and the audio engine `renderPlaybackStep()` integration call `updatePlaybackProgress()`.

- [ ] **Step 5: Add visual styles**

Add this to `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/styles.css` near `.tempo-panel`:

```css
.playback-progress {
  margin: 0.7rem 0 0;
  color: var(--text-muted);
  font-weight: 700;
}
```

Strengthen focus and non-color cues by replacing the `.step-button:focus-visible` and `.step-button.is-active` blocks with:

```css
.step-button:hover,
.step-button:focus-visible {
  transform: scale(1.03);
}

.step-button:focus-visible {
  outline: 3px solid rgba(31, 42, 54, 0.72);
  outline-offset: 3px;
}

.step-button.is-active {
  background: linear-gradient(180deg, var(--step-on-glow), var(--step-on));
  box-shadow: 0 0 0 2px rgba(14, 165, 164, 0.15), 0 10px 18px rgba(14, 165, 164, 0.18);
}

.step-button.is-active::after {
  content: "";
  position: absolute;
  inset: 34% 34%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
}
```

- [ ] **Step 6: Run verification**

Run:

```bash
npm run test:syntax
npm run test:behavior
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html styles.css app.js tests/app-behavior.spec.js
git commit -m "feat: improve playback and grid feedback"
```

---

### Task 5: Add Failure Fallback Tests for Clipboard and QR

**Files:**
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/tests/app-behavior.spec.js`
- Modify only if tests expose a bug: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/app.js`

- [ ] **Step 1: Add clipboard fallback test**

Append:

```js
test("clipboard failure shows manual copy guidance", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText() {
          return Promise.reject(new Error("Blocked clipboard"));
        },
      },
    });
  });

  await page.goto("/");
  await page.locator("#generate-share-link").click();
  await page.locator("#copy-share-link").click();

  await expect(page.locator("#share-url")).toBeFocused();
  await expect(page.locator("#save-feedback")).toContainText("직접 복사");
});
```

- [ ] **Step 2: Add QR missing fallback test**

Append:

```js
test("missing QR generator keeps the share link usable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "LocalQrCode", {
      configurable: true,
      value: undefined,
    });
  });

  await page.goto("/");
  await page.evaluate(() => {
    window.LocalQrCode = undefined;
  });
  await page.locator("#generate-share-link").click();

  await expect(page.locator("#share-url")).toHaveValue(/\\?beat=/);
  await expect(page.locator("#share-qr")).toBeHidden();
  await expect(page.locator("#qr-placeholder")).toContainText("QR 생성기");
});
```

- [ ] **Step 3: Add QR render failure fallback test**

Append:

```js
test("QR render failure shows link-only recovery guidance", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.LocalQrCode.renderToCanvas = () => {
      throw new Error("QR too long");
    };
  });

  await page.locator("#generate-share-link").click();

  await expect(page.locator("#share-url")).toHaveValue(/\\?beat=/);
  await expect(page.locator("#share-qr")).toBeHidden();
  await expect(page.locator("#qr-placeholder")).toContainText("직접 복사");
});
```

- [ ] **Step 4: Run verification**

Run:

```bash
npm run test:behavior
```

Expected: PASS. If the QR missing test fails because `qr-code.js` loads after `addInitScript`, keep the `page.evaluate()` override after `page.goto("/")`; do not edit `qr-code.js`.

- [ ] **Step 5: Commit**

```bash
git add tests/app-behavior.spec.js app.js
git commit -m "test: cover share recovery fallbacks"
```

---

### Task 6: Update Documentation and Release Checklist

**Files:**
- Modify: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/README.md`
- Create: `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/docs/release-checklist.md`

- [ ] **Step 1: Update README development memo**

Replace the current `## 개발 메모` section with:

```md
## 개발 메모

현재 폴더는 `https://github.com/WBmaker2/digital-beat-maker`의 `main` 브랜치를 기준으로 관리됩니다. 커밋/푸시 이후에는 GitHub Pages 배포 URL `https://wbmaker2.github.io/digital-beat-maker/`에서 동작을 확인합니다.
```

- [ ] **Step 2: Add operational constraints to README**

Append this under `## 저장과 공유 방식`:

```md
## 현장 사용 시 주의

- 사생활 보호 모드, 저장 공간 제한, 학교 기기 정책에 따라 `localStorage` 저장이 실패할 수 있습니다.
- 클립보드 복사가 막힌 환경에서는 공유 링크 입력칸을 직접 선택해 복사하면 됩니다.
- QR 생성이 실패해도 공유 링크 자체는 계속 사용할 수 있습니다.
- 오디오 재생은 브라우저 정책상 학생이 재생 버튼이나 셀을 한 번 누른 뒤 시작됩니다.
```

- [ ] **Step 3: Create release checklist**

Create `/Users/kimhongnyeon/Dev/codex/digital-beat-maker/docs/release-checklist.md`:

```md
# Release Checklist

## Before Commit

- [ ] Run `npm run test:syntax`.
- [ ] Run `npm run test:behavior`.
- [ ] Open `http://127.0.0.1:4173/` on desktop width and confirm the sequencer renders.
- [ ] On a mobile-width viewport, scroll the sequencer horizontally and confirm instrument labels remain visible.
- [ ] Generate a share link, open it in a new tab, and confirm `친구 비트` mode appears.
- [ ] Clear a pattern and confirm `지우기 취소` restores the previous pattern.

## After Push

- [ ] Open `https://wbmaker2.github.io/digital-beat-maker/`.
- [ ] Confirm the visible version and the asset query versions match the intended release.
- [ ] Generate a share link from the deployed page and open it.
- [ ] Confirm the QR code appears or the link-only fallback message is useful.
- [ ] Include the deployment URL in the user-facing report.
```

- [ ] **Step 4: Run verification**

Run:

```bash
npm run test:syntax
npm run test:behavior
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/release-checklist.md
git commit -m "docs: add release checklist"
```

---

### Task 7: Final Verification and Ship Readiness

**Files:**
- Review all changed files.

- [ ] **Step 1: Inspect git diff**

Run:

```bash
git diff --stat HEAD~6..HEAD
git diff HEAD~6..HEAD -- index.html styles.css app.js audio-engine.js tests/app-behavior.spec.js README.md docs/release-checklist.md
```

Expected: changes are limited to the planned files.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 3: Run syntax gate**

Run:

```bash
npm run test:syntax
```

Expected: PASS.

- [ ] **Step 4: Manual smoke**

Run:

```bash
npm run serve
```

Open `http://127.0.0.1:4173/` and verify:

- [ ] Play/stop works.
- [ ] Cells can be toggled and heard.
- [ ] `전체 지우기` shows `지우기 취소`.
- [ ] `지우기 취소` restores the previous pattern.
- [ ] Share link opens in `친구 비트` mode.
- [ ] New slot, slot switch, and delete fallback behave correctly.

- [ ] **Step 5: Commit or amend final fixes**

If the final review finds no changes:

```bash
git status --short
```

Expected: clean working tree.

If small fixes are needed:

```bash
git add <changed-files>
git commit -m "fix: polish prioritized improvements"
```

---

## Self-Review

- Spec coverage:
  - Audio timing stability: Task 2.
  - `전체 지우기` recovery: Task 3.
  - UX/accessibility feedback: Task 4.
  - Save/share/slot/QR/clipboard regression coverage: Tasks 1 and 5.
  - Release documentation and deployment reporting discipline: Task 6.
- Compatibility:
  - Existing `?beat=` compact and legacy decode paths remain in `app.js` unless a later dedicated codec refactor is planned.
  - `qr-code.js` remains unchanged.
- Execution safety:
  - Each task has a focused commit.
  - Tests are run before and after behavioral changes.
  - The final report after push must include `https://wbmaker2.github.io/digital-beat-maker/`.
