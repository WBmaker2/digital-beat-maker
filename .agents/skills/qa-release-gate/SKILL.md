---
name: qa-release-gate
description: Run the final validation and release gate for a website feature by comparing contracts, UI behavior, and deployment readiness.
---

# QA Release Gate

Use this skill when implementation is ready for integration checks, preview verification, or release planning.

## Trigger
- Frontend and backend slices have both landed
- A preview or deploy decision is approaching
- The team needs a reproducible QA artifact and release notes

## Do Not Trigger
- Early ideation
- Single isolated design draft with no runnable surface

## Inputs
- Acceptance criteria
- `_workspace/01_api_contracts.md`
- `_workspace/02_frontend_status.md`
- `_workspace/02_backend_status.md`
- Available test commands or smoke-check routes

## Outputs
- `_workspace/03_qa_findings.md`
- `_workspace/04_release_plan.md`
- `_workspace/04_release_notes.md`

## Procedure
1. Verify success, error, retry, and empty states at the frontend-backend boundary.
2. Record exact commands, routes, and evidence.
3. Separate blockers from low-risk follow-ups.
4. Write preview checks, production steps, and rollback notes.

## Should Trigger
- "배포 전에 QA 게이트를 통과시켜줘"
- "프리뷰 검증이랑 릴리즈 노트를 같이 정리해줘"

## Should Not Trigger
- "아이디어만 브레인스토밍하자"
- "아직 API 계약도 안 정해졌어"
