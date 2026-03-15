# CDRRMD Disaster Response Platform

Monorepo structure:

- `admin-web/` — React + Tailwind admin dashboard for posting alerts/news
- `user-app/` — Expo React Native mobile app (UI based on your screenshot)
- `backend/` — Node.js/Express API with JWT auth + PostgreSQL

## Quick Start

1. Install dependencies from the project root:
   - `npm install`
2. Start backend:
   - `npm run dev:backend`
3. Start admin web:
   - `npm run dev:admin`
4. Start mobile user app:
   - `npm run dev:user`

## PostgreSQL Auto-Connection

Backend uses `backend/.env`:

- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_NAME=postgres`
- `DB_USER=postgres`
- `DB_PASSWORD=Babi_031705`

On backend start, tables are auto-created and default admin account is auto-seeded:

- username: `admin`
- password: `Admin@123`

## Features Implemented

### User App (React Native + NativeWind/Tailwind)
- Home screen mimics screenshot layout
- Weather card with dynamic condition image (rainy/sunny/cloudy)
- Open-Meteo weather integration through backend
- Request Rescue opens Calamba City map/bounds (Laguna, PH)
- Latest Alerts (dynamic from backend)
- News & Announcement (dynamic from backend)

### Admin Web (React + Tailwind)
- JWT login
- Post alerts (e.g., typhoon, flood, fire)
- Post news/announcements
- Lists latest posted content immediately

### Backend (Node + PostgreSQL)
- `POST /api/auth/login`
- `GET /api/content/alerts`
- `POST /api/content/alerts` (JWT)
- `GET /api/content/announcements`
- `POST /api/content/announcements` (JWT)
- `GET /api/weather?latitude=14.2117&longitude=121.1653`
