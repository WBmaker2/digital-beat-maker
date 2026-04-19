const { test, expect } = require("@playwright/test");

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
