# Demo API Contracts

## Scope
- Minimum viable API for teacher assignment creation, assignment detail fetch, student submission create, and parent status lookup.
- Backend stack: Next.js Route Handlers + Supabase.

## Shared Rules
- All timestamps are ISO 8601 UTC strings.
- All responses use JSON.
- All validation happens at the route boundary.
- Teacher writes require Supabase auth; student and parent reads/writes use access keys.

## Auth Assumptions
- Teacher requests send the Supabase session cookie.
- Teacher role is resolved from the authenticated user profile or JWT claim.
- Student requests use `accessKey` issued with the assignment.
- Parent status lookup uses `parentLookupKey` issued with the assignment.
- Missing or invalid auth returns `401` or `403`, never a silent fallback.

## Endpoints
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/assignments` | Teacher creates an assignment |
| GET | `/api/assignments/[assignmentId]` | Fetch assignment detail for teacher or student |
| POST | `/api/assignments/[assignmentId]/submissions` | Student creates a submission |
| GET | `/api/assignments/[assignmentId]/parent-status` | Parent checks submission status |

## 1. POST `/api/assignments`
Teacher creates a new assignment.

Request body:
```json
{
  "title": "리듬 숙제 1",
  "description": "16박 안에서 킥과 스네어를 배치해 보세요.",
  "dueAt": "2026-04-05T15:00:00.000Z",
  "examplePattern": {
    "tempo": 110,
    "pattern": [[true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false]]
  }
}
```

Response `201`:
```json
{
  "data": {
    "assignment": {
      "id": "assn_123",
      "title": "리듬 숙제 1",
      "description": "16박 안에서 킥과 스네어를 배치해 보세요.",
      "dueAt": "2026-04-05T15:00:00.000Z",
      "examplePattern": { "tempo": 110, "pattern": [] },
      "status": "draft",
      "publicAccessKey": "pub_xxx",
      "parentLookupKey": "parent_xxx",
      "createdAt": "2026-03-29T03:00:00.000Z",
      "updatedAt": "2026-03-29T03:00:00.000Z"
    }
  }
}
```

## 2. GET `/api/assignments/[assignmentId]`
Fetch assignment detail.

Request:
- Teacher view: authenticated cookie only.
- Student view: `?accessKey=pub_xxx`.
- Parent view: not used here.

Response `200`:
```json
{
  "data": {
    "assignment": {
      "id": "assn_123",
      "title": "리듬 숙제 1",
      "description": "16박 안에서 킥과 스네어를 배치해 보세요.",
      "dueAt": "2026-04-05T15:00:00.000Z",
      "examplePattern": { "tempo": 110, "pattern": [] },
      "status": "published",
      "createdAt": "2026-03-29T03:00:00.000Z",
      "updatedAt": "2026-03-29T03:00:00.000Z"
    }
  }
}
```

## 3. POST `/api/assignments/[assignmentId]/submissions`
Student submits a rhythm pattern.

Request body:
```json
{
  "accessKey": "pub_xxx",
  "studentName": "김민지",
  "pattern": {
    "tempo": 112,
    "pattern": [[true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false]]
  }
}
```

Response `201`:
```json
{
  "data": {
    "submission": {
      "id": "sub_456",
      "assignmentId": "assn_123",
      "studentName": "김민지",
      "pattern": { "tempo": 112, "pattern": [] },
      "submittedAt": "2026-03-29T03:10:00.000Z",
      "status": "submitted"
    }
  }
}
```

## 4. GET `/api/assignments/[assignmentId]/parent-status`
Parent looks up one student's status.

Query:
- `parentLookupKey=parent_xxx`
- `studentName=김민지`

Response `200`:
```json
{
  "data": {
    "assignment": {
      "id": "assn_123",
      "title": "리듬 숙제 1",
      "dueAt": "2026-04-05T15:00:00.000Z"
    },
    "studentStatus": {
      "studentName": "김민지",
      "submissionStatus": "submitted",
      "submittedAt": "2026-03-29T03:10:00.000Z"
    }
  }
}
```

## Error Shape
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해 주세요.",
    "fieldErrors": {
      "title": "필수 항목입니다."
    }
  }
}
```

## Error Codes
- `VALIDATION_ERROR` `400`
- `UNAUTHORIZED` `401`
- `FORBIDDEN` `403`
- `NOT_FOUND` `404`
- `CONFLICT` `409`
- `INTERNAL_ERROR` `500`

## Deferred Items
- Assignment edit and delete APIs
- Teacher grading and comments
- Submission history or resubmission
- File attachments or audio uploads
- Parent multi-student lookup
- Rate limiting and audit logs
