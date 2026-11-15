"""Regenerate the pretrained transformer weights used by the LLM playground.

Run from the project folder:

    python -m backend.train_llm

The weights are small, so they are saved next to the module and loaded at
startup. Retrain whenever the corpus or the model shape changes.
"""

from pathlib import Path

import numpy as np

from .llm import LanguageModel


def main():
    model = LanguageModel()
    history = model.batches(3000, 0.3)
    target = Path(__file__).with_name("llm_weights.npz")
    np.savez_compressed(target, **model.params)
    print(f"trained {len(history) - 1} steps: loss {history[0]:.3f} -> {history[-1]:.3f}")
    print(f"saved {model.parameters} parameters to {target}")


if __name__ == "__main__":
    main()
