import json

import pytest
from fastapi.testclient import TestClient

from backend.main import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path / "test.sqlite3")) as instance:
        yield instance


def preset(client, key="one-neuron"):
    response = client.get(f"/api/presets/{key}")
    assert response.status_code == 200
    return response.json()


@pytest.mark.parametrize(
    "field,value,expected",
    [("input", 4, 4), ("weight", -1, 0), ("bias", -5, 0), ("activation", "tanh", 0.9950547536867305)],
)
def test_forward_with_edited_value(client, field, value, expected):
    network = preset(client)["network"]
    if field == "input":
        network["inputs"][0] = value
    elif field == "weight":
        network["layers"][0]["weights"][0][0] = value
    elif field == "bias":
        network["layers"][0]["biases"][0] = value
    else:
        network["layers"][0]["activation"] = value
    response = client.post("/api/forward", json=network)
    assert response.status_code == 200
    assert response.json()["outputs"] == pytest.approx([expected])


def test_backprop_returns_gradients_and_reduces_the_loss(client):
    network = preset(client)["network"]
    response = client.post("/api/backprop", json={
        "network": network, "inputs": network["inputs"], "targets": [1], "learning_rate": 0.5,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["loss"] == pytest.approx(4.0)
    assert len(data["backward"]["layers"]) == len(network["layers"])
    assert data["backward"]["layers"][0]["weight_gradients"][0] == pytest.approx([8.0, 12.0])
    assert data["updated"]["loss"] < data["loss"]
    assert data["updated"]["network"]["layers"][0]["weights"] != network["layers"][0]["weights"]


def test_auto_backprop_keeps_the_lowest_loss(client):
    network = preset(client)["network"]
    response = client.post("/api/backprop/auto", json={
        "network": network, "inputs": network["inputs"], "targets": [1],
        "learning_rate": 0.1, "steps": 40,
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["history"]) > 1
    assert data["best"]["loss"] == pytest.approx(min(data["history"]))
    assert data["best"]["loss"] <= data["before"]["loss"]
    assert data["final"]["loss"] >= data["best"]["loss"]
    assert data["best"]["network"]["layers"][0]["weights"] != network["layers"][0]["weights"]


def test_house_case_runs_mini_batches(client):
    response = client.post("/api/case/house/train", json={
        "epochs": 10, "batch_size": 100, "learning_rate": 0.05,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["dataset"]["counts"] == {"train": 1000, "validation": 100, "test": 100}
    assert data["network"]["inputs"] == 2
    assert data["network"]["hidden"] == 3
    assert data["network"]["outputs"] == 1
    assert data["network"]["weights"] == 9
    assert data["network"]["biases"] == 4
    assert data["dataset"]["batches_per_epoch"] == 10
    assert data["updates"] == 100
    assert len(data["history"]["train_rmse"]) == 11
    assert len(data["batch_losses"]) == 10
    assert data["final"]["train"]["mae"] < data["initial"]["train"]["mae"]
    assert data["final"]["test"]["mae"] < data["initial"]["test"]["mae"]
    assert len(data["predictions"]) == 4


def test_backprop_rejects_a_mismatched_target(client):
    network = preset(client)["network"]
    response = client.post("/api/backprop", json={
        "network": network, "inputs": network["inputs"], "targets": [1, 0], "learning_rate": 0.5,
    })
    assert response.status_code == 422


def test_lesson_round_trip_persists_to_disk(tmp_path):
    database = tmp_path / "lessons.sqlite3"
    with TestClient(create_app(database)) as client:
        lesson = preset(client, "and")
        lesson.pop("forward")
        lesson["name"] = "AND for Monday"
        saved = client.post("/api/lessons", json=lesson)
        assert saved.status_code == 201
        item = saved.json()
        assert client.get("/api/lessons").json() == [item]

    with TestClient(create_app(database)) as client:
        path = f"/api/lessons/{item['id']}"
        reopened = client.get(path).json()
        assert "outputs" in reopened.pop("forward")
        assert reopened == lesson
        assert client.delete(path).status_code == 204
        assert client.get(path).status_code == 404
        assert client.get("/api/lessons").json() == []


def test_invalid_shape_and_non_finite_number(client):
    network = preset(client)["network"]
    network["layers"][0]["weights"] = [[1]]
    invalid = client.post("/api/forward", json=network)
    assert invalid.status_code == 422
    assert "2 incoming weights" in invalid.json()["detail"]

    network = preset(client)["network"]
    network["inputs"][0] = float("inf")
    invalid = client.post("/api/forward", content=json.dumps(network), headers={"Content-Type": "application/json"})
    assert invalid.status_code == 422
    assert "finite number" in invalid.json()["detail"]

    network["inputs"][0] = 1e308
    network["layers"][0]["weights"][0][0] = 1e308
    invalid = client.post("/api/forward", json=network)
    assert invalid.status_code == 422
    assert "exceeded the number range" in invalid.json()["detail"]


def test_lesson_with_overflow_can_be_reopened_for_editing(client):
    network = preset(client)["network"]
    network["inputs"][0] = 1e308
    network["layers"][0]["weights"][0][0] = 1e308
    saved = client.post("/api/lessons", json={"name": "Large numbers", "network": network})
    assert saved.status_code == 201
    reopened = client.get(f"/api/lessons/{saved.json()['id']}")
    assert reopened.status_code == 200
    assert reopened.json()["network"] == network
    assert reopened.json()["forward"] is None
    assert "exceeded the number range" in reopened.json()["warning"]


def test_architecture_limits(client):
    network = preset(client)["network"]
    valid = client.post("/api/resize", json={"network": network, "inputs": 8, "hidden": [8] * 4, "outputs": 4})
    assert valid.status_code == 200
    run = client.post("/api/forward", json=valid.json())
    assert len(run.json()["layers"]) == 5
    assert len(run.json()["outputs"]) == 4
    invalid = client.post("/api/resize", json={"network": network, "inputs": 0, "hidden": [9] * 5, "outputs": 5})
    assert invalid.status_code == 422
    assert all(field in invalid.json()["detail"] for field in ("inputs", "hidden", "outputs"))


def test_training_api_errors_and_valid_step(client):
    lesson = preset(client, "and")
    settings = lesson["training"]
    request = {"network": lesson["network"], "settings": settings, "connection": {"layer": 0, "neuron": 0, "source": 0}}
    settings["steps"] = 1
    updated = client.post("/api/train", json=request)
    assert updated.status_code == 200
    assert len(updated.json()["history"]) == 2

    settings["learning_rate"] = -1
    invalid = client.post("/api/train", json=request)
    assert invalid.status_code == 422
    assert "learning_rate" in invalid.json()["detail"]

    settings["learning_rate"] = 1
    settings["examples"][0]["inputs"] = [0]
    invalid = client.post("/api/train", json=request)
    assert invalid.status_code == 422
    assert "Training row 1 needs 2 inputs and 1 targets" in invalid.json()["detail"]
