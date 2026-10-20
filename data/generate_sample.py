"""Generates a fictional bank statement CSV (no real data).

Usage:
  python generate_sample.py              -> sample_bank_statement.csv (~280 rows)
  python generate_sample.py 1000         -> sample_bank_statement_1000.csv (1000 rows)
"""
import csv, random, datetime as dt, os, sys

target = int(sys.argv[1]) if len(sys.argv) > 1 else None
random.seed(7)
rows = []

def add(d, desc, amt, typ):
    rows.append([d, desc, round(amt, 2), typ])

start = dt.datetime(2025, 1, 1)
for m in range(12):
    base = start + dt.timedelta(days=30 * m)
    add(base + dt.timedelta(days=1, hours=9), "Salary - Fictional Corp", 52000, "credit")
    add(base + dt.timedelta(days=4, hours=11), "Electricity bill", random.uniform(1200, 1600), "debit")
    add(base + dt.timedelta(days=6, hours=8), "Mobile recharge", 399, "debit")
    add(base + dt.timedelta(days=10, hours=10), "Internet bill", 799, "debit")
    add(base + dt.timedelta(days=15, hours=12), "Transfer to savings", 5000, "debit")
    add(base + dt.timedelta(days=20, hours=18), "Transfer from friend", random.uniform(500, 2000), "credit")

# Intentionally unusual patterns
add(dt.datetime(2025, 6, 14, 3, 12), "Wire Transfer - Unknown Beneficiary", 185000, "debit")
add(dt.datetime(2025, 9, 2, 2, 47), "Wire Transfer - Unknown Beneficiary", 250000, "debit")
add(dt.datetime(2025, 3, 9, 4, 5), "Unverified Credit", 99999, "credit")
add(dt.datetime(2025, 11, 20, 13, 0), "Account Verification", 0.01, "debit")
for k in range(25):
    add(dt.datetime(2025, 8, 18, 2, 0) + dt.timedelta(minutes=k), "Card Test Merchant", 1.5 + k * 0.1, "debit")

# Everyday purchases fill the rest of the statement
shops = ["Grocery Store", "Coffee Shop", "Fuel Station", "Online Shopping", "Restaurant", "Pharmacy", "Ride Share", "Bookstore"]
extra = (target - len(rows)) if target else 180
for _ in range(max(0, extra)):
    d = start + dt.timedelta(days=random.randint(0, 364), hours=random.randint(8, 22), minutes=random.randint(0, 59))
    add(d, f"{random.choice(shops)} #{random.randint(1, 40)}", random.uniform(80, 2500), "debit")

rows.sort(key=lambda r: r[0])
name = f"sample_bank_statement_{target}.csv" if target else "sample_bank_statement.csv"
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), name)
with open(out, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["transaction_id", "date", "description", "amount", "type"])
    for i, (d, desc, amt, typ) in enumerate(rows, 1):
        w.writerow([f"TXN{i:05d}", d.strftime("%Y-%m-%dT%H:%M:%S"), desc, f"{amt:.2f}", typ])
print(f"Wrote {len(rows)} rows to {out}")
