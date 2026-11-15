import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend import llm
from backend.main import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path / "llm-test.sqlite3")) as instance:
        yield instance


def test_attention_is_causal_and_normalized():
    model = llm.LanguageModel()
    ids = model.encode("the cat sat on the mat")
    _, cache = model.forward(ids)
    attention = cache["attention"][0]
    assert np.allclose(attention.sum(axis=1), 1.0, atol=1e-9)
    future = np.triu_indices(len(ids), k=1)
    assert np.allclose(attention[future], 0.0, atol=1e-12)


def test_analytic_gradients_match_numeric_approximation():
    model = llm.LanguageModel()
    ids = model.encode("the cat ran to the")
    position = len(ids) - 1
    target = model.stoi["mat"]
    probs, cache = model.forward(ids)
    dlogits = np.zeros_like(probs)
    dlogits[0, position] = probs[0, position]
    dlogits[0, position, target] -= 1.0
    grads, _ = model.backward(cache, dlogits)

    checks = [
        ("Wq", (0, 1)), ("Wk", (2, 3)), ("Wv", (1, 0)), ("Wo", (3, 2)),
        ("W1", (4, 5)), ("W2", (5, 4)), ("Wout", (6, 7)),
        ("E", (2, 3)), ("P", (4, 5)), ("bo", (1,)), ("b2", (3,)), ("bout", (2,)),
    ]
    epsilon = 1e-5
    errors = []
    for name, index in checks:
        original = model.params[name][index]

        model.params[name][index] = original + epsilon
        plus, _ = model.forward(ids)
        high = -np.log(plus[0, position, target])

        model.params[name][index] = original - epsilon
        minus, _ = model.forward(ids)
        low = -np.log(minus[0, position, target])

        model.params[name][index] = original
        numeric = (high - low) / (2 * epsilon)
        errors.append(abs(float(numeric - grads[name][index])))
    assert max(errors) < 1e-6


def test_training_lowers_the_corpus_loss():
    model = llm.LanguageModel()
    before = model.corpus_loss()
    history = model.batches(4, 0.2)
    assert len(history) == 5
    assert history[-1] < before


def test_trace_walks_the_chain_back_to_the_embedding():
    model = llm.LanguageModel()
    trace = model.trace("the cat ran to the", None, "mat", 3)
    assert trace["link"]["token"] == "to"
    assert trace["link"]["index"] == 3
    assert trace["steps"][0]["key"] == "loss"
    assert trace["steps"][0]["seed"] is True
    assert trace["steps"][-1]["key"] == "embedding"
    assert len(trace["steps"]) == 9
    assert trace["max_norm"] > 0
    assert "∂L/∂a" in trace["steps"][5]["outgoing"]
    gradient = model.gradients("the cat ran to the", None, "mat")
    assert trace["link"]["gradient"] == pytest.approx(gradient["dattention"][3], abs=1e-5)


def test_forward_explains_attention_and_prediction(client):
    response = client.post("/api/llm/forward", json={"prompt": "the cat ran to the"})
    assert response.status_code == 200
    data = response.json()
    assert data["predicted"] == "mat"
    assert data["target"] == "mat"
    assert 0 < data["predicted_prob"] <= 1
    assert len(data["attention"]) == len(data["tokens"])
    assert abs(sum(data["attention"]) - 1) < 1e-5
    assert data["top"][0]["token"] == data["predicted"]
    assert len(data["embedding"]) == 16
    assert len(data["mlp"]) == 32
    assert len(data["ids"]) == len(data["tokens"])
    assert len(data["mlp_input"]) == 16 and len(data["final_vector"]) == 16
    # The vector the model reads is the token's row plus the position's row.
    assert data["embedding"] == pytest.approx(
        [token + position for token, position in zip(data["token_embedding"], data["position_embedding"])], abs=1e-4)


def test_gradients_expose_the_backward_flow(client):
    response = client.post(
        "/api/llm/gradients",
        json={"prompt": "the cat ran to the", "target": "mat"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["gradient_norm"] > 0
    assert len(data["dattention"]) == len(data["attention"])
    assert data["loss"] > 0


def test_trace_endpoint_returns_the_chain(client):
    response = client.post(
        "/api/llm/trace",
        json={"prompt": "the cat ran to the", "target": "mat", "link": 3},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["link"]["index"] == 3
    assert data["link"]["token"] == "to"
    assert data["steps"][0]["key"] == "loss"
    assert data["steps"][-1]["key"] == "embedding"
    assert len(data["steps"]) == 9
    assert "∂L/∂a" in data["steps"][5]["outgoing"]


def test_generation_extends_the_prompt(client):
    response = client.post(
        "/api/llm/generate",
        json={"prompt": "the cat", "count": 6, "temperature": 0, "seed": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["steps"]) == 6
    assert data["text"].startswith("the cat")
    assert all(len(step["attention"]) >= 1 for step in data["steps"])


def test_training_endpoint_changes_the_loss_and_reset_restores(client):
    info = client.get("/api/llm/info").json()
    trained = client.post("/api/llm/train", json={"steps": 3, "learning_rate": 0.15}).json()
    assert len(trained["history"]) == 4
    assert trained["loss"] <= trained["history"][0]
    reset = client.post("/api/llm/reset").json()
    assert reset["loss"] == pytest.approx(info["loss"], abs=1e-9)


def test_prompt_validation(client):
    response = client.post("/api/llm/forward", json={"prompt": "x" * 81})
    assert response.status_code == 422
