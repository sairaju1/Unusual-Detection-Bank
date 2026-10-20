import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ml-service"))
from app import app
from model import UnusualTransactionModel

def _sample(n=40):
    base = [{"amount": 50 + i, "type": "debit", "date": f"2025-01-{(i % 28) + 1:02d}T12:00:00"} for i in range(n)]
    base.append({"amount": 900000, "type": "debit", "date": "2025-01-05T03:00:00"})
    return base

def test_flags_extreme_amount_and_scores_higher():
    res = UnusualTransactionModel(contamination=0.05).fit_predict(_sample())
    assert res[-1]["prediction"] == "unusual"
    assert res[-1]["anomaly_score"] == max(r["anomaly_score"] for r in res)

def test_bad_values_do_not_crash():
    recs = _sample(12)
    recs[0]["amount"] = "abc"
    recs[1]["date"] = "not-a-date"
    res = UnusualTransactionModel().fit_predict(recs)
    assert len(res) == len(recs)

def test_endpoint_validation():
    c = app.test_client()
    assert c.post("/predict", json={"transactions": []}).status_code == 400
    assert c.post("/predict", json={"transactions": _sample(), "contamination": 0.9}).status_code == 400
    r = c.post("/predict", json={"transactions": _sample()})
    assert r.status_code == 200 and r.get_json()["score_direction"] == "higher_means_more_unusual"
