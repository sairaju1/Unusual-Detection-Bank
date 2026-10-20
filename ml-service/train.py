"""Train and save the Isolation Forest.

Usage (from ml-service/):
  python train.py ../data/sample_bank_statement_1000.csv
  python train.py your_statement.csv models/isolation_forest.joblib

Steps: preprocess -> train/test split -> fit on train -> save with joblib.
The held-out flag rate is NOT an accuracy metric; the data has no fraud labels.
"""
import os
import sys

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split

from preprocessing import build_features

csv_path = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "isolation_forest.joblib")

df = pd.read_csv(csv_path)
X = build_features(df[["amount", "type", "date"]].to_dict("records")).values
X_train, X_test = train_test_split(X, test_size=0.2, random_state=42)

model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42).fit(X_train)
test_flag_rate = (model.predict(X_test) == -1).mean()

os.makedirs(os.path.dirname(out), exist_ok=True)
joblib.dump(model, out)
print(f"Saved {out}. Held-out flag rate: {test_flag_rate:.3f} (not an accuracy metric).")
