# Car Studio (white-label demo for auto businesses)

A phone-first PWA for body shops, detailing centers and tuning shops in the US: a client uploads a photo of their own car, picks a style or parts, and gets a realistic render of the build. The shop's name and logo are set in the admin panel, so the same app is a demo for any shop.

- **Client app** (`index.html`): Home, Tuning, Gallery. Design concept "Cyclorama": the app background is the photo studio floor, one yellow action per screen. English by default, Russian in settings.
- **Sign-up for free renders**: the first render asks for phone and email; each client gets 3 free renders (set in the admin). The client never sees the cost.
- **Admin panel** (`admin.html`, password = `ADMIN_PASSWORD`): business name, phone, square logo, free renders per client; woso balance; clients with contacts; every render with its cost in woso credits and dollars; web push to the owner on each new client and each render (with cost).

## How it fits together

```
GitHub Pages (this app)  ──►  Cloudflare Worker (worker/)  ──►  woso.io (owner's account)
                               KV DB: clients, renders, brand, push subscriptions, limits
                               R2 IMAGES: logo, temporary reference photos
```

Worker routes: `GET /config`, `GET /logo`, `POST /register`, `GET /me` and `POST /generate` (header `X-User`), `/admin/*` (header `Authorization: Bearer <ADMIN_PASSWORD>`). Deploy steps are in `worker/wrangler.toml`. The app reads the Worker URL from the `SERVICE_URL` repository variable at build time.

## Development

```bash
npm install
npm run dev        # app at /, admin at /admin.html (set VITE_SERVICE_URL)
npm test           # Worker unit tests: sign-up, free renders, costs, admin auth, branding, web push encryption
npm run test:e2e   # the real Worker with a fake woso + the built app in Chromium
npm run build
```

Pushing to `main` runs lint, tests and deploys to GitHub Pages (`.github/workflows/deploy.yml`).
