from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, StringConstraints, model_validator

Activation = Literal["linear", "relu", "sigmoid", "tanh"]
Seed = Annotated[int, Field(ge=0, le=2**32 - 1)]
LearningRate = Annotated[FiniteFloat, Field(gt=0, le=10)]
Steps = Annotated[int, Field(ge=1, le=500)]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Layer(Model):
    activation: Activation
    weights: list[list[FiniteFloat]] = Field(min_length=1, max_length=8)
    biases: list[FiniteFloat] = Field(min_length=1, max_length=8)


def make_layer(activation: Activation, weights: list[list[float]], biases: list[float]) -> Layer:
    """Build a Layer from compact fixture literals without repeating the constructor."""
    return Layer(activation=activation, weights=weights, biases=biases)


class Network(Model):
    inputs: list[FiniteFloat] = Field(min_length=1, max_length=8)
    layers: list[Layer] = Field(min_length=1, max_length=5)
    seed: Seed = 42

    @model_validator(mode="after")
    def check_shape(self):
        incoming = len(self.inputs)
        for index, layer in enumerate(self.layers, 1):
            size = len(layer.weights)
            if index == len(self.layers) and size > 4:
                raise ValueError("The output layer must have 1 to 4 neurons.")
            if len(layer.biases) != size:
                raise ValueError(f"Layer {index} needs one bias per neuron.")
            if any(len(row) != incoming for row in layer.weights):
                raise ValueError(f"Every neuron in layer {index} needs {incoming} incoming weights.")
            incoming = size
        return self


class Resize(Model):
    network: Network
    inputs: Annotated[int, Field(ge=1, le=8)]
    hidden: list[Annotated[int, Field(ge=1, le=8)]] = Field(max_length=4)
    outputs: Annotated[int, Field(ge=1, le=4)]


class Example(Model):
    label: str = Field(default="", max_length=80)
    inputs: list[FiniteFloat] = Field(min_length=1, max_length=8)
    targets: list[FiniteFloat] = Field(min_length=1, max_length=4)


class TrainingSettings(Model):
    learning_rate: LearningRate = 1.0
    steps: Steps = 120
    examples: list[Example] = Field(min_length=1, max_length=64)


def check_examples(network: Network, settings: TrainingSettings):
    inputs = len(network.inputs)
    outputs = len(network.layers[-1].biases)
    for index, example in enumerate(settings.examples, 1):
        if len(example.inputs) != inputs or len(example.targets) != outputs:
            raise ValueError(f"Training row {index} needs {inputs} inputs and {outputs} targets.")


class Connection(Model):
    layer: Annotated[int, Field(ge=0)]
    neuron: Annotated[int, Field(ge=0)]
    source: Annotated[int, Field(ge=0)]


class Backprop(Model):
    network: Network
    inputs: list[FiniteFloat] = Field(min_length=1, max_length=8)
    targets: list[FiniteFloat] = Field(min_length=1, max_length=4)
    learning_rate: LearningRate = 0.5

    @model_validator(mode="after")
    def check_backprop(self):
        inputs = len(self.network.inputs)
        outputs = len(self.network.layers[-1].biases)
        if len(self.inputs) != inputs:
            raise ValueError(f"This network needs {inputs} inputs.")
        if len(self.targets) != outputs:
            raise ValueError(f"This network needs {outputs} targets.")
        return self


class AutoBackprop(Backprop):
    steps: Steps = 50


class HouseTrain(Model):
    epochs: Annotated[int, Field(ge=1, le=30)] = 10
    batch_size: Annotated[int, Field(ge=10, le=500)] = 100
    learning_rate: LearningRate = 0.05


class Train(Model):
    network: Network
    settings: TrainingSettings
    connection: Connection

    @model_validator(mode="after")
    def check_training(self):
        check_examples(self.network, self.settings)
        layer, neuron, source = self.connection.layer, self.connection.neuron, self.connection.source
        if layer >= len(self.network.layers):
            raise ValueError("Choose a weight in a computed layer.")
        weights = self.network.layers[layer].weights
        if neuron >= len(weights) or source >= len(weights[neuron]):
            raise ValueError("Choose a weight that exists in this network.")
        return self


class Lesson(Model):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
    network: Network
    training: TrainingSettings | None = None

    @model_validator(mode="after")
    def check_training(self):
        if self.training is not None:
            check_examples(self.network, self.training)
        return self


class LlmPrompt(Model):
    prompt: Annotated[str, StringConstraints(max_length=80)] = "the cat ran to the"
    position: Annotated[int, Field(ge=0, le=63)] | None = None


class LlmGradients(LlmPrompt):
    target: Annotated[str, StringConstraints(min_length=1, max_length=24)] | None = None


class LlmTrace(LlmPrompt):
    target: Annotated[str, StringConstraints(min_length=1, max_length=24)] | None = None
    link: Annotated[int, Field(ge=0, le=63)] | None = None


class LlmTrain(Model):
    steps: Annotated[int, Field(ge=1, le=100)] = 1
    learning_rate: Annotated[FiniteFloat, Field(gt=0, le=1)] = 0.15


class LlmGenerate(LlmPrompt):
    count: Annotated[int, Field(ge=1, le=24)] = 8
    temperature: Annotated[FiniteFloat, Field(ge=0, le=2)] = 0.7
    seed: Annotated[int, Field(ge=0, le=2**32 - 1)] | None = None



class TokenizeText(Model):
    # A hard ceiling on the request; the friendly limit (tokenizer.MAX_CHARACTERS) is checked in the route.
    text: Annotated[str, StringConstraints(max_length=200_000)] = ""
