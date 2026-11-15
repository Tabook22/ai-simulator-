"""Train the house-price case study from house_data.xlsx.

This script is intentionally small and self-contained. It reads the workbook
created by the Neuron Lab House case, scales the two features, trains the same
2 -> 3 -> 1 network for 10 epochs in 10 batches of 100, evaluates the three
splits, and writes results_house.xlsx.

Run from this folder:
    python train_house.py
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

DATA_FILE = Path(__file__).with_name("house_data.xlsx")
RESULT_FILE = Path(__file__).with_name("results_house.xlsx")
FEATURES = ["area_m2", "bedrooms"]
TARGET = "price_omr"
SEED = 42
BATCH_SIZE = 100
EPOCHS = 10
LEARNING_RATE = 0.05


def load_data() -> pd.DataFrame:
    if not DATA_FILE.exists():
        raise SystemExit(
            f"Missing {DATA_FILE.name}. Put this script and house_data.xlsx in the same folder."
        )
    frame = pd.read_excel(DATA_FILE, sheet_name="Full_Data")
    required = {"row_id", "split", "batch", *FEATURES, TARGET}
    missing = required - set(frame.columns)
    if missing:
        raise SystemExit(f"Workbook is missing columns: {sorted(missing)}")
    return frame


def standardise(frame: pd.DataFrame, feature_mean: np.ndarray, feature_std: np.ndarray) -> np.ndarray:
    return (frame[FEATURES].to_numpy(dtype=float) - feature_mean) / feature_std


def forward(x: np.ndarray, w1: np.ndarray, b1: np.ndarray, w2: np.ndarray, b2: np.ndarray):
    z1 = x @ w1 + b1
    hidden = np.maximum(0.0, z1)
    prediction = hidden @ w2 + b2
    return z1, hidden, prediction


def predict_price(x, w1, b1, w2, b2, y_mean, y_std):
    _, _, scaled = forward(x, w1, b1, w2, b2)
    return (scaled.reshape(-1) * y_std + y_mean) * 10_000.0


def metrics(x, actual_price, w1, b1, w2, b2, y_mean, y_std):
    predicted = predict_price(x, w1, b1, w2, b2, y_mean, y_std)
    error = predicted - actual_price
    return {
        "mae": float(np.mean(np.abs(error))),
        "rmse": float(np.sqrt(np.mean(error ** 2))),
    }


def main() -> None:
    frame = load_data()
    train = frame[frame["split"] == "train"].reset_index(drop=True)
    validation = frame[frame["split"] == "validation"].reset_index(drop=True)
    test = frame[frame["split"] == "test"].reset_index(drop=True)

    print("Workbook:", DATA_FILE.name)
    print("Rows:", {"train": len(train), "validation": len(validation), "test": len(test)})

    batches = sorted(train["batch"].dropna().unique())
    print("Batch sheets:", ", ".join(f"Batch_{int(batch):02d}" for batch in batches))
    for batch in batches:
        count = len(train[train["batch"] == batch])
        if count != BATCH_SIZE:
            raise SystemExit(f"Batch {batch} has {count} rows; expected {BATCH_SIZE}.")
    print(f"Each of the {len(batches)} batches contains {BATCH_SIZE} rows.")

    feature_mean = train[FEATURES].to_numpy(dtype=float).mean(axis=0)
    feature_std = train[FEATURES].to_numpy(dtype=float).std(axis=0, ddof=0)
    feature_std[feature_std == 0] = 1.0
    x_train = standardise(train, feature_mean, feature_std)
    x_validation = standardise(validation, feature_mean, feature_std)
    x_test = standardise(test, feature_mean, feature_std)

    # Prices are divided by 10,000 for a stable target scale, exactly as in the case.
    y_train_price = train[TARGET].to_numpy(dtype=float)
    y_validation_price = validation[TARGET].to_numpy(dtype=float)
    y_test_price = test[TARGET].to_numpy(dtype=float)
    y_mean = float((y_train_price / 10_000.0).mean())
    y_std = float((y_train_price / 10_000.0).std(ddof=0)) or 1.0
    y_train = ((y_train_price / 10_000.0 - y_mean) / y_std).reshape(-1, 1)

    # Same seeded initialization as the Neuron Lab House case.
    rng = np.random.default_rng(SEED)
    w1 = rng.normal(0.0, np.sqrt(2.0 / 2.0), (2, 3))
    b1 = np.zeros(3)
    w2 = rng.normal(0.0, np.sqrt(2.0 / (3.0 + 1.0)), (3, 1))
    b2 = np.zeros(1)

    initial = {
        "train": metrics(x_train, y_train_price, w1, b1, w2, b2, y_mean, y_std),
        "validation": metrics(x_validation, y_validation_price, w1, b1, w2, b2, y_mean, y_std),
        "test": metrics(x_test, y_test_price, w1, b1, w2, b2, y_mean, y_std),
    }
    history = [{"epoch": 0, "train_rmse": initial["train"]["rmse"],
                "validation_rmse": initial["validation"]["rmse"]}]
    order_rng = np.random.default_rng(SEED + 1)

    for epoch in range(1, EPOCHS + 1):
        order = order_rng.permutation(len(train))
        for start in range(0, len(train), BATCH_SIZE):
            batch = order[start:start + BATCH_SIZE]
            z1, hidden, prediction = forward(x_train[batch], w1, b1, w2, b2)
            dpred = 2.0 * (prediction - y_train[batch]) / len(batch)
            dw2 = hidden.T @ dpred
            db2 = dpred.sum(axis=0)
            dhidden = dpred @ w2.T
            dz1 = dhidden * (z1 > 0)
            dw1 = x_train[batch].T @ dz1
            db1 = dz1.sum(axis=0)
            w1 -= LEARNING_RATE * dw1
            b1 -= LEARNING_RATE * db1
            w2 -= LEARNING_RATE * dw2
            b2 -= LEARNING_RATE * db2
        train_metrics = metrics(x_train, y_train_price, w1, b1, w2, b2, y_mean, y_std)
        val_metrics = metrics(x_validation, y_validation_price, w1, b1, w2, b2, y_mean, y_std)
        history.append({"epoch": epoch, "train_rmse": train_metrics["rmse"],
                        "validation_rmse": val_metrics["rmse"]})

    final = {
        "train": metrics(x_train, y_train_price, w1, b1, w2, b2, y_mean, y_std),
        "validation": metrics(x_validation, y_validation_price, w1, b1, w2, b2, y_mean, y_std),
        "test": metrics(x_test, y_test_price, w1, b1, w2, b2, y_mean, y_std),
    }

    print("\nParameters: 9 weights, 4 biases")
    print("Updates:", EPOCHS * len(batches))
    print("\nMean absolute error (OMR)")
    for split, before, after in (
        ("train", initial["train"]["mae"], final["train"]["mae"]),
        ("validation", initial["validation"]["mae"], final["validation"]["mae"]),
        ("test", initial["test"]["mae"], final["test"]["mae"]),
    ):
        print(f"  {split:10s} {before:10.2f} -> {after:10.2f}")

    sample = frame.iloc[:4].copy()
    sample["predicted_price"] = predict_price(
        standardise(sample, feature_mean, feature_std), w1, b1, w2, b2, y_mean, y_std
    )
    sample["error"] = sample["predicted_price"] - sample[TARGET]
    print("\nIllustrative rows")
    print(sample[["row_id", *FEATURES, TARGET, "predicted_price", "error"]].to_string(index=False, float_format=lambda v: f"{v:,.2f}"))

    metrics_rows = []
    for split in ("train", "validation", "test"):
        metrics_rows.append({"split": split, "initial_mae": initial[split]["mae"],
                             "final_mae": final[split]["mae"],
                             "initial_rmse": initial[split]["rmse"],
                             "final_rmse": final[split]["rmse"]})
    with pd.ExcelWriter(RESULT_FILE, engine="openpyxl") as writer:
        pd.DataFrame(metrics_rows).to_excel(writer, sheet_name="Metrics", index=False)
        pd.DataFrame(history).to_excel(writer, sheet_name="Training_History", index=False)
        sample[["row_id", *FEATURES, TARGET, "predicted_price", "error"]].to_excel(
            writer, sheet_name="Predictions", index=False
        )
    print(f"\nSaved {RESULT_FILE.name}")


if __name__ == "__main__":
    main()
