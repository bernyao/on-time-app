# ontime

ontime is a secure, student-centered productivity app that imports Canvas deadlines and converts them into clean reminders.

## Overview

- SwiftUI app using MVVM
- Background syncing from Canvas via ICS or API
- Secure token storage in Keychain

## Quick dev notes

This repository uses Swift Package Manager. To build locally:

```bash
swift build
swift test
```

## License

© Your Organization

## Master Roadmap

This repository contains the roadmap for ontime. Phases are marked:

- 🟢 = MVP (what we actually need to ship a usable v1)
- 🟡 = Nice but soon after MVP
- 🔵 = Stretch / polish

### 🟢 Phase 1 – Backend Skeleton & Health Route

- Node + Express project with CORS and JSON parsing.
- Route: GET /api/health → { status: "ok" }.

### 🟢 Phase 2 – User Auth (DB + Register/Login + JWT)

- Postgres users table + helpers (findUserByEmail, createUser).
- Routes: POST /api/auth/register, POST /api/auth/login.
- Use bcrypt for password hashing and jsonwebtoken for JWT. Add authMiddleware.

### 🟢 Phase 3 – Reminder Model + CRUD Routes

- Reminders table: user_id, title, description, due_at, source, source_id, is_completed.
- Routes (auth-protected): GET /api/reminders, POST /api/reminders, PATCH /api/reminders/:id, (optional) DELETE /api/reminders/:id.

### 🟢 Phase 4 – Canvas Connection Model + ICS Sync (Backend Only)

- canvas_connections table: user_id, ics_url, last_synced_at.
- POST /api/canvas/connect to save ics URL.
- syncCanvasForUser(userId): fetch & parse .ics, upsert reminders (source='canvas'), update last_synced_at.
- POST /api/canvas/sync for manual sync.

### 🟢 Phase 5 – Mobile App Project + Auth Flow

- Create an Expo app with Auth and App stacks.
- Login/Register call backend /auth routes; store JWT in SecureStore; add Axios wrapper with interceptor.

### 🟢 Phase 6 – Reminder List UI Hooked to Backend

- HomeScreen fetches GET /api/reminders on mount and renders a list with loading and error states.

### 🟢 Phase 7 – Canvas Connect UI + "Sync" Button

- SettingsScreen input for .ics URL. "Save & Sync" triggers POST /api/canvas/connect and POST /api/canvas/sync, then refreshes HomeScreen.

### 🟡 Phase 8 – Background Jobs & Auto Sync

- Use node-cron, BullMQ, or hosted schedulers to periodically run syncCanvasForUser for all connections, respecting last_synced_at.

### 🟡 Phase 9 – Notifications

- Local notifications (Expo) scheduled on sync and creation. Future: server-side push via Expo/FCM.

### 🟡 Phase 10 – Deployment & DevOps

- Deploy backend (Railway/Render/Fly), use managed Postgres; set DATABASE_URL and JWT_SECRET. Use Expo/EAS for mobile builds and GitHub Actions for CI.

### 🟡 Phase 11 – Testing Strategy

- Backend tests (Jest + Supertest) for core flows. Mobile smoke tests for key screens.

### 🔵 Phase 12 – Stretch Features / Future-Proofing

- Recurring reminders, tags, offline mode (SQLite), shared reminders, advanced views, cross-device push.

---

If you'd like, I can scaffold the backend Node/Express project next and wire up the health route so you can hit /api/health locally. Which phase should I start with now?
# on-time-app
