# Example Run

This example shows how the lead agent can use the fullstack website harness on a realistic project.

## Example Project

- Product: 교사-학생 과제 제출 웹사이트
- Users: 초등 교사, 학생, 학부모
- Core outcome: 과제를 생성하고 제출 상태를 확인하는 반응형 웹사이트
- Frontend: Next.js App Router
- Backend: Next.js Route Handlers
- Data: Supabase Auth + Postgres
- Deploy: Vercel

## 1. Lead kickoff prompt

```markdown
You are the lead agent for a fullstack website delivery pipeline.

Goal:
- Build and coordinate a fullstack website from wireframe through deployment.

Project Brief:
- Product: 교사-학생 과제 제출 웹사이트
- Users: 초등 교사, 학생, 학부모
- Core outcome: 교사가 과제를 등록하고 학생이 제출하며 학부모가 진행 상태를 확인할 수 있어야 한다.
- In scope:
  - 홈 / 소개 페이지
  - 교사 대시보드
  - 학생 제출 페이지
  - 제출 상태 API
  - 모바일 대응
- Out of scope:
  - 결제
  - 알림톡 연동
  - 관리자 분석 대시보드

Technical Context:
- Frontend: React / Next.js
- Backend: Next.js Route Handlers
- Data/services: Supabase Auth + Postgres
- Deployment target: Vercel preview and production
- Constraints: 1차 출시, 접근성 기본 준수, 모바일 우선, SEO는 홈 페이지만 우선

Use the harness files in `agents/`, `.agents/skills/`, and `_workspace/`.
Define contracts first, then fan out design/frontend/backend, then run QA and release planning.
```

## 2. Lead plan in `update_plan`

```text
1. Define goals, acceptance criteria, and artifact paths
2. Write design wireframes and UI handoff
3. Write frontend-backend contracts
4. Spawn frontend and backend workers in parallel
5. Run QA on integrated flows
6. Prepare release plan and release notes
```

## 3. Initial handoff files

The lead writes:

- `_workspace/01_design_wireframes.md`
  - page map
  - teacher flow
  - student flow
  - parent status-check flow
- `_workspace/01_design_handoff.md`
  - route list
  - page sections
  - component inventory
  - empty/loading/error states
- `_workspace/01_api_contracts.md`
  - `GET /api/assignments`
  - `POST /api/submissions`
  - `GET /api/submissions/:id`
  - auth assumptions
  - error payloads

## 4. Worker fan-out

### Design worker

```text
Goal: Turn the brief into text wireframes and a UI handoff.
Read: agents/product-design-architect.md
Write: _workspace/01_design_wireframes.md and _workspace/01_design_handoff.md
Success: frontend can implement without guessing page structure or missing states.
```

### Frontend worker

```text
Goal: Build the public pages, teacher dashboard shell, and student submission flow in Next.js.
Ownership:
- app/
- components/
- styles or design tokens used by these routes
Read:
- agents/nextjs-frontend-builder.md
- _workspace/01_design_handoff.md
- _workspace/01_api_contracts.md
Write:
- _workspace/02_frontend_status.md
Success:
- routes render
- loading/error/empty states exist
- API calls match the written contract
```

### Backend worker

```text
Goal: Implement assignment and submission endpoints with validation.
Ownership:
- app/api/
- lib/server/
- schema or validation files tied to these endpoints
Read:
- agents/api-backend-builder.md
- _workspace/01_api_contracts.md
Write:
- _workspace/02_backend_status.md
Success:
- endpoints match request/response shapes
- invalid input returns explicit error payloads
- auth assumptions are documented
```

## 5. Mid-flight coordination

Examples of lead follow-up:

- If frontend needs a missing response field:
  - update `_workspace/01_api_contracts.md`
  - send a focused follow-up to backend
- If backend adds a server-side constraint:
  - add it to the contract file
  - notify frontend to reflect the same validation in the UI

Example `send_input` to backend:

```text
Update scope: add `submissionCount` and `lastSubmittedAt` to the assignment list response.
Reflect the change in `_workspace/02_backend_status.md` and keep the existing error payload shape unchanged.
```

## 6. QA gate

The lead starts QA after frontend and backend both produce usable outputs.

QA brief:

```text
Verify the assignment creation and submission flows against `_workspace/01_api_contracts.md`.
Read `agents/qa-integration-worker.md`, `_workspace/02_frontend_status.md`, and `_workspace/02_backend_status.md`.
If possible, run the project locally and record commands, evidence, and findings in `_workspace/03_qa_findings.md`.
```

Expected QA checks:

- teacher can create an assignment
- student can submit successfully
- invalid submission shows a useful error
- empty assignment list is rendered intentionally
- UI states match API payloads

## 7. Release stage

The lead asks release to convert QA status into launch guidance.

Release brief:

```text
Prepare preview checks, production steps, and rollback notes for the assignment website.
Read `agents/release-coordinator.md` and `_workspace/03_qa_findings.md`.
Write `_workspace/04_release_plan.md` and `_workspace/04_release_notes.md`.
```

Expected outputs:

- preview URL checklist
- env var checklist
- production deploy steps
- rollback actions
- shipped scope summary
- known follow-up issues

## 8. Final lead summary

The lead finishes with:

- what shipped
- what was verified
- unresolved risks
- whether deployment is recommended now or after one more fix

## Why this example matters

This run shows the intended order:

1. clarify scope
2. write design + contracts
3. fan out frontend/backend
4. gate with QA
5. finish with release planning

That order keeps the team aligned and prevents the usual frontend-backend drift.
