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
npm run dev
```

Frontend runs on:
`http://localhost:5173`

## Notes
- Backend API base URL is currently `http://localhost:5000` in source.
- Upload flow supports text or file (one at a time), optional password, burn-after-read, max downloads, and expiry.
- File downloads are requested through backend proxy endpoint, not direct storage links.

## Build
```bash
npm run build
npm run preview
```
