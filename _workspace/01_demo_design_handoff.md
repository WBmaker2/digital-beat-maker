# 리듬 숙제장 - Design Handoff

## Routes
- `/` landing page
- `/teacher` teacher dashboard
- `/teacher/assignments/new` assignment creation
- `/student/[assignmentId]` student submission page
- `/parent/status` parent status page

## Shared Layout
- Top header with product name and role switch or entry point.
- Content container width should feel roomy on desktop and remain readable on mobile.
- Cards should have strong hierarchy, visible spacing, and simple action placement.

## Landing Page Components
- Hero section with title, summary, and 3 role CTAs.
- Feature strip with short benefit summaries.
- No deep navigation needed on the first screen.

## Teacher Dashboard Components
- Summary stats row.
- Assignment list card stack.
- `새 과제 만들기` primary action.
- Per-assignment action menu or inline actions for view, edit, and copy link.

## Assignment Creation Components
- Form section for title, description, due date, grade, and sample rhythm.
- Optional preview panel showing how the assignment will look to students.
- Primary submit action and secondary save draft action.
- Validation messages below each field, not only in a banner.

## Student Submission Components
- Assignment summary panel.
- Rhythm example preview panel.
- Student name input, note input, submit button.
- Submission result state with confirmation and next step guidance.

## Parent Status Components
- Search or lookup input.
- Status list with per-assignment row.
- Filters should be minimal in v1.
- If no results, show a helpful zero-state card instead of empty whitespace.

## Interaction Rules
- Primary actions should be visually dominant and consistent across pages.
- Loading must be visible for data-fetching pages and form submissions.
- Success states should confirm the result and indicate what happens next.
- Error states should explain the problem and offer the immediate recovery action.

## Content Rules
- Use short Korean copy that primary-school adults can scan quickly.
- Keep labels direct: `과제 제목`, `마감일`, `학생 이름`, `제출 상태`.
- Avoid jargon in student-facing copy.
- Parent-facing copy should be factual and simple.

## Responsive Notes
- Mobile: stack sections vertically, keep buttons full width where appropriate.
- Desktop: teacher dashboard may use a 2-column summary/list layout.
- Forms: prefer grouped sections with comfortable spacing rather than dense grids.

## Accessibility Notes
- Buttons and inputs need obvious focus states.
- Error text must not rely on color alone.
- Status labels should be readable as text, not only icon or color.

## Implementation Notes for Next.js
- Use App Router page-level routes for each major flow.
- Keep shared card, button, input, and status components in a common UI layer.
- Data-fetching pages should have explicit loading and error UI.
- Form pages should separate draft state, validation state, and submit state.

## Open Decisions
- Whether teacher and parent flows share the same authentication surface in v1.
- Whether the student submission page needs a live rhythm editor or only a preset preview.
- Whether parent lookup uses student name only or name plus class code.
