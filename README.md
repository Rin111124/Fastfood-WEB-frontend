# QuickBite Frontend

Vite + React SPA for the FatFood platform. The UI mirrors a modern admin/staff dashboard and consumes the JSON APIs exposed by `../backend`.

## Getting started

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173`. Configure the backend base URL through `.env`:

```
VITE_API_BASE_URL=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

You can tweak the request timeout with `VITE_API_TIMEOUT_MS`.

## Highlights

- Role-based dashboards (admin/staff) with responsive cards, charts (Chart.js), and live listings.
- Shared `apiFetch` wrapper injects JWT tokens persisted via `lib/session`.
- Bootstrap 5 plus custom gradients/glassmorphism cards for a DashStack-inspired look & feel.

## Scripts

- `npm run dev` — start the Vite dev server.
- `npm run build` — production build (code-splits charts/components).
- `npm run preview` — preview the production build locally.
- `npm run lint` — run ESLint. On Windows PowerShell you may hit execution-policy blocks; run the command from **Command Prompt** (`cmd.exe`) or relax the execution policy for your user profile.

## Running the whole stack

1. Install dependencies for both projects:
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```
2. Start the backend API (from `backend/`):
   ```bash
   npm run dev
   ```
3. Start the frontend (from `frontend/`):
   ```bash
   npm run dev
   ```
4. Visit http://localhost:5173. The frontend reads `VITE_API_BASE_URL` to communicate with the backend.
