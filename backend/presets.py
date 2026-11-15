from .models import Example, Network, TrainingSettings, make_layer


PRESETS = {
    "one-neuron": {
        "name": "One neuron by hand",
        "network": Network(inputs=[2, 3], layers=[make_layer("relu", [[0.5, 1]], [-1])]),
    },
    "two-layers": {
        "name": "Two layers working together",
        "network": Network(
            inputs=[2, 3],
            layers=[
                make_layer("relu", [[0.5, 1], [-1, 0.5]], [-1, 0.5]),
                make_layer("linear", [[0.5, -1]], [0.25]),
            ],
        ),
    },
    "activation": {
        "name": "Why activation matters",
        "network": Network(inputs=[2, 3], layers=[make_layer("linear", [[-1, 0.5]], [-2.5])]),
    },
    "and": {
        "name": "AND gate",
        "network": Network(inputs=[0, 0], layers=[make_layer("sigmoid", [[0.2, -0.3]], [-0.1])]),
        "training": TrainingSettings(
            examples=[
                Example(label=f"{a} AND {b}", inputs=[a, b], targets=[a * b])
                for a, b in [(0, 0), (0, 1), (1, 0), (1, 1)]
            ]
        ),
    },
}

