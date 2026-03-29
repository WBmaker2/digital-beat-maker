# 리듬 숙제장 - QA Findings

## Summary
- This is a planning-only demo. No implemented frontend, backend, or deployable preview exists yet.
- The design, API contract, frontend status, and backend status artifacts are sufficiently aligned for implementation to start.
- Release is not ready. The current state is a pre-build QA gate, not a ship gate.

## Current Blockers
- No runnable application exists yet, so no success-path, error-path, or integration-path verification can be executed.
- The backend schema and route implementation are still unbuilt, so all API behavior remains contract-only.
- The student submission experience is not fully decided in the frontend handoff. The open question is whether v1 uses a preset preview or a live rhythm editor.
- Parent lookup scope is still undecided in the frontend handoff. The open question is whether v1 uses student name only or student name plus class code.
- Teacher dashboard disclosure of raw access keys versus copyable links is still unresolved and could affect both UX and security expectations.

## Planned Verification Checks
- Verify the landing page exposes the three role entry points and that each is visually distinct on mobile and desktop.
- Verify the teacher dashboard loads assignment summaries, list states, and an empty-state CTA.
- Verify assignment creation validates required fields, due date, and rhythm example input before publish.
- Verify student submission accepts the access key, displays the assignment detail, and submits a rhythm pattern successfully.
- Verify parent status lookup works only with the correct parent lookup key and student name.
- Verify validation errors render inline at the field level, not only in a banner.
- Verify conflict handling for duplicate student submissions returns `409 CONFLICT`.
- Verify route-level loading and error states appear for teacher, student, and parent pages.
- Verify the frontend preserves cookies for teacher requests and does not leak secret keys in public responses.
- Verify the preview build and production build both pass after implementation.

## Reproduction / Evidence Plan
- Start the app locally once implementation exists.
- Open `/` and confirm role CTAs are present.
- Open `/teacher` and confirm skeleton, empty, and loaded dashboard states behave as designed.
- Open `/teacher/assignments/new` and submit with missing title, invalid date, and valid data to compare validation and success behavior.
- Open `/student/[assignmentId]` with and without `?accessKey=...` to verify public access gating.
- Open `/parent/status` with correct and incorrect `parentLookupKey` values to verify lookup behavior.
- Call `POST /api/assignments`, `GET /api/assignments/[assignmentId]`, `POST /api/assignments/[assignmentId]/submissions`, and `GET /api/assignments/[assignmentId]/parent-status` against a local preview or test environment.
- Capture response payloads and compare them against `_workspace/01_demo_api_contracts.md`.
- Record any mismatches in `_workspace/03_demo_qa_findings.md` with exact request bodies, URLs, and returned error codes.

## Risk Assessment
- Contract drift risk is moderate until the frontend and backend are implemented against the same artifact set.
- Duplicate-submission handling needs early confirmation because it affects both teacher expectations and student retry behavior.
- Access-key handling needs a quick security review once code exists because the design intentionally uses lightweight sharing for v1.

## QA Decision
- Implementation can start now.
- Release cannot proceed yet.
- The next useful gate is an implementation QA pass after the first frontend/backend slices land.
