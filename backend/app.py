import os
import numpy as np
import pandas as pd
import joblib

from flask import Flask, request, jsonify
from flask_cors import CORS

from tensorflow.keras.models import load_model

# -------- Paths & constants --------
BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "data", "Emigrant-1981-2020-Sex.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")

WINDOW_SIZE = 5
SCALE_FACTOR = 1000.0  # must match train_models.py

# API attribute names -> CSV column names
ATTRIBUTES = {
    "total": "Total",
    "male": "Male",
    "female": "Female",
}

app = Flask(__name__)
CORS(app)


# -------- Data loading --------
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


# -------- Load models --------
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
        LSTM_MODELS[attr_key] = load_model(lstm_path, compile=False)
        print(f"Loaded {lstm_path}")
    else:
        print(f"WARNING: missing {lstm_path}")


# -------- Metrics (static for now) --------
# Update these from your latest train_models.py output if needed
METRICS = {
    "total": {
        "rmse": 8536.0,
        "mae": 7952.0,
        "r2": 0.018,
        "notes": "Validation on last 20% of years for Total emigrants.",
    },
    "male": {
        "rmse": 4605.0,
        "mae": 3862.0,
        "r2": -0.073,
        "notes": "Validation on last 20% of years for Male emigrants.",
    },
    "female": {
        "rmse": 3735.0,
        "mae": 3335.0,
        "r2": 0.239,
        "notes": "Validation on last 20% of years for Female emigrants.",
    },
}


# -------- Forecast helper (ALWAYS expects SCALED series) --------
def make_forecast_from_scaled(model, series_scaled, n_steps, model_type):
    """
    series_scaled: 1D numpy array already divided by SCALE_FACTOR.
    Returns list of dicts with values in REAL COUNTS.
    """
    history = list(series_scaled.astype("float32"))
    forecasts = []

    for _ in range(n_steps):
        window = np.array(history[-WINDOW_SIZE:], dtype="float32")

        if model_type == "lstm":
            x_input = window.reshape((1, WINDOW_SIZE, 1))
            yhat_scaled = float(model.predict(x_input, verbose=0)[0][0])
        else:  # mlp
            x_input = window.reshape(1, -1)
            yhat_scaled = float(model.predict(x_input)[0])

        # keep scaled value for the next step
        history.append(yhat_scaled)

        # convert back to real counts
        yhat = yhat_scaled * SCALE_FACTOR

        lower = max(0.0, yhat * 0.9)
        upper = yhat * 1.1

        forecasts.append(
            {
                "value": yhat,
                "lower": lower,
                "upper": upper,
            }
        )

    return forecasts


# -------- API endpoints --------
@app.route("/forecast", methods=["POST"])
def forecast_endpoint():
    """
    Request JSON:
      {
        "attribute": "total" | "male" | "female",
        "model_type": "mlp" | "lstm",
        "years": 1-10,

        // optional, from Firebase Files page:
        "series": [..., ...],      # numeric values (totals, males, females)
        "years_array": [1981, 1982, ...]
      }

    If series/years_array are provided, they are used for the
    historical part AND as input to the model (after consistent scaling).
    Otherwise, the local CSV (df) is used, which reproduces
    your previous results.
    """
    data = request.get_json(force=True)
    attribute = data.get("attribute", "total")
    model_type = data.get("model_type", "mlp")
    years_to_forecast = int(data.get("years", 5))

    if attribute not in ATTRIBUTES:
        return jsonify({"message": f"Unknown attribute '{attribute}'."}), 400

    if model_type not in ("mlp", "lstm"):
        return jsonify({"message": "model_type must be 'mlp' or 'lstm'."}), 400

    if years_to_forecast < 1 or years_to_forecast > 10:
        return jsonify({"message": "Years must be between 1 and 10."}), 400

    # ---- choose model ----
    if model_type == "mlp":
        model = MLP_MODELS.get(attribute)
    else:
        model = LSTM_MODELS.get(attribute)

    if model is None:
        return jsonify(
            {"message": f"No pre-trained {model_type.upper()} model for '{attribute}'."}
        ), 500

    # ---- decide which series to use ----
    custom_series = data.get("series")
    custom_years = data.get("years_array")

    if custom_series and custom_years:
        # Use the series coming from Firebase (Sex CSV uploaded in the app)
        raw_series = np.array(custom_series, dtype="float32")
        years_arr = np.array(custom_years, dtype="int32")
        print(f"Using custom series from client for attribute={attribute}")
    else:
        # Fallback: use local CSV (this reproduces your old behaviour)
        col_name = ATTRIBUTES[attribute]
        raw_series = df[col_name].values.astype("float32")
        years_arr = df["Year"].values.astype("int32")
        print(f"Using local CSV series for attribute={attribute}")

    # --- IMPORTANT: keep only years up to 2019 (drop 2020 pandemic outlier) ---
    # This matches how you trained your models (1981–2019),
    # so forecasts have the same scale as your previous results.
    mask = years_arr <= 2019
    raw_series = raw_series[mask]
    years_arr = years_arr[mask]

    if raw_series.shape[0] <= WINDOW_SIZE:
        return jsonify(
            {
                "message": "Not enough data points to apply a 5-year input window "
                f"(got {raw_series.shape[0]})."
            }
        ), 400

    # ---- scale ONCE (same as training) ----
    series_scaled = raw_series / SCALE_FACTOR

    # ---- make forecasts ----
    forecasts = make_forecast_from_scaled(
        model, series_scaled, years_to_forecast, model_type
    )

    last_year = int(years_arr[-1])

    # historical segment in REAL counts
    historical = [
        {"year": int(y), "value": float(v)}
        for y, v in zip(years_arr, raw_series)
    ]

    # future years with CI band
    future = []
    for step, f in enumerate(forecasts, start=1):
        future.append(
            {
                "year": last_year + step,
                "value": float(f["value"]),
                "lower": float(f["lower"]),
                "upper": float(f["upper"]),
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


@app.route("/metrics", methods=["GET"])
def metrics_endpoint():
    """
    GET /metrics?attribute=total|male|female
    """
    attr = request.args.get("attribute", "total")
    if attr not in METRICS:
        return jsonify({"message": f"No metrics stored for attribute '{attr}'."}), 404
    return jsonify(METRICS[attr])


@app.route("/")
def index():
    return jsonify(
        {
            "message": "Filipino Emigrants Forecast API",
            "endpoints": ["/forecast", "/metrics"],
        }
    )


if __name__ == "__main__":
    # debug=True is fine for development
    app.run(host="127.0.0.1", port=5000, debug=True)
