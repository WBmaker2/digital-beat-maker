# 리듬 숙제장 - Release Plan

## Status
- This project is still in planning and pre-implementation stage.
- Production deploy is not recommended at this time.

## Preview Readiness Conditions
- Design wireframes and UI handoff are complete in `_workspace/01_demo_design_wireframes.md` and `_workspace/01_demo_design_handoff.md`.
- API contract is complete in `_workspace/01_demo_api_contracts.md`.
- Frontend and backend implementation tasks are clearly scoped in `_workspace/02_demo_frontend_status.md` and `_workspace/02_demo_backend_status.md`.
- QA findings in `_workspace/03_demo_qa_findings.md` show no blocking contract issues.
- A runnable preview build exists and passes smoke checks for teacher, student, and parent flows.
- Environment variables for Supabase and deployment are documented and verified in the target environment.

## Production Gating Conditions
- Frontend routes and backend route handlers are implemented against the shared contract.
- Teacher create, student submit, and parent lookup flows all pass end-to-end smoke checks.
- Validation failures return the documented error shape and status codes.
- Duplicate submission behavior is confirmed and intentional.
- Auth and access-key handling have been reviewed for the preview build.
- No P0 or P1 findings remain in QA.
- Release notes and rollback steps are written and approved.

## Rollback Expectations
- Keep the previous successful preview or production deployment available for rollback.
- If a release regression is detected, revert to the last known good deployment before attempting a hotfix.
- If schema changes are introduced later, deployment must include a rollback-safe migration plan.
- If access-key or auth behavior breaks, disable the affected release path before expanding traffic.

## Recommended Next Step
- Implement the first frontend and backend slices, then run an implementation QA pass before considering production.
