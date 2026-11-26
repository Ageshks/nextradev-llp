# Nextradev Technologies LLP

React/Vite website and Express API. Employee operations are stored by the API in SQLite; Firebase Authentication provides sign-in and Firebase employee profiles provide role verification.

## Development

Install dependencies with `npm install`, set the environment values below, then run `npm run dev`. The development script starts the client and API. `npm run build` creates the production client bundle.

## Environment

Server:

- `PORT` — API port (defaults to `4000`)
- `CLIENT_URL` — allowed browser origin(s), comma separated
- `FIREBASE_PROJECT_ID` — Firebase project used to verify ID tokens (defaults to `nextradev-652ae`)

Frontend:

- `VITE_API_URL` — API origin, such as `https://api.example.com`

Do not add Firebase service account credentials to the client. The server validates Firebase ID tokens against Google's public signing certificates and checks the signed-in user's `employees/{uid}` role profile.

## Workforce API

The API stores employee profiles, attendance and location coordinates, checkout requests, tasks and reports, leave requests, work-calendar events, workplace coordinates, and career applications in `server/data/nextradev.db`. Workforce changes are broadcast to connected clients using server-sent events.

Admin accounts must have a Firebase Authentication account and an `employees/{uid}` Firestore profile with an allowed admin role (`admin`, `super_admin`, `hr`, or `hr_manager`). Employees need an Authentication account and an employee profile. Admins can connect an account to the backend employee directory from the Employees & attendance page.

On an admin's first visit after upgrade, the app attempts a one-time import of existing workforce records from the prior Firestore collections into SQLite. New workforce reads and writes then use the API and SQLite. The old sample project, opportunity, founder, and vacancy rows are removed by database startup migration.

For production, configure the server's SQLite directory on persistent storage and back it up. The public frontend needs `VITE_API_URL` pointed at the deployed API. Deploy the API and built frontend together so Firebase token verification, role checks, and API routes are active.

## Main routes

- `/internships` — published internship opportunities
- `/careers` — published vacancies and career application form
- `/login` — Firebase email and password sign-in
- `/employee` — employee dashboard
- `/admin` — live operations dashboard
- `/admin/employees` — employee directory, attendance, leave, workplace, calendar
- `/admin/tasks` — task assignment and completion reports
- `/admin/internships` — website content and application management
