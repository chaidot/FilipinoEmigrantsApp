import os
import numpy as np
import pandas as pd
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model

# ---- Paths & constants ----
BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "data", "Emigrant-1981-2020-Sex.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")

WINDOW_SIZE = 5
SCALE_FACTOR = 1000.0  # must match train_models.py

ATTRIBUTES = {
    "total": "Total",
    "male": "Male",
    "female": "Female",
}

app = Flask(__name__)
CORS(app)  # allow frontend (Vite) to call this API


def load_data():
    df_raw = pd.read_csv(DATA_PATH)
    df_raw.columns = [c.strip() for c in df_raw.columns]

    df = df_raw.rename(
        columns={
            "YEAR": "Year",
            "MALE": "Male",
            "FEMALE": "Female",
            "TOTAL": "Total",
        }
    )

    for col in ["Male", "Female", "Total"]:
        df[col] = (
            df[col]
            .astype(str)
            .str.replace(",", "", regex=False)
            .str.strip()
        )
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["Year"] = pd.to_numeric(df["Year"], errors="coerce").astype("int32")
    df = df.dropna(subset=["Year", "Male", "Female", "Total"])
    df = df.sort_values("Year").reset_index(drop=True)
    return df


df = load_data()
print("Loaded data with columns:", df.columns.tolist())
print(df.head())

# ---------- Load models ----------
MLP_MODELS = {}
LSTM_MODELS = {}

for attr_key in ATTRIBUTES.keys():
    mlp_path = os.path.join(MODELS_DIR, f"mlp_{attr_key}.joblib")
    lstm_path = os.path.join(MODELS_DIR, f"lstm_{attr_key}.h5")

    if os.path.exists(mlp_path):
        MLP_MODELS[attr_key] = joblib.load(mlp_path)
        print(f"Loaded {mlp_path}")
    else:
        print(f"WARNING: missing {mlp_path}")

    if os.path.exists(lstm_path):
        # compile=False so we don't try to reload training loss/metrics
        LSTM_MODELS[attr_key] = load_model(lstm_path, compile=False)
        print(f"Loaded {lstm_path}")
    else:
        print(f"WARNING: missing {lstm_path}")


def make_forecast(model, series, n_steps, model_type):
    """
    Iteratively forecast n_steps ahead using the last WINDOW_SIZE points.
    We trained on 'thousands of emigrants', so we:
      - divide series by SCALE_FACTOR before feeding the model
      - multiply predictions by SCALE_FACTOR before returning
    Returns list of dicts: {value, lower, upper} in REAL counts.
    """
    # work in scaled units (thousands)
    history = list(series.astype("float32") / SCALE_FACTOR)
    forecasts = []

    for _ in range(n_steps):
        window = np.array(history[-WINDOW_SIZE:], dtype="float32")

        if model_type == "lstm":
            x_input = window.reshape((1, WINDOW_SIZE, 1))
            yhat_scaled = float(model.predict(x_input, verbose=0)[0][0])
        else:  # mlp
            x_input = window.reshape(1, -1)
            yhat_scaled = float(model.predict(x_input)[0])

        # keep scaled value for next prediction
        history.append(yhat_scaled)

        # convert back to real counts
        yhat = yhat_scaled * SCALE_FACTOR

        # simple ±10% band as "approx. 95% CI"
        lower = max(0.0, yhat * 0.9)
        upper = yhat * 1.1

        forecasts.append(
            {"value": yhat, "lower": lower, "upper": upper}
        )

    return forecasts


@app.route("/forecast", methods=["POST"])
def forecast_endpoint():
    """
    Request JSON:
    {
      "attribute": "total" | "male" | "female",
      "model_type": "lstm" | "mlp",
      "years": 1-10
    }
    """
    data = request.get_json(force=True)
    attribute = data.get("attribute", "total")
    model_type = data.get("model_type", "lstm")
    years = int(data.get("years", 5))

    if attribute not in ATTRIBUTES:
        return jsonify({"message": f"Unknown attribute '{attribute}'."}), 400

    if model_type not in ("lstm", "mlp"):
        return jsonify({"message": "model_type must be 'lstm' or 'mlp'."}), 400

    if years < 1 or years > 10:
        return jsonify({"message": "Years must be between 1 and 10."}), 400

    # Select model
    if model_type == "lstm":
        model = LSTM_MODELS.get(attribute)
    else:
        model = MLP_MODELS.get(attribute)

    if model is None:
        return jsonify(
            {
                "message": f"No pre-trained {model_type.upper()} model "
                f"for attribute '{attribute}'."
            }
        ), 500

    col_name = ATTRIBUTES[attribute]
    series = df[col_name].values.astype("float32")

    forecasts = make_forecast(model, series, years, model_type)
    last_year = int(df["Year"].max())

    # historical segment for chart
    historical = [
        {"year": int(y), "value": float(v)}
        for y, v in zip(df["Year"].values, series)
    ]

    # future years
    future = []
    for step, f in enumerate(forecasts, start=1):
        future.append(
            {
                "year": last_year + step,
                "value": f["value"],
                "lower": f["lower"],
                "upper": f["upper"],
            }
        )

    return jsonify(
        {
            "attribute": attribute,
            "model_type": model_type,
            "historical": historical,
            "forecast": future,
        }
    )


@app.route("/")
def index():
    return jsonify(
        {
            "message": "Filipino Emigrants Forecast API",
            "endpoints": ["/forecast"],
        }
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
