"""Tiny worked examples for the forward/backward classroom gallery."""

from .models import Network, make_layer


EXAMPLES = {
    "one-weight": {
        "name": "One weight, one bias",
        "blurb": "The shortest chain rule there is.",
        "focus": "A linear neuron and one small step: the loss lands exactly on zero. Watch how one error number becomes two gradients.",
        "shape": "1 â†’ 1",
        "target": [1.0],
        "learning_rate": 0.1,
        "network": Network(inputs=[2.0], layers=[make_layer("linear", [[0.5]], [-1.0])]),
    },
    "relu-pass": {
        "name": "ReLU that passes the error",
        "blurb": "Two inputs, one active neuron.",
        "focus": "The neuron is on, so the ReLU slope is 1 and the error reaches both weights. Each weight gets a different gradient because each input is different.",
        "shape": "2 â†’ 1",
        "target": [1.0],
        "learning_rate": 0.01,
        "network": Network(inputs=[2.0, 3.0], layers=[make_layer("relu", [[0.5, 1.0]], [-1.0])]),
    },
    "relu-block": {
        "name": "ReLU that blocks the error",
        "blurb": "A switched-off neuron learns nothing.",
        "focus": "The total is negative, so ReLU sits at zero. Its slope is zero, which stops the chain rule: every gradient is zero and the weights do not move.",
        "shape": "2 â†’ 1",
        "target": [3.0],
        "learning_rate": 0.1,
        "network": Network(inputs=[1.0, 2.0], layers=[make_layer("relu", [[1.0, 0.5]], [-4.0])]),
    },
    "two-layers": {
        "name": "Two layers, hidden error",
        "blurb": "Backprop through a hidden layer.",
        "focus": "The output error is sent back through the output weights, multiplied by each hidden slope, and only then becomes the hidden weight gradients. The second hidden neuron is off, so it receives no update.",
        "shape": "2 â†’ 2 â†’ 1",
        "target": [2.0],
        "learning_rate": 0.1,
        "network": Network(
            inputs=[1.0, 0.0],
            layers=[
                make_layer("relu", [[0.5, -1.0], [0.25, 2.0]], [0.1, -0.5]),
                make_layer("linear", [[1.0, 2.0]], [0.2]),
            ],
        ),
    },
    "sigmoid": {
        "name": "Sigmoid squashes the slope",
        "blurb": "Why the activation derivative matters.",
        "focus": "The sigmoid slope is only 0.197, so a large output error becomes a much smaller delta. The weight still moves, but gently â€” this is the shrinking gradient behind the vanishing-gradient story.",
        "shape": "1 â†’ 1",
        "target": [1.0],
        "learning_rate": 1.0,
        "network": Network(inputs=[1.0], layers=[make_layer("sigmoid", [[1.0]], [0.0])]),
    },
}

