---
name: fullstack-contracts
description: Define and validate frontend-backend contracts for routes, API payloads, state transitions, and failure modes before or during implementation.
---

# Fullstack Contracts

Use this skill when frontend and backend work need a shared agreement that prevents integration drift.

## Trigger
- React/Next.js UI depends on API data
- Multiple workers will implement against the same feature
- QA needs a concrete boundary to verify

## Do Not Trigger
- Purely static pages
- Refactors that do not change data boundaries

## Inputs
- Product flow or feature brief
- Existing routes, API paths, or schemas
- Design handoff when present

## Outputs
- `_workspace/01_api_contracts.md`

## Procedure
1. List each page or action that crosses the UI/API boundary.
2. For every action, define request shape, response shape, error shape, and empty-state behavior.
3. Note auth, caching, optimistic UI, or retry assumptions.
4. Call out mocked, deferred, or out-of-scope backend behavior explicitly.

## Should Trigger
- "프론트와 백엔드를 병렬로 진행해야 해"
- "응답 shape부터 합의하고 구현하자"

## Should Not Trigger
- "정적 소개 페이지 하나 만들어줘"
- "문장 다듬기만 해줘"
