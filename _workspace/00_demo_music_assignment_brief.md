# Demo Project Brief

## Project

- Name: 리듬 숙제장
- Type: fullstack website
- Audience: 초등 교사, 학생, 학부모

## Goal

교사가 리듬 과제를 만들고, 학생이 브라우저에서 리듬을 제출하며, 학부모가 제출 상태를 확인할 수 있는 웹사이트를 만든다.

## Core Outcomes

- 교사는 과제 제목, 설명, 마감일, 기본 리듬 예시를 포함한 과제를 생성할 수 있어야 한다.
- 학생은 링크로 접속해 과제를 확인하고 리듬 패턴을 제출할 수 있어야 한다.
- 학부모는 학생 이름과 과제 상태를 보고 제출 여부를 확인할 수 있어야 한다.

## In Scope

- 랜딩 페이지
- 교사 대시보드
- 과제 생성 폼
- 학생 제출 페이지
- 제출 상태 확인 페이지
- 과제/제출 조회 API
- 모바일 대응

## Out of Scope

- 결제
- 학교 행정 시스템 연동
- 알림톡 또는 문자 발송
- 상세 통계 대시보드

## Suggested Stack

- Frontend: Next.js App Router
- Backend: Next.js Route Handlers
- Data: Supabase Auth + Postgres
- Deploy: Vercel

## Constraints

- 1차 출시 범위만 다룬다.
- 모바일 우선 레이아웃이 필요하다.
- 접근성 기본 요구를 지킨다.
- 교사/학생/학부모가 한 번에 이해할 수 있을 만큼 흐름이 단순해야 한다.

## Acceptance Checks

- 교사가 과제를 생성할 수 있다.
- 학생이 과제 상세를 보고 제출할 수 있다.
- 제출 성공과 실패 상태가 화면에서 명확히 드러난다.
- 학부모가 제출 상태를 확인할 수 있다.
- 주요 흐름이 모바일에서도 무너지지 않는다.

## Demo Artifact Paths

- `_workspace/01_demo_design_wireframes.md`
- `_workspace/01_demo_design_handoff.md`
- `_workspace/01_demo_api_contracts.md`
- `_workspace/02_demo_frontend_status.md`
- `_workspace/02_demo_backend_status.md`
- `_workspace/03_demo_qa_findings.md`
- `_workspace/04_demo_release_plan.md`
- `_workspace/04_demo_release_notes.md`
