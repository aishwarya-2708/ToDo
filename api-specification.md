# TaskMate REST API Specification

Base path: `/api`. JSON request/response bodies except where noted. All endpoints use same-origin session cookies. Error envelope: `{ "error": { "code": "SNAKE_CASE_CODE", "message": "Human-readable message", "details": [...] } }`; validation details may be omitted when empty. No response contains password hashes or session IDs.

## Common behavior

- `Content-Type: application/json` is required for JSON bodies.
- State-changing methods (`POST`, `PATCH`, `DELETE`) require `X-CSRF-Token`; obtain the current token from `GET /api/auth/csrf`.
- Authenticated routes require a valid server-side session. Missing/expired session: `401 { error: { code: "UNAUTHENTICATED", ... } }`.
- Invalid JSON/input: `400`; validation details: `{field, message}`. Unauthenticated: `401`; forbidden CSRF/origin: `403`; missing resource: `404`; duplicate email/conflict: `409`; throttling: `429`; unexpected service failure: `500`.
- List response: `{ "data": [...], "meta": { "count": number } }`. Single resource response: `{ "data": {...} }`.

## Authentication

### `GET /api/auth/csrf`

Creates/loads an anonymous session as needed and returns `{ "data": { "csrfToken": "..." } }`; status `200`. Token is session-bound and must be sent in `X-CSRF-Token` for mutations.

### `POST /api/auth/register`

Body: `{ "name": string, "email": string, "password": string, "confirmPassword": string }`.

On success, creates user and authenticated session, rotates/regenerates session and CSRF token, status `201`: `{ "data": { "user": { "id", "name", "email" }, "csrfToken": "..." } }`. Duplicate email: `409`; invalid values or mismatch: `400`; rate limited: `429`.

### `POST /api/auth/login`

Body: `{ "email": string, "password": string }`.

Success status `200`: `{ "data": { "user": { "id", "name", "email" }, "csrfToken": "..." } }`, with regenerated session. Invalid credentials: `401` with generic message. Rate limited: `429`.

### `POST /api/auth/logout`

Authenticated, CSRF-protected. Destroys server session and clears cookie. Success `200`: `{ "data": { "message": "Logged out" } }`. A repeated logout may return `401`.

### `GET /api/auth/me`

Success `200`: `{ "data": { "user": { "id", "name", "email" } } }`; unauthenticated `401`.

## Tasks (all endpoints require authentication)

Task representation: `{ "id", "title", "description", "priority", "dueDate", "completed", "completedAt", "createdAt", "updatedAt" }`. `description` defaults to `""`, `priority` to `"medium"`, `dueDate` and `completedAt` to null, `completed` to false. Dates are ISO timestamps except date-only `dueDate`.

### `GET /api/tasks`

Query (all optional): `search` (max 100 chars), `status=all|pending|completed`, `priority=low|medium|high`, `sort=createdAt|dueDate|priority|title`, `order=asc|desc`, `page` (1-based integer, default 1), `limit` (integer 1–100, default 20).

Defaults: status all, no priority/search filter, `sort=createdAt`, `order=desc`. Returns `200` `{ "data": [task...], "meta": { "count": number, "page": number, "limit": number, "pageCount": number } }`. `count` is the total number matching filters before pagination; empty result has `pageCount: 0`. Null due dates sort last for both order directions. Priority sorts high-to-low for descending and low-to-high for ascending. Stable secondary ordering by `_id` ascending. Invalid query values: `400`.

### `POST /api/tasks`

Body: `{ "title": string, "description"?: string, "priority"?: "low"|"medium"|"high", "dueDate"?: "YYYY-MM-DD"|null }`.

Success `201` `{ "data": task }`. Invalid fields/format: `400`.

### `GET /api/tasks/:id`

Success `200` `{ "data": task }`; malformed or not-owned/nonexistent id: `404`.

### `PATCH /api/tasks/:id`

Body may contain one or more of `title`, `description`, `priority`, `dueDate`, `completed`. Unknown fields rejected. If `completed` transitions to true, server sets `completedAt` to now; false clears it. Success `200` `{ "data": task }`; invalid/missing task `400`/`404`.

### `DELETE /api/tasks/:id`

Success `200` `{ "data": { "id": "...", "deleted": true } }`; malformed or not-owned/nonexistent id: `404`.

## Dashboard

### `GET /api/dashboard/stats`

Success `200`: `{ "data": { "total": number, "pending": number, "completed": number, "overdue": number } }`. Counts are scoped to current user and overdue uses UTC date-only comparison.
