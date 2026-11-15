import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend import engine
from backend.examples import EXAMPLES
from backend.main import create_app
from backend.models import Network


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path / "examples.sqlite3")) as instance:
        yield instance


def test_example_list_is_ordered_and_complete(client):
    response = client.get("/api/examples")
    assert response.status_code == 200
    data = response.json()
    assert [item["id"] for item in data] == list(EXAMPLES)
    assert all("network" not in item for item in data)
    assert all(item["name"] and item["blurb"] and item["shape"] for item in data)


def test_every_example_trace_has_the_full_chain(client):
    for key in EXAMPLES:
        response = client.get(f"/api/examples/{key}")
        assert response.status_code == 200
        trace = response.json()["trace"]
        assert len(trace["forward"]["layers"]) == len(trace["network"]["layers"])
        assert len(trace["backward"]["layers"]) == len(trace["network"]["layers"])
        assert len(trace["forward"]["prediction"]) == len(trace["targets"])
        assert trace["updated"]["loss"] <= trace["loss"] + 1e-12
        for layer in trace["forward"]["layers"]:
            assert len(layer["z"]) == len(layer["weights"])
            assert len(layer["outputs"]) == len(layer["weights"])
            assert len(layer["slopes"]) == len(layer["weights"])
        for layer in trace["backward"]["layers"]:
            assert len(layer["deltas"]) == len(layer["bias_gradients"])
            assert len(layer["weight_gradients"]) == len(layer["deltas"])


def test_each_weight_and_bias_gradient_matches_a_numeric_slope():
    for key, definition in EXAMPLES.items():
        trace = engine.trace(
            definition["network"], definition["network"].inputs,
            definition["target"], definition["learning_rate"],
        )
        network = Network.model_validate(trace["network"])
        targets = np.array(trace["targets"])
        epsilon = 1e-6

        def loss(model):
            outputs = np.array(engine.forward(model)["outputs"])
            return engine.mean_squared_error(outputs, targets)

        for layer_index, layer in enumerate(network.layers):
            for neuron, row in enumerate(layer.weights):
                for source in range(len(row)):
                    high = Network.model_validate(network.model_dump())
                    low = Network.model_validate(network.model_dump())
                    high.layers[layer_index].weights[neuron][source] += epsilon
                    low.layers[layer_index].weights[neuron][source] -= epsilon
                    numeric = (loss(high) - loss(low)) / (2 * epsilon)
                    analytic = trace["backward"]["layers"][layer_index]["weight_gradients"][neuron][source]
                    assert numeric == pytest.approx(analytic, abs=1e-4), (key, layer_index, neuron, source)
            for neuron in range(len(layer.biases)):
                high = Network.model_validate(network.model_dump())
                low = Network.model_validate(network.model_dump())
                high.layers[layer_index].biases[neuron] += epsilon
                low.layers[layer_index].biases[neuron] -= epsilon
                numeric = (loss(high) - loss(low)) / (2 * epsilon)
                analytic = trace["backward"]["layers"][layer_index]["bias_gradients"][neuron]
                assert numeric == pytest.approx(analytic, abs=1e-4), (key, layer_index, neuron)


def test_the_simplest_example_lands_exactly_on_the_target():
    definition = EXAMPLES["one-weight"]
    trace = engine.trace(
        definition["network"], definition["network"].inputs,
        definition["target"], definition["learning_rate"],
    )
    assert trace["forward"]["prediction"] == [0.0]
    assert trace["loss"] == 1.0
    assert trace["backward"]["layers"][0]["weight_gradients"] == [[-4.0]]
    assert trace["backward"]["layers"][0]["bias_gradients"] == [-2.0]
    assert trace["updated"]["network"]["layers"][0]["weights"] == [[0.9]]
    assert trace["updated"]["network"]["layers"][0]["biases"] == [-0.8]
    assert trace["updated"]["forward"]["prediction"] == pytest.approx([1.0])
    assert trace["updated"]["loss"] == pytest.approx(0.0)


def test_blocked_relu_has_no_gradient():
    definition = EXAMPLES["relu-block"]
    trace = engine.trace(
        definition["network"], definition["network"].inputs,
        definition["target"], definition["learning_rate"],
    )
    assert trace["forward"]["layers"][0]["outputs"] == [0.0]
    assert trace["forward"]["layers"][0]["slopes"] == [0.0]
    assert trace["backward"]["layers"][0]["deltas"] == [0.0]
    assert trace["backward"]["layers"][0]["weight_gradients"] == [[0.0, 0.0]]
    assert trace["updated"]["loss"] == trace["loss"]


def test_trace_endpoint_rejects_unknown_example(client):
    assert client.get("/api/examples/not-a-real-example").status_code == 404
