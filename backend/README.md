# ontime backend

Minimal Node + Express skeleton for Phase 1.

## Quickstart

1. cd backend
2. Install dependencies:

```bash
npm install
```

3. Copy environment file:

```bash
cp .env.example .env
```

4. Start the server (dev with nodemon):

```bash
npm run dev
# or
npm start
```

5. Open http://localhost:4000/api/health — you should see:

```json
{ "status": "ok" }
```

## Notes

- Uses `dotenv`, `cors`, and `express`.
- Next: add auth, reminders, and Canvas sync routes.

## Docker

You can run the backend in a Docker container or with docker-compose (the compose file includes a Postgres service for future phases).

Build and run the backend image:

```bash
cd backend
docker build -t ontime-backend .
docker run -p 4000:4000 --env-file .env --rm ontime-backend
```

Or run the full stack (Postgres + backend):

```bash
# from repository root
docker-compose up --build
```

The backend will be reachable at http://localhost:4000/api/health

## Auth (Phase 2)

Dependencies added: `pg`, `bcrypt`, `jsonwebtoken`.

1. Configure environment

Create `.env` in `backend/` (see `.env.example`). Important:

```
DATABASE_URL=postgres://ontime:changeme@localhost:5432/ontime
JWT_SECRET=replace-with-strong-secret
```

If using docker-compose, these are already provided to the `backend` service.

2. Start Postgres and backend with docker-compose (recommended)

```bash
# from repository root
docker-compose up --build
```

3. Run DB migration

Open a new terminal and run:

```bash
cd backend
npm run migrate
```

4. Test with Postman (or curl)

- Register:

POST http://localhost:4000/api/auth/register

Body (JSON):

```
{
	"email": "student@example.edu",
	"password": "StrongPassword!",
	"name": "Student"
}
```

Expected 201 with `{ token, user }`.

- Login:

POST http://localhost:4000/api/auth/login

Body (JSON):

```
{
	"email": "student@example.edu",
	"password": "StrongPassword!"
}
```

Expected 200 with `{ token, user }`.

- Protected route example (once added): add header

```
Authorization: Bearer <paste JWT token>
```

5. Troubleshooting

- Ensure the DB is up: `docker ps` should show the `db` service.
- If migration fails, verify `DATABASE_URL` and that the `ontime` DB exists (compose creates it by default).

## Reminders (Phase 3)

Schema adds a `reminders` table linked to `users`. Run `npm run migrate` after pulling the latest code to apply changes.

All reminder routes require an `Authorization: Bearer <token>` header from the login/register response.

- List reminders

```
GET http://localhost:4000/api/reminders
```

Response:

```
{
	"reminders": [
		{
			"id": 1,
			"user_id": 1,
			"title": "Finish essay",
			"description": "Draft conclusion",
			"due_at": "2024-09-01T18:00:00.000Z",
			"source": "manual",
			"source_id": null,
			"is_completed": false,
			"created_at": "...",
			"updated_at": "..."
		}
	]
}
```

- Create reminder

```
POST http://localhost:4000/api/reminders
Content-Type: application/json

{
	"title": "Finish essay",
	"description": "Draft conclusion",
	"dueAt": "2024-09-01T18:00:00.000Z",
	"source": "manual"
}
```

- Update reminder

```
PATCH http://localhost:4000/api/reminders/1
Content-Type: application/json

{
	"isCompleted": true
}
```

- Delete reminder

```
DELETE http://localhost:4000/api/reminders/1
```

All operations scope to the authenticated user; attempting to access another user’s reminder returns 404.

## Canvas Sync (Phase 4)

Canvas connections let each user store an `.ics` feed URL from their institution. The backend downloads and upserts events as reminders with `source="canvas"`.

1. Save (or update) a connection:

```
POST http://localhost:4000/api/canvas/connect
Authorization: Bearer <token>
Content-Type: application/json

{
	"icsUrl": "https://canvas.example.edu/calendar.ics"
}
```

2. Trigger a sync (uses the saved URL unless overridden in the body):

```
POST http://localhost:4000/api/canvas/sync
Authorization: Bearer <token>
```

Optional body to override the URL for this sync:

```
{
	"icsUrl": "https://canvas.example.edu/calendar.ics"
}
```

Response includes the latest connection record and sync stats (`created`, `updated`, `removed`, `totalEvents`). Each sync also prunes reminders whose Canvas events disappeared from the feed.
