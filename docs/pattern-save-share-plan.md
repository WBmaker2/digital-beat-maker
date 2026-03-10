# Pattern Save and Share Improvement Plan

## Goal

- Keep a student's own beat safe in the browser even when they open a friend's shared link.
- Allow shared beats to be played, inspected, and optionally copied into the student's own workspace.
- Preserve the app as a static client-only project with no backend dependency.

## Development Workflow

### 1. Analyze Requirements

- The current app keeps only one live beat state, so any future restore logic would risk overwriting the student's own work.
- The new behavior must separate:
  - `draft`: the student's own beat that auto-saves locally
  - `shared`: a beat loaded from a URL that should not overwrite the draft automatically
- Shared-link playback is a core use case, but it must never silently erase the local draft.

### 2. Design Architecture

- Introduce two storage buckets in `localStorage`:
  - `digital-beat-maker:draft`
  - `digital-beat-maker:shared-preview`
- Introduce two in-memory beat models:
  - `draftBeat`
  - `sharedBeat`
- Track which source is currently visible with `currentSource`.
- Keep the editable composer state (`pattern`, `tempo`) separate from stored snapshots.

### 3. UX Rules

- On normal open with no share URL:
  - load `draftBeat`
  - auto-save edits back to `draft`
- On open with a share URL:
  - load the URL beat as `sharedBeat`
  - show a mode badge that the user is viewing a shared beat
  - keep `draftBeat` untouched in storage
- In shared mode:
  - playback works normally
  - edits affect only the shared preview slot
  - the user can press `내 비트로 돌아가기` to restore the local draft
  - the user can press `이 비트를 내 작업으로 저장` to copy the shared beat into the draft slot

### 4. Serialization Strategy

- Encode `tempo` and `pattern` into a compact JSON payload.
- Convert the payload to URL-safe Base64 for a `?beat=` query parameter.
- Validate decoded data before applying it to the composer.

### 5. Implementation Plan

- Update `index.html`
  - add a save/share panel
  - add mode badge and helper text
  - add `내 비트 저장`, `공유 링크 복사`, `내 비트로 돌아가기`, `이 비트를 내 작업으로 저장` buttons
  - add a readonly field for the generated share URL
- Update `styles.css`
  - style the new panel, badge, helper text, and link field
  - keep the controls readable on mobile
- Update `app.js`
  - add storage helpers
  - add encode/decode helpers
  - add source-aware save behavior
  - clear the URL when returning to draft mode

### 6. Verification

- Confirm draft auto-saves during normal editing.
- Confirm opening a shared link does not overwrite the existing draft.
- Confirm `내 비트로 돌아가기` restores the previous draft.
- Confirm `이 비트를 내 작업으로 저장` intentionally replaces the draft.
- Confirm a copied share link recreates the same visible beat.
- Confirm the new controls remain usable on mobile widths.

## Risks and Guardrails

- Invalid or tampered share URLs must fail safely and fall back to the draft.
- Clipboard access may be blocked by the browser, so the generated link should still be visible in a readonly field.
- Switching sources while playing should stop and reset playback to avoid state drift.
