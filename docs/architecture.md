# Architecture

React + Vite frontend (frontend/) -> Express API (backend/) -> Flask ML service (ml-service/) and MongoDB.

1. POST /api/statements/upload parses and validates CSV, dedupes by SHA-256, stores transactions.
2. POST /api/analysis/:statementId sends transactions to the Flask /predict endpoint.
3. The Isolation Forest fits on that statement and returns prediction and anomaly_score per row.
4. Scores are stored on each transaction. Higher anomaly_score means more unusual.

Flags are statistical outliers for human review. They are not confirmed fraud.
