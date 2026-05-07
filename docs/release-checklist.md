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
