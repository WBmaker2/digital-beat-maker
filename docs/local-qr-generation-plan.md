# Local QR Generation Plan

## Goal

- Remove the external QR image dependency.
- Generate QR codes fully inside the browser so the app can work without a QR service.
- Keep existing shared links usable while moving new links to a shorter payload format.

## Development Workflow

### 1. Analyze Requirements

- The current QR preview depends on `api.qrserver.com`, which breaks the offline-friendly goal.
- Shared links are long because the payload is JSON with boolean arrays.
- A local QR renderer is realistic only if the payload stays small enough for a compact QR version.
- Existing `?beat=` links should remain readable after the change.

### 2. Design Architecture

- Vendor a proven MIT QR encoder locally and wrap it with a small canvas renderer in the browser.
- Render the QR into a `<canvas>` inside the existing share panel.
- Replace the new share payload with a compact binary format:
  - version byte
  - tempo byte
  - packed 64-step rhythm bits
  - UTF-8 name length + name bytes
- Keep the decoder backward-compatible with the older JSON Base64 payloads.

### 3. UX Rules

- When the user creates a share link:
  - generate the shorter local payload
  - display the link
  - render the QR locally on canvas
- If QR generation fails:
  - keep the share link visible
  - show a clear fallback message instead of a broken image

### 4. Implementation Plan

- Update `index.html`
  - swap the QR `<img>` for a `<canvas>`
  - load a local QR helper script before `app.js`
- Add `qr-code.js`
  - include a local QR engine and a small canvas renderer wrapper
  - support the new compact share URLs entirely in-browser
- Update `app.js`
  - remove the external QR URL dependency
  - add compact share payload encoding
  - keep decode support for both compact and legacy payloads
  - call the local QR renderer when a share link is generated

### 5. Verification

- Confirm the share panel renders a QR without network requests.
- Confirm the QR canvas updates for the current share link.
- Confirm the link decodes to the same beat state as before.
- Confirm an old share link still opens correctly.
- Confirm mobile layout still shows the QR panel cleanly.

## Risks and Guardrails

- The local QR encoder must handle the actual production share URL length, not just localhost.
- Compact payload parsing must fail safely for malformed data.
- If a future URL becomes too long for the supported QR versions, the app should keep the link and show a useful fallback message.
