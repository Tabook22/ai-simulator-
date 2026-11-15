import numpy as np
import pytest

from backend import engine
from backend.models import Connection, Resize, Train
from backend.presets import PRESETS


def preset(key):
    return PRESETS[key]["network"]


def test_one_neuron_by_hand():
    network = preset("one-neuron")
    run = engine.forward(network)
    assert run["layers"][0]["neurons"][0] == {
        "inputs": [2, 3], "weights": [0.5, 1], "products": [1, 3],
        "sum": 4, "bias": -1, "z": 3, "output": 3,
    }
    assert run["outputs"] == [3]


def test_two_layers_working_together():
    run = engine.forward(preset("two-layers"))
    first, second = [layer["neurons"] for layer in run["layers"]]
    assert [neuron["output"] for neuron in first] == [3, 0]
    assert first[1]["products"] == [-2, 1.5]
    assert first[1]["z"] == 0
    assert second[0]["inputs"] == [3, 0]
    assert second[0]["products"] == [1.5, 0]
    assert run["outputs"] == [1.75]


def test_negative_pre_activation_and_bias_challenge():
    network = preset("activation").model_copy(deep=True)
    assert engine.forward(network)["outputs"] == [-3]
    network.layers[0].activation = "relu"
    run = engine.forward(network)
    assert run["layers"][0]["neurons"][0]["z"] == -3
    assert run["outputs"] == [0]
    network = preset("one-neuron").model_copy(deep=True)
    network.layers[0].biases[0] = -5
    assert engine.forward(network)["outputs"] == [0]


def test_seed_and_resize_preserve_existing_connections():
    network = preset("two-layers")
    first = engine.initialize(network)
    assert first == engine.initialize(network)
    assert first != engine.initialize(network.model_copy(update={"seed": network.seed + 1}))
    assert [layer.biases for layer in first.layers] == [[0, 0], [0]]

    grown = engine.resize(Resize(network=network, inputs=3, hidden=[3], outputs=2))
    assert grown.inputs == [2, 3, 0]
    assert grown.layers[0].weights[0][:2] == [0.5, 1]
    assert grown.layers[0].weights[1][:2] == [-1, 0.5]
    assert grown.layers[0].biases == [-1, 0.5, 0]
    assert grown.layers[1].weights[0][:2] == [0.5, -1]
    assert grown.layers[1].biases == [0.25, 0]
    assert engine.resize(Resize(network=grown, inputs=2, hidden=[2], outputs=1)) == network

    removed = engine.resize(Resize(network=network, inputs=2, hidden=[], outputs=1))
    assert removed.layers[0].activation == "linear"
    assert removed.layers[0].biases == [0.25]
    assert removed.layers[0].weights != network.layers[1].weights


def test_backprop_matches_numerical_gradients_for_multiple_outputs():
    # Check every weight and bias, including both a hidden and an output layer.
    network = preset("two-layers").model_copy(deep=True)
    network.layers[0].activation = "tanh"
    network.layers[1].activation = "sigmoid"
    network.layers[1].weights.append([-0.2, 0.7])
    network.layers[1].biases.append(0.1)
    weights, biases, kinds = engine.parameters(network)
    inputs = [[0.2, -0.7], [1.4, 0.5], [0.3, 0.6]]
    targets = np.array([[0.7, 0.1], [0.1, 0.5], [0.4, 0.8]])
    values, layers = engine.forward_arrays(inputs, weights, biases, kinds)
    weight_gradients, bias_gradients = engine.gradients(values, layers, weights, kinds, targets)

    def loss():
        outputs, _ = engine.forward_arrays(inputs, weights, biases, kinds)
        return engine.mean_squared_error(outputs[-1], targets)

    epsilon = 1e-6
    for parameter, gradient in zip(weights + biases, weight_gradients + bias_gradients):
        for index in np.ndindex(parameter.shape):
            original = parameter[index]
            parameter[index] = original + epsilon
            plus = loss()
            parameter[index] = original - epsilon
            minus = loss()
            parameter[index] = original
            assert gradient[index] == pytest.approx((plus - minus) / (2 * epsilon), abs=1e-8)


def test_and_training_reduces_loss_and_reports_last_update():
    item = PRESETS["and"]
    result = engine.train(Train(network=item["network"], settings=item["training"],
                                connection=Connection(layer=0, neuron=0, source=1)))
    history = result["history"]
    assert len(history) == 121
    assert history[-1] < history[0] / 4
    assert result["before"]["loss"] == history[-2]
    assert result["after"]["loss"] == history[-1]
    assert [value[0] >= 0.5 for value in result["after"]["predictions"]] == [False, False, False, True]
    weight = result["weight"]
    assert weight["new"] == pytest.approx(weight["old"] - weight["rate"] * weight["gradient"])
    assert result["network"].layers[0].weights[0][1] == weight["new"]
