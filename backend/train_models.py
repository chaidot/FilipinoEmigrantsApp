import os
import numpy as np
import pandas as pd
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import joblib

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.callbacks import EarlyStopping

# ---- Paths & constants ----
BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "data", "Emigrant-1981-2020-Sex.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")

WINDOW_SIZE = 5              # how many past years used as input
SCALE_FACTOR = 1000.0        # train on "thousands of emigrants"

# API attribute names -> CSV column names (after cleaning)
ATTRIBUTES = {
    "total": "Total",
    "male": "Male",
    "female": "Female",
}


def load_data():
    """Load and clean the Emigrant-1981-2020-Sex.csv file."""
    df_raw = pd.read_csv(DATA_PATH)

    # Clean column names
    df_raw.columns = [c.strip() for c in df_raw.columns]

    # Rename to nicer names
    df = df_raw.rename(
        columns={
            "YEAR": "Year",
            "MALE": "Male",
            "FEMALE": "Female",
            "TOTAL": "Total",
        }
    )

    # Remove commas & convert to numeric
    for col in ["Male", "Female", "Total"]:
        df[col] = (
            df[col]
            .astype(str)
            .str.replace(",", "", regex=False)
            .str.strip()
        )
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["Year"] = pd.to_numeric(df["Year"], errors="coerce").astype("int32")

    # Drop incomplete rows & sort
    df = df.dropna(subset=["Year", "Male", "Female", "Total"])
    df = df.sort_values("Year").reset_index(drop=True)
    return df


def make_supervised(series: np.ndarray, window: int):
    """Convert 1D time series into supervised learning samples."""
    X, y = [], []
    for i in range(len(series) - window):
        X.append(series[i : i + window])
        y.append(series[i + window])
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)

    df = load_data()
    print("Loaded data with columns:", df.columns.tolist())
    print(df.head())

    for attr_key, col_name in ATTRIBUTES.items():
        if col_name not in df.columns:
            print(f"Skipping {attr_key}: column '{col_name}' not found.")
            continue

        print(f"\n=== Training models for: {attr_key} ({col_name}) ===")

        # Scale to thousands for more stable training
        values = df[col_name].values.astype("float32") / SCALE_FACTOR

        X, y = make_supervised(values, WINDOW_SIZE)
        if len(X) < 10:
            print("Not enough data after windowing, skipping.")
            continue

        # Time-series style split (no shuffle)
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )

        # ---------- MLP ----------
        mlp_configs = [
            {"hidden_layer_sizes": (32,), "alpha": 0.0001},
            {"hidden_layer_sizes": (64, 32), "alpha": 0.0001},
            {"hidden_layer_sizes": (64, 64), "alpha": 0.0005},
        ]

        best_mlp = None
        best_mlp_rmse = float("inf")

        for cfg in mlp_configs:
            print(f"Training MLP with {cfg}")
            mlp = MLPRegressor(
                max_iter=2000,
                random_state=42,
                **cfg,
            )
            mlp.fit(X_train, y_train)
            preds = mlp.predict(X_val)

            # scikit-learn version doesn't have squared=False, so do RMSE manually
            mse = mean_squared_error(y_val, preds)
            rmse = float(np.sqrt(mse))
            print(f"  -> RMSE (scaled): {rmse:.4f}")

            if rmse < best_mlp_rmse:
                best_mlp_rmse = rmse
                best_mlp = mlp

        mlp_path = os.path.join(MODELS_DIR, f"mlp_{attr_key}.joblib")
        joblib.dump(best_mlp, mlp_path)
        print(f"Saved best MLP to {mlp_path}")

        # ---------- LSTM ----------
        X_train_lstm = X_train.reshape((X_train.shape[0], WINDOW_SIZE, 1))
        X_val_lstm = X_val.reshape((X_val.shape[0], WINDOW_SIZE, 1))

        lstm_units_candidates = [32, 64]
        best_lstm = None
        best_lstm_val_loss = float("inf")

        for units in lstm_units_candidates:
            print(f"Training LSTM with units={units}")
            model = Sequential(
                [
                    LSTM(units, input_shape=(WINDOW_SIZE, 1)),
                    Dense(1),
                ]
            )
            model.compile(optimizer="adam", loss="mse")
            es = EarlyStopping(
                monitor="val_loss", patience=20, restore_best_weights=True
            )

            history = model.fit(
                X_train_lstm,
                y_train,
                validation_data=(X_val_lstm, y_val),
                epochs=200,
                batch_size=8,
                verbose=0,
                callbacks=[es],
            )

            val_loss = min(history.history["val_loss"])
            print(f"  -> best val_loss (scaled): {val_loss:.6f}")

            if val_loss < best_lstm_val_loss:
                best_lstm_val_loss = val_loss
                best_lstm = model

        lstm_path = os.path.join(MODELS_DIR, f"lstm_{attr_key}.h5")
        best_lstm.save(lstm_path)
        print(f"Saved best LSTM to {lstm_path}")

        print(
            f"Finished {attr_key}: "
            f"best MLP RMSE (scaled)={best_mlp_rmse:.4f}, "
            f"best LSTM val_loss (scaled)={best_lstm_val_loss:.6f}"
        )


if __name__ == "__main__":
    main()
