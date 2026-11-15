"""The classroom exam-score case study: synthetic data and mini-batch training."""
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


def _predict_points(x, w1, b1, w2, b2, y_mean, y_std):
    _, _, prediction = _forward(x, w1, b1, w2, b2)
    points = prediction.reshape(-1) * y_std + y_mean
    return np.clip(points, 0.0, 100.0)


def _metrics(x, y_points, w1, b1, w2, b2, y_mean, y_std):
    predictions = _predict_points(x, w1, b1, w2, b2, y_mean, y_std)
    error = predictions - y_points
    return {
        "mae": float(np.mean(np.abs(error))),
        "rmse": float(np.sqrt(np.mean(error ** 2))),
    }


def exam_case(epochs: int = 10, batch_size: int = 100, learning_rate: float = 0.05, seed: int = 42):
    rng = np.random.default_rng(seed)
    study = rng.uniform(1.0, 20.0, size=TOTAL).round()
    attendance = rng.integers(50, 101, size=TOTAL).astype(float)
    study[:4] = [5.0, 10.0, 15.0, 8.0]
    attendance[:4] = [70.0, 85.0, 95.0, 80.0]
    score = 10.0 + 3.0 * study + 0.5 * attendance + rng.normal(0.0, 3.0, size=TOTAL)
    score[:4] = [58.0, 75.0, 89.0, 68.0]
    score = np.clip(score, 0.0, 100.0)

    x_raw = np.column_stack([study, attendance])
    y_score = score
    train = np.arange(TRAIN_SIZE)
    validation = np.arange(TRAIN_SIZE, TRAIN_SIZE + VALIDATION_SIZE)
    test = np.arange(TRAIN_SIZE + VALIDATION_SIZE, TOTAL)

    feature_mean = x_raw[train].mean(axis=0)
    feature_std = x_raw[train].std(axis=0)
    feature_std[feature_std == 0] = 1.0
    x = (x_raw - feature_mean) / feature_std
    y_mean = y_score[train].mean()
    y_std = y_score[train].std() or 1.0
    y = ((y_score - y_mean) / y_std).reshape(-1, 1)

    init_rng = np.random.default_rng(seed)
    w1 = init_rng.normal(0.0, np.sqrt(2.0 / 2.0), (2, 3))
    b1 = np.zeros(3)
    w2 = init_rng.normal(0.0, np.sqrt(2.0 / (3.0 + 1.0)), (3, 1))
    b2 = np.zeros(1)
    initial_w1, initial_b1, initial_w2, initial_b2 = w1.copy(), b1.copy(), w2.copy(), b2.copy()

    initial = {
        "train": _metrics(x[train], y_score[train], w1, b1, w2, b2, y_mean, y_std),
        "validation": _metrics(x[validation], y_score[validation], w1, b1, w2, b2, y_mean, y_std),
        "test": _metrics(x[test], y_score[test], w1, b1, w2, b2, y_mean, y_std),
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
                current = _predict_points(x[batch], w1, b1, w2, b2, y_mean, y_std)
                batch_losses.append(float(np.sqrt(np.mean((current - y_score[batch]) ** 2))))
        train_metrics = _metrics(x[train], y_score[train], w1, b1, w2, b2, y_mean, y_std)
        val_metrics = _metrics(x[validation], y_score[validation], w1, b1, w2, b2, y_mean, y_std)
        train_history.append(train_metrics["rmse"])
        validation_history.append(val_metrics["rmse"])

    final = {
        "train": _metrics(x[train], y_score[train], w1, b1, w2, b2, y_mean, y_std),
        "validation": _metrics(x[validation], y_score[validation], w1, b1, w2, b2, y_mean, y_std),
        "test": _metrics(x[test], y_score[test], w1, b1, w2, b2, y_mean, y_std),
    }
    sample_indices = [0, 1, 2, 3]
    sample_predictions = _predict_points(x[sample_indices], w1, b1, w2, b2, y_mean, y_std)
    samples = [
        {
            "study_hours": int(study[index]),
            "attendance": int(attendance[index]),
            "actual": int(round(float(y_score[index]))),
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
            "name": "Exam scores (classroom synthetic set)",
            "features": [
                {"name": "Study hours", "unit": "hours/week"},
                {"name": "Attendance", "unit": "%"},
            ],
            "target": "Exam score",
            "unit": "points",
            "counts": {"train": TRAIN_SIZE, "validation": VALIDATION_SIZE, "test": TEST_SIZE},
            "samples": samples,
            "batch_size": batch_size,
            "batches_per_epoch": batches_per_epoch,
            "feature_mean": feature_mean.tolist(),
            "feature_std": feature_std.tolist(),
            "target_mean": y_mean,
            "target_std": y_std,
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
