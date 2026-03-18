# LinkVault Frontend

React + Vite frontend for LinkVault.

## Stack
- React
- Vite
- Tailwind CSS
- Axios
- React Router

## Setup
```bash
cd frontend
npm install
# optional: copy env and customize backend URL
cp .env.example .env
npm run dev
```

Frontend runs on:
`http://localhost:5173`

## Notes
- Backend API base URL is controlled by `VITE_API_BASE_URL` (defaults to `http://localhost:5000`).
- Upload flow supports text or file (one at a time), optional password, burn-after-read, max downloads, and expiry.
- File downloads are requested through backend proxy endpoint, not direct storage links.

## Build
```bash
npm run build
npm run preview
```
