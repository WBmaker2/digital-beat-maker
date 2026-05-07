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
    const scheduledAudioNodes = new Set();
    const audioCleanupTimerIds = new Map();

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

    function releaseScheduledAudioNode(node) {
      const timerId = audioCleanupTimerIds.get(node);
      if (timerId) {
        window.clearTimeout(timerId);
        audioCleanupTimerIds.delete(node);
      }

      scheduledAudioNodes.delete(node);
      if (typeof node.disconnect === "function") {
        try {
          node.disconnect();
        } catch (error) {
          // The node may already be disconnected after its natural stop.
        }
      }
    }

    function trackScheduledAudioNode(node, stopTime) {
      scheduledAudioNodes.add(node);
      const cleanupDelayMs = Math.max(0, (stopTime - audioContext.currentTime) * 1000) + 250;
      const timerId = window.setTimeout(() => {
        releaseScheduledAudioNode(node);
      }, cleanupDelayMs);
      audioCleanupTimerIds.set(node, timerId);
    }

    function startSourceNode(node, startTime, stopTime, trackPlaybackNode) {
      node.start(startTime);
      node.stop(stopTime);

      if (trackPlaybackNode) {
        trackScheduledAudioNode(node, stopTime);
      }
    }

    function stopScheduledAudioNodes() {
      scheduledAudioNodes.forEach((node) => {
        try {
          node.stop(audioContext.currentTime);
        } catch (error) {
          // stop() can throw if the source already finished; cleanup still matters.
        }
        releaseScheduledAudioNode(node);
      });
      scheduledAudioNodes.clear();
      audioCleanupTimerIds.forEach((timerId) => window.clearTimeout(timerId));
      audioCleanupTimerIds.clear();
    }

    function playKick(time, trackPlaybackNode) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(140, time);
      oscillator.frequency.exponentialRampToValueAtTime(45, time + 0.18);
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      startSourceNode(oscillator, time, time + 0.2, trackPlaybackNode);
    }

    function playSnare(time, trackPlaybackNode) {
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

      startSourceNode(noise, time, time + 0.2, trackPlaybackNode);
      startSourceNode(toneOsc, time, time + 0.12, trackPlaybackNode);
    }

    function playHiHat(time, trackPlaybackNode) {
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

      startSourceNode(noise, time, time + 0.06, trackPlaybackNode);
    }

    function playClap(time, trackPlaybackNode) {
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

        startSourceNode(noise, time + offset, time + offset + 0.09, trackPlaybackNode);
      });
    }

    function playInstrument(instrumentId, time, trackPlaybackNode = false) {
      if (instrumentId === "kick") {
        playKick(time, trackPlaybackNode);
        return;
      }

      if (instrumentId === "snare") {
        playSnare(time, trackPlaybackNode);
        return;
      }

      if (instrumentId === "hihat") {
        playHiHat(time, trackPlaybackNode);
        return;
      }

      playClap(time, trackPlaybackNode);
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
          playInstrument(instrument.id, time, true);
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

      stop();
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
      stopScheduledAudioNodes();
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
