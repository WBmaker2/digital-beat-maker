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
let isStartingPlayback = false;
let playbackStartToken = 0;
let currentSource = "slot";
let slotsLibrary = null;
let sharedBeat = null;
let focusedCell = { row: 0, step: 0 };
let clearSnapshot = null;
let clearSnapshotSource = "slot";
let clearSnapshotSlotId = null;

const gridElement = document.getElementById("sequencer-grid");
const stepLabelsElement = document.getElementById("step-labels");
const playButton = document.getElementById("play-toggle");
const clearButton = document.getElementById("clear-pattern");
const undoClearButton = document.getElementById("undo-clear");
const saveSlotButton = document.getElementById("save-slot");
const legacyShareLinkButton = document.getElementById("share-link");
const generateShareLinkButton = document.getElementById("generate-share-link");
const copyShareLinkButton = document.getElementById("copy-share-link");
const restoreSlotButton = document.getElementById("restore-slot");
const saveAsMineButton = document.getElementById("save-as-mine");
const restoreSharedPreviewButton = document.getElementById("restore-shared-preview");
const newSlotButton = document.getElementById("new-slot");
const deleteSlotButton = document.getElementById("delete-slot");
const slotSelect = document.getElementById("slot-select");
const patternNameInput = document.getElementById("pattern-name");
const tempoSlider = document.getElementById("tempo-slider");
const tempoValue = document.getElementById("tempo-value");
const playbackProgress = document.getElementById("playback-progress");
const modeBadge = document.getElementById("mode-badge");
const modeMessage = document.getElementById("mode-message");
const shareUrlInput = document.getElementById("share-url");
const shareQrImage = document.getElementById("share-qr");
const qrPlaceholder = document.getElementById("qr-placeholder");
const saveFeedback = document.getElementById("save-feedback");
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

function patternHasActiveStep(beat) {
  return beat.pattern.some((row) => row.some(Boolean));
}

function getCurrentClearContext() {
  return {
    source: currentSource,
    slotId: currentSource === "slot" ? slotsLibrary?.activeSlotId || null : null,
  };
}

function clearSnapshotMatchesCurrentContext() {
  const currentContext = getCurrentClearContext();
  return clearSnapshotSource === currentContext.source && clearSnapshotSlotId === currentContext.slotId;
}

function rememberClearSnapshot() {
  const currentBeat = createCurrentBeat();
  if (!currentBeat || !patternHasActiveStep(currentBeat)) {
    if (clearSnapshot && clearSnapshotMatchesCurrentContext()) {
      undoClearButton.hidden = false;
      return;
    }

    clearUndoSnapshot();
    return;
  }

  const currentContext = getCurrentClearContext();
  clearSnapshot = currentBeat;
  clearSnapshotSource = currentContext.source;
  clearSnapshotSlotId = currentContext.slotId;
  undoClearButton.hidden = !clearSnapshot;
}

function clearUndoSnapshot() {
  clearSnapshot = null;
  clearSnapshotSlotId = null;
  undoClearButton.hidden = true;
}

function createSlot(beat, nameHint) {
  return {
    id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    updatedAt: Date.now(),
    beat: normalizeBeat(beat) || createStarterBeat(nameHint),
    shareCode: "",
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
    setFeedback("브라우저 저장 공간에 기록하지 못했어요. 공유 링크로 백업해 주세요.");
    return false;
  }
}

function removeStorageItem(key) {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
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
        shareCode: typeof slot.shareCode === "string" ? slot.shareCode : "",
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

function createShareUrlFromCode(shareCode) {
  const url = new URL(window.location.href);
  url.searchParams.set(shareParam, shareCode);
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

function getShareCodeForBeat(beat) {
  return encodeBeat(normalizeBeat(beat));
}

function syncSlotShareArtifacts() {
  if (currentSource !== "slot") {
    clearShareArtifacts();
    return;
  }

  const activeSlot = getActiveSlot();
  if (!activeSlot?.shareCode) {
    clearShareArtifacts();
    return;
  }

  const expectedShareCode = getShareCodeForBeat(activeSlot.beat);
  if (activeSlot.shareCode !== expectedShareCode) {
    activeSlot.shareCode = "";
    saveLibrary();
    clearShareArtifacts();
    return;
  }

  updateShareArtifacts(createShareUrlFromCode(activeSlot.shareCode));
}

function storeShareCodeForCurrentSlot(shareCode) {
  if (currentSource !== "slot") {
    return true;
  }

  const activeSlot = getActiveSlot();
  if (!activeSlot) {
    return false;
  }

  activeSlot.shareCode = shareCode;
  return saveLibrary();
}

function generateShareArtifactsForCurrentBeat() {
  const shareCode = getShareCodeForBeat(createCurrentBeat());
  const shareUrl = createShareUrlFromCode(shareCode);
  updateShareArtifacts(shareUrl);
  const storedShareCode = storeShareCodeForCurrentSlot(shareCode);
  return { shareUrl, storedShareCode };
}

function syncTempoUi() {
  tempoSlider.value = String(tempo);
  tempoValue.value = `${tempo} BPM`;
  tempoValue.textContent = `${tempo} BPM`;
}

function updatePlaybackProgress() {
  playbackProgress.textContent = isPlaying ? `현재 ${currentStep + 1}박 / ${totalSteps}박` : "정지 중";
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
  restoreSharedPreviewButton.hidden = sharedMode || !sharedBeat;
  slotSelect.disabled = sharedMode;
  newSlotButton.disabled = sharedMode;
  deleteSlotButton.disabled = sharedMode || slotsLibrary.slots.length <= 1;
  patternNameInput.disabled = false;
}

function stopPlayback() {
  playbackStartToken += 1;
  isStartingPlayback = false;
  isPlaying = false;
  currentStep = 0;
  playButton.textContent = "재생";
  audioEngine.stop();
  updatePlaybackProgress();
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
  syncSlotShareArtifacts();
}

function updateActiveSlotBeat(beat) {
  const activeSlot = getActiveSlot();
  const nextBeat = normalizeBeat(beat);

  if (!activeSlot || !nextBeat) {
    return;
  }

  activeSlot.beat = nextBeat;
  activeSlot.updatedAt = Date.now();

  if (activeSlot.shareCode && activeSlot.shareCode !== getShareCodeForBeat(nextBeat)) {
    activeSlot.shareCode = "";
  }
}

function persistCurrentBeat() {
  const safeBeat = createCurrentBeat();
  if (!safeBeat) {
    return;
  }

  if (currentSource === "slot") {
    updateActiveSlotBeat(safeBeat);
    const saved = saveLibrary();
    updateSlotOptions();
    updateModeUi();
    syncSlotShareArtifacts();
    if (saved) {
      setFeedback(`"${safeBeat.name}" 슬롯을 저장했어요.`);
    } else {
      setFeedback(`"${safeBeat.name}" 슬롯을 브라우저 저장 공간에 저장하지 못했어요. 공유 링크로 백업해 주세요.`);
    }
    return saved;
  }

  sharedBeat = safeBeat;
  const saved = saveJsonToStorage(storageKeys.sharedPreview, sharedBeat);
  updateModeUi();
  clearShareArtifacts();
  if (saved) {
    setFeedback("공유 비트는 따로 보관 중이고, 내 슬롯들은 그대로 남아 있어요.");
  } else {
    setFeedback("공유 비트를 브라우저 저장 공간에 저장하지 못했어요. 공유 링크로 백업해 주세요.");
  }
  return saved;
}

async function prepareAudioContext() {
  return audioEngine.prepare();
}

function getStepAriaLabel(row, step) {
  const activeState = pattern[row][step] ? "켜짐" : "꺼짐";
  return `${instruments[row].name} ${step + 1}번째 박, ${activeState}`;
}

function getStepButton(row, step) {
  return gridElement.querySelector(`.step-button[data-row="${row}"][data-step="${step}"]`);
}

function moveFocusedCell(row, step) {
  const nextRow = (row + instruments.length) % instruments.length;
  const nextStep = (step + totalSteps) % totalSteps;
  focusedCell = { row: nextRow, step: nextStep };
  updateGrid();
  getStepButton(nextRow, nextStep)?.focus();
}

function handleStepKeydown(event) {
  const row = Number(event.currentTarget.dataset.row);
  const step = Number(event.currentTarget.dataset.step);
  let nextRow = row;
  let nextStep = step;

  if (event.key === "ArrowRight") {
    nextStep += 1;
  } else if (event.key === "ArrowLeft") {
    nextStep -= 1;
  } else if (event.key === "ArrowDown") {
    nextRow += 1;
  } else if (event.key === "ArrowUp") {
    nextRow -= 1;
  } else if (event.key === "Home") {
    nextStep = 0;
  } else if (event.key === "End") {
    nextStep = totalSteps - 1;
  } else {
    return;
  }

  event.preventDefault();
  moveFocusedCell(nextRow, nextStep);
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
      button.setAttribute("aria-label", getStepAriaLabel(rowIndex, step));
      button.setAttribute("aria-pressed", String(pattern[rowIndex][step]));
      button.tabIndex = rowIndex === focusedCell.row && step === focusedCell.step ? 0 : -1;

      if (pattern[rowIndex][step]) {
        button.classList.add("is-active");
      }

      if (step === currentStep && isPlaying) {
        button.classList.add("is-current");
      }

      if (step % 4 === 0) {
        button.classList.add("bar-start");
      }

      button.addEventListener("focus", () => {
        focusedCell = { row: rowIndex, step };
        updateGrid();
      });

      button.addEventListener("keydown", handleStepKeydown);

      button.addEventListener("click", async () => {
        if (!(await prepareAudioContext())) {
          return;
        }
        clearUndoSnapshot();
        pattern[rowIndex][step] = !pattern[rowIndex][step];
        updateGrid();
        if (pattern[rowIndex][step]) {
          audioEngine.playInstrumentNow(instrument.id);
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
    button.setAttribute("aria-label", getStepAriaLabel(row, step));
    button.tabIndex = row === focusedCell.row && step === focusedCell.step ? 0 : -1;
  });
}

async function startPlayback() {
  if (isPlaying || isStartingPlayback) {
    return;
  }

  const startToken = playbackStartToken + 1;
  playbackStartToken = startToken;
  isStartingPlayback = true;
  const started = await audioEngine.start();

  if (startToken !== playbackStartToken) {
    if (started) {
      audioEngine.stop();
    }
    return;
  }

  isStartingPlayback = false;
  if (!started) {
    return;
  }

  isPlaying = true;
  currentStep = 0;
  playButton.textContent = "정지";
  updateGrid();
  updatePlaybackProgress();
}

playButton.addEventListener("click", async () => {
  if (isPlaying || isStartingPlayback) {
    stopPlayback();
    return;
  }

  await startPlayback();
});

clearButton.addEventListener("click", () => {
  rememberClearSnapshot();
  const canUndoClear = Boolean(clearSnapshot);
  pattern = pattern.map((row) => row.map(() => false));
  stopPlayback();
  updateGrid();
  const saved = persistCurrentBeat();
  if (canUndoClear && saved) {
    setFeedback("전체를 지웠어요. 실수였다면 지우기 취소를 누를 수 있어요.");
  }
});

undoClearButton.addEventListener("click", () => {
  if (!clearSnapshot || !clearSnapshotMatchesCurrentContext()) {
    setFeedback("복원할 리듬이 없어요.");
    clearUndoSnapshot();
    return;
  }

  const beatToRestore = clearSnapshot;
  const sourceToRestore = clearSnapshotSource;
  loadBeatIntoComposer(beatToRestore, sourceToRestore);
  persistCurrentBeat();
  clearUndoSnapshot();
  setFeedback("지우기 전 리듬을 복원했어요.");
});

tempoSlider.addEventListener("input", (event) => {
  clearUndoSnapshot();
  tempo = clampTempo(event.target.value);
  syncTempoUi();
  persistCurrentBeat();
});

patternNameInput.addEventListener("input", (event) => {
  clearUndoSnapshot();
  patternName = sanitizeName(event.target.value, currentSource === "shared" ? "친구 리듬" : "이름 없는 리듬");
  persistCurrentBeat();
});

slotSelect.addEventListener("change", (event) => {
  if (currentSource !== "slot") {
    return;
  }

  clearUndoSnapshot();
  slotsLibrary.activeSlotId = event.target.value;
  loadBeatIntoComposer(getActiveSlot().beat, "slot");
  setFeedback(`"${getActiveSlot().beat.name}" 슬롯으로 바꿨어요.`);
});

newSlotButton.addEventListener("click", () => {
  if (currentSource !== "slot") {
    return;
  }

  clearUndoSnapshot();
  const nextSlot = createSlot(createStarterBeat(getNextSlotName()), getNextSlotName());
  slotsLibrary.slots.unshift(nextSlot);
  slotsLibrary.activeSlotId = nextSlot.id;
  const saved = saveLibrary();
  loadBeatIntoComposer(nextSlot.beat, "slot");
  if (saved) {
    setFeedback(`새 슬롯 "${nextSlot.beat.name}"을 만들었어요.`);
  } else {
    setFeedback(`새 슬롯 "${nextSlot.beat.name}"을 만들었지만 브라우저 저장 공간에 저장하지 못했어요.`);
  }
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

  clearUndoSnapshot();
  slotsLibrary.slots = slotsLibrary.slots.filter((slot) => slot.id !== activeSlot.id);

  if (slotsLibrary.slots.length === 0) {
    const fallbackSlot = createSlot(createStarterBeat("리듬 1"), "리듬 1");
    slotsLibrary.slots = [fallbackSlot];
  }

  slotsLibrary.activeSlotId = slotsLibrary.slots[0].id;
  const saved = saveLibrary();
  loadBeatIntoComposer(getActiveSlot().beat, "slot");
  if (saved) {
    setFeedback("현재 슬롯을 삭제했어요.");
  } else {
    setFeedback("현재 슬롯을 삭제했지만 브라우저 저장 공간에 기록하지 못했어요.");
  }
});

saveSlotButton.addEventListener("click", () => {
  if (currentSource !== "slot") {
    return;
  }

  persistCurrentBeat();
});

async function copyShareUrlToClipboard(shareUrl) {
  try {
    await navigator.clipboard.writeText(shareUrl);
    setFeedback("공유 링크를 복사했어요.");
  } catch (error) {
    shareUrlInput.focus();
    shareUrlInput.select();
    setFeedback("자동 복사가 막혀 있어요. 아래 링크를 직접 복사해 주세요.");
  }
}

if (generateShareLinkButton) {
  generateShareLinkButton.addEventListener("click", () => {
    const { storedShareCode } = generateShareArtifactsForCurrentBeat();
    if (storedShareCode) {
      setFeedback("공유 링크와 QR 코드를 만들었어요.");
    } else {
      setFeedback("공유 링크와 QR 코드는 만들었지만 슬롯에는 저장하지 못했어요.");
    }
  });
}

if (copyShareLinkButton) {
  copyShareLinkButton.addEventListener("click", async () => {
    const shareUrl = shareUrlInput.value.trim();
    if (!shareUrl) {
      setFeedback("먼저 공유 링크 생성을 눌러 주세요.");
      return;
    }

    await copyShareUrlToClipboard(shareUrl);
  });
}

if (legacyShareLinkButton) {
  legacyShareLinkButton.addEventListener("click", async () => {
    const { shareUrl } = generateShareArtifactsForCurrentBeat();
    await copyShareUrlToClipboard(shareUrl);
  });
}

restoreSlotButton.addEventListener("click", () => {
  clearUndoSnapshot();
  loadBeatIntoComposer(getActiveSlot().beat, "slot");
  clearShareUrlFromAddressBar();
  setFeedback("내 슬롯으로 돌아왔어요. 친구 비트는 내 슬롯을 덮어쓰지 않았어요.");
});

saveAsMineButton.addEventListener("click", () => {
  clearUndoSnapshot();
  const sharedBeatCopy = createCurrentBeat();
  sharedBeatCopy.name = getUniqueSlotName(sharedBeatCopy.name);
  const sharedSlot = createSlot(
    sharedBeatCopy,
    sharedBeatCopy.name,
  );
  slotsLibrary.slots.unshift(sharedSlot);
  slotsLibrary.activeSlotId = sharedSlot.id;
  const saved = saveLibrary();
  if (saved) {
    removeStorageItem(storageKeys.sharedPreview);
    sharedBeat = null;
  }
  loadBeatIntoComposer(sharedSlot.beat, "slot");
  clearShareUrlFromAddressBar();
  if (saved) {
    setFeedback(`"${sharedSlot.beat.name}" 새 슬롯으로 저장했어요.`);
  } else {
    setFeedback(`"${sharedSlot.beat.name}" 새 슬롯을 만들었지만 브라우저 저장 공간에 저장하지 못했어요.`);
  }
});

restoreSharedPreviewButton.addEventListener("click", () => {
  if (!sharedBeat) {
    setFeedback("이어 볼 친구 비트가 없어요.");
    updateModeUi();
    return;
  }

  clearUndoSnapshot();
  loadBeatIntoComposer(sharedBeat, "shared");
  setFeedback("최근 친구 비트를 이어서 열었어요. 내 슬롯들은 그대로 남아 있어요.");
});

renderStepLabels();
renderGrid();
loadLibrary();
const sharedBeatFromUrl = getSharedBeatFromUrl();
sharedBeat = sharedBeatFromUrl || normalizeBeat(loadJsonFromStorage(storageKeys.sharedPreview));

if (sharedBeatFromUrl) {
  saveJsonToStorage(storageKeys.sharedPreview, sharedBeatFromUrl);
  sharedBeat = sharedBeatFromUrl;
}

if (sharedBeatFromUrl) {
  loadBeatIntoComposer(sharedBeat, "shared");
  setFeedback("친구가 보낸 비트를 열었어요. 내 슬롯들은 안전하게 따로 저장되어 있어요.");
} else {
  loadBeatIntoComposer(getActiveSlot().beat, "slot");
  setFeedback(`"${getActiveSlot().beat.name}" 슬롯을 불러왔어요.`);
}
