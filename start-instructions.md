# Start instructions (Windows)

Requires: Python 3.11+, Node.js 20+, MongoDB (Atlas URI or local).

## 1. ML service (Terminal 1)
    cd unusual-transaction-detection\ml-service
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    python app.py

## 2. Backend (Terminal 2)
    cd unusual-transaction-detection\backend
    copy .env.example .env
    (edit MONGODB_URI in .env, and set JWT_SECRET to a long random string)
    Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    npm install
    npm start

## 3. Test the flow with the sample CSV
    curl -F "file=@..\data\sample_bank_statement.csv" http://localhost:4000/api/statements/upload
    curl -X POST http://localhost:4000/api/analysis/<statementId>
    curl http://localhost:4000/api/dashboard/stats

On PowerShell, use `Invoke-RestMethod` or install curl. Regenerate the sample with `python data\generate_sample.py`.

## Tests
    cd unusual-transaction-detection\ml-service
    venv\Scripts\activate
    cd ..
    python -m pytest tests -q

## 4. Frontend (Terminal 3)
    cd unusual-transaction-detection\frontend
    npm install
    npm run dev

Open http://localhost:5173. Requests to /api are proxied to the backend on port 4000.

## Accounts
Open http://localhost:5173, click "Create one", register, and log in. Each account sees only its own statements, transactions, analyses, and reports.
Statements uploaded before accounts were added are not visible to any account; re-upload them after registering.
