# Repository Guidelines

## Project Structure & Module Organization
The FastAPI backend lives in `backend/app`, where feature routers pair with helper modules in `core/` and service classes in `services/`. Tests are organized in `backend/tests` (unit, integration, e2e), while database migrations and Supabase policies stay in `backend/migrations` and `backend/supabase`. The React frontend sits in `frontend/hotel-onboarding-frontend/src`, with static assets in `public/` and build tooling (`vite.config.ts`, Tailwind config) at the same level.

## Build, Test, and Development Commands
**Backend (from `backend/`):**
- `poetry install` — install Python dependencies.
- `poetry run uvicorn app.main_enhanced:app --reload --port 8000` — start the API with hot reload.
- `poetry run pytest` — run all backend tests; add `-k module_name` for focused runs.

**Frontend (from `frontend/hotel-onboarding-frontend/`):**
- `npm install` — install Node dependencies.
- `npm run dev` — launch Vite on port 3000.
- `npm run build` / `npm run preview` — generate and inspect production bundles.
- `npm test` — execute the Jest suite; `npm run lint` applies the shared ESLint rules.

## Coding Style & Naming Conventions
Follow 4-space indentation, snake_case filenames, and type-hinted signatures in Python; routers should remain thin and defer business logic to services (see `backend/app/analytics_service.py`). Keep environment loading consistent with `main_enhanced.py` and centralize settings in `config/`. Frontend code uses TypeScript with PascalCase components, camelCase hooks, Tailwind utility classes, and formatting enforced by ESLint.

## Testing Guidelines
Pytest powers backend tests; add new integration scenarios under `backend/tests/integration/` using the `test_<feature>.py` pattern and reuse fixtures from `conftest.py` to avoid hard-coded credentials. Reference `TEST_COVERAGE_REPORT.md` and maintain at least the documented coverage range when shipping new features. Frontend tests use Jest with Testing Library—co-locate new specs near existing `test-*.js` files and supply screenshots or PDFs when UI documents change.

## Commit & Pull Request Guidelines
Commits follow the imperative style already in history (`Add ...`, `Fix: ...`, `Enhance ...`). Each pull request should describe scope, note the backend/frontend commands executed, and link to related issues. Include screenshots or generated document diffs when updating navigation flows or PDF generation to streamline review.

## Environment & Configuration Tips
Backend startup reads `.env` files from both repo and `backend/app`, so place Supabase keys and secrets there and keep them out of version control. Use the helpers in `backend/create_test_accounts.py` or related scripts to refresh tokens before manual QA. Frontend `.env.local` files mirror Vite naming (`VITE_API_URL`, etc.) and should target the same host used by the FastAPI instance.
