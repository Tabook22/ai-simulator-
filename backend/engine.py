"""The same forward calculation supplies the inspector and training."""

import numpy as np

from .models import Layer, Network, Resize, Train


def activate(z, kind):
    if kind == "relu":
        return np.maximum(0.0, z)
    if kind == "sigmoid":
        # This form also works for very large positive or negative z.
        exponential = np.exp(-np.abs(z))
        return np.where(z >= 0, 1.0 / (1.0 + exponential), exponential / (1.0 + exponential))
    if kind == "tanh":
        return np.tanh(z)
    return z


def activation_slope(z, output, kind):
    if kind == "relu":
        # Use zero as the derivative at the corner.
        return (z > 0).astype(float)
    if kind == "sigmoid":
        return output * (1.0 - output)
    if kind == "tanh":
        return 1.0 - output**2
    return np.ones_like(z)


def parameters(network):
    weights = [np.array(layer.weights) for layer in network.layers]
    biases = [np.array(layer.biases) for layer in network.layers]
    kinds = [layer.activation for layer in network.layers]
    return weights, biases, kinds


def with_parameters(network: Network, weights, biases):
    """The same network with new weights and biases."""
    return Network(
        inputs=network.inputs,
        layers=[
            Layer(activation=layer.activation, weights=np.asarray(weight).tolist(), biases=np.asarray(bias).tolist())
            for layer, weight, bias in zip(network.layers, weights, biases)
        ],
        seed=network.seed,
    )


def forward_arrays(inputs, weights, biases, kinds):
    """Rows are examples. Within each layer, rows of weights are neurons."""
    values = [np.asarray(inputs, dtype=float)]
    layers = []
    for weight, bias, kind in zip(weights, biases, kinds):
        products = values[-1][:, None, :] * weight[None, :, :]
        weighted_sum = products.sum(axis=2)
        z = weighted_sum + bias
        layers.append((products, weighted_sum, z))
        values.append(activate(z, kind))
    return values, layers


def forward(network: Network):
    weights, biases, kinds = parameters(network)
    with np.errstate(over="raise", invalid="raise"):
        values, layers = forward_arrays([network.inputs], weights, biases, kinds)
    return {
        "layers": [
            {
                "activation": kind,
                "neurons": [
                    {
                        "inputs": values[index][0].tolist(),
                        "weights": weights[index][neuron].tolist(),
                        "products": products[0, neuron].tolist(),
                        "sum": float(weighted_sum[0, neuron]),
                        "bias": float(biases[index][neuron]),
                        "z": float(z[0, neuron]),
                        "output": float(values[index + 1][0, neuron]),
                    }
                    for neuron in range(len(biases[index]))
                ],
            }
            for index, (kind, (products, weighted_sum, z)) in enumerate(zip(kinds, layers))
        ],
        "outputs": values[-1][0].tolist(),
    }


def random_layer(rng, incoming, size, activation):
    # Uniform distributions with Xavier or He variance, respectively.
    limit = np.sqrt(6 / incoming if activation == "relu" else 6 / (incoming + size))
    return Layer(
        activation=activation,
        weights=rng.uniform(-limit, limit, size=(size, incoming)).tolist(),
        biases=[0.0] * size,
    )


def initialize(network: Network):
    rng = np.random.default_rng(network.seed)
    incoming = len(network.inputs)
    layers = []
    for layer in network.layers:
        layers.append(random_layer(rng, incoming, len(layer.biases), layer.activation))
        incoming = len(layer.biases)
    return Network(inputs=network.inputs, layers=layers, seed=network.seed)


def resize(request: Resize):
    network = request.network
    sizes = [*request.hidden, request.outputs]
    old_keys = [*range(len(network.layers) - 1), "out"]
    new_keys = [*range(len(request.hidden)), "out"]
    old_layers = dict(zip(old_keys, network.layers))
    old_sources = dict(zip(old_keys, ["in", *old_keys[:-1]]))
    rng = np.random.default_rng(network.seed)
    incoming = request.inputs
    layers = []
    source = "in"
    for key, size in zip(new_keys, sizes):
        old = old_layers.get(key)
        kind = old.activation if old else "relu"
        layer = random_layer(rng, incoming, size, kind)
        if old:
            for neuron in range(min(size, len(old.biases))):
                layer.biases[neuron] = old.biases[neuron]
                if old_sources[key] == source:
                    surviving = min(incoming, len(old.weights[neuron]))
                    layer.weights[neuron][:surviving] = old.weights[neuron][:surviving]
        layers.append(layer)
        incoming, source = size, key
    inputs = (network.inputs + [0.0] * request.inputs)[:request.inputs]
    return Network(inputs=inputs, layers=layers, seed=network.seed)


def mean_squared_error(predictions, targets):
    return float(np.mean((predictions - targets) ** 2))


def _forward_layer(kind, products, weighted_sum, z, inputs, outputs, weights, biases):
    return {
        "activation": kind,
        "inputs": inputs,
        "weights": weights,
        "biases": biases,
        "products": products,
        "sums": weighted_sum,
        "z": z,
        "outputs": outputs,
        "slopes": activation_slope(np.asarray(z), np.asarray(outputs), kind).tolist(),
    }


def trace(network: Network, inputs, targets, learning_rate: float):
    """One worked example: every forward value and every backward gradient."""
    weights, biases, kinds = parameters(network)
    target_values = np.asarray(targets, dtype=float)
    values, layers = forward_arrays([inputs], weights, biases, kinds)
    prediction = values[-1][0]
    loss = mean_squared_error(prediction, target_values)
    output_gradient = loss_slope(values[-1], target_values)[0]

    forward_layers = [
        _forward_layer(kind, products[0].tolist(), weighted_sum[0].tolist(), z[0].tolist(),
                       values[index][0].tolist(), values[index + 1][0].tolist(),
                       weights[index].tolist(), biases[index].tolist())
        for index, (kind, (products, weighted_sum, z)) in enumerate(zip(kinds, layers))
    ]

    steps = backward(values, layers, weights, kinds, target_values)
    backward_layers = [
        {
            "output_gradient": step["slope"][0].tolist(),
            "deltas": step["delta"][0].tolist(),
            "weight_gradients": step["weights"].tolist(),
            "bias_gradients": step["biases"].tolist(),
            "input_gradient": step["inputs"][0].tolist(),
        }
        for step in steps
    ]

    updated = with_parameters(
        network,
        [weight - learning_rate * step["weights"] for weight, step in zip(weights, steps)],
        [bias - learning_rate * step["biases"] for bias, step in zip(biases, steps)],
    )
    updated_weights, updated_biases, updated_kinds = parameters(updated)
    updated_values, updated_data = forward_arrays([inputs], updated_weights, updated_biases, updated_kinds)
    updated_forward = [
        _forward_layer(kind, products[0].tolist(), weighted_sum[0].tolist(), z[0].tolist(),
                       updated_values[index][0].tolist(), updated_values[index + 1][0].tolist(),
                       updated_weights[index].tolist(), updated_biases[index].tolist())
        for index, (kind, (products, weighted_sum, z)) in enumerate(zip(updated_kinds, updated_data))
    ]

    return {
        "network": network.model_dump(),
        "inputs": list(inputs),
        "targets": target_values.tolist(),
        "learning_rate": learning_rate,
        "forward": {"layers": forward_layers, "prediction": prediction.tolist()},
        "loss": loss,
        "output_gradient": output_gradient.tolist(),
        "backward": {"layers": backward_layers},
        "updated": {
            "network": updated.model_dump(),
            "forward": {"layers": updated_forward, "prediction": updated_values[-1][0].tolist()},
            "loss": mean_squared_error(updated_values[-1][0], target_values),
        },
    }


def auto_trace(network: Network, inputs, targets, learning_rate: float, steps: int):
    """Repeat one-example gradient steps and keep the step with the lowest loss."""
    weights, biases, kinds = parameters(network)
    target_values = np.asarray(targets, dtype=float)
    values, layers = forward_arrays([inputs], weights, biases, kinds)
    before_prediction = values[-1][0].copy()
    before_loss = mean_squared_error(before_prediction, target_values)
    best_weights = [weight.copy() for weight in weights]
    best_biases = [bias.copy() for bias in biases]
    best_loss = before_loss
    best_step = 0
    best_prediction = before_prediction.copy()
    history = [before_loss]

    with np.errstate(over="raise", invalid="raise"):
        for step in range(1, steps + 1):
            weight_gradients, bias_gradients = gradients(values, layers, weights, kinds, target_values)
            weights = [weight - learning_rate * grad for weight, grad in zip(weights, weight_gradients)]
            biases = [bias - learning_rate * grad for bias, grad in zip(biases, bias_gradients)]
            values, layers = forward_arrays([inputs], weights, biases, kinds)
            loss = mean_squared_error(values[-1][0], target_values)
            history.append(loss)
            if loss < best_loss:
                best_weights = [weight.copy() for weight in weights]
                best_biases = [bias.copy() for bias in biases]
                best_loss = loss
                best_step = step
                best_prediction = values[-1][0].copy()
            if loss <= 1e-12:
                break

    best_network = with_parameters(network, best_weights, best_biases)
    final_network = with_parameters(network, weights, biases)
    return {
        "before": {"prediction": before_prediction.tolist(), "loss": before_loss},
        "history": history,
        "best": {
            "step": best_step,
            "loss": best_loss,
            "network": best_network.model_dump(),
            "prediction": best_prediction.tolist(),
        },
        "final": {
            "loss": history[-1],
            "network": final_network.model_dump(),
            "prediction": values[-1][0].tolist(),
        },
        "stopped": "tolerance" if history[-1] <= 1e-12 else "steps",
    }


def loss_slope(predictions, targets):
    """The derivative of mean squared error with respect to every prediction."""
    return 2.0 * (predictions - targets) / targets.size


def backward(values, layers, weights, kinds, targets):
    """Start at the loss and carry its slope backward through each layer.

    Every layer reports the slope that arrived, its delta (slope × activation
    slope), the gradients for its weights and biases, and the slope it sends on.
    """
    slope = loss_slope(values[-1], targets)
    steps = [None] * len(weights)
    for index in reversed(range(len(weights))):
        delta = slope * activation_slope(layers[index][2], values[index + 1], kinds[index])
        steps[index] = {
            "slope": slope,
            "delta": delta,
            "weights": delta.T @ values[index],
            "biases": delta.sum(axis=0),
            "inputs": delta @ weights[index],
        }
        slope = steps[index]["inputs"]
    return steps


def gradients(values, layers, weights, kinds, targets):
    steps = backward(values, layers, weights, kinds, targets)
    return [step["weights"] for step in steps], [step["biases"] for step in steps]


def train(request: Train):
    network, settings, connection = request.network, request.settings, request.connection
    inputs = [example.inputs for example in settings.examples]
    targets = np.array([example.targets for example in settings.examples])
    weights, biases, kinds = parameters(network)
    layer, neuron, source = connection.layer, connection.neuron, connection.source
    rate = settings.learning_rate
    with np.errstate(over="raise", invalid="raise"):
        values, layers = forward_arrays(inputs, weights, biases, kinds)
        history = [mean_squared_error(values[-1], targets)]
        for _ in range(settings.steps):
            weight_gradients, bias_gradients = gradients(values, layers, weights, kinds, targets)
            predictions_before = values[-1]
            old = float(weights[layer][neuron, source])
            gradient = float(weight_gradients[layer][neuron, source])
            weights = [weight - rate * grad for weight, grad in zip(weights, weight_gradients)]
            biases = [bias - rate * grad for bias, grad in zip(biases, bias_gradients)]
            values, layers = forward_arrays(inputs, weights, biases, kinds)
            history.append(mean_squared_error(values[-1], targets))

    updated = with_parameters(network, weights, biases)
    return {
        "network": updated,
        "forward": forward(updated),
        "history": history,
        "before": {"predictions": predictions_before.tolist(), "loss": history[-2]},
        "after": {"predictions": values[-1].tolist(), "loss": history[-1]},
        "weight": {
            "connection": connection,
            "old": old,
            "gradient": gradient,
            "new": float(weights[layer][neuron, source]),
            "rate": rate,
        },
    }
