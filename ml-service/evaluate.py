"""Quick sanity run: python evaluate.py ../data/sample_bank_statement.csv

Prints how many transactions were flagged. No accuracy metrics are computed,
because the sample data has no verified fraud labels.
"""
import sys
import pandas as pd
from model import UnusualTransactionModel

df = pd.read_csv(sys.argv[1] if len(sys.argv) > 1 else "../data/sample_bank_statement.csv")
records = df[["amount", "type", "date"]].to_dict("records")
results = UnusualTransactionModel(contamination=0.05).fit_predict(records)
flagged = [r for r in results if r["prediction"] == "unusual"]
print(f"Transactions: {len(results)}  Flagged unusual: {len(flagged)}")
for r in sorted(flagged, key=lambda r: -r["anomaly_score"])[:10]:
    row = df.iloc[r["index"]]
    print(f"  {row['transaction_id']} {row['date']} {row['amount']:>12} {row['type']:<6} score={r['anomaly_score']:.4f} {row['description']}")
