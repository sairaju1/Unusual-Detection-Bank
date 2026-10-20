"""Cleaning and feature engineering for transaction records."""
import numpy as np
import pandas as pd

FEATURES = ["log_abs_amount", "is_debit", "hour", "day_of_week"]


def _col(df, name, default):
    if name in df.columns:
        return df[name]
    return pd.Series([default] * len(df), index=df.index)


def build_features(records):
    """Turn a list of dicts (amount, type, date) into a numeric feature matrix.

    Invalid or missing values are replaced with safe defaults instead of failing.
    """
    df = pd.DataFrame(records)
    amount = pd.to_numeric(_col(df, "amount", 0.0), errors="coerce").fillna(0.0)
    tx_type = _col(df, "type", "debit").astype(str).str.strip().str.lower()
    dates = pd.to_datetime(_col(df, "date", None), errors="coerce")

    X = pd.DataFrame(index=df.index)
    X["log_abs_amount"] = np.log1p(amount.abs())
    X["is_debit"] = (tx_type == "debit").astype(float)
    X["hour"] = dates.dt.hour.fillna(12).astype(float)
    X["day_of_week"] = dates.dt.dayofweek.fillna(0).astype(float)
    return X.replace([np.inf, -np.inf], 0.0).fillna(0.0)[FEATURES]
