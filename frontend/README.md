# Pawly frontend

This is the React/Vite frontend for Pawly.

## Local development

```bash
npm install
npm run dev
```

The Vite proxy sends `/api` requests to the local PHP API and `/socket.io`
requests to the local realtime service.

## Validation and production build

```bash
npm run lint
npm run build
```

## Firebase Hosting

This directory contains `firebase.json`, which serves `dist` and provides SPA
history fallback.

After the backend is deployed, copy `.env.production.example` to
`.env.production`, set the Render API and realtime URLs, then rebuild:

```bash
cp .env.production.example .env.production
npm run build
```

For Firebase Hosting plus Render, configure the PHP API with
`SESSION_SAME_SITE=None` and `APP_ORIGIN` equal to the exact Firebase Hosting
origin (or your custom HTTPS domain). This is required for authenticated
cross-site cookies. Keep `SESSION_SAME_SITE=Lax` for same-origin local
development.

Deploy from this directory with:

```bash
cd frontend
firebase deploy --only hosting
```

Never commit `.env.production` or backend credentials.
