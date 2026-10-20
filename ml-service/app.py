import os

from flask import Flask, request, jsonify
from model import UnusualTransactionModel, SavedModelScorer

app = Flask(__name__)
MIN_RECORDS = 10
DEFAULT_MODEL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "bank_anomaly_model.joblib")
MODEL_PATH = os.environ.get("MODEL_PATH", DEFAULT_MODEL)

saved_scorer = SavedModelScorer(MODEL_PATH) if os.path.exists(MODEL_PATH) else None


@app.get("/health")
def health():
    return jsonify(
        status="ok",
        model="IsolationForest",
        saved_model=os.path.basename(MODEL_PATH) if saved_scorer else None,
    )


@app.post("/predict")
def predict():
    body = request.get_json(silent=True) or {}
    txs = body.get("transactions")
    if not isinstance(txs, list) or len(txs) < MIN_RECORDS:
        return jsonify(error=f"transactions must be a list of at least {MIN_RECORDS} items"), 400
    try:
        contamination = float(body.get("contamination", 0.05))
        if not 0 < contamination < 0.5:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify(error="contamination must be a number between 0 and 0.5"), 400

    # The saved model is only usable when the statement supplies all of its inputs.
    # Filling missing inputs with 'Unknown' makes every row look alike and nothing gets flagged.
    missing = saved_scorer.missing_for(txs) if saved_scorer is not None else []
    if saved_scorer is not None and not missing:
        try:
            results = saved_scorer.score(txs)
        except ValueError as e:
            return jsonify(error=str(e)), 500
        source = f"saved:{os.path.basename(MODEL_PATH)}"
        warnings = []
    else:
        results = UnusualTransactionModel(contamination=contamination).fit_predict(txs)
        source = "fit_on_request"
        warnings = []

    return jsonify(
        results=results,
        model="IsolationForest",
        model_source=source,
        warnings=warnings,
        contamination=contamination,
        score_direction="higher_means_more_unusual",
    )


if __name__ == "__main__":
    app.run(port=5001, debug=False)
