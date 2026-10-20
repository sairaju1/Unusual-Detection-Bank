# Unusual Bank Transaction Detection (Isolation Forest)

Status: frontend, backend, ML service, sample data, and tests are included.

## Parts
- `ml-service/` Flask API around scikit-learn IsolationForest (port 5001)
- `backend/` Express API with CSV upload, analysis, MongoDB storage, reports (port 4000)
- `data/` synthetic sample statement (fictional data only) and its generator
- `frontend/` React + Vite dashboard (Dashboard, Upload, All and Unusual Transactions, Details, Reports, About)
- `tests/` checks for the ML service

## Run (Windows, PowerShell)
See `start-instructions.md`.

## Limitations
- Isolation Forest is unsupervised. Flags mean "rare", not "fraud".
- No accuracy metrics are reported because there are no verified fraud labels.
- Each analysis fits on one statement, so small statements give weak results (minimum 10 rows).

## Accounts
Users register and log in. Passwords are hashed with bcrypt, sessions use JWT tokens (7 days), and all data is scoped to the logged-in user.
Set `JWT_SECRET` in `backend/.env`. Do not commit that file.
