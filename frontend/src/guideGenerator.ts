import type { Network } from './model';
import { calculateParameters } from './advisorModel';

export type GuideSource = 'synthetic-house' | 'synthetic-generic' | 'current-examples';
export type GuideOptimizer = 'sgd' | 'adam';
export type GuideDevice = 'cpu' | 'cuda';

export interface GuideExample {
  inputs: number[];
  targets: number[];
}

export interface GuideConfig {
  source: GuideSource;
  featureNames: string[];
  targetNames: string[];
  trainRows: number;
  validationRows: number;
  testRows: number;
  batchSize: number;
  epochs: number;
  learningRate: number;
  optimizer: GuideOptimizer;
  device: GuideDevice;
  targetScaled: boolean;
  earlyStopping: boolean;
  patience: number;
  newExample: number[];
  seed: number;
  currentExamples?: GuideExample[];
}

export interface GuideStep {
  number: number;
  title: string;
  purpose: string;
  input: string;
  explanation: string;
  code: string;
  output: string;
  check: string;
  terminal?: string;
}

export interface GuideSummary {
  architecture: string;
  features: number;
  outputs: number;
  weights: number;
  biases: number;
  parameters: number;
  trainRows: number;
  validationRows: number;
  testRows: number;
  totalRows: number;
  batchesPerEpoch: number;
  updates: number;
  batchSize: number;
  epochs: number;
  learningRate: number;
  optimizer: string;
  device: string;
  seed: number;
  source: string;
  parameterStorage: string;
}

export interface GeneratedGuide {
  steps: GuideStep[];
  script: string;
  notebook: string;
  requirements: string;
  summary: GuideSummary;
  errors: string[];
  warnings: string[];
  scriptFilename: string;
  notebookFilename: string;
  modelFilename: string;
}

const ACTIVATION_MODULE: Record<string, string> = {
  linear: 'nn.Identity()',
  relu: 'nn.ReLU()',
  sigmoid: 'nn.Sigmoid()',
  tanh: 'nn.Tanh()',
};

const ACTIVATION_LABEL: Record<string, string> = {
  linear: 'linear',
  relu: 'ReLU',
  sigmoid: 'Sigmoid',
  tanh: 'Tanh',
};

function pyString(value: string) {
  return JSON.stringify(value);
}

function pyList(values: string[]) {
  return `[${values.map(value => pyString(value)).join(', ')}]`;
}

function pyNumber(value: number) {
  if (!Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(8)));
}

function sourceLabel(source: GuideSource) {
  if (source === 'synthetic-house') return 'synthetic house-price demonstration';
  if (source === 'current-examples') return 'your complete Teach-the-network examples';
  return 'synthetic generic demonstration';
}

function bytesLabel(bytes: number) {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function buildGuide(network: Network, config: GuideConfig): GeneratedGuide {
  const errors: string[] = [];
  const warnings: string[] = [];
  const outputs = network.layers.at(-1)?.weights.length ?? 0;
  const params = calculateParameters(network);
  const layerSpecs = network.layers.map((layer, index) => ({
    in: index === 0 ? network.inputs.length : network.layers[index - 1].weights.length,
    out: layer.weights.length,
    activation: layer.activation,
  }));
  const totalRows = config.trainRows + config.validationRows + config.testRows;
  const batchesPerEpoch = config.trainRows > 0 && config.batchSize > 0
    ? Math.ceil(config.trainRows / config.batchSize) : 0;
  const updates = batchesPerEpoch * Math.max(0, config.epochs);
  const seed = Number.isFinite(config.seed) ? Math.max(0, Math.floor(config.seed)) : 42;

  if (config.trainRows <= 0 || config.validationRows <= 0 || config.testRows <= 0) {
    errors.push('Training, validation, and test row counts must all be greater than zero.');
  }
  if (config.batchSize <= 0) errors.push('Batch size must be greater than zero.');
  if (config.epochs <= 0) errors.push('Epochs must be greater than zero.');
  if (!(config.learningRate > 0)) errors.push('Learning rate must be greater than zero.');
  if (config.featureNames.length !== network.inputs.length) {
    errors.push(`Feature names must contain exactly ${network.inputs.length} name(s).`);
  }
  if (config.targetNames.length !== outputs) {
    errors.push(`Target names must contain exactly ${outputs} name(s).`);
  }
  if (config.newExample.length !== network.inputs.length) {
    errors.push(`The new example needs exactly ${network.inputs.length} feature value(s).`);
  }
  if (config.source === 'synthetic-house' && (network.inputs.length !== 2 || outputs !== 1)) {
    errors.push('The house-price source requires exactly 2 input features and 1 output. Choose the generic source.');
  }
  if (config.source === 'current-examples') {
    if (!config.currentExamples || config.currentExamples.length === 0) {
      errors.push('No complete numeric examples are available in Teach the network.');
    } else if (config.currentExamples.length !== totalRows) {
      errors.push(`Your split totals ${totalRows} rows, but the current examples contain ${config.currentExamples.length}.`);
    }
  }
  for (const layer of network.layers) {
    if (!ACTIVATION_MODULE[layer.activation]) {
      errors.push(`Unsupported activation "${layer.activation}" in the selected network.`);
    }
  }
  if (outputs !== 1 && config.source === 'synthetic-house') {
    errors.push('The house-price demonstration needs one output.');
  }
  if (network.layers.at(-1)?.activation !== 'linear') {
    warnings.push(`The output activation is ${ACTIVATION_LABEL[network.layers.at(-1)?.activation ?? ''] ?? 'not linear'}. The generated code keeps your selected activation; ordinary price regression normally uses a linear output so negative prices are not clipped.`);
  }
  if (config.device === 'cuda') {
    warnings.push('GPU execution was requested. The generated code uses CUDA only when it is available and otherwise falls back to CPU. Install PyTorch from the official selector for your CUDA version.');
  }
  if (config.earlyStopping && config.patience <= 0) {
    errors.push('Early-stopping patience must be greater than zero.');
  }
  if (config.optimizer === 'adam' && config.learningRate > 0.01) {
    warnings.push('Adam with a learning rate this high can be unstable. The code keeps your selected value; compare with SGD or a smaller rate.');
  }

  const source = config.source;
  const currentData = config.currentExamples?.map(example => [...example.inputs, ...example.targets]) ?? [];
  const unit = config.targetScaled ? 'scaled target units' : 'target units';
  const outputActivation = network.layers.at(-1)?.activation ?? 'linear';
  const activationWarning = outputActivation !== 'linear'
    ? `\n# NOTE: your selected output activation is ${outputActivation}. It can clip negative predictions;\n# ordinary house-price regression normally uses a linear output. This code keeps your selection.`
    : '';

  const header = `# Complete training script generated from the Neuron Lab configuration.
# Architecture: ${[network.inputs.length, ...network.layers.map(layer => layer.weights.length)].join(' -> ')}
# Source: ${sourceLabel(source)}
# Run the terminal setup from Step 1 first, then run this file.
# This script generates its own reproducible ${source === 'synthetic-house' ? 'house-price demonstration' : 'demonstration'} data;
# it is classroom data, not real observations.
`;

  const step1Terminal = String.raw`# Windows PowerShell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
# If PowerShell blocks the activation script, allow it for this terminal only:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
python -m pip install --upgrade pip
python -m pip install torch pandas numpy scikit-learn matplotlib
python -m pip install notebook

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install torch pandas numpy scikit-learn matplotlib
python -m pip install notebook

# GPU users: install PyTorch with the official selector instead of guessing CUDA commands:
# https://pytorch.org/get-started/locally/
# Choose your OS, package manager, and CUDA version there. This guide never guesses a CUDA wheel.
`;
  const step1Code = `import sys

print("Python:", sys.version.split()[0])
try:
    import torch
    import pandas
    import numpy
    import sklearn
    import matplotlib
except ImportError as error:
    raise SystemExit(
        f"Missing package: {error}. Run the installation commands from Step 1 in your own terminal."
    ) from error

print("torch:", torch.__version__)
print("pandas:", pandas.__version__)
print("numpy:", numpy.__version__)
print("scikit-learn:", sklearn.__version__)
print("CUDA available:", torch.cuda.is_available())`;

  const step2Code = `# === Step 2: imports and reproducible seeds ===
import copy
import math
import random
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # headless-safe; remove this line if you want interactive plot windows
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

SEED = ${pyNumber(seed)}
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False
print("Seed:", SEED)
# Do not reset these seeds inside a batch or epoch loop: the seed starts the run;
# it does not set the number of weights or make every hardware stack bit-identical.`;

  const dataGenerator = source === 'synthetic-house'
    ? `def make_house_price_data(seed, n_rows):
    """Synthetic classroom data only; these are not real observations."""
    rng = np.random.default_rng(seed)
    area = rng.integers(70, 301, size=n_rows)
    bedrooms = rng.integers(1, 6, size=n_rows)
    noise = rng.normal(0, 12000, size=n_rows)
    price = 500.0 * area - 10000.0 * bedrooms + 5000.0 + noise
    return pd.DataFrame({
        FEATURES[0]: area,
        FEATURES[1]: bedrooms,
        TARGETS[0]: np.round(price, 2),
    })


df = make_house_price_data(SEED, TOTAL_ROWS)`
    : source === 'current-examples'
      ? `# The rows below were copied from the complete numeric examples in Teach the network.
DATA = ${JSON.stringify(currentData)}
df = pd.DataFrame(DATA, columns=FEATURES + TARGETS)`
      : `def make_generic_data(seed, n_rows):
    """Synthetic classroom data only; these are not real observations."""
    rng = np.random.default_rng(seed)
    features = rng.normal(0.0, 1.0, size=(n_rows, len(FEATURES)))
    coefficients = np.linspace(3.0, 0.5, len(FEATURES))
    base = features @ coefficients + 2.0
    if len(TARGETS) == 1:
        target = (base + rng.normal(0.0, 0.4, size=n_rows)).reshape(-1, 1)
        return pd.DataFrame(np.column_stack([features, target]), columns=FEATURES + TARGETS)
    targets = np.column_stack([
        base + index * 0.5 + rng.normal(0.0, 0.4, size=n_rows)
        for index in range(len(TARGETS))
    ])
    return pd.DataFrame(np.column_stack([features, targets]), columns=FEATURES + TARGETS)


df = make_generic_data(SEED, TOTAL_ROWS)`;

  const step3Code = `# === Step 3: load and inspect the dataset ===
# Dataset configuration chosen in the guide.
FEATURES = ${pyList(config.featureNames)}
TARGETS = ${pyList(config.targetNames)}
SOURCE = ${pyString(source)}
TRAIN_ROWS = ${pyNumber(config.trainRows)}
VALIDATION_ROWS = ${pyNumber(config.validationRows)}
TEST_ROWS = ${pyNumber(config.testRows)}
TOTAL_ROWS = TRAIN_ROWS + VALIDATION_ROWS + TEST_ROWS
BATCH_SIZE = ${pyNumber(config.batchSize)}
EPOCHS = ${pyNumber(config.epochs)}
LEARNING_RATE = ${pyNumber(config.learningRate)}
OPTIMIZER_NAME = ${pyString(config.optimizer)}
DEVICE_NAME = ${pyString(config.device)}
TARGET_SCALED = ${config.targetScaled ? 'True' : 'False'}
EARLY_STOPPING = ${config.earlyStopping ? 'True' : 'False'}
PATIENCE = ${pyNumber(config.patience)}
NEW_EXAMPLE_VALUES = [${config.newExample.map(pyNumber).join(', ')}]

print("Dataset source:", SOURCE)
${dataGenerator}

print("Rows:", len(df))
print("Columns:", list(df.columns))
print("Data types:")
print(df.dtypes)
print("First rows:")
print(df.head())
print("Missing values by column:")
print(df.isna().sum())
print("Features:", FEATURES)
print("Targets:", TARGETS)
assert len(df) == TOTAL_ROWS, f"Expected {TOTAL_ROWS} rows, found {len(df)}."
assert list(df.columns) == FEATURES + TARGETS
print("Total dataset rows:", TOTAL_ROWS)
print("Training rows:", TRAIN_ROWS, "| validation:", VALIDATION_ROWS, "| test:", TEST_ROWS)`;

  const step4Code = `# === Step 4: clean and split the data ===
REQUIRED_COLUMNS = FEATURES + TARGETS
missing_columns = [column for column in REQUIRED_COLUMNS if column not in df.columns]
assert not missing_columns, f"Missing required columns: {missing_columns}"

clean_df = df[REQUIRED_COLUMNS].copy()
for column in REQUIRED_COLUMNS:
    clean_df[column] = pd.to_numeric(clean_df[column], errors="coerce")

# A missing target cannot be used as a supervised label; drop it before splitting.
clean_df = clean_df.dropna(subset=TARGETS).reset_index(drop=True)
assert len(clean_df) == TOTAL_ROWS, (
    f"Cleaning changed the expected row count: {len(clean_df)} instead of {TOTAL_ROWS}. "
    "Check missing targets or invalid numeric values."
)

# Split first, then fit imputation on the training partition only.
split_rng = np.random.default_rng(SEED)
order = split_rng.permutation(len(clean_df))
train_df = clean_df.iloc[order[:TRAIN_ROWS]].copy()
validation_df = clean_df.iloc[order[TRAIN_ROWS:TRAIN_ROWS + VALIDATION_ROWS]].copy()
test_df = clean_df.iloc[order[TRAIN_ROWS + VALIDATION_ROWS:]].copy()

feature_imputer = SimpleImputer(strategy="median")
X_train = feature_imputer.fit_transform(train_df[FEATURES])
X_validation = feature_imputer.transform(validation_df[FEATURES])
X_test = feature_imputer.transform(test_df[FEATURES])
y_train = train_df[TARGETS].to_numpy(dtype=float)
y_validation = validation_df[TARGETS].to_numpy(dtype=float)
y_test = test_df[TARGETS].to_numpy(dtype=float)

print("Train examples:", len(train_df))
print("Validation examples:", len(validation_df))
print("Test examples:", len(test_df))
print("Total examples:", len(clean_df), "— only", len(train_df), "are used for weight updates.")
print("Training feature matrix:", X_train.shape, "| train targets:", y_train.shape)
assert len(train_df) + len(validation_df) + len(test_df) == TOTAL_ROWS
# The imputer was fit on training data only; validation/test use that fitted imputer.`;

  const step5Code = `# === Step 5: scale features (and optionally the target) ===
feature_scaler = StandardScaler()
X_train_scaled = feature_scaler.fit_transform(X_train)
X_validation_scaled = feature_scaler.transform(X_validation)
X_test_scaled = feature_scaler.transform(X_test)

if TARGET_SCALED:
    target_scaler = StandardScaler()
    y_train_scaled = target_scaler.fit_transform(y_train)
    y_validation_scaled = target_scaler.transform(y_validation)
    y_test_scaled = target_scaler.transform(y_test)
else:
    target_scaler = None
    y_train_scaled = y_train
    y_validation_scaled = y_validation
    y_test_scaled = y_test

print("Feature means (training):", np.round(feature_scaler.mean_, 3))
print("Feature scales (training):", np.round(feature_scaler.scale_, 3))
print("Target scaled:", TARGET_SCALED)
print("Scaled training features:", X_train_scaled.shape)
# Fit on training only. Reusing the training scaler is what keeps validation/test comparable.`;

  const step6Code = `# === Step 6: tensors and mini-batches ===
X_train_tensor = torch.tensor(X_train_scaled, dtype=torch.float32)
y_train_tensor = torch.tensor(y_train_scaled, dtype=torch.float32)
X_validation_tensor = torch.tensor(X_validation_scaled, dtype=torch.float32)
y_validation_tensor = torch.tensor(y_validation_scaled, dtype=torch.float32)
X_test_tensor = torch.tensor(X_test_scaled, dtype=torch.float32)
y_test_tensor = torch.tensor(y_test_scaled, dtype=torch.float32)

train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, drop_last=False)
validation_loader = DataLoader(
    TensorDataset(X_validation_tensor, y_validation_tensor),
    batch_size=BATCH_SIZE, shuffle=False, drop_last=False,
)
test_loader = DataLoader(
    TensorDataset(X_test_tensor, y_test_tensor),
    batch_size=BATCH_SIZE, shuffle=False, drop_last=False,
)

batch_sizes = [batch.shape[0] for batch, _ in train_loader]
print("Training feature tensor:", tuple(X_train_tensor.shape), "= [examples, features]")
print("Training target tensor:", tuple(y_train_tensor.shape), "= [examples, targets]")
print("Training examples:", len(train_dataset))
print("Batch size:", BATCH_SIZE)
print("Batches per epoch:", len(train_loader))
print("Batch sizes:", batch_sizes[:5], "..." if len(batch_sizes) > 5 else "", "last:", batch_sizes[-1] if batch_sizes else 0)
assert len(train_loader) == math.ceil(TRAIN_ROWS / BATCH_SIZE)
# drop_last=False retains the final smaller batch. One optimizer update happens per batch.`;

  const modelSpec = JSON.stringify(layerSpecs, null, 4);
  const layerComments = layerSpecs.map((layer, index) =>
    `# Layer ${index + 1}: nn.Linear(${layer.in}, ${layer.out}) + ${layer.activation}`).join('\n');
  const activationComment = activationWarning;
  const step7Code = `# === Step 7: build and inspect the exact network ===
# Exact selected layers:
${layerComments}
MODEL_SPEC = ${modelSpec}
EXPECTED_TRAINABLE = ${pyNumber(params.total)}
OUTPUT_ACTIVATION = ${pyString(outputActivation)}
${activationComment}
def activation_module(name):
    if name == "linear":
        return nn.Identity()
    if name == "relu":
        return nn.ReLU()
    if name == "sigmoid":
        return nn.Sigmoid()
    if name == "tanh":
        return nn.Tanh()
    raise ValueError(f"Unsupported activation: {name}")


def build_model_from_spec(spec):
    modules = []
    for layer in spec:
        modules.append(nn.Linear(layer["in"], layer["out"]))
        modules.append(activation_module(layer["activation"]))
    return nn.Sequential(*modules)


def initialize_like_lab(model, spec):
    # Same initialization family as the lab: uniform He for ReLU, Xavier otherwise,
    # and explicitly zero biases. Cross-framework RNG streams are not identical.
    linear_layers = [module for module in model if isinstance(module, nn.Linear)]
    for layer, linear in zip(spec, linear_layers):
        fan_in = linear.weight.shape[1]
        fan_out = linear.weight.shape[0]
        limit = math.sqrt(6.0 / fan_in) if layer["activation"] == "relu" else math.sqrt(6.0 / (fan_in + fan_out))
        nn.init.uniform_(linear.weight, -limit, limit)
        nn.init.zeros_(linear.bias)


if DEVICE_NAME == "cuda" and not torch.cuda.is_available():
    print("CUDA was requested but is not available; falling back to CPU.")
    device = torch.device("cpu")
else:
    device = torch.device(DEVICE_NAME)

torch.manual_seed(SEED)
model = build_model_from_spec(MODEL_SPEC)
initialize_like_lab(model, MODEL_SPEC)
model = model.to(device)

print(model)
for name, parameter in model.named_parameters():
    print(name, tuple(parameter.shape))
total_trainable = sum(parameter.numel() for parameter in model.parameters() if parameter.requires_grad)
print("Total trainable parameters:", total_trainable)
assert total_trainable == EXPECTED_TRAINABLE
print("Output activation:", OUTPUT_ACTIVATION)
print("Device:", device)
# Biases are explicitly initialized to zero above. The seed controls initialization,
# not the parameter count.`;

  const step8Code = `# === Step 8: define the loss and optimizer ===
criterion = nn.MSELoss()
if OPTIMIZER_NAME == "adam":
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
else:
    optimizer = torch.optim.SGD(model.parameters(), lr=LEARNING_RATE)

print("Loss:", criterion)
print("Optimizer:", optimizer)
# Loss measures prediction error. Backpropagation computes gradients.
# The optimizer turns those gradients into one parameter update per batch.`;

  const step9Code = `# === Step 9: optional inspection of one batch (does not touch the main run) ===
# A deep copy and a separate optimizer keep the experiment's model/optimizer state untouched.
probe_model = copy.deepcopy(model)
if OPTIMIZER_NAME == "adam":
    probe_optimizer = torch.optim.Adam(probe_model.parameters(), lr=LEARNING_RATE)
else:
    probe_optimizer = torch.optim.SGD(probe_model.parameters(), lr=LEARNING_RATE)
probe_model.train()
probe_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=False, drop_last=False)
X_probe, y_probe = next(iter(probe_loader))
X_probe = X_probe.to(device)
y_probe = y_probe.to(device)
initial_main_state = copy.deepcopy(model.state_dict())
before = [parameter.detach().clone() for parameter in probe_model.parameters()]

probe_optimizer.zero_grad(set_to_none=True)
predictions = probe_model(X_probe)
loss = criterion(predictions, y_probe)
loss.backward()

print("Parameter before the step (first 5 values):", before[0].flatten()[:5].cpu())
print("Predictions (${unit}, first 5):", predictions[:5].detach().cpu().flatten())
print("Targets (${unit}, first 5):", y_probe[:5].cpu().flatten())
print("Batch loss:", loss.item())
print("Gradient of the first weight (first 5 values):", probe_model[0].weight.grad.flatten()[:5].cpu())

probe_optimizer.step()
print("Parameter after one optimizer step (first 5 values):", next(probe_model.parameters()).detach().flatten()[:5].cpu())

main_unchanged = all(
    torch.equal(model.state_dict()[key], initial_main_state[key])
    for key in initial_main_state
)
print("Main model unchanged by the demonstration:", main_unchanged)
assert main_unchanged
# This demonstration is a copy. The main training run below still starts from the original model.`;

  const step10Code = `# === Step 10: complete mini-batch training loop ===
def evaluate(current_model, loader, current_criterion, current_device):
    current_model.eval()
    total_loss = 0.0
    total_examples = 0
    with torch.no_grad():
        for X_batch, y_batch in loader:
            X_batch = X_batch.to(current_device)
            y_batch = y_batch.to(current_device)
            predictions = current_model(X_batch)
            loss = current_criterion(predictions, y_batch)
            batch_examples = X_batch.shape[0]
            total_loss += loss.item() * batch_examples
            total_examples += batch_examples
    return total_loss / total_examples if total_examples else float("nan")


history = {"train": [], "validation": []}
best_validation_loss = float("inf")
best_state = copy.deepcopy(model.state_dict())
best_epoch = 0
epochs_without_improvement = 0

for epoch in range(1, EPOCHS + 1):
    model.train()
    running_loss = 0.0
    seen_examples = 0

    for batch_index, (X_batch, y_batch) in enumerate(train_loader, start=1):
        # 1. Move the batch to the selected execution device.
        X_batch = X_batch.to(device)
        y_batch = y_batch.to(device)

        # 2. Clear the gradients from the previous batch.
        optimizer.zero_grad(set_to_none=True)

        # 3. Forward pass: current parameters produce predictions.
        predictions = model(X_batch)

        # 4. Calculate the batch loss.
        loss = criterion(predictions, y_batch)

        # 5. Backpropagation: calculate gradients.
        loss.backward()

        # 6. One optimizer step: update weights and biases.
        optimizer.step()

        batch_examples = X_batch.shape[0]
        running_loss += loss.item() * batch_examples
        seen_examples += batch_examples

        if batch_index == 1 or batch_index % 5 == 0 or batch_index == len(train_loader):
            print(
                f"Epoch {epoch:02d} | batch {batch_index:03d}/{len(train_loader):03d} "
                f"| batch loss {loss.item():.6f} | examples {batch_examples}"
            )

    train_loss = running_loss / seen_examples
    validation_loss = evaluate(model, validation_loader, criterion, device)
    history["train"].append(train_loss)
    history["validation"].append(validation_loss)

    if validation_loss < best_validation_loss:
        best_validation_loss = validation_loss
        best_state = copy.deepcopy(model.state_dict())
        best_epoch = epoch
        epochs_without_improvement = 0
    else:
        epochs_without_improvement += 1

    print(
        f"Epoch {epoch:02d} summary | train loss {train_loss:.6f} "
        f"| validation loss {validation_loss:.6f} | best epoch {best_epoch}"
    )

    if EARLY_STOPPING and epochs_without_improvement >= PATIENCE:
        print(f"Early stopping at epoch {epoch}: validation did not improve for {PATIENCE} epoch(s).")
        break

print("Epochs completed:", len(history["train"]))
print("Best epoch:", best_epoch, "| best validation loss:", best_validation_loss)
# The next batch uses the parameters updated by the previous batch.
# Parameters are not reset between batches or epochs. The test set was never touched here.`;

  const step11Code = `# === Step 11: validate and restore the selected model ===
# Validation ran each epoch without gradients or parameter updates.
# The test set was not used to choose the architecture or the stopping point.
model.load_state_dict(best_state)
model.eval()
selected_validation_loss = evaluate(model, validation_loader, criterion, device)
print("Selected epoch:", best_epoch)
print("Selected validation loss:", selected_validation_loss)
print("The test set has not been used for selection.")

if EARLY_STOPPING:
    print(f"Early stopping was enabled with patience={PATIENCE}.")
else:
    print("Early stopping was disabled; the best validation state is still restored.")`;

  const step12Code = `# === Step 12: plot learning progress ===
epochs_ran = list(range(1, len(history["train"]) + 1))
plt.figure(figsize=(8, 5))
plt.plot(epochs_ran, history["train"], marker="o", label="Training loss")
plt.plot(epochs_ran, history["validation"], marker="s", label="Validation loss")
plt.title("Training and validation loss")
plt.xlabel("Epoch")
plt.ylabel("MSE (${unit})")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig("learning_curves.png", dpi=150)
if matplotlib.get_backend().lower() != "agg":
    plt.show()
print("Saved learning_curves.png")
# Falling loss means improving fit. Training improving while validation worsens can signal overfitting.
# More epochs or hidden layers do not guarantee better generalization.`;

  const step13Code = `# === Step 13: test the selected model once ===
test_loss_scaled = evaluate(model, test_loader, criterion, device)
model.eval()
with torch.no_grad():
    test_predictions_scaled = model(X_test_tensor.to(device)).cpu().numpy()

if target_scaler is not None:
    test_predictions = target_scaler.inverse_transform(test_predictions_scaled)
else:
    test_predictions = test_predictions_scaled

test_actual = y_test
mae = float(np.mean(np.abs(test_predictions - test_actual)))
rmse = float(np.sqrt(np.mean((test_predictions - test_actual) ** 2)))
print("Test MSE (${unit}):", test_loss_scaled)
print("Test MAE (original target units):", mae)
print("Test RMSE (original target units):", rmse)

results = pd.DataFrame(
    np.column_stack([test_actual, test_predictions]),
    columns=[f"actual_{name}" for name in TARGETS] + [f"predicted_{name}" for name in TARGETS],
)
print("Actual vs predicted (first 10 test rows):")
print(results.head(10).to_string(index=False))
# Report these once. The test set is for the final check, not for tuning.`;

  const step14Code = `# === Step 14: predict a new example ===
if len(NEW_EXAMPLE_VALUES) != len(FEATURES):
    raise ValueError("The new example must contain one value per input feature.")
new_example = dict(zip(FEATURES, NEW_EXAMPLE_VALUES))
new_frame = pd.DataFrame([new_example], columns=FEATURES)
new_imputed = feature_imputer.transform(new_frame)
new_scaled = feature_scaler.transform(new_imputed)
new_tensor = torch.tensor(new_scaled, dtype=torch.float32).to(device)

model.eval()
with torch.no_grad():
    new_prediction_scaled = model(new_tensor).cpu().numpy()

if target_scaler is not None:
    new_prediction = target_scaler.inverse_transform(new_prediction_scaled)
else:
    new_prediction = new_prediction_scaled

print("New example (original feature order):", new_example)
print("Predicted target (original units):", new_prediction.ravel())
# Inference uses the learned parameters without updating them.`;

  const checkpointName = source === 'synthetic-house' ? 'house_price_model.pt' : 'trained_network_model.pt';
  const step15Code = `# === Step 15: save and reload for inference ===
CHECKPOINT_PATH = Path("${checkpointName}")
checkpoint = {
    "state_dict": model.state_dict(),
    "layer_specs": MODEL_SPEC,
    "feature_names": FEATURES,
    "target_names": TARGETS,
    "feature_imputer": feature_imputer,
    "feature_scaler": feature_scaler,
    "target_scaler": target_scaler,
    "config": {
        "architecture": [layer["in"] for layer in MODEL_SPEC] + [MODEL_SPEC[-1]["out"]],
        "activations": [layer["activation"] for layer in MODEL_SPEC],
        "features": FEATURES,
        "targets": TARGETS,
        "train_rows": TRAIN_ROWS,
        "validation_rows": VALIDATION_ROWS,
        "test_rows": TEST_ROWS,
        "batch_size": BATCH_SIZE,
        "epochs": EPOCHS,
        "learning_rate": LEARNING_RATE,
        "optimizer": OPTIMIZER_NAME,
        "target_scaled": TARGET_SCALED,
        "seed": SEED,
    },
}
torch.save(checkpoint, CHECKPOINT_PATH)
print("Saved inference checkpoint:", CHECKPOINT_PATH)


def predict_with_artifact(artifact, feature_values):
    frame = pd.DataFrame([dict(zip(artifact["feature_names"], feature_values))], columns=artifact["feature_names"])
    features = artifact["feature_imputer"].transform(frame)
    features = artifact["feature_scaler"].transform(features)
    tensor = torch.tensor(features, dtype=torch.float32).to(device)
    loaded = build_model_from_spec(artifact["layer_specs"])
    loaded.load_state_dict(artifact["state_dict"])
    loaded.to(device)
    loaded.eval()
    with torch.no_grad():
        prediction = loaded(tensor).cpu().numpy()
    if artifact["target_scaler"] is not None:
        prediction = artifact["target_scaler"].inverse_transform(prediction)
    return prediction


before_reload = predict_with_artifact(checkpoint, NEW_EXAMPLE_VALUES)
loaded_checkpoint = torch.load(CHECKPOINT_PATH, map_location=device, weights_only=False)
loaded_model = build_model_from_spec(loaded_checkpoint["layer_specs"])
loaded_model.load_state_dict(loaded_checkpoint["state_dict"])
loaded_model.to(device)
loaded_model.eval()
after_reload = predict_with_artifact(loaded_checkpoint, NEW_EXAMPLE_VALUES)
print("Prediction before reload:", before_reload.ravel())
print("Prediction after reload:", after_reload.ravel())
reload_matches = bool(np.allclose(before_reload, after_reload, rtol=1e-5, atol=1e-5))
print("Reloaded prediction matches:", reload_matches)
assert reload_matches
# This is an inference-only save: architecture, weights, feature order, imputer, scalers, and config.
# To resume interrupted training, also save optimizer.state_dict(), the current epoch, history,
# and the RNG state; inference does not need those.`;

  const steps: GuideStep[] = [
    {
      number: 1,
      title: 'Set up the environment',
      purpose: 'Create an isolated Python environment and install the libraries the guide uses.',
      input: 'A terminal and Python 3.10+; the selected execution device.',
      explanation: 'The terminal commands create a virtual environment so this project does not affect other Python work. Activate it before running any Python. Windows and macOS/Linux use different activation commands. Keep terminal commands out of the Python file.',
      code: step1Code,
      output: 'Python and package versions, plus whether CUDA is available.',
      check: config.device === 'cuda'
        ? 'All imports succeed and CUDA available is True. If it is False, install PyTorch using the official selector and verify the driver before continuing.'
        : 'All imports succeed and CUDA available is False (CPU is the intended default).',
      terminal: step1Terminal,
    },
    {
      number: 2,
      title: 'Import libraries and set seeds',
      purpose: 'Import every library once and make random choices repeatable before data generation, splitting, and initialization.',
      input: 'The virtual environment from Step 1 and the selected seed.',
      explanation: 'The seed controls random choices such as synthetic rows, the split order, and the initial weights. It does not determine how many weights exist. It is set once before the workflow; resetting it inside the loop would restart the randomness. Exact bit-for-bit reproducibility can still vary across hardware, library versions, and nondeterministic operations.',
      code: step2Code,
      output: `Seed value ${seed}; imports are ready.`,
      check: 'The seed prints once. Do not add seed resets inside the batch or epoch loop.',
    },
    {
      number: 3,
      title: 'Load and inspect the dataset',
      purpose: 'Load the selected data source, verify its columns, and understand what each row represents.',
      input: `${sourceLabel(source)} with ${config.featureNames.length} feature(s) and ${config.targetNames.length} target(s).`,
      explanation: source === 'current-examples'
        ? 'The rows come from your complete numeric training examples. They are copied into this script so it is self-contained. No synthetic rows are invented.'
        : `This guide has no external real dataset, so it generates an explicitly labeled ${source === 'synthetic-house' ? 'house-price' : 'generic'} demonstration dataset from your seed. These are synthetic classroom records, not real observations. You can replace the data-loading block with your CSV later and keep the rest of the workflow.`,
      code: step3Code,
      output: `${totalRows} rows; column names and types; the first rows; missing-value counts; feature and target lists.`,
      check: 'The row count matches the split total, both feature columns and the target are numeric, and you see the expected column names and a few sensible rows. Remember: synthetic does not mean real.',
    },
    {
      number: 4,
      title: 'Clean and split the data',
      purpose: 'Validate columns, handle invalid values, and create training, validation, and test sets without leaking information.',
      input: `The inspected DataFrame, seed ${seed}, and split counts ${config.trainRows}/${config.validationRows}/${config.testRows}.`,
      explanation: 'The code coerces values to numeric, drops rows with missing targets, and splits before fitting preprocessing. The imputer is fit on the training partition only, then applied to validation and test. The total dataset is larger than the training set; only the training rows update weights.',
      code: step4Code,
      output: `Training: ${config.trainRows}; validation: ${config.validationRows}; test: ${config.testRows}; total: ${totalRows}.`,
      check: 'The three split sizes sum to the total. Validation and test were held out. No imputer statistic was learned from them.',
    },
    {
      number: 5,
      title: 'Scale features',
      purpose: 'Put features on comparable scales and optionally standardize the target for optimization.',
      input: 'Training, validation, and test arrays from Step 4.',
      explanation: 'Scaling helps gradient-based training when features have different units, such as square metres and bedroom counts. The scaler is fit on training only. If target scaling is used, the target scaler must be kept so predictions can be converted back to prices.',
      code: step5Code,
      output: `Scaled feature shapes; training feature means and scales; whether the target is scaled.`,
      check: 'The scaler means and scales look plausible. Validation/test were transformed, not re-fit.',
    },
    {
      number: 6,
      title: 'Create tensors and batches',
      purpose: 'Convert arrays to correctly shaped float32 tensors and create shuffled mini-batches.',
      input: 'Scaled arrays and batch size.',
      explanation: `The feature tensor is [${config.trainRows}, ${config.featureNames.length}], and the target tensor is [${config.trainRows}, ${config.targetNames.length}]. Rows are examples; columns are features. Batch size counts rows, not neurons or weights. The final batch may be smaller because drop_last=False. Training batches are shuffled each epoch.`,
      code: step6Code,
      output: `${config.trainRows} training examples, ${batchesPerEpoch} batch(es) per epoch, and the first/last batch sizes.`,
      check: 'The tensor shapes and batch count match the training split. A final batch may be smaller; it is retained.',
    },
    {
      number: 7,
      title: 'Build and inspect the network',
      purpose: 'Build exactly the selected fully connected architecture, activation functions, and output layer.',
      input: 'The selected layer sizes/activations and the seed.',
      explanation: 'The model is an nn.Sequential of Linear layers and the selected activations. The output activation stays exactly as selected. Initialization follows the lab family — uniform He for ReLU, Xavier otherwise, and zero biases — but cross-framework random streams are not identical. The code prints parameter shapes and the exact trainable count.',
      code: step7Code,
      output: `Model structure; each parameter shape; total trainable parameters = ${params.total} (${params.weights} weights + ${params.biases} biases).`,
      check: `The parameter count is ${params.total}. For a 2 → 3 → 1 network with biases: 9 weights, 4 biases, 13 trainable parameters.`,
    },
    {
      number: 8,
      title: 'Define loss and optimizer',
      purpose: 'Create the selected optimizer and a loss suitable for regression.',
      input: 'The model from Step 7, selected optimizer, and learning rate.',
      explanation: `MSE is used for this teaching regression example. MSE is in squared ${config.targetScaled ? 'scaled ' : ''}target units; MAE (Step 13) is easier to read in original units such as OMR. Loss measures error, backpropagation computes gradients, and the optimizer applies one update per batch.`,
      code: step8Code,
      output: `Loss object ${config.targetScaled ? 'MSE (scaled target)' : 'MSE'} and the ${config.optimizer.toUpperCase()} optimizer.`,
      check: 'MSE and the selected optimizer are shown. Do not confuse the loss with an accuracy score.',
    },
    {
      number: 9,
      title: 'Inspect one training batch',
      purpose: 'See the actual forward pass, loss, gradients, and one optimizer step without changing the main experiment.',
      input: 'A copy of the model, an independent optimizer, and the first training batch.',
      explanation: 'This optional demonstration uses copy.deepcopy(model) and a separate optimizer. It prints a limited subset, performs one step on the copy, and asserts that the main model is unchanged. The real training run below starts from the original model and optimizer.',
      code: step9Code,
      output: `A few parameter values, predictions, targets, batch loss, gradients, post-step values, and "Main model unchanged by the demonstration: True".`,
      check: 'The main model unchanged line is True. The printed arrays are labeled subsets, not full parameter dumps.',
    },
    {
      number: 10,
      title: 'Run the complete training loop',
      purpose: 'Train the selected network for the selected epochs and track validation loss.',
      input: 'Model, optimizer, criterion, loaders, epochs, and early-stopping settings.',
      explanation: `Every batch follows the same six operations: move to device, clear gradients, forward, loss, backward, optimizer step. The next batch starts from the updated parameters. Epoch train loss is a sample-weighted average so a smaller final batch is handled correctly. Validation uses no_grad and no updates. The test set is not touched.`,
      code: step10Code,
      output: `${updates} expected optimizer update(s): ${batchesPerEpoch} batch(es) × ${config.epochs} epoch(s). Batch logs are limited; each epoch prints a concise summary.`,
      check: 'Update counts match batches × epochs. Training and validation losses are recorded. No test data appears here.',
    },
    {
      number: 11,
      title: 'Validate and select the model',
      purpose: 'Explain validation, preserve the best validation state, and restore it before final testing.',
      input: 'The best validation state and validation loader from Step 10.',
      explanation: 'The loop saved an independent copy of the state with the best validation loss. This step restores that state and reports the selected validation loss. Early stopping, when enabled, uses the selected patience and stops after that many epochs without improvement. The test set is never used for these decisions.',
      code: step11Code,
      output: `Selected epoch, selected validation loss, and whether early stopping was enabled.`,
      check: 'The selected model is the best-validation checkpoint, not simply the last epoch. Test data is still untouched.',
    },
    {
      number: 12,
      title: 'Plot learning progress',
      purpose: 'Compare training and validation loss across epochs and look for overfitting.',
      input: 'The history recorded during training.',
      explanation: 'Falling loss means improving fit to that dataset. Training loss improving while validation loss worsens can indicate overfitting. More epochs or hidden layers do not guarantee better generalization; compare with validation evidence.',
      code: step12Code,
      output: 'A training/validation loss chart saved as learning_curves.png.',
      check: 'The two curves use the same epoch axis. Look for a widening gap, not just a lower training loss.',
    },
    {
      number: 13,
      title: 'Test the selected model',
      purpose: 'Evaluate the restored model once on the held-out test set and translate metrics into original units.',
      input: 'The selected model, test loader, and target scaler.',
      explanation: `The test set is used only now. MAE and RMSE are reported in original target units${config.targetScaled ? ' after inverting the target scaler' : ''}. MSE is also reported in ${unit}. The table shows a small labeled subset of actual and predicted values.`,
      code: step13Code,
      output: 'Test MSE, MAE, RMSE, and the first 10 actual/predicted rows.',
      check: 'Metrics are in understandable target units. Do not go back and tune on this test result; if you must, use a fresh test set.',
    },
    {
      number: 14,
      title: 'Predict for a new example',
      purpose: 'Apply the saved training preprocessing and the selected model to one new set of feature values.',
      input: `A new example in feature order: ${config.featureNames.join(', ')}.`,
      explanation: 'The new row is imputed and scaled with the training artifacts, converted to a tensor, and passed through the model with no_grad. The target scaler is inverted so the answer is in original units. Inference does not update any weights.',
      code: step14Code,
      output: `The new feature dictionary and the predicted target in original units.`,
      check: 'The feature values are in the original feature order. The prediction is a number, and no optimizer step occurred.',
    },
    {
      number: 15,
      title: 'Save and reload',
      purpose: 'Save an inference-ready artifact and prove that reloading reproduces the prediction.',
      input: 'The selected model, architecture, feature order, preprocessing, and configuration.',
      explanation: 'The checkpoint stores weights, layer specs, activations, feature names, imputer, scalers, and the training configuration. Reloading builds the architecture from the saved specs, loads the weights, and compares before/after predictions. This is inference-only; resuming interrupted training also needs optimizer state, epoch, history, and RNG state.',
      code: step15Code,
      output: `Saved ${checkpointName}, predictions before and after reload, and "Reloaded prediction matches: True".`,
      check: 'The reloaded prediction matches. Keep the artifact and the feature order together; a model without its preprocessing is incomplete.',
    },
  ];

  const script = `${header}\n${steps.map(step => `# ${'='.repeat(70)}\n# STEP ${step.number}: ${step.title.toUpperCase()}\n# ${'='.repeat(70)}\n${step.code}`).join('\n\n')}\n\nprint("\\nGuide complete: data, training, evaluation, inference, and reload all ran.")\n`;
  const requirements = `# Core workflow
torch>=2.2
pandas>=2.0
numpy>=1.26
scikit-learn>=1.4
matplotlib>=3.8

# Optional: run the downloadable notebook
jupyter>=1.0
# For GPU PyTorch, install torch from the official selector:
# https://pytorch.org/get-started/locally/
`;
  const notebook = makeNotebook(steps, summaryFor(network, config, source, params, batchesPerEpoch, updates));
  const scriptFilename = source === 'synthetic-house' ? 'house_price_training_guide.py' : 'neural_network_training_guide.py';
  const notebookFilename = source === 'synthetic-house' ? 'house_price_training_guide.ipynb' : 'neural_network_training_guide.ipynb';

  return {
    steps,
    script,
    notebook,
    requirements,
    summary: summaryFor(network, config, source, params, batchesPerEpoch, updates),
    errors,
    warnings,
    scriptFilename,
    notebookFilename,
    modelFilename: checkpointName,
  };
}

function summaryFor(
  network: Network, config: GuideConfig, source: GuideSource,
  params: { weights: number; biases: number; total: number },
  batchesPerEpoch: number, updates: number,
): GuideSummary {
  const outputs = network.layers.at(-1)?.weights.length ?? 0;
  return {
    architecture: [network.inputs.length, ...network.layers.map(layer => layer.weights.length)].join(' → '),
    features: network.inputs.length,
    outputs,
    weights: params.weights,
    biases: params.biases,
    parameters: params.total,
    trainRows: config.trainRows,
    validationRows: config.validationRows,
    testRows: config.testRows,
    totalRows: config.trainRows + config.validationRows + config.testRows,
    batchesPerEpoch,
    updates,
    batchSize: config.batchSize,
    epochs: config.epochs,
    learningRate: config.learningRate,
    optimizer: config.optimizer.toUpperCase(),
    device: config.device === 'cuda' ? 'GPU (CUDA, CPU fallback)' : 'CPU',
    seed: config.seed,
    source: sourceLabel(source),
    parameterStorage: bytesLabel(params.total * 4),
  };
}

function makeNotebook(steps: GuideStep[], summary: GuideSummary) {
  const cells: Record<string, unknown>[] = [];
  cells.push({
    cell_type: 'markdown',
    metadata: {},
    source: [
      '# Neural Network Training Guide\n',
      '\n',
      `Generated for the selected **${summary.architecture}** network.\n`,
      '\n',
      `Dataset: **${summary.source}** · training ${summary.trainRows} / validation ${summary.validationRows} / test ${summary.testRows} · `,
      `${summary.batchesPerEpoch} batch(es) per epoch · ${summary.updates} updates · ${summary.optimizer} · ${summary.device}.\n`,
      '\n',
      '> Run these cells in order. Later cells use variables created by earlier cells. The terminal commands in Step 1 belong in a terminal, not in a Python cell.\n',
    ],
  });
  for (const step of steps) {
    const markdown = [
      `## Step ${step.number} — ${step.title}\n`,
      '\n',
      `**Purpose.** ${step.purpose}\n`,
      '\n',
      `**Input.** ${step.input}\n`,
      '\n',
      `**What the code does.** ${step.explanation}\n`,
      '\n',
      `**Output.** ${step.output}\n`,
      '\n',
      `**What to check before continuing.** ${step.check}\n`,
    ];
    if (step.terminal) {
      markdown.push('\n**Terminal commands (run in a terminal, not in this notebook):**\n\n```powershell\n', step.terminal, '```\n');
    }
    cells.push({ cell_type: 'markdown', metadata: {}, source: markdown });
    cells.push({
      cell_type: 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: step.code.split('\n').map((line, index, all) => index < all.length - 1 ? `${line}\n` : line),
    });
  }
  cells.push({
    cell_type: 'markdown',
    metadata: {},
    source: [
      '## Done\n',
      '\n',
      'The notebook performs the same workflow as the complete `.py` script. The test set is used once, the best validation state is restored before testing, and the reload check compares predictions. The checkpoint is inference-ready; resuming training needs the optimizer state and training progress as well.\n',
    ],
  });
  return JSON.stringify({
    cells,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.10' },
    },
    nbformat: 4,
    nbformat_minor: 5,
  }, null, 2);
}
