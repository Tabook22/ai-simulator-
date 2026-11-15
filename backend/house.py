"""The classroom house-price case study: synthetic data and mini-batch training."""
from __future__ import annotations

import numpy as np

TRAIN_SIZE = 1000
VALIDATION_SIZE = 100
TEST_SIZE = 100
TOTAL = TRAIN_SIZE + VALIDATION_SIZE + TEST_SIZE


def _relu(value):
    return np.maximum(0.0, value)


def _forward(x, w1, b1, w2, b2):
    z1 = x @ w1 + b1
    hidden = _relu(z1)
    prediction = hidden @ w2 + b2
    return z1, hidden, prediction


def _predict_omr(x, w1, b1, w2, b2, y_mean, y_std):
    _, _, prediction = _forward(x, w1, b1, w2, b2)
    return (prediction.reshape(-1) * y_std + y_mean) * 10_000.0


def _metrics(x, y_omr, w1, b1, w2, b2, y_mean, y_std):
    predictions = _predict_omr(x, w1, b1, w2, b2, y_mean, y_std)
    error = predictions - y_omr
    return {
        "mae": float(np.mean(np.abs(error))),
        "rmse": float(np.sqrt(np.mean(error ** 2))),
    }


def house_case(epochs: int = 10, batch_size: int = 100, learning_rate: float = 0.05, seed: int = 42):
    rng = np.random.default_rng(seed)
    area = rng.integers(80, 301, size=TOTAL).astype(float)
    bedrooms = rng.integers(1, 6, size=TOTAL).astype(float)
    area[:3] = [120.0, 180.0, 250.0]
    bedrooms[:3] = [2.0, 3.0, 4.0]
    price = 500.0 * area - 10_000.0 * bedrooms + 5_000.0 + rng.normal(0.0, 2_400.0, size=TOTAL)
    price[:3] = [45_000.0, 65_000.0, 90_000.0]
    price = np.maximum(price, 15_000.0)

    x_raw = np.column_stack([area, bedrooms])
    y_price = price
    train = np.arange(TRAIN_SIZE)
    validation = np.arange(TRAIN_SIZE, TRAIN_SIZE + VALIDATION_SIZE)
    test = np.arange(TRAIN_SIZE + VALIDATION_SIZE, TOTAL)

    feature_mean = x_raw[train].mean(axis=0)
    feature_std = x_raw[train].std(axis=0)
    feature_std[feature_std == 0] = 1.0
    x = (x_raw - feature_mean) / feature_std
    y_mean = y_price[train].mean() / 10_000.0
    y_std = (y_price[train] / 10_000.0).std() or 1.0
    y = (y_price / 10_000.0 - y_mean) / y_std
    y = y.reshape(-1, 1)

    init_rng = np.random.default_rng(seed)
    w1 = init_rng.normal(0.0, np.sqrt(2.0 / 2.0), (2, 3))
    b1 = np.zeros(3)
    w2 = init_rng.normal(0.0, np.sqrt(2.0 / (3.0 + 1.0)), (3, 1))
    b2 = np.zeros(1)
    initial_w1, initial_b1, initial_w2, initial_b2 = w1.copy(), b1.copy(), w2.copy(), b2.copy()

    def scaled_loss(indices):
        _, _, pred = _forward(x[indices], w1, b1, w2, b2)
        return float(np.mean((pred - y[indices]) ** 2))

    initial = {
        "train": _metrics(x[train], y_price[train], w1, b1, w2, b2, y_mean, y_std),
        "validation": _metrics(x[validation], y_price[validation], w1, b1, w2, b2, y_mean, y_std),
        "test": _metrics(x[test], y_price[test], w1, b1, w2, b2, y_mean, y_std),
    }
    train_history = [initial["train"]["rmse"]]
    validation_history = [initial["validation"]["rmse"]]
    batch_losses: list[float] = []
    order_rng = np.random.default_rng(seed + 1)
    batches_per_epoch = int(np.ceil(TRAIN_SIZE / batch_size))

    for epoch in range(epochs):
        shuffled = order_rng.permutation(train)
        for batch_index in range(batches_per_epoch):
            batch = shuffled[batch_index * batch_size:(batch_index + 1) * batch_size]
            z1, hidden, prediction = _forward(x[batch], w1, b1, w2, b2)
            count = len(batch)
            dpred = 2.0 * (prediction - y[batch]) / count
            dw2 = hidden.T @ dpred
            db2 = dpred.sum(axis=0)
            dhidden = dpred @ w2.T
            dz1 = dhidden * (z1 > 0)
            dw1 = x[batch].T @ dz1
            db1 = dz1.sum(axis=0)
            w2 -= learning_rate * dw2
            b2 -= learning_rate * db2
            w1 -= learning_rate * dw1
            b1 -= learning_rate * db1
            if epoch == 0:
                current = _predict_omr(x[batch], w1, b1, w2, b2, y_mean, y_std)
                batch_losses.append(float(np.sqrt(np.mean((current - y_price[batch]) ** 2))))
        train_metrics = _metrics(x[train], y_price[train], w1, b1, w2, b2, y_mean, y_std)
        val_metrics = _metrics(x[validation], y_price[validation], w1, b1, w2, b2, y_mean, y_std)
        train_history.append(train_metrics["rmse"])
        validation_history.append(val_metrics["rmse"])

    final = {
        "train": _metrics(x[train], y_price[train], w1, b1, w2, b2, y_mean, y_std),
        "validation": _metrics(x[validation], y_price[validation], w1, b1, w2, b2, y_mean, y_std),
        "test": _metrics(x[test], y_price[test], w1, b1, w2, b2, y_mean, y_std),
    }
    sample_indices = [0, 1, 2, 3]
    sample_predictions = _predict_omr(x[sample_indices], w1, b1, w2, b2, y_mean, y_std)
    samples = [
        {
            "area": int(area[index]),
            "bedrooms": int(bedrooms[index]),
            "actual": int(round(float(y_price[index]))),
            "predicted": int(round(float(sample_predictions[position]))),
        }
        for position, index in enumerate(sample_indices)
    ]

    def layers(weights1, biases1, weights2, biases2):
        return [
            {"activation": "relu", "weights": weights1.tolist(), "biases": biases1.tolist()},
            {"activation": "linear", "weights": weights2.tolist(), "biases": biases2.tolist()},
        ]

    return {
        "dataset": {
            "name": "House prices (classroom synthetic set)",
            "features": [
                {"name": "Area", "unit": "m²"},
                {"name": "Bedrooms", "unit": "rooms"},
            ],
            "target": "Price",
            "unit": "OMR",
            "counts": {"train": TRAIN_SIZE, "validation": VALIDATION_SIZE, "test": TEST_SIZE},
            "samples": samples,
            "batch_size": batch_size,
            "batches_per_epoch": batches_per_epoch,
            "feature_mean": feature_mean.tolist(),
            "feature_std": feature_std.tolist(),
            "target_mean_omr": y_mean * 10_000.0,
            "target_std_omr": y_std * 10_000.0,
        },
        "network": {
            "inputs": 2,
            "hidden": 3,
            "outputs": 1,
            "weights": 9,
            "biases": 4,
            "layers": layers(initial_w1, initial_b1, initial_w2, initial_b2),
            "final_layers": layers(w1, b1, w2, b2),
        },
        "history": {
            "train_rmse": train_history,
            "validation_rmse": validation_history,
        },
        "batch_losses": batch_losses,
        "initial": initial,
        "final": final,
        "predictions": samples,
        "epochs": epochs,
        "updates": epochs * batches_per_epoch,
    }
