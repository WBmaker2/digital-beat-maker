const instruments = [
  { id: "kick", name: "킥", color: "kick" },
  { id: "snare", name: "스네어", color: "snare" },
  { id: "hihat", name: "하이햇", color: "hihat" },
  { id: "clap", name: "박수", color: "clap" },
];

const totalSteps = 16;
const storageKeys = {
  legacyDraft: "digital-beat-maker:draft",
  slotsLibrary: "digital-beat-maker:slots-library",
  sharedPreview: "digital-beat-maker:shared-preview",
};
const shareParam = "beat";
const starterPattern = [
  [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
  [false, false, false, false, false, false, false, false, false, false, false, false, true, false, false, false],
];

let pattern = clonePattern(starterPattern);
let patternName = "기본 리듬";
let tempo = 110;
let currentStep = 0;
let isPlaying = false;
let schedulerId = null;
let audioContext = null;
let currentSource = "slot";
let slotsLibrary = null;
let sharedBeat = null;

const gridElement = document.getElementById("sequencer-grid");
const stepLabelsElement = document.getElementById("step-labels");
const playButton = document.getElementById("play-toggle");
const clearButton = document.getElementById("clear-pattern");
const saveSlotButton = document.getElementById("save-slot");
const shareLinkButton = document.getElementById("share-link");
const restoreSlotButton = document.getElementById("restore-slot");
const saveAsMineButton = document.getElementById("save-as-mine");
const newSlotButton = document.getElementById("new-slot");
const deleteSlotButton = document.getElementById("delete-slot");
const slotSelect = document.getElementById("slot-select");
const patternNameInput = document.getElementById("pattern-name");
const tempoSlider = document.getElementById("tempo-slider");
const tempoValue = document.getElementById("tempo-value");
const modeBadge = document.getElementById("mode-badge");
const modeMessage = document.getElementById("mode-message");
const shareUrlInput = document.getElementById("share-url");
const shareQrImage = document.getElementById("share-qr");
const qrPlaceholder = document.getElementById("qr-placeholder");
const saveFeedback = document.getElementById("save-feedback");

function clonePattern(source) {
  return source.map((row) => [...row]);
}

function clampTempo(nextTempo) {
  return Math.min(160, Math.max(70, Number(nextTempo) || 110));
}

function sanitizeName(rawName, fallback = "이름 없는 리듬") {
  const safeName = String(rawName || "").trim().slice(0, 40);
  return safeName || fallback;
}

function createStarterBeat(name = "기본 리듬") {
  return {
    version: 2,
    name: sanitizeName(name),
    tempo: 110,
    pattern: clonePattern(starterPattern),
  };
}

function normalizeBeat(rawBeat) {
  if (!rawBeat || !Array.isArray(rawBeat.pattern) || rawBeat.pattern.length !== instruments.length) {
    return null;
  }

  const normalizedPattern = rawBeat.pattern.map((row) => {
    if (!Array.isArray(row) || row.length !== totalSteps) {
      return null;
    }

    return row.map((cell) => Boolean(cell));
  });

  if (normalizedPattern.some((row) => row === null)) {
    return null;
  }

  return {
    version: 2,
    name: sanitizeName(rawBeat.name, "이름 없는 리듬"),
    tempo: clampTempo(rawBeat.tempo),
    pattern: normalizedPattern,
  };
}

function createCurrentBeat() {
  return normalizeBeat({
    name: patternName,
    tempo,
    pattern,
  });
}

function createSlot(beat, nameHint) {
  return {
    id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    updatedAt: Date.now(),
    beat: normalizeBeat(beat) || createStarterBeat(nameHint),
  };
}

function createLibrary(slots, activeSlotId) {
  return {
    version: 1,
    activeSlotId,
    slots,
  };
}

function setFeedback(message) {
  saveFeedback.textContent = message;
}

function saveJsonToStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    setFeedback("브라우저 저장 공간에 기록하지 못했어요.");
    return false;
  }
}

function loadJsonFromStorage(key) {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    return null;
  }
}

function getSlotLabel(slot, index) {
  return `${index + 1}. ${sanitizeName(slot.beat.name, `리듬 ${index + 1}`)}`;
}

function getNextSlotName() {
  const taken = new Set((slotsLibrary?.slots || []).map((slot) => slot.beat.name));
  let nextIndex = 1;

  while (taken.has(`리듬 ${nextIndex}`)) {
    nextIndex += 1;
  }

  return `리듬 ${nextIndex}`;
}

function getUniqueSlotName(baseName) {
  const safeBaseName = sanitizeName(baseName, getNextSlotName());
  const taken = new Set((slotsLibrary?.slots || []).map((slot) => slot.beat.name));

  if (!taken.has(safeBaseName)) {
    return safeBaseName;
  }

  let copyIndex = 2;
  let nextName = `${safeBaseName} 사본`;

  while (taken.has(nextName)) {
    nextName = `${safeBaseName} 사본 ${copyIndex}`;
    copyIndex += 1;
  }

  return nextName;
}

function ensureLibraryShape(rawLibrary) {
  if (!rawLibrary || !Array.isArray(rawLibrary.slots) || rawLibrary.slots.length === 0) {
    return null;
  }

  const normalizedSlots = rawLibrary.slots
    .map((slot) => {
      const safeBeat = normalizeBeat(slot.beat || slot);
      if (!safeBeat || !slot.id) {
        return null;
      }

      return {
        id: String(slot.id),
        updatedAt: Number(slot.updatedAt) || Date.now(),
        beat: safeBeat,
      };
    })
    .filter(Boolean);

  if (normalizedSlots.length === 0) {
    return null;
  }

  const activeSlotId = normalizedSlots.some((slot) => slot.id === rawLibrary.activeSlotId)
    ? rawLibrary.activeSlotId
    : normalizedSlots[0].id;

  return createLibrary(normalizedSlots, activeSlotId);
}

function migrateLegacyDraft() {
  const legacyDraft = normalizeBeat(loadJsonFromStorage(storageKeys.legacyDraft));
  if (legacyDraft) {
    return createLibrary([createSlot(legacyDraft, legacyDraft.name)], null);
  }

  return createLibrary([createSlot(createStarterBeat("리듬 1"), "리듬 1")], null);
}

function ensureActiveSlotId() {
  if (!slotsLibrary.activeSlotId || !slotsLibrary.slots.some((slot) => slot.id === slotsLibrary.activeSlotId)) {
    slotsLibrary.activeSlotId = slotsLibrary.slots[0].id;
  }
}

function saveLibrary() {
  ensureActiveSlotId();
  return saveJsonToStorage(storageKeys.slotsLibrary, slotsLibrary);
}

function loadLibrary() {
  const storedLibrary = ensureLibraryShape(loadJsonFromStorage(storageKeys.slotsLibrary));
  slotsLibrary = storedLibrary || migrateLegacyDraft();
  ensureActiveSlotId();
  saveLibrary();
}

function getActiveSlot() {
  return slotsLibrary.slots.find((slot) => slot.id === slotsLibrary.activeSlotId) || slotsLibrary.slots[0];
}

function toBase64Url(value) {
  return window.btoa(unescape(encodeURIComponent(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeURIComponent(escape(window.atob(padded)));
}

function encodeBeat(beat) {
  const safeBeat = normalizeBeat(beat);
  const nameBytes = Array.from(new TextEncoder().encode(safeBeat.name));
  const packedPattern = [];

  for (let row = 0; row < safeBeat.pattern.length; row += 1) {
    for (let byteIndex = 0; byteIndex < 2; byteIndex += 1) {
      let nextByte = 0;
      for (let bit = 0; bit < 8; bit += 1) {
        const stepIndex = byteIndex * 8 + bit;
        nextByte = (nextByte << 1) | (safeBeat.pattern[row][stepIndex] ? 1 : 0);
      }
      packedPattern.push(nextByte);
    }
  }

  const payloadBytes = [
    2,
    clampTempo(safeBeat.tempo),
    nameBytes.length,
    ...packedPattern,
    ...nameBytes,
  ];

  let binary = "";
  payloadBytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeCompactBeat(encodedBeat) {
  try {
    const padded = encodedBeat.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encodedBeat.length / 4) * 4, "=");
    const binary = window.atob(padded);
    const bytes = Array.from(binary, (char) => char.charCodeAt(0));

    if (bytes.length < 11 || bytes[0] !== 2) {
      return null;
    }

    const nameLength = bytes[2];
    const expectedLength = 11 + nameLength;
    if (bytes.length !== expectedLength) {
      return null;
    }

    const pattern = [];
    let patternOffset = 3;
    for (let row = 0; row < instruments.length; row += 1) {
      const rowSteps = [];
      for (let rowByte = 0; rowByte < 2; rowByte += 1) {
        const nextByte = bytes[patternOffset];
        patternOffset += 1;
        for (let bit = 7; bit >= 0; bit -= 1) {
          rowSteps.push(((nextByte >>> bit) & 1) === 1);
        }
      }
      pattern.push(rowSteps);
    }

    const nameBytes = new Uint8Array(bytes.slice(patternOffset));
    const name = new TextDecoder().decode(nameBytes);

    return normalizeBeat({
      version: 2,
      name,
      tempo: bytes[1],
      pattern,
    });
  } catch (error) {
    return null;
  }
}

function decodeBeat(encodedBeat) {
  const compactBeat = decodeCompactBeat(encodedBeat);
  if (compactBeat) {
    return compactBeat;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encodedBeat));
    return normalizeBeat({
      version: parsed.v,
      name: parsed.n,
      tempo: parsed.t,
      pattern: parsed.p,
    });
  } catch (error) {
    return null;
  }
}

function getSharedBeatFromUrl() {
  const url = new URL(window.location.href);
  const encodedBeat = url.searchParams.get(shareParam);
  if (!encodedBeat) {
    return null;
  }

  return decodeBeat(encodedBeat);
}

function createShareUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set(shareParam, encodeBeat(createCurrentBeat()));
  return url.toString();
}

function clearShareUrlFromAddressBar() {
  const url = new URL(window.location.href);
  url.searchParams.delete(shareParam);
  const nextUrl = `${url.pathname}${url.search ? url.search : ""}${url.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

function clearShareArtifacts() {
  shareUrlInput.value = "";
  shareQrImage.hidden = true;
  if (window.LocalQrCode) {
    window.LocalQrCode.clearCanvas(shareQrImage);
  }
  qrPlaceholder.hidden = false;
  qrPlaceholder.textContent = "공유 링크를 만들면 QR 코드가 여기에 보여요.";
}

function updateShareArtifacts(shareUrl) {
  shareUrlInput.value = shareUrl;
  if (!window.LocalQrCode) {
    shareQrImage.hidden = true;
    qrPlaceholder.hidden = false;
    qrPlaceholder.textContent = "QR 생성기를 불러오지 못했어요. 링크는 그대로 사용할 수 있어요.";
    return;
  }

  try {
    window.LocalQrCode.renderToCanvas(shareUrl, shareQrImage, { size: 220, quietZone: 4 });
    shareQrImage.hidden = false;
    qrPlaceholder.hidden = true;
  } catch (error) {
    shareQrImage.hidden = true;
    qrPlaceholder.hidden = false;
    qrPlaceholder.textContent = "이 링크는 너무 길어서 QR로 만들지 못했어요. 링크를 직접 복사해 주세요.";
  }
}

function syncTempoUi() {
  tempoSlider.value = String(tempo);
  tempoValue.value = `${tempo} BPM`;
  tempoValue.textContent = `${tempo} BPM`;
}

function syncNameUi() {
  patternNameInput.value = patternName;
}

function updateSlotOptions() {
  slotSelect.innerHTML = "";

  slotsLibrary.slots.forEach((slot, index) => {
    const option = document.createElement("option");
    option.value = slot.id;
    option.textContent = getSlotLabel(slot, index);
    option.selected = slot.id === slotsLibrary.activeSlotId;
    slotSelect.appendChild(option);
  });
}

function updateModeUi() {
  const sharedMode = currentSource === "shared";
  const activeSlot = getActiveSlot();

  modeBadge.textContent = sharedMode ? "친구 비트" : "내 슬롯";
  modeBadge.classList.toggle("is-shared", sharedMode);
  modeMessage.textContent = sharedMode
    ? "친구가 보낸 비트를 보고 있어요. 내 슬롯들은 이 브라우저에 안전하게 따로 저장되어 있어요."
    : `${sanitizeName(activeSlot.beat.name, "내 슬롯")} 슬롯을 편집 중이에요. 이름과 리듬이 자동 저장돼요.`;

  saveSlotButton.hidden = sharedMode;
  restoreSlotButton.hidden = !sharedMode;
  saveAsMineButton.hidden = !sharedMode;
  slotSelect.disabled = sharedMode;
  newSlotButton.disabled = sharedMode;
  deleteSlotButton.disabled = sharedMode || slotsLibrary.slots.length <= 1;
  patternNameInput.disabled = false;
}

function stopPlayback() {
  isPlaying = false;
  if (schedulerId) {
    window.clearTimeout(schedulerId);
    schedulerId = null;
  }
  currentStep = 0;
  playButton.textContent = "재생";
  updateGrid();
}

function loadBeatIntoComposer(beat, source) {
  const safeBeat = normalizeBeat(beat) || createStarterBeat();
  stopPlayback();
  currentSource = source;
  pattern = clonePattern(safeBeat.pattern);
  patternName = safeBeat.name;
  tempo = safeBeat.tempo;
  syncNameUi();
  syncTempoUi();
  updateGrid();
  updateSlotOptions();
  updateModeUi();
  clearShareArtifacts();
}

function updateActiveSlotBeat(beat) {
  const activeSlot = getActiveSlot();
  const nextBeat = normalizeBeat(beat);

  if (!activeSlot || !nextBeat) {
    return;
  }

  activeSlot.beat = nextBeat;
  activeSlot.updatedAt = Date.now();
}

function persistCurrentBeat() {
  const safeBeat = createCurrentBeat();
  if (!safeBeat) {
    return;
  }

  clearShareArtifacts();

  if (currentSource === "slot") {
    updateActiveSlotBeat(safeBeat);
    saveLibrary();
    updateSlotOptions();
    updateModeUi();
    setFeedback(`"${safeBeat.name}" 슬롯을 저장했어요.`);
    return;
  }

  sharedBeat = safeBeat;
  saveJsonToStorage(storageKeys.sharedPreview, sharedBeat);
  setFeedback("공유 비트는 따로 보관 중이고, 내 슬롯들은 그대로 남아 있어요.");
}

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new window.AudioContext();
  }

  if (audioContext.state === "suspended") {
    return audioContext.resume();
  }

  return Promise.resolve();
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

function renderStepLabels() {
  const spacer = document.createElement("div");
  spacer.className = "row-label";
  spacer.textContent = "악기";
  stepLabelsElement.appendChild(spacer);

  for (let step = 0; step < totalSteps; step += 1) {
    const stepLabel = document.createElement("div");
    stepLabel.className = "step-number";
    stepLabel.textContent = String(step + 1);

    if (step % 4 === 0) {
      stepLabel.classList.add("bar-start");
    }

    stepLabelsElement.appendChild(stepLabel);
  }
}

function renderGrid() {
  gridElement.innerHTML = "";

  instruments.forEach((instrument, rowIndex) => {
    const row = document.createElement("div");
    row.className = "grid-row";
    row.setAttribute("role", "row");

    const label = document.createElement("div");
    label.className = "row-label";
    label.textContent = instrument.name;
    row.appendChild(label);

    for (let step = 0; step < totalSteps; step += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "step-button";
      button.dataset.row = String(rowIndex);
      button.dataset.step = String(step);
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `${instrument.name} ${step + 1}번째 박`);
      button.setAttribute("aria-pressed", String(pattern[rowIndex][step]));

      if (pattern[rowIndex][step]) {
        button.classList.add("is-active");
      }

      if (step === currentStep && isPlaying) {
        button.classList.add("is-current");
      }

      if (step % 4 === 0) {
        button.classList.add("bar-start");
      }

      button.addEventListener("click", async () => {
        await ensureAudioContext();
        pattern[rowIndex][step] = !pattern[rowIndex][step];
        updateGrid();
        if (pattern[rowIndex][step]) {
          playInstrument(instrument.id, audioContext.currentTime + 0.01);
        }
        persistCurrentBeat();
      });

      row.appendChild(button);
    }

    gridElement.appendChild(row);
  });
}

function updateGrid() {
  const buttons = gridElement.querySelectorAll(".step-button");
  buttons.forEach((button) => {
    const row = Number(button.dataset.row);
    const step = Number(button.dataset.step);
    const active = pattern[row][step];
    const current = isPlaying && step === currentStep;

    button.classList.toggle("is-active", active);
    button.classList.toggle("is-current", current);
    button.setAttribute("aria-pressed", String(active));
  });
}

function getStepDurationMs() {
  return (60 / tempo / 4) * 1000;
}

function scheduleNextStep() {
  if (!isPlaying) {
    return;
  }

  const playbackTime = audioContext.currentTime + 0.01;

  instruments.forEach((instrument, rowIndex) => {
    if (pattern[rowIndex][currentStep]) {
      playInstrument(instrument.id, playbackTime);
    }
  });

  updateGrid();
  currentStep = (currentStep + 1) % totalSteps;
  schedulerId = window.setTimeout(scheduleNextStep, getStepDurationMs());
}

function startPlayback() {
  if (isPlaying) {
    return;
  }

  isPlaying = true;
  currentStep = 0;
  playButton.textContent = "정지";
  updateGrid();
  scheduleNextStep();
}

playButton.addEventListener("click", async () => {
  await ensureAudioContext();
  if (isPlaying) {
    stopPlayback();
    return;
  }

  startPlayback();
});

clearButton.addEventListener("click", () => {
  pattern = pattern.map((row) => row.map(() => false));
  stopPlayback();
  updateGrid();
  persistCurrentBeat();
});

tempoSlider.addEventListener("input", (event) => {
  tempo = clampTempo(event.target.value);
  syncTempoUi();
  persistCurrentBeat();
});

patternNameInput.addEventListener("input", (event) => {
  patternName = sanitizeName(event.target.value, currentSource === "shared" ? "친구 리듬" : "이름 없는 리듬");
  persistCurrentBeat();
});

slotSelect.addEventListener("change", (event) => {
  if (currentSource !== "slot") {
    return;
  }

  slotsLibrary.activeSlotId = event.target.value;
  loadBeatIntoComposer(getActiveSlot().beat, "slot");
  setFeedback(`"${getActiveSlot().beat.name}" 슬롯으로 바꿨어요.`);
});

newSlotButton.addEventListener("click", () => {
  if (currentSource !== "slot") {
    return;
  }

  const nextSlot = createSlot(createStarterBeat(getNextSlotName()), getNextSlotName());
  slotsLibrary.slots.unshift(nextSlot);
  slotsLibrary.activeSlotId = nextSlot.id;
  saveLibrary();
  loadBeatIntoComposer(nextSlot.beat, "slot");
  setFeedback(`새 슬롯 "${nextSlot.beat.name}"을 만들었어요.`);
});

deleteSlotButton.addEventListener("click", () => {
  if (currentSource !== "slot") {
    return;
  }

  const activeSlot = getActiveSlot();
  if (!activeSlot) {
    return;
  }

  if (!window.confirm(`"${activeSlot.beat.name}" 슬롯을 지울까요?`)) {
    return;
  }

  slotsLibrary.slots = slotsLibrary.slots.filter((slot) => slot.id !== activeSlot.id);

  if (slotsLibrary.slots.length === 0) {
    const fallbackSlot = createSlot(createStarterBeat("리듬 1"), "리듬 1");
    slotsLibrary.slots = [fallbackSlot];
  }

  slotsLibrary.activeSlotId = slotsLibrary.slots[0].id;
  saveLibrary();
  loadBeatIntoComposer(getActiveSlot().beat, "slot");
  setFeedback("현재 슬롯을 삭제했어요.");
});

saveSlotButton.addEventListener("click", () => {
  if (currentSource !== "slot") {
    return;
  }

  persistCurrentBeat();
});

shareLinkButton.addEventListener("click", async () => {
  const shareUrl = createShareUrl();
  updateShareArtifacts(shareUrl);

  try {
    await navigator.clipboard.writeText(shareUrl);
    setFeedback("공유 링크를 복사했어요.");
  } catch (error) {
    shareUrlInput.focus();
    shareUrlInput.select();
    setFeedback("자동 복사가 막혀 있어요. 아래 링크를 직접 복사해 주세요.");
  }
});

restoreSlotButton.addEventListener("click", () => {
  loadBeatIntoComposer(getActiveSlot().beat, "slot");
  clearShareUrlFromAddressBar();
  setFeedback("내 슬롯으로 돌아왔어요. 친구 비트는 내 슬롯을 덮어쓰지 않았어요.");
});

saveAsMineButton.addEventListener("click", () => {
  const sharedBeatCopy = createCurrentBeat();
  sharedBeatCopy.name = getUniqueSlotName(sharedBeatCopy.name);
  const sharedSlot = createSlot(
    sharedBeatCopy,
    sharedBeatCopy.name,
  );
  slotsLibrary.slots.unshift(sharedSlot);
  slotsLibrary.activeSlotId = sharedSlot.id;
  saveLibrary();
  loadBeatIntoComposer(sharedSlot.beat, "slot");
  clearShareUrlFromAddressBar();
  setFeedback(`"${sharedSlot.beat.name}" 새 슬롯으로 저장했어요.`);
});

renderStepLabels();
renderGrid();
loadLibrary();
sharedBeat = getSharedBeatFromUrl() || normalizeBeat(loadJsonFromStorage(storageKeys.sharedPreview));

if (getSharedBeatFromUrl()) {
  saveJsonToStorage(storageKeys.sharedPreview, getSharedBeatFromUrl());
  sharedBeat = getSharedBeatFromUrl();
}

if (getSharedBeatFromUrl()) {
  loadBeatIntoComposer(sharedBeat, "shared");
  setFeedback("친구가 보낸 비트를 열었어요. 내 슬롯들은 안전하게 따로 저장되어 있어요.");
} else {
  loadBeatIntoComposer(getActiveSlot().beat, "slot");
  setFeedback(`"${getActiveSlot().beat.name}" 슬롯을 불러왔어요.`);
}
