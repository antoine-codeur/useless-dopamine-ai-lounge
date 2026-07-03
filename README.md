# Useless Dopamine AI Lounge

A ChatGPT / Claude-style AI chat client with a **dopamine gamification layer** — per-prompt
credits, paid plans (Free / Pro / Max / Max+), daily quests, boosters, birthday gifts, an
activity calendar and a file gallery. Guest sessions and real accounts with onboarding.

AI responses are currently **simulated** by a minimal Node backend; the frontend is a Tauri 2
desktop shell that also runs in the browser.

**Stack:** Tauri 2 · Vite 7 · React 19 · TypeScript · Zustand · Framer Motion · lucide-react.

---

## Prerequisites

- **Node 24** — an [`.nvmrc`](./.nvmrc) is provided, so `nvm use` picks the right version
- **Docker** + Docker Compose (for the containerized deploy)
- Native desktop build only: the [Tauri prerequisites](https://tauri.app/start/prerequisites/) (Rust toolchain)

---

## Quick start

### Option A — Run the full app with Docker (recommended)

Frontend (nginx serving the built SPA) + Node backend, wired together:

```bash
git clone https://github.com/antoine-codeur/useless-dopamine-ai-lounge.git
cd useless-dopamine-ai-lounge
make deploy            # docker compose up -d --build
```

Open **http://localhost:8094**. Change the port / prototype id if needed:

```bash
make deploy UDA_PORT=8091 PROTOTYPE_ID=studio
```

### Option B — Local web dev (hot reload)

```bash
nvm use                # Node 24
npm install
npm run dev            # Vite dev server (frontend only)
```

> The dev server serves the frontend only. For the API, run the backend
> (`node backend/server.mjs`, listens on `PORT`, default `8080`) or use the Docker deploy.

### Option C — Native desktop app (Tauri)

```bash
nvm use
npm install
npm run tauri dev
```

---

## Commands

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `make deploy`       | Build + run frontend & backend via Docker Compose  |
| `make status`       | Show container status                              |
| `make logs`         | Tail container logs                                |
| `make stop`         | `docker compose down`                              |
| `make build`        | `npm run build` (`tsc && vite build`)              |
| `make type-check`   | Same as build (typecheck is part of the build)     |
| `npm run dev`       | Vite dev server                                    |
| `npm run tauri dev` | Native desktop app                                 |

Deploy variables: `UDA_PORT` (default `8094`), `PROTOTYPE_ID` (default `lounge`).

---

## Architecture

```
src/
  app/          bootstrap, prototype config
  features/     one folder per domain: auth, onboarding, account, chat, profile,
                plans, activity, earn, gallery, settings, quests, rewards, …
  components/   reusable UI primitives (Button, Toast, ChatBubble, Markdown, …)
  lib/          api client, storage scoping, helpers
  styles/       design-token foundation (tokens/) + globals
backend/
  server.mjs    minimal Node HTTP API (accounts, sessions, credits, quests…)
docker/
  nginx.conf    SPA hosting + /api proxy + cache headers
docs/
  FEATURES.md   living feature / finition tracker
```

- Persisted stores are **identity-scoped** (`lib/accountScope.ts`): each account/guest keeps
  its own snapshot in `localStorage`; switching identity reloads so every store re-hydrates.
  Any identity change persists the account id to `localStorage` **before** reloading.
- Backend state persists to `DATA_FILE` (default `/data/app.json`, a Docker volume in deploy).
- nginx serves `index.html` as `no-cache` and hashed assets as `immutable`, so clients always
  pick up new builds without a manual cache clear.

---

## Health & API

- `GET /healthz` — nginx healthcheck
- `GET /api/v1/health` — backend healthcheck
- `POST /api/v1/auth/login`, `POST /api/v1/accounts`, `GET /api/v1/session`, … — app API

## Recommended IDE setup

[VS Code](https://code.visualstudio.com/) +
[Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) +
[rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).
