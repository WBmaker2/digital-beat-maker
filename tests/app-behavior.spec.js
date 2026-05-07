const { test, expect } = require("@playwright/test");

async function toggleStep(page, row, step) {
  await page.locator(`.step-button[data-row="${row}"][data-step="${step}"]`).click();
}

async function expectStepState(page, row, step, pressed) {
  await expect(page.locator(`.step-button[data-row="${row}"][data-step="${step}"]`)).toHaveAttribute(
    "aria-pressed",
    String(pressed),
  );
}

test("storage failures keep a failure message instead of showing a saved message", async ({ page }) => {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem;
    Object.defineProperty(Storage.prototype, "setItem", {
      configurable: true,
      value(key, value) {
        if (String(key).startsWith("digital-beat-maker:")) {
          throw new DOMException("Storage unavailable", "QuotaExceededError");
        }
        return originalSetItem.call(this, key, value);
      },
    });
  });

  await page.goto("/");
  await page.locator("#pattern-name").fill("저장 실패 테스트");

  await expect(page.locator("#save-feedback")).toContainText(/저장하지 못|저장 공간/);
  await expect(page.locator("#save-feedback")).not.toContainText("저장했어요");
});

test("uses webkitAudioContext when standard AudioContext is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: undefined,
    });

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
        window.__usedWebkitAudioContext = true;
        this.currentTime = 0;
        this.destination = {};
        this.sampleRate = 44100;
        this.state = "running";
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

    window.webkitAudioContext = FakeAudioContext;
  });

  await page.goto("/");
  await page.locator("#play-toggle").click();

  await expect(page.locator("#play-toggle")).toHaveText("정지");
  await expect.poll(() => page.evaluate(() => window.__usedWebkitAudioContext)).toBe(true);
});

test("offers to reopen a saved shared draft when returning without a beat URL", async ({ page }) => {
  await page.goto("/");
  await page.locator("#generate-share-link").click();
  const shareUrl = await page.locator("#share-url").inputValue();

  await page.goto(shareUrl);
  await expect(page.locator("#mode-badge")).toHaveText("친구 비트");
  await page.locator("#pattern-name").fill("수정한 친구 비트");

  await page.goto("/");
  await expect(page.locator("#restore-shared-preview")).toBeVisible();
  await page.locator("#restore-shared-preview").click();

  await expect(page.locator("#mode-badge")).toHaveText("친구 비트");
  await expect(page.locator("#pattern-name")).toHaveValue("수정한 친구 비트");
});

test("step grid supports arrow-key focus movement", async ({ page }) => {
  await page.goto("/");
  await page.locator('.step-button[data-row="0"][data-step="0"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('.step-button[data-row="0"][data-step="1"]')).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(page.locator('.step-button[data-row="1"][data-step="1"]')).toBeFocused();
});

test("instrument labels stay visible while the mobile grid scrolls horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");

  const before = await page.locator(".sequencer-grid .grid-row").first().locator(".row-label").boundingBox();
  await page.locator(".grid-wrapper").evaluate((element) => {
    element.scrollLeft = 260;
  });
  const after = await page.locator(".sequencer-grid .grid-row").first().locator(".row-label").boundingBox();

  expect(Math.abs(after.x - before.x)).toBeLessThan(2);
});

test("share link round-trip preserves pattern, tempo, and name", async ({ page }) => {
  await page.goto("/");
  await page.locator("#clear-pattern").click();
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

test("editing a saved slot invalidates stale share artifacts until regenerated", async ({ page }) => {
  await page.goto("/");
  await page.locator("#generate-share-link").click();
  const firstShareUrl = await page.locator("#share-url").inputValue();
  await expect(page.locator("#share-qr")).toBeVisible();

  await toggleStep(page, 0, 2);

  await expect(page.locator("#share-url")).toHaveValue("");
  await expect(page.locator("#share-qr")).toHaveAttribute("hidden", "");
  await expect(page.locator("#qr-placeholder")).toBeVisible();

  await page.locator("#generate-share-link").click();
  const secondShareUrl = await page.locator("#share-url").inputValue();

  expect(secondShareUrl).not.toBe(firstShareUrl);
  await expect(page.locator("#share-qr")).toBeVisible();
});

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

  await expect(page.locator("#share-url")).toHaveValue(/\?beat=/);
  await expect(page.locator("#share-qr")).toBeHidden();
  await expect(page.locator("#qr-placeholder")).toContainText("QR 생성기");
});

test("QR render failure shows link-only recovery guidance", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.LocalQrCode.renderToCanvas = () => {
      throw new Error("QR too long");
    };
  });

  await page.locator("#generate-share-link").click();

  await expect(page.locator("#share-url")).toHaveValue(/\?beat=/);
  await expect(page.locator("#share-qr")).toBeHidden();
  await expect(page.locator("#qr-placeholder")).toContainText("직접 복사");
});

test("slot lifecycle keeps user data isolated", async ({ page }) => {
  await page.goto("/");
  await page.locator("#clear-pattern").click();
  await page.locator("#pattern-name").fill("첫 슬롯");
  await toggleStep(page, 0, 0);

  await page.locator("#new-slot").click();
  await expect(page.locator("#pattern-name")).toHaveValue(/리듬 \d+/);
  await page.locator("#clear-pattern").click();
  await page.locator("#pattern-name").fill("둘째 슬롯");
  await toggleStep(page, 2, 5);

  const firstSlotValue = await page.locator("#slot-select option", { hasText: "첫 슬롯" }).getAttribute("value");
  await page.locator("#slot-select").selectOption(firstSlotValue);
  await expect(page.locator("#pattern-name")).toHaveValue("첫 슬롯");
  await expectStepState(page, 0, 0, true);
  await expectStepState(page, 2, 5, false);

  const secondSlotValue = await page.locator("#slot-select option", { hasText: "둘째 슬롯" }).getAttribute("value");
  await page.locator("#slot-select").selectOption(secondSlotValue);
  await expect(page.locator("#pattern-name")).toHaveValue("둘째 슬롯");
  await expectStepState(page, 0, 0, false);
  await expectStepState(page, 2, 5, true);
});

test("playback advances the visual step and clears it when stopped", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeAudioParam {
      setValueAtTime() {}
      exponentialRampToValueAtTime() {}
    }

    window.__fakeSourceNodes = [];

    class FakeNode {
      constructor(type) {
        this.type = type;
        this.frequency = new FakeAudioParam();
        this.gain = new FakeAudioParam();
        this.Q = { value: 0 };
        this.startTimes = [];
        this.stopTimes = [];
      }
      connect() {}
      disconnect() {}
      start(time) {
        this.startTimes.push(time);
      }
      stop(time) {
        this.stopTimes.push(time);
      }
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
        const node = new FakeNode("source");
        window.__fakeSourceNodes.push(node);
        return node;
      }
      createGain() {
        return new FakeNode("gain");
      }
      createBiquadFilter() {
        return new FakeNode("filter");
      }
      createBufferSource() {
        const node = new FakeNode("source");
        window.__fakeSourceNodes.push(node);
        return node;
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
  await expect(page.locator(".step-button.is-current")).toHaveCount(4);

  const firstStep = await page.locator(".step-button.is-current").first().getAttribute("data-step");
  await expect(page.locator(`.step-button.is-current[data-step="${firstStep}"]`)).toHaveCount(4);
  await page.waitForTimeout(260);
  await expect(page.locator(".step-button.is-current")).toHaveCount(4);
  const laterStep = await page.locator(".step-button.is-current").first().getAttribute("data-step");
  await expect(page.locator(`.step-button.is-current[data-step="${laterStep}"]`)).toHaveCount(4);

  expect(laterStep).not.toBe(firstStep);

  await page.locator("#play-toggle").click();
  await expect(page.locator("#play-toggle")).toHaveText("재생");
  await expect(page.locator(".step-button.is-current")).toHaveCount(0);

  const scheduledSources = await page.evaluate(() =>
    window.__fakeSourceNodes.map((node) => ({
      startCount: node.startTimes.length,
      stopCount: node.stopTimes.length,
    })),
  );
  expect(scheduledSources.length).toBeGreaterThan(0);
  expect(scheduledSources.every((node) => node.startCount === 0 || node.stopCount >= 2)).toBe(true);

  await page.waitForTimeout(180);
  await expect(page.locator("#play-toggle")).toHaveText("재생");
  await expect(page.locator(".step-button.is-current")).toHaveCount(0);
});

test("playback progress label updates while playing", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#playback-progress")).toHaveText("정지 중");

  await page.locator("#play-toggle").click();
  await expect(page.locator("#playback-progress")).toContainText(/현재 \d+박 \/ 16박/);

  await page.locator("#play-toggle").click();
  await expect(page.locator("#playback-progress")).toHaveText("정지 중");
});

test("clearing while audio resume is pending cancels the stale playback start", async ({ page }) => {
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
      disconnect() {}
      start() {}
      stop() {}
    }

    class FakeAudioContext {
      constructor() {
        this.startedAt = Date.now();
        this.destination = {};
        this.sampleRate = 44100;
        this.state = "suspended";
      }
      get currentTime() {
        return (Date.now() - this.startedAt) / 1000;
      }
      resume() {
        window.__resumeRequested = true;
        return new Promise((resolve) => {
          window.__resolveAudioResume = () => {
            this.state = "running";
            resolve();
          };
        });
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
  await expect.poll(() => page.evaluate(() => window.__resumeRequested)).toBe(true);

  await page.locator("#clear-pattern").click();
  await expect(page.locator("#play-toggle")).toHaveText("재생");
  await page.evaluate(() => window.__resolveAudioResume());

  await page.waitForTimeout(220);
  await expect(page.locator("#play-toggle")).toHaveText("재생");
  await expect(page.locator(".step-button.is-current")).toHaveCount(0);
});

test("clear pattern can be undone once", async ({ page }) => {
  await page.goto("/");
  await page.locator("#clear-pattern").click();
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

test("clearing an already empty pattern keeps the previous undo snapshot", async ({ page }) => {
  await page.goto("/");
  await page.locator("#clear-pattern").click();
  await toggleStep(page, 1, 1);
  await toggleStep(page, 3, 3);

  await page.locator("#clear-pattern").click();
  await expect(page.locator("#undo-clear")).toBeVisible();
  await page.locator("#clear-pattern").click();
  await expect(page.locator("#undo-clear")).toBeVisible();

  await page.locator("#undo-clear").click();

  await expectStepState(page, 1, 1, true);
  await expectStepState(page, 3, 3, true);
  await expect(page.locator("#undo-clear")).toBeHidden();
});

test("slot navigation after clear prevents undo from overwriting another slot", async ({ page }) => {
  await page.goto("/");
  await page.locator("#clear-pattern").click();
  await page.locator("#pattern-name").fill("Slot A Review");
  await toggleStep(page, 1, 1);

  await page.locator("#new-slot").click();
  await page.locator("#clear-pattern").click();
  await page.locator("#pattern-name").fill("Slot B Review");
  await toggleStep(page, 3, 3);

  const slotAValue = await page.locator("#slot-select option", { hasText: "Slot A Review" }).getAttribute("value");
  await page.locator("#slot-select").selectOption(slotAValue);
  await expect(page.locator("#pattern-name")).toHaveValue("Slot A Review");
  await expectStepState(page, 1, 1, true);

  await page.locator("#clear-pattern").click();
  await expect(page.locator("#undo-clear")).toBeVisible();
  await expectStepState(page, 1, 1, false);

  const slotBValue = await page.locator("#slot-select option", { hasText: "Slot B Review" }).getAttribute("value");
  await page.locator("#slot-select").selectOption(slotBValue);

  await expect(page.locator("#undo-clear")).toBeHidden();
  await expect(page.locator("#pattern-name")).toHaveValue("Slot B Review");
  await expectStepState(page, 1, 1, false);
  await expectStepState(page, 3, 3, true);

  await page.locator("#slot-select").selectOption(slotAValue);
  await expect(page.locator("#pattern-name")).toHaveValue("Slot A Review");
  await expectStepState(page, 1, 1, false);
  await expectStepState(page, 3, 3, false);
});

test("storage failure during clear keeps failure guidance visible", async ({ page }) => {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem;
    Object.defineProperty(Storage.prototype, "setItem", {
      configurable: true,
      value(key, value) {
        if (String(key).startsWith("digital-beat-maker:")) {
          throw new DOMException("Storage unavailable", "QuotaExceededError");
        }
        return originalSetItem.call(this, key, value);
      },
    });
  });

  await page.goto("/");
  await page.locator("#clear-pattern").click();

  await expect(page.locator("#undo-clear")).toBeVisible();
  await expect(page.locator("#save-feedback")).toContainText(/저장하지 못|저장 공간/);
  await expect(page.locator("#save-feedback")).not.toContainText("실수였다면");
});
