# TaskMate Database Specification

MongoDB is the authoritative persistent store for users, tasks, and sessions. Mongoose models provide schema validation and indexes.

## User (`users`)

| Field | Type | Constraints |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `name` | String | Trimmed; 2–80 chars; required |
| `email` | String | Trimmed/lowercase; required; unique index; valid email |
| `passwordHash` | String | Required; bcrypt hash only; never serialized |
| `createdAt`, `updatedAt` | Date | Managed timestamps |

Unique index: `{ email: 1 }`. Registration handles duplicate-key races as HTTP 409.

## Task (`tasks`)

| Field | Type | Constraints |
| --- | --- | --- |
| `_id` | ObjectId | Primary key |
| `owner` | ObjectId | Required reference to User; immutable |
| `title` | String | Trimmed; 1–160 chars; required |
| `description` | String | Trimmed; max 2,000 chars; default empty string |
| `priority` | String enum | `low`, `medium`, `high`; default `medium` |
| `dueDate` | String or null | Strict `YYYY-MM-DD` calendar date; default null |
| `completed` | Boolean | Default false |
| `completedAt` | Date or null | Null while pending; set on completion, cleared on reopen |
| `createdAt`, `updatedAt` | Date | Managed timestamps |

Indexes: `{ owner: 1, createdAt: -1 }`, `{ owner: 1, completed: 1, dueDate: 1 }`, and `{ owner: 1, priority: 1 }`. Search may use a scoped case-insensitive regex with escaped user input; a text index is optional and is not required for this deployment scale.

## Session (`sessions`)

Use the Express session store adapter backed by MongoDB. Session documents expire after the configured seven-day cookie lifetime; the store TTL must be enabled. Session contents contain only necessary authentication identity and CSRF state, never passwords or hashes.

## Ownership and query rules

- `owner` is assigned from `req.session.userId` by server code at creation.
- Never accept an owner/user id in task request bodies or query parameters.
- Every task get/update/delete query includes both `_id` and `owner`.
- Lists and aggregate statistics always match `owner` first.
- API projections explicitly omit `passwordHash`; users are returned through a public-user serializer.
- Deleting a user (not in current product scope) would require cascading owned tasks and sessions or a documented retention policy.
