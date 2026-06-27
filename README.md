# VLSIApp Monorepo (Android + FastAPI)

This workspace contains an Android-first app and backend API.

## Content Phases

- Phase 1: Digital Electronics, Verilog HDL, STA Basics (free)
- Phase 2: SystemVerilog RTL/Verification, UVM, SVA, Physical Design, Bus Protocols (free)
- Phase 3: Interview packs (premium at INR 299/month)

## Stack

- Mobile: Expo React Native (TypeScript), Android target
- Backend: FastAPI, SQLAlchemy, JWT auth skeleton
- Database: PostgreSQL via Docker Compose

## Structure

- `mobile/` Android app screens and API client
- `backend/` API, models, and import tooling
- `infra/` Docker Compose for PostgreSQL
- `docs/` DB schema and content format

## 1) Start PostgreSQL

From `infra/`:

```powershell
docker compose up -d
```

## 2) Run Backend (Windows PowerShell)

From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

Health endpoint:

`http://localhost:8000/api/v1/health`

## 3) Run Android App

From `mobile/`:

```powershell
npm install
Copy-Item .env.example .env
npm run start
```

Then press `a` in Expo terminal to open Android emulator.

If using Android emulator, backend base URL should remain:

`EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api/v1`

## 4) Run Website

From `web/`:

```powershell
python -m http.server 5500
```

Open `http://127.0.0.1:5500` in your browser.

The website reads data from backend API at `http://127.0.0.1:8000/api/v1`.

## 5) Run Tests

Backend:

```powershell
cd backend
pytest
```

Mobile:

```powershell
cd mobile
npm test
```

## 6) Import Content

From `backend/` after creating JSON files:

```powershell
python -m scripts.import_content --subjects ..\docs\seed\subjects.json --mcqs ..\docs\seed\mcqs.json --coding ..\docs\seed\coding.json --notes ..\docs\seed\notes.json
```

JSON shapes are documented in `docs/content-format.md`.

## Content Ownership Note

Use your own authored content or content you have rights to publish. The platform structure supports importing your curated MCQs, notes, and coding sets.
