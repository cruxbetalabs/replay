# Security hardening (optional)

Follow-ups from the cloud feature security review. None are blockers for shipping.

## Client-side

- [ ] **Validate presigned URL hosts** — Before PUT/GET, check that `upload_url`, `video_url`, and `metadata_url` point to expected storage hosts (defense in depth on top of API trust).
- [ ] **Tighten drag-drop job ID handling** — Drop the `text/plain` fallback in `readCloudJobDragId`; only accept the custom `application/x-replay-cloud-job` MIME type.

## API / infrastructure (backend)

- [ ] **Confirm IDOR protection** — Every job list/load/delete/upload operation validates session ownership.
- [ ] **CORS + cookies** — Allow the GitHub Pages origin with credentials; same setup for SSE (`/events`).
- [ ] **CSRF protection** — Cookie-authenticated POST/DELETE endpoints are protected.
- [ ] **Presigned URLs** — Scoped, short-lived, and restricted to storage hosts only.
- [ ] **Server-side upload limits** — Enforce type, size, and duration limits matching the client (500 MB, 2 min, `.mp4`/`.mov`).

## Repo / DX

- [ ] **Un-ignore `.env.local.example`** — Add `!.env.local.example` to `.gitignore` so the dev setup doc can be committed without exposing secrets.
