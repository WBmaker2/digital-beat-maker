# Pattern Library, Naming, and QR Share Plan

## Goal

- Let students name each beat pattern clearly.
- Support multiple personal beat slots in the same browser.
- Keep shared-link playback safe so it never overwrites existing personal slots.
- Add a QR code view for easier classroom sharing on tablets and phones.

## Development Workflow

### 1. Analyze Requirements

- The current save model supports only one local draft and one shared preview.
- Pattern naming needs to travel with both local saves and shared links.
- Multiple personal slots require an indexed storage model instead of a single draft key.
- Shared beats must remain isolated from personal slots unless the user explicitly saves them.
- QR sharing should reuse the same share link payload instead of inventing a second format.

### 2. Design Architecture

- Replace the single draft key with a slot library object in `localStorage`.
- Storage model:
  - `digital-beat-maker:slots-library`
  - `digital-beat-maker:shared-preview`
  - `digital-beat-maker:draft` kept only as a legacy migration source
- Slot library shape:
  - `version`
  - `activeSlotId`
  - `slots[]`
- Each slot contains:
  - `id`
  - `updatedAt`
  - `beat`
- Each beat contains:
  - `name`
  - `tempo`
  - `pattern`

### 3. UX Rules

- In normal mode:
  - the student edits one named personal slot at a time
  - changes auto-save into the active slot
  - the student can switch slots, add a slot, or delete the current slot
- In shared mode:
  - the student can play and edit the shared preview safely
  - personal slots stay untouched
  - the student can return to the active personal slot
  - the student can save the shared beat as a new personal slot
- Sharing:
  - the current beat name is included in the share link payload
  - QR code generation uses the same link
  - the QR should only refresh when the user explicitly generates a fresh share link

### 4. Migration Strategy

- If the new slot library is missing but the old draft exists:
  - convert the old draft into the first named slot
  - preserve the user’s previous beat instead of resetting it
- Old shared links without a name should still load with a safe default title.

### 5. Implementation Plan

- Update `index.html`
  - add a pattern name input
  - add slot chooser and slot actions
  - extend the share panel with QR preview UI
- Update `styles.css`
  - style the naming and slot controls
  - style the QR panel and make it readable on narrow screens
- Update `app.js`
  - replace draft storage with slot-library helpers
  - migrate legacy draft data
  - include `name` in serialized share payloads
  - add slot create, delete, switch, and shared-to-slot save flows
  - add QR image generation from the current share URL

### 6. Verification

- Confirm an existing draft migrates into the new slot library.
- Confirm name edits persist inside the active slot.
- Confirm creating and switching between slots preserves each beat independently.
- Confirm deleting a slot chooses a safe replacement slot.
- Confirm a shared link opens in isolated mode and does not overwrite any saved slot.
- Confirm saving a shared beat creates a new named slot.
- Confirm the generated QR code matches the visible share URL.

## Risks and Guardrails

- QR preview uses a remote QR image endpoint, so QR rendering depends on network access even though the app itself remains static.
- Shared-link payloads get longer once names are included, so validation must reject malformed data safely.
- Slot deletion should never leave the app with zero usable personal slots.
