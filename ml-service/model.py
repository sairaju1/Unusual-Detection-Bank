"""Isolation Forest wrapper and saved-model scorer.

Score convention: scikit-learn's decision_function is HIGHER for normal points.
We expose anomaly_score = -decision_function, so HIGHER means MORE UNUSUAL.
The model is unsupervised: it flags statistically rare transactions for review.
It does not confirm fraud.
"""
import numpy as np
import pandas as pd
import joblib
import sklearn.compose._column_transformer as _ct
from sklearn.ensemble import IsolationForest
from preprocessing import build_features, FEATURES

# Pickles saved by some scikit-learn versions reference a private class that newer
# versions removed. This shim lets those files load. Remove it if your version loads without it.
if not hasattr(_ct, "_RemainderColsList"):
    class _RemainderColsList(list):
        pass
    _ct._RemainderColsList = _RemainderColsList


def _to_results(records, labels, scores, features):
    results = []
    for i in range(len(records)):
        results.append({
            "index": i,
            "prediction": "unusual" if labels[i] == -1 else "normal",
            "anomaly_score": round(float(scores[i]), 6),
            "features": features[i],
        })
    return results


def _pipeline_input(records, columns):
    """Build the raw input table a trained pipeline expects (column names from feature_names_in_).

    Assumptions for the uploaded bank model (see README):
      log_amount       = log1p(|amount|)
      transaction_type = 'Debit' / 'Credit'
      day_of_week      = 0 (Mon) .. 6 (Sun), from date
      month            = 1 .. 12, from date
      category, customer_name: not in the statement, filled with 'Unknown'
                               (the encoder ignores unseen values)
    """
    df = pd.DataFrame(records)
    amount = pd.to_numeric(df.get("amount", 0.0), errors="coerce").fillna(0.0)
    dates = pd.to_datetime(df.get("date"), errors="coerce")
    known = {
        "log_amount": np.log1p(amount.abs()),
        "transaction_type": df.get("type", pd.Series(["debit"] * len(df))).astype(str).str.strip().str.title(),
        "day_of_week": dates.dt.dayofweek.fillna(0),
        "month": dates.dt.month.fillna(1),
    }
    table = pd.DataFrame(index=df.index)
    for c in columns:
        table[c] = known[c] if c in known else df[c] if c in df.columns else "Unknown"
    return table


class SavedModelScorer:
    """Loads a trained model saved with joblib and scores transactions with it.

    Only load model files you trust: joblib files can run code when loaded.
    Supports either:
      - a model trained on build_features() output (4 numeric columns), or
      - a scikit-learn Pipeline with named input columns (feature_names_in_).
    """

    def __init__(self, path):
        self.path = path
        self.model = joblib.load(path)
        self.columns = getattr(self.model, "feature_names_in_", None)
        self.columns = list(self.columns) if self.columns is not None else None
        self.missing_inputs = []

    def missing_for(self, records):
        """Model input columns that the records cannot supply (derived columns excluded)."""
        if self.columns is None:
            return []
        present = set(pd.DataFrame(records).columns)
        return [c for c in self.columns if c not in present and c not in
                ("log_amount", "transaction_type", "day_of_week", "month")]

    def score(self, records):
        if self.columns is not None:
            self.missing_inputs = self.missing_for(records)
            table = _pipeline_input(records, self.columns)
            labels = self.model.predict(table)
            scores = -self.model.decision_function(table)
            feats = [{c: (round(float(v), 4) if isinstance(v, (int, float, np.number)) else str(v))
                      for c, v in table.iloc[i].items()} for i in range(len(table))]
            return _to_results(records, labels, scores, feats)

        X = build_features(records)
        expected = getattr(self.model, "n_features_in_", None)
        if expected is not None and X.shape[1] != expected:
            raise ValueError(f"Saved model expects {expected} features, preprocessing produces {X.shape[1]}.")
        labels = self.model.predict(X.values)
        scores = -self.model.decision_function(X.values)
        feats = [{k: round(float(X.iloc[i][k]), 4) for k in FEATURES} for i in range(len(X))]
        return _to_results(records, labels, scores, feats)


class UnusualTransactionModel:
    def __init__(self, contamination=0.05, random_state=42, n_estimators=200):
        self.contamination = contamination
        self.random_state = random_state
        self.n_estimators = n_estimators
        self.model = None

    def fit(self, records):
        X = build_features(records)
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
        ).fit(X.values)
        return self

    def fit_predict(self, records):
        """Fit on the given transactions, then score them (used only without a saved model)."""
        X = build_features(records)
        self.fit(records)
        labels = self.model.predict(X.values)
        scores = -self.model.decision_function(X.values)
        feats = [{k: round(float(X.iloc[i][k]), 4) for k in FEATURES} for i in range(len(X))]
        return _to_results(records, labels, scores, feats)
